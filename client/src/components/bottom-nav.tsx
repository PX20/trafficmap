import { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { 
  Home, 
  Map, 
  User, 
  MessageSquare, 
  MapPin,
  Settings,
  ChevronUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from '@/components/ui/drawer';
import { LocationAutocomplete } from '@/components/location-autocomplete';
import { useAuth } from '@/hooks/useAuth';

interface BottomNavProps {
  unreadMessages?: number;
}

export function BottomNav({ unreadMessages = 0 }: BottomNavProps) {
  const [location] = useLocation();
  const { user } = useAuth();
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);

  const navigationItems = [
    {
      id: 'feed',
      label: 'Feed',
      icon: Home,
      href: '/',
      active: location === '/' || location === '/feed'
    },
    {
      id: 'map',
      label: 'Map',
      icon: Map,
      href: '/map',
      active: location === '/map'
    },
    {
      id: 'messages',
      label: 'Messages',
      icon: MessageSquare,
      href: '/messages',
      active: location.startsWith('/messages'),
      badge: unreadMessages > 0 ? unreadMessages : undefined
    },
    {
      id: 'profile',
      label: 'Profile',
      icon: User,
      href: '/profile',
      active: location === '/profile'
    }
  ];

  const handleLocationChange = (location: string, coordinates?: { lat: number; lon: number }, boundingBox?: [number, number, number, number]) => {
    // Save to localStorage to sync with other pages
    if (coordinates) {
      localStorage.setItem('homeLocation', location);
      localStorage.setItem('homeCoordinates', JSON.stringify(coordinates));
      localStorage.setItem('locationFilter', 'true');
      if (boundingBox) {
        localStorage.setItem('homeBoundingBox', JSON.stringify(boundingBox));
      }
      
      // Dispatch custom event to notify other pages
      window.dispatchEvent(new CustomEvent('locationChanged', {
        detail: { location, coordinates, boundingBox }
      }));
    }
    
    setIsLocationDrawerOpen(false);
  };

  const clearLocation = () => {
    localStorage.removeItem('homeLocation');
    localStorage.removeItem('homeCoordinates');
    localStorage.removeItem('homeBoundingBox');
    localStorage.setItem('locationFilter', 'false');
    
    window.dispatchEvent(new CustomEvent('locationChanged', {
      detail: { location: '', coordinates: null, boundingBox: null }
    }));
    
    setIsLocationDrawerOpen(false);
  };

  const currentLocation = localStorage.getItem('homeLocation') || '';

  return (
    <>
      {/* Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border">
        <div className="flex justify-around items-center h-16 px-2">
          {navigationItems.map((item) => {
            const IconComponent = item.icon;
            
            if (item.id === 'profile') {
              return (
                <Drawer key={item.id} open={isLocationDrawerOpen} onOpenChange={setIsLocationDrawerOpen}>
                  <DrawerTrigger asChild>
                    <button
                      className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 text-xs transition-colors ${
                        item.active 
                          ? 'text-primary' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                      data-testid={`nav-${item.id}`}
                    >
                      <div className="relative">
                        <IconComponent className="w-5 h-5 mb-1" />
                        {currentLocation && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full" />
                        )}
                      </div>
                      <span className="truncate">{item.label}</span>
                    </button>
                  </DrawerTrigger>
                  <DrawerContent className="max-h-[80vh]">
                    <DrawerHeader className="text-left">
                      <DrawerTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5" />
                        Location Settings
                      </DrawerTitle>
                    </DrawerHeader>
                    <div className="px-4 pb-6 space-y-4">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">Set Your Area</CardTitle>
                          <CardDescription>
                            Choose your location to get relevant safety updates and filter incidents
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <LocationAutocomplete
                            value=""
                            onChange={handleLocationChange}
                            placeholder="Search for your suburb or area..."
                            className="w-full"
                          />
                          
                          {currentLocation && (
                            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                              <div className="flex items-center gap-2 flex-1">
                                <MapPin className="w-4 h-4 text-primary" />
                                <span className="text-sm font-medium">{currentLocation}</span>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={clearLocation}
                                className="h-8 w-8 p-0"
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <div className="grid grid-cols-2 gap-4">
                        <Link href="/profile">
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <User className="w-4 h-4" />
                            View Profile
                          </Button>
                        </Link>
                        <Link href="/notifications">
                          <Button variant="outline" className="w-full justify-start gap-2">
                            <Settings className="w-4 h-4" />
                            Settings
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </DrawerContent>
                </Drawer>
              );
            }

            return (
              <Link key={item.id} href={item.href}>
                <button
                  className={`flex flex-col items-center justify-center min-w-0 flex-1 py-2 px-1 text-xs transition-colors ${
                    item.active 
                      ? 'text-primary' 
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                  data-testid={`nav-${item.id}`}
                >
                  <div className="relative">
                    <IconComponent className="w-5 h-5 mb-1" />
                    {item.badge && (
                      <Badge 
                        variant="destructive" 
                        className="absolute -top-1 -right-1 h-4 w-4 text-xs p-0 flex items-center justify-center"
                      >
                        {item.badge > 99 ? '99+' : item.badge}
                      </Badge>
                    )}
                  </div>
                  <span className="truncate">{item.label}</span>
                </button>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}