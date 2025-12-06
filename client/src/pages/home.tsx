import { useState, useEffect } from "react";
import { TrafficMap } from "@/components/map/traffic-map";
import { SimpleFilterSidebar } from "@/components/map/simple-filter-sidebar";
import { IncidentReportForm } from "@/components/incident-report-form";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useQuery } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { navigateToIncident } from "@/lib/incident-utils";
import { useAuth } from "@/hooks/useAuth";
import { 
  Bell, 
  MessageCircle, 
  MapPin,
  Settings,
  Menu,
  User,
  LogOut,
  Map,
  List,
  ChevronRight,
  Shield,
  HelpCircle,
  Heart,
  Bookmark
} from "lucide-react";

export interface FilterState {
  // Simplified source-based filters
  showTrafficEvents: boolean;  // TMR traffic data
  showIncidents: boolean;      // ESQ emergency data (excluding QFES)
  showQFES: boolean;           // QFES fire & emergency data
  showUserReports: boolean;    // All user reports
  // Individual user report filters
  showUserSafetyCrime: boolean;
  showUserWildlife: boolean;
  showUserCommunity: boolean;
  showUserTraffic: boolean;
  showUserLostFound: boolean;
  showUserPets: boolean;
  // Status filtering
  showActiveIncidents: boolean;
  showResolvedIncidents: boolean;
  // Priority filtering
  showHighPriority: boolean;
  showMediumPriority: boolean;
  showLowPriority: boolean;
  // Auto-refresh settings
  autoRefresh: boolean;
  // Distance filtering
  distanceFilter: 'all' | '1km' | '2km' | '5km' | '10km' | '25km' | '50km';
  radius?: number; // Custom radius in kilometers for proximity filtering
  // Location filtering
  locationFilter: boolean;
  homeLocation?: string;
  homeCoordinates?: { lat: number; lon: number };
  homeBoundingBox?: [number, number, number, number];
  // Aging controls
  showExpiredIncidents: boolean;
  agingSensitivity: 'normal' | 'extended' | 'disabled';
  // Dynamic category filters - any string key for category IDs
  [key: string]: boolean | string | number | { lat: number; lon: number } | [number, number, number, number] | undefined;
}

