import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Link, useLocation } from "wouter";
import { Map, List, Bell, MessageCircle, Filter, Plus, MapPin, Menu, LogOut, Settings, Megaphone, BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
            <circle cx="12" cy="12" r="10" strokeWidth="2"/>
            <circle cx="12" cy="12" r="6" strokeWidth="1.5"/>
            <circle cx="12" cy="12" r="2" fill="currentColor"/>
            <path strokeLinecap="round" strokeWidth="2" d="M12 2v4M12 18v4M2 12h4M18 12h4"/>
          </svg>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* Mobile Navigation - Clean and Simple */}
          {isMobile ? (
            <div className="flex items-center space-x-3">
              {/* View Toggle - Main Navigation */}
              <div className="flex items-center bg-muted p-1 rounded-lg gap-0.5">
                <Link href="/map">
                  <Button
                    variant={location === "/map" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                    data-testid="button-map-view"
                  >
                    <Map className="w-4 h-4 mr-1.5" />
                    🗺️ TEST MAP
                  </Button>
                </Link>
                <Link href="/feed">
                  <Button
                    variant={location === "/feed" || location === "/" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs"
                    data-testid="button-feed-view"
                  >
                    <List className="w-4 h-4 mr-1.5" />
                    Feed
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button
                    variant={location === "/messages" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 text-xs relative"
                    data-testid="button-messages-view"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Messages
                    {unreadMessages > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>
                {user?.accountType === 'business' && (
                  <>
                    <Link href="/business-dashboard">
                      <Button
                        variant={location === "/business-dashboard" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 text-xs"
                        data-testid="button-dashboard-view"
                      >
                        <BarChart3 className="w-4 h-4 mr-1.5" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/advertise">
                      <Button
                        variant={location === "/advertise" || location === "/create-ad" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3 text-xs"
                        data-testid="button-advertise-view"
                      >
                        <Megaphone className="w-4 h-4 mr-1.5" />
                        Advertise
                      </Button>
                    </Link>
                  </>
                )}
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
                          {user.accountType === 'business' && user.businessName 
                            ? user.businessName[0].toUpperCase() 
                            : user.firstName 
                              ? user.firstName[0].toUpperCase() 
                              : user.email 
                                ? user.email[0].toUpperCase() 
                                : 'U'}
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
              <div className="flex items-center bg-muted p-1 rounded-lg gap-0.5">
                <Link href="/map">
                  <Button
                    variant={location === "/map" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    data-testid="button-map-view"
                  >
                    <Map className="w-4 h-4 mr-1.5" />
                    🗺️ TEST MAP
                  </Button>
                </Link>
                <Link href="/feed">
                  <Button
                    variant={location === "/feed" || location === "/" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3"
                    data-testid="button-feed-view"
                  >
                    <List className="w-4 h-4 mr-1.5" />
                    Feed
                  </Button>
                </Link>
                <Link href="/messages">
                  <Button
                    variant={location === "/messages" ? "default" : "ghost"}
                    size="sm"
                    className="h-8 px-3 relative"
                    data-testid="button-messages-view"
                  >
                    <MessageCircle className="w-4 h-4 mr-1.5" />
                    Messages
                    {unreadMessages > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-4 w-4 p-0 text-xs flex items-center justify-center"
                      >
                        {unreadMessages}
                      </Badge>
                    )}
                  </Button>
                </Link>
                {user?.accountType === 'business' && (
                  <>
                    <Link href="/business-dashboard">
                      <Button
                        variant={location === "/business-dashboard" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3"
                        data-testid="button-dashboard-view-desktop"
                      >
                        <BarChart3 className="w-4 h-4 mr-1.5" />
                        Dashboard
                      </Button>
                    </Link>
                    <Link href="/advertise">
                      <Button
                        variant={location === "/advertise" || location === "/create-ad" ? "default" : "ghost"}
                        size="sm"
                        className="h-8 px-3"
                        data-testid="button-advertise-view"
                      >
                        <Megaphone className="w-4 h-4 mr-1.5" />
                        Advertise
                      </Button>
                    </Link>
                  </>
                )}
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
                            {user.accountType === 'business' && user.businessName 
                              ? user.businessName[0].toUpperCase() 
                              : user.firstName 
                                ? user.firstName[0].toUpperCase() 
                                : user.email 
                                  ? user.email[0].toUpperCase() 
                                  : 'U'}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm text-foreground hidden lg:block">
                          {user.accountType === 'business' && user.businessName 
                            ? user.businessName 
                            : user.firstName || user.email}
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

      {/* Location Dialog */}
      <Dialog open={isLocationDrawerOpen} onOpenChange={setIsLocationDrawerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-primary" />
              Set Your Location
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Search for your area
              </label>
              <LocationAutocomplete
                value=""
                onChange={handleLocationChange}
                placeholder="Enter suburb, postcode, or area..."
              />
              <p className="text-xs text-muted-foreground">
                This helps filter safety alerts and incidents to your local area
              </p>
            </div>
            
            {currentLocation && (
              <div className="space-y-3">
                <label className="text-sm font-medium text-foreground">
                  Current Location
                </label>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{currentLocation}</p>
                      <p className="text-xs text-muted-foreground">Regional filtering enabled</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
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
                      setIsLocationDrawerOpen(false);
                    }}
                    className="text-destructive hover:text-destructive"
                  >
                    Clear
                  </Button>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Incident Report Form */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
      />
    </header>
  );
}
