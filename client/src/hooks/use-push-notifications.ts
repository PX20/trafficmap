import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export function usePushNotifications() {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const { toast } = useToast();

  useEffect(() => {
    // Check if push notifications are supported
    const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
    setIsSupported(supported);
    
    if (supported) {
      setPermission(Notification.permission);
      checkSubscriptionStatus();
    }
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription status:', error);
    }
  };

  const requestPermission = async (): Promise<boolean> => {
    if (!isSupported) {
      toast({
        title: "Not Supported",
        description: "Push notifications are not supported on this device.",
        variant: "destructive",
      });
      return false;
    }

    if (permission === 'granted') {
      return true;
    }

    const result = await Notification.requestPermission();
    setPermission(result);

    if (result === 'granted') {
      toast({
        title: "Notifications Enabled",
        description: "You'll now receive safety alerts for your area.",
      });
      return true;
    } else if (result === 'denied') {
      toast({
        title: "Notifications Blocked",
        description: "Please enable notifications in your browser settings to receive safety alerts.",
        variant: "destructive",
      });
      return false;
    }

    return false;
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || permission !== 'granted') {
      const granted = await requestPermission();
      if (!granted) return false;
    }

    setIsLoading(true);

    try {
      console.log('[Push] Starting subscription process...');
      
      // Register service worker
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('[Push] Service worker registered');
      
      // Wait for service worker to be ready
      await navigator.serviceWorker.ready;
      console.log('[Push] Service worker ready');

      // Get VAPID public key from API (works in both dev and production)
      console.log('[Push] Fetching VAPID key from API...');
      const vapidResponse = await fetch('/api/push/vapid-key');
      if (!vapidResponse.ok) {
        throw new Error('VAPID public key not configured - push notifications unavailable');
      }
      const { publicKey: vapidPublicKey } = await vapidResponse.json();
      console.log('[Push] VAPID key available:', !!vapidPublicKey);

      // Get or create push subscription
      console.log('[Push] Creating push subscription...');
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });
      console.log('[Push] Push subscription created:', subscription.endpoint.substring(0, 50) + '...');

      // Send subscription to backend
      console.log('[Push] Sending subscription to backend...');
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: arrayBufferToBase64(subscription.getKey('p256dh')!),
              auth: arrayBufferToBase64(subscription.getKey('auth')!)
            }
          }
        })
      });

      console.log('[Push] Backend response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Push] Backend error:', errorText);
        throw new Error(`Failed to save subscription: ${response.status} - ${errorText}`);
      }

      setIsSubscribed(true);
      toast({
        title: "Notifications Enabled",
        description: "You'll receive safety alerts for incidents in your area.",
      });
      
      console.log('[Push] Subscription complete!');
      return true;
    } catch (error: any) {
      console.error('[Push] Error subscribing to push notifications:', error);
      console.error('[Push] Error details:', error?.message, error?.stack);
      toast({
        title: "Subscription Failed",
        description: error?.message || "Unable to enable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setIsLoading(true);

    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        // Unsubscribe from push notifications
        await subscription.unsubscribe();
        
        // Remove subscription from backend
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            endpoint: subscription.endpoint
          })
        });
      }

      setIsSubscribed(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
      
      return true;
    } catch (error) {
      console.error('Error unsubscribing from push notifications:', error);
      toast({
        title: "Unsubscribe Failed",
        description: "Unable to disable push notifications. Please try again.",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  };
}

// Helper functions
function urlBase64ToUint8Array(base64String: string): BufferSource {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}