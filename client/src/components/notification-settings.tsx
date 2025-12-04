import { useState, useEffect } from 'react';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Bell, BellOff, Smartphone, AlertTriangle, Car, Shield, Flame, Megaphone, PawPrint, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';

const NOTIFICATION_CATEGORIES = [
  { id: 'tmr', name: 'TMR Traffic', icon: Car },
  { id: 'safety', name: 'Safety & Crime', icon: Shield },
  { id: 'emergency', name: 'Emergencies', icon: Flame },
  { id: 'community', name: 'Community', icon: Megaphone },
  { id: 'pets', name: 'Pets', icon: PawPrint },
  { id: 'lostfound', name: 'Lost & Found', icon: Search },
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
  const [enabledCategories, setEnabledCategories] = useState<string[]>(
    NOTIFICATION_CATEGORIES.map(c => c.id)
  );

  useEffect(() => {
    if (user?.notificationCategories && Array.isArray(user.notificationCategories)) {
      setEnabledCategories(user.notificationCategories as string[]);
    }
  }, [user?.notificationCategories]);

  const savePreferencesMutation = useMutation({
    mutationFn: async (categories: string[]) => {
      const response = await apiRequest('PATCH', '/api/user/notification-preferences', {
        notificationCategories: categories
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to save preferences.',
        variant: 'destructive',
      });
    }
  });

  const handleCategoryToggle = (categoryId: string) => {
    const newCategories = enabledCategories.includes(categoryId)
      ? enabledCategories.filter(id => id !== categoryId)
      : [...enabledCategories, categoryId];
    
    setEnabledCategories(newCategories);
    savePreferencesMutation.mutate(newCategories);
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

        {/* Master Toggle */}
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
            data-testid="switch-notifications-master"
            checked={isSubscribed}
            onCheckedChange={handleToggleNotifications}
            disabled={isLoading || permission === 'denied'}
          />
        </div>

        {/* Category Toggles */}
        {isSubscribed && (
          <div className="space-y-3 pt-2">
            <Label className="text-sm font-medium">Alert Categories</Label>
            <div className="space-y-2">
              {NOTIFICATION_CATEGORIES.map((category) => {
                const Icon = category.icon;
                const isEnabled = enabledCategories.includes(category.id);
                return (
                  <div 
                    key={category.id}
                    className="flex items-center justify-between py-1"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm">{category.name}</span>
                    </div>
                    <Switch
                      data-testid={`switch-category-${category.id}`}
                      checked={isEnabled}
                      onCheckedChange={() => handleCategoryToggle(category.id)}
                      disabled={savePreferencesMutation.isPending}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-2">
          {permission === 'default' && (
            <Button 
              onClick={requestPermission}
              className="w-full"
              variant="default"
              data-testid="button-enable-notifications"
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
              data-testid="button-test-notification"
            >
              {testLoading ? 'Testing...' : 'Test Notification'}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