export default function Home() {
  // Safety Monitor - Main Home Component
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(false); // Always start closed on mobile for better UX
  const [, setLocation] = useLocation();
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    showTrafficEvents: true,
    showIncidents: true,
    showQFES: true,
    showUserReports: true,
    showUserSafetyCrime: true,
    showUserWildlife: true,
    showUserCommunity: true,
    showUserTraffic: true,
    showUserLostFound: true,
    showUserPets: true,
    // Status filters
    showActiveIncidents: true,
    showResolvedIncidents: false, // Hide resolved by default
    // Priority filters
    showHighPriority: true,
    showMediumPriority: true,
    showLowPriority: true,
    // Auto-refresh and distance
    autoRefresh: true,
    distanceFilter: 'all',
    radius: 50, // Default 50km radius for proximity filtering
    locationFilter: true,
    // Aging controls - hide expired incidents by default for clean map display
    showExpiredIncidents: false, // Hide expired incidents after aging duration
    agingSensitivity: 'normal', // Use normal aging sensitivity
    // Dynamic category filters will be added automatically when users interact with them
  });
  
  // Fetch notification count for badge
  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    select: (data: any) => data?.count || 0,
  });

  // Fetch categories to initialize all category filters as checked by default
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    select: (data: any) => data || [],
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["/api/subcategories"],
    select: (data: any) => data || [],
  });

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        setLocation("/");
      }
    });
  };

  const menuItems = [
    { icon: User, label: "My Profile", href: "/profile" },
    { icon: MapPin, label: "My Location", href: "/location" },
    { icon: Bookmark, label: "Saved Posts", href: "/saved" },
    { icon: Heart, label: "My Reactions", href: "/reactions" },
    { icon: Settings, label: "Preferences", href: "/settings" },
    { icon: Shield, label: "Privacy", href: "/privacy" },
    { icon: HelpCircle, label: "Help & Support", href: "/help" },
  ];
  
  // Initialize all category and subcategory filters to true when loaded
  useEffect(() => {
    if (categories.length > 0) {
      const categoryFilters: Record<string, boolean> = {};
      categories.forEach((category: any) => {
        categoryFilters[category.id] = true;
      });
      setFilters(prev => ({ ...prev, ...categoryFilters }));
    }
  }, [categories]);

  useEffect(() => {
    if (subcategories.length > 0) {
      const subcategoryFilters: Record<string, boolean> = {};
      subcategories.forEach((subcategory: any) => {
        subcategoryFilters[subcategory.id] = true;
      });
      setFilters(prev => ({ ...prev, ...subcategoryFilters }));
    }
  }, [subcategories]);
  
  // Load location preferences from user profile on startup
  useEffect(() => {
    if (user?.preferredLocation && user?.preferredLocationLat && user?.preferredLocationLng) {
      setFilters(prev => ({
        ...prev,
        homeLocation: user.preferredLocation!,
        homeCoordinates: { lat: user.preferredLocationLat!, lon: user.preferredLocationLng! },
        homeBoundingBox: user.preferredLocationBounds as any,
        distanceFilter: user.distanceFilter || 'all',
        locationFilter: true
      }));
    }
  }, [user]);
  
  // Save location preferences to user profile when they change (including clearing)
  useEffect(() => {
    if (user) {
      // Save to API (debounced to avoid excessive calls)
      const timeoutId = setTimeout(async () => {
        try {
          await fetch('/api/user/location-preferences', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              preferredLocation: filters.homeLocation || null,
              preferredLocationLat: filters.homeCoordinates?.lat || null,
              preferredLocationLng: filters.homeCoordinates?.lon || null,
              preferredLocationBounds: filters.homeBoundingBox || null,
              distanceFilter: filters.distanceFilter || 'all'
            })
          });
        } catch (error) {
          console.error('Failed to save location preferences:', error);
        }
      }, 500); // Debounce 500ms
      
      return () => clearTimeout(timeoutId);
    }
  }, [filters.homeLocation, filters.homeCoordinates, filters.homeBoundingBox, filters.distanceFilter, user]);

  const handleFilterChange = (key: keyof FilterState, value: boolean | string | number | { lat: number; lon: number } | [number, number, number, number] | undefined) => {
    // DEBUG: Log radius changes to identify the bug
    if (key === 'radius') {
      console.log('🔧 RADIUS CHANGE DEBUG:', { key, value, currentRadius: filters.radius });
    }
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="relative h-dvh overflow-hidden bg-background">
      {/* Header - Same as Feed page */}
      <header className="sticky top-0 z-50 bg-card dark:bg-card border-b border-border shadow-sm shrink-0">
        <div className="max-w-full px-4">
          <div className="flex items-center justify-between h-14 gap-2">
            {/* Left: Hamburger Menu */}
            <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
              <SheetTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  data-testid="button-menu"
                >
                  <Menu className="w-5 h-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80 p-0">
                <SheetHeader className="p-4 border-b border-border">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-12 h-12">
                      {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user?.displayName?.charAt(0) || user?.firstName?.charAt(0) || "?"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <SheetTitle className="text-left truncate">
                        {user?.displayName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || "Guest"}
                      </SheetTitle>
                      <p className="text-sm text-muted-foreground truncate">
                        {user?.email || "Not logged in"}
                      </p>
                    </div>
                  </div>
                </SheetHeader>
                
                {/* Location Section */}
                <div className="p-4 border-b border-border">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Your Location</span>
                    </div>
                    <Link href="/profile" onClick={() => setMenuOpen(false)}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary"
                        data-testid="button-change-location-menu"
                      >
                        Change
                      </Button>
                    </Link>
                  </div>
                  <p className="mt-1 font-medium" data-testid="text-current-location">
                    {user?.preferredLocation || "Not set"}
                  </p>
                </div>

                {/* Menu Items */}
                <nav className="p-2">
                  {menuItems.map((item) => (
                    <Link 
                      key={item.href} 
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      data-testid={`link-menu-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                    >
                      <div className="flex items-center justify-between px-3 py-3 rounded-lg hover-elevate cursor-pointer">
                        <div className="flex items-center gap-3">
                          <item.icon className="w-5 h-5 text-muted-foreground" />
                          <span className="font-medium">{item.label}</span>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                    </Link>
                  ))}
                </nav>

                <Separator className="my-2" />

                {/* Logout */}
                {user && (
                  <div className="p-2">
                    <button
                      onClick={() => {
                        handleLogout();
                        setMenuOpen(false);
                      }}
                      className="flex items-center gap-3 w-full px-3 py-3 rounded-lg hover-elevate text-destructive"
                      data-testid="button-logout"
                    >
                      <LogOut className="w-5 h-5" />
                      <span className="font-medium">Log Out</span>
                    </button>
                  </div>
                )}

                {!user && (
                  <div className="p-4">
                    <Link href="/login" onClick={() => setMenuOpen(false)}>
                      <Button className="w-full" data-testid="button-login">
                        Log In
                      </Button>
                    </Link>
                  </div>
                )}
              </SheetContent>
            </Sheet>

            {/* Center: App Title */}
            <h1 className="text-xl font-bold text-primary flex-1 text-center">
              Neighbourhood
            </h1>

            {/* Right: Actions */}
            <div className="flex items-center gap-1">
              {/* Notification Bell */}
              <Link href="/notifications">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full relative"
                  data-testid="button-notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                  )}
                </Button>
              </Link>

              {/* Messages */}
              <Link href="/messages">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="rounded-full"
                  data-testid="button-messages"
                >
                  <MessageCircle className="w-5 h-5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Feed/Map Toggle */}
      <div className="sticky top-14 z-40 bg-card dark:bg-card border-b border-border">
        <div className="max-w-full px-4">
          <div className="flex items-center justify-center gap-1 py-2">
            <Button
              variant="ghost"
              size="sm"
              className="flex-1 max-w-32 gap-2"
              onClick={() => setLocation('/feed')}
              data-testid="button-view-feed"
            >
              <List className="w-4 h-4" />
              Feed
            </Button>
            <Button
              variant="default"
              size="sm"
              className="flex-1 max-w-32 gap-2"
              data-testid="button-view-map"
            >
              <Map className="w-4 h-4" />
              Map
            </Button>
          </div>
        </div>
      </div>
      
      <SimpleFilterSidebar
        isOpen={sidebarOpen}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className={`absolute top-[6.5rem] right-0 bottom-0 left-0 transition-all duration-300 ${
        sidebarOpen && !isMobile ? 'left-80' : 'left-0'
      }`}>
        <TrafficMap 
          filters={filters}
          onEventSelect={(incident) => navigateToIncident(incident, setLocation)}
        />
      </main>


      {/* Community Report Button */}
      {isMobile ? (
        <button
          onClick={() => setReportFormOpen(true)}
          className="fixed bottom-6 left-6 w-14 h-14 bg-blue-500 text-white rounded-full shadow-lg z-30 flex items-center justify-center hover:bg-blue-600 transition-colors"
          data-testid="button-community-report"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </button>
      ) : (
        <Button
          onClick={() => setReportFormOpen(true)}
          className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-30 shadow-lg"
          data-testid="button-community-report"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          Share Community Update
        </Button>
      )}

      {/* Mobile FAB for filters */}
      {isMobile && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg z-30 flex items-center justify-center hover:bg-primary/90 transition-colors"
          data-testid="button-mobile-menu-toggle"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"></path>
          </svg>
        </button>
      )}

      {/* Modal functionality moved to unified /incident/:id route */}
      
      
      <IncidentReportForm 
        isOpen={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
      />

    </div>
  );
}
