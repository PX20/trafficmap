import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Smartphone, AlertTriangle, Car, Shield, Flame, Megaphone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Separator } from '@/components/ui/separator';

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  icon: any;
  enabled: boolean;
}

const DEFAULT_CATEGORIES: NotificationCategory[] = [
  { id: 'tmr', name: 'TMR Traffic Alerts', description: 'Road closures, crashes, roadworks from Transport and Main Roads', icon: Car, enabled: true },
  { id: 'safety', name: 'Safety & Crime', description: 'Crime reports, suspicious activity, public disturbances', icon: Shield, enabled: true },
  { id: 'emergency', name: 'Emergencies', description: 'Fire, flood, natural disasters, medical emergencies', icon: Flame, enabled: true },
  { id: 'community', name: 'Community Posts', description: 'Local community updates and reports', icon: Megaphone, enabled: true },
];

export function NotificationSettings() {
  const {
    isSupported,
    isSubscribed,
    isLoading,
    permission,
    subscribe,
    unsubscribe,
    requestPermission
  } = usePushNotifications();

  const { user } = useAuth();
  const { toast } = useToast();
  const [testLoading, setTestLoading] = useState(false);
  const [categories, setCategories] = useState<NotificationCategory[]>(DEFAULT_CATEGORIES);

  // Load user's notification preferences
  useEffect(() => {
    if (user?.notificationCategories) {
      const enabledCategories = user.notificationCategories as string[];
      setCategories(prev => prev.map(cat => ({
        ...cat,
        enabled: enabledCategories.includes(cat.id)
      })));
    }
  }, [user?.notificationCategories]);

  // Mutation to save notification preferences
  const savePreferencesMutation = useMutation({
    mutationFn: async (enabledCategoryIds: string[]) => {
      const response = await apiRequest('PATCH', '/api/user/notification-preferences', {
        notificationCategories: enabledCategoryIds
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      toast({
        title: 'Preferences saved',
        description: 'Your notification settings have been updated.',
      });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save notification preferences.',
        variant: 'destructive',
      });
    }
  });

  const handleCategoryToggle = (categoryId: string, enabled: boolean) => {
    const newCategories = categories.map(cat => 
      cat.id === categoryId ? { ...cat, enabled } : cat
    );
    setCategories(newCategories);
    
    // Save to server
    const enabledIds = newCategories.filter(c => c.enabled).map(c => c.id);
    savePreferencesMutation.mutate(enabledIds);
  };

  const handleToggleNotifications = async () => {
    if (isSubscribed) {
      await unsubscribe();
    } else {
      await subscribe();
    }
  };

  const handleTestNotification = async () => {
    setTestLoading(true);
    try {
      const response = await fetch('/api/push/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        // Show a browser notification as a test since backend doesn't actually send one yet
        if (permission === 'granted') {
          new Notification('Test Notification', {
            body: 'Push notifications are working! You\'ll receive alerts about safety incidents in your area.',
            icon: '/icon-192x192.png',
            tag: 'test-notification'
          });
        }
      }
    } catch (error) {
      console.error('Error testing notification:', error);
    } finally {
      setTestLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BellOff className="w-5 h-5 text-muted-foreground" />
            Push Notifications
          </CardTitle>
          <CardDescription>
            Stay informed about safety incidents in your area
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500" />
            <div className="flex-1">
              <p className="text-sm font-medium">Not Supported</p>
              <p className="text-xs text-muted-foreground">
                Push notifications aren't available on this device or browser.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5 text-primary" />
          Push Notifications
          {isSubscribed && (
            <Badge variant="secondary" className="ml-auto">
              <Smartphone className="w-3 h-3 mr-1" />
              Active
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Get instant alerts about safety incidents in your area
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Permission Status */}
        <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
          <div className={`w-3 h-3 rounded-full ${
            permission === 'granted' ? 'bg-green-500' : 
            permission === 'denied' ? 'bg-red-500' : 'bg-yellow-500'
          }`} />
          <div className="flex-1">
            <p className="text-sm font-medium">
              {permission === 'granted' ? 'Permissions Granted' : 
               permission === 'denied' ? 'Permissions Denied' : 'Permissions Needed'}
            </p>
            <p className="text-xs text-muted-foreground">
              {permission === 'granted' ? 'Ready to receive notifications' : 
               permission === 'denied' ? 'Enable in browser settings to receive alerts' : 
               'Allow notifications to get safety alerts'}
            </p>
          </div>
        </div>

        {/* Toggle Switch */}
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <Label htmlFor="notifications-toggle" className="text-sm font-medium">
              Safety Alerts
            </Label>
            <p className="text-xs text-muted-foreground">
              Receive notifications about incidents near you
            </p>
          </div>
          <Switch
            id="notifications-toggle"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-2">
          {permission === 'default' && (
            <Button 
              onClick={requestPermission}
              className="w-full"
              variant="default"
            >
              <Bell className="w-4 h-4 mr-2" />
              Enable Notifications
            </Button>
          )}
          
          {permission === 'denied' && (
            <div className="text-center p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">
                Notifications are blocked. Please enable them in your browser settings.
              </p>
            </div>
          )}

          {isSubscribed && (
            <Button 
              onClick={handleTestNotification}
              disabled={testLoading}
              className="w-full"
              variant="outline"
              size="sm"
            >
              {testLoading ? 'Testing...' : 'Test Notification'}
            </Button>
          )}
        </div>

        {/* What You'll Receive */}
        <div className="text-xs text-muted-foreground space-y-1">
          <p className="font-medium">You'll be notified about:</p>
          <ul className="list-disc list-inside space-y-0.5 ml-2">
            <li>Emergency incidents in your area</li>
            <li>Major traffic events and road closures</li>
            <li>Community safety alerts</li>
            <li>Crime reports and suspicious activity</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}