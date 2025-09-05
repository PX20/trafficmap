import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Map, List, Bell, MessageCircle, Filter, Plus, MapPin, Menu, LogOut, Settings } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { IncidentReportForm } from "@/components/incident-report-form";
import { useIsMobile } from "@/hooks/use-mobile";

interface AppHeaderProps {
  onMenuToggle: () => void;
  onFilterToggle?: () => void;
  showFilterButton?: boolean;
}

export function AppHeader({ onMenuToggle, onFilterToggle, showFilterButton }: AppHeaderProps) {
  const { user, isAuthenticated } = useAuth();
  const [location] = useLocation();
  const isMobile = useIsMobile();
  const [isLocationDrawerOpen, setIsLocationDrawerOpen] = useState(false);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(() => 
    typeof window !== 'undefined' ? localStorage.getItem('homeLocation') || '' : ''
  );

  // Temporarily disable notification and message count queries until APIs are implemented
  const unreadNotifications = 0;
  const unreadMessages = 0;

  const handleLocationChange = (location: string, coordinates?: { lat: number; lon: number }, boundingBox?: [number, number, number, number]) => {
    setCurrentLocation(location);
    
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

  return (
    <header className="absolute top-0 left-0 right-0 z-20 bg-card border-b border-border">
      <div className="px-4 py-3 flex items-center justify-between">
        <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m-6 3l6-3"></path>
          </svg>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mobile Navigation - Clean and Simple */}
          {isMobile ? (
            <div className="flex items-center space-x-3">
              {/* View Toggle - Main Navigation */}
              <div className="flex items-center bg-muted p-1 rounded-lg">
                <Link href="/map">
                  <Button
                    variant={location === "/map" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                    data-testid="button-map-view"
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Map
                  </Button>
                </Link>
                <Link href="/feed">
                  <Button
                    variant={location === "/feed" || location === "/" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                    data-testid="button-feed-view"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Feed
                  </Button>
                </Link>
              </div>

              {/* User Menu - Only for authenticated users */}
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2">
                  {/* Report Button */}
                  <Button
                    onClick={() => setReportFormOpen(true)}
                    size="sm"
                    className="h-8 w-8 p-0"
                    data-testid="button-report-mobile"
                  >
                    <Plus className="w-4 h-4" />
                  </Button>

                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Avatar className="w-8 h-8 cursor-pointer hover:opacity-80 transition-opacity">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                        <AvatarFallback className="text-xs">
                          {user.firstName ? user.firstName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsLocationDrawerOpen(true)}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Set Location
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center w-full">
                          <Settings className="w-4 h-4 mr-2" />
                          Profile Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} className="text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ) : (
            /* Desktop Navigation */
            <div className="flex items-center space-x-4">
              {/* Filter Button for Desktop Map Mode */}
              {showFilterButton && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onFilterToggle}
                  className="h-8"
                  data-testid="button-toggle-filter"
                >
                  <Filter className="w-4 h-4 mr-1" />
                  Filter
                </Button>
              )}
              
              {/* Desktop View Toggle */}
              <div className="flex items-center bg-muted p-1 rounded-lg">
                <Link href="/map">
                  <Button
                    variant={location === "/map" ? "default" : "ghost"}
                    size="sm"
                    className="h-8"
                    data-testid="button-map-view"
                  >
                    <Map className="w-4 h-4 mr-1" />
                    Map
                  </Button>
                </Link>
                <Link href="/feed">
                  <Button
                    variant={location === "/feed" || location === "/" ? "default" : "ghost"}
                    size="sm"
                    className="h-8"
                    data-testid="button-feed-view"
                  >
                    <List className="w-4 h-4 mr-1" />
                    Feed
                  </Button>
                </Link>
              </div>
              
              {/* Desktop User Menu */}
              {isAuthenticated && user && (
                <div className="flex items-center space-x-2">
                  {/* Notifications */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative h-8 w-8 p-0"
                    data-testid="button-notifications"
                  >
                    <Bell className="w-4 h-4" />
                  </Button>
                  
                  {/* Profile Dropdown */}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <div className="flex items-center space-x-2 p-1 hover:bg-muted rounded-lg transition-colors cursor-pointer" data-testid="link-user-profile">
                        <Avatar className="w-8 h-8">
                          <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                          <AvatarFallback className="text-xs">
                            {user.firstName ? user.firstName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground hidden lg:block">
                          {user.firstName || user.email}
                        </span>
                      </div>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setIsLocationDrawerOpen(true)}>
                        <MapPin className="w-4 h-4 mr-2" />
                        Set Location
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href="/profile" className="flex items-center w-full">
                          <Settings className="w-4 h-4 mr-2" />
                          Profile Settings
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => window.location.href = '/api/logout'} className="text-red-600">
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign Out
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
              
              {/* Menu Button */}
              <button 
                onClick={onMenuToggle}
                className="p-2 hover:bg-muted rounded-lg transition-colors"
                data-testid="button-menu-toggle"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Location Drawer for Mobile */}
      <Drawer open={isLocationDrawerOpen} onOpenChange={setIsLocationDrawerOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Set Your Location</DrawerTitle>
          </DrawerHeader>
          <div className="p-4 space-y-4">
            <LocationAutocomplete
              value=""
              onChange={handleLocationChange}
              placeholder="Search for your suburb or area..."
            />
            {currentLocation && (
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-2 flex-1">
                  <MapPin className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm">{currentLocation}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    localStorage.removeItem('homeLocation');
                    localStorage.removeItem('homeCoordinates');
                    localStorage.removeItem('homeBoundingBox');
                    localStorage.setItem('locationFilter', 'false');
                    setCurrentLocation('');
                    window.dispatchEvent(new CustomEvent('locationChanged', {
                      detail: { location: '', coordinates: null, boundingBox: null }
                    }));
                  }}
                  className="text-destructive hover:text-destructive"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Incident Report Form */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
      />
    </header>
  );
}
