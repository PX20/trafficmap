import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/mobile-nav";
import { PostCard } from "@/components/post-card";
import { IncidentReportForm, type EntryPoint } from "@/components/incident-report-form";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Bell, 
  MessageCircle, 
  Search, 
  MapPin,
  Settings,
  RefreshCw,
  PenSquare,
  Camera,
  MapPinned,
  Menu,
  User,
  LogOut,
  Map,
  List,
  ChevronRight,
  Shield,
  HelpCircle,
  Heart,
  Bookmark,
  ChevronDown
} from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { calculateDistance, type Coordinates } from "@/lib/location-utils";

type DistanceFilter = '1km' | '2km' | '5km' | '10km' | '25km' | '50km';

export default function Feed() {
  const { user, logoutMutation } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [reportEntryPoint, setReportEntryPoint] = useState<EntryPoint>("post");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<'feed' | 'map'>('feed');
  const [menuOpen, setMenuOpen] = useState(false);
  const [distanceFilter, setDistanceFilter] = useState<DistanceFilter>('10km');

  const userLocation = useMemo((): Coordinates | null => {
    if (user?.preferredLocationLat && user?.preferredLocationLng) {
      return {
        lat: user.preferredLocationLat,
        lon: user.preferredLocationLng
      };
    }
    return null;
  }, [user?.preferredLocationLat, user?.preferredLocationLng]);

  const hasLocation = !!userLocation && !!user?.preferredLocation;

  useEffect(() => {
    const validFilters = ['1km', '2km', '5km', '10km', '25km', '50km'];
    if (user?.distanceFilter && validFilters.includes(user.distanceFilter)) {
      setDistanceFilter(user.distanceFilter as DistanceFilter);
    } else if (user && !user.distanceFilter) {
      setDistanceFilter('10km');
    }
  }, [user?.id, user?.distanceFilter]);

  const openReportForm = (entryPoint: EntryPoint) => {
    setReportEntryPoint(entryPoint);
    setReportFormOpen(true);
  };

  const { data: postsData, isLoading, refetch } = useQuery({
    queryKey: ["/api/posts"],
    refetchInterval: 60000,
  });

  const { data: unreadCount = 0 } = useQuery<number>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    select: (data: any) => data?.count || 0,
  });

  const allPosts = (postsData as any)?.features
    ?.sort((a: any, b: any) => {
      const dateA = new Date(a.properties?.createdAt || 0);
      const dateB = new Date(b.properties?.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    }) || [];

  const posts = useMemo(() => {
    if (!userLocation) {
      return allPosts;
    }

    const maxDistance = parseInt(distanceFilter.replace('km', ''));
    
    return allPosts.filter((post: any) => {
      const geometry = post.geometry;
      if (!geometry?.coordinates) return false;
      
      let lng: number | undefined;
      let lat: number | undefined;
      
      if (geometry.type === 'Point') {
        [lng, lat] = geometry.coordinates;
      } else if (geometry.type === 'MultiPoint' && geometry.coordinates[0]) {
        [lng, lat] = geometry.coordinates[0];
      } else if (geometry.type === 'LineString' && geometry.coordinates[0]) {
        [lng, lat] = geometry.coordinates[0];
      } else if (geometry.type === 'MultiLineString' && geometry.coordinates[0]?.[0]) {
        [lng, lat] = geometry.coordinates[0][0];
      } else if (geometry.type === 'GeometryCollection' && geometry.geometries?.[0]) {
        const pointGeom = geometry.geometries.find((g: any) => g.type === 'Point');
        if (pointGeom?.coordinates) {
          [lng, lat] = pointGeom.coordinates;
        }
      }
      
      if (typeof lng !== 'number' || typeof lat !== 'number') return false;
      
      const postLocation: Coordinates = { lat, lon: lng };
      const distance = calculateDistance(userLocation, postLocation);
      return distance <= maxDistance;
    });
  }, [allPosts, distanceFilter, userLocation]);

  const handleDistanceChange = async (newDistance: DistanceFilter) => {
    setDistanceFilter(newDistance);
    
    if (user) {
      try {
        const response = await fetch('/api/user/location-preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({
            distanceFilter: newDistance
          })
        });
        
        if (response.ok) {
          queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
        }
      } catch (error) {
        console.error('Failed to save distance preference:', error);
      }
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCommentClick = (postId: string) => {
    setLocation(`/incident/${postId}`);
  };

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

  return (
    <div className={`bg-background dark:bg-background ${isMobile ? 'mobile-app-container' : 'min-h-screen'}`}>
      {/* Header */}
      <header className={`${isMobile ? '' : 'sticky top-0'} z-50 bg-card dark:bg-card border-b border-border shadow-sm shrink-0`}>
        <div className="max-w-2xl mx-auto px-4">
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
      {/* Scrollable content area for mobile */}
      <div className={isMobile ? 'mobile-app-content' : ''}>
        <div className={`${isMobile ? '' : 'sticky top-14'} z-40 bg-card dark:bg-card border-b border-border`}>
          <div className="max-w-2xl mx-auto px-4">
            <div className="flex items-center justify-center gap-1 py-2">
              <Button
                variant={viewMode === 'feed' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 max-w-32 gap-2"
                onClick={() => setViewMode('feed')}
                data-testid="button-view-feed"
              >
                <List className="w-4 h-4" />
                Feed
              </Button>
              <Button
                variant={viewMode === 'map' ? 'default' : 'ghost'}
                size="sm"
                className="flex-1 max-w-32 gap-2"
                onClick={() => {
                  setViewMode('map');
                  setLocation('/map');
                }}
                data-testid="button-view-map"
              >
                <Map className="w-4 h-4" />
                Map
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="max-w-2xl mx-auto pb-20">

        {/* Create Post Card */}
        <Card className="mx-0 sm:mx-4 mt-2 rounded-none sm:rounded-lg border-0 shadow-sm">
          <div className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
                <AvatarFallback className="bg-primary/10 text-primary">
                  {user?.displayName?.charAt(0) || user?.firstName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => openReportForm("post")}
                className="flex-1 bg-muted hover:bg-muted/80 rounded-full px-4 py-2.5 text-left text-muted-foreground transition-colors"
                data-testid="button-create-post"
              >
                What's happening in your area?
              </button>
            </div>
            <div className="flex items-center justify-around mt-3 pt-3 border-t border-border">
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => openReportForm("photo")}
                data-testid="button-add-photo"
              >
                <Camera className="w-5 h-5 text-green-500" />
                <span className="text-sm">Photo</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => openReportForm("location")}
                data-testid="button-add-location"
              >
                <MapPinned className="w-5 h-5 text-red-500" />
                <span className="text-sm">Location</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2"
                onClick={() => openReportForm("post")}
                data-testid="button-write-post"
              >
                <PenSquare className="w-5 h-5 text-primary" />
                <span className="text-sm">Post</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Location Filter */}
        <div className="px-4 py-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="sm" 
                className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground h-auto py-2 whitespace-normal text-left"
                data-testid="button-location-filter"
              >
                <MapPin className={`w-4 h-4 flex-shrink-0 self-start mt-0.5 ${hasLocation ? 'text-blue-500' : 'text-muted-foreground'}`} />
                {hasLocation ? (
                  <span className="text-sm text-left flex-1 break-words">
                    Within {distanceFilter}
                    {user?.preferredLocation && (
                      <span className="text-muted-foreground"> of {user.preferredLocation}</span>
                    )}
                  </span>
                ) : (
                  <span className="text-sm">Set Location</span>
                )}
                <ChevronDown className="w-3 h-3 flex-shrink-0 self-start mt-1" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {hasLocation ? (
                <>
                  <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                    Show posts
                  </div>
                  <DropdownMenuRadioGroup 
                    value={distanceFilter} 
                    onValueChange={(value) => handleDistanceChange(value as DistanceFilter)}
                  >
                    <DropdownMenuRadioItem value="1km" data-testid="radio-distance-1km">
                      Within 1km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="2km" data-testid="radio-distance-2km">
                      Within 2km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="5km" data-testid="radio-distance-5km">
                      Within 5km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="10km" data-testid="radio-distance-10km">
                      Within 10km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="25km" data-testid="radio-distance-25km">
                      Within 25km
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem value="50km" data-testid="radio-distance-50km">
                      Within 50km
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                  <DropdownMenuSeparator />
                  <Link href="/profile" className="block">
                    <div className="px-2 py-1.5 text-sm text-primary hover:bg-accent rounded-sm cursor-pointer">
                      Change location
                    </div>
                  </Link>
                </>
              ) : (
                <div className="p-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    Set your location to filter posts by distance
                  </p>
                  <Link href="/profile">
                    <Button size="sm" className="w-full" data-testid="button-set-location">
                      Set Location
                    </Button>
                  </Link>
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          
          {posts.length !== allPosts.length && (
            <Badge variant="secondary" className="text-xs">
              {posts.length} of {allPosts.length}
            </Badge>
          )}
        </div>

        {/* Refresh Button */}
        <div className="px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleRefresh}
            disabled={isRefreshing}
            data-testid="button-refresh-feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Feed"}
          </Button>
        </div>

        {/* Posts Feed */}
        <div className="mt-2 space-y-2">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="mx-0 sm:mx-4 p-4 border-0 rounded-none sm:rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </Card>
            ))
          ) : posts.length === 0 ? (
            <Card className="mx-4 p-8 text-center border-0 rounded-lg">
              <div className="text-muted-foreground mb-4">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold mb-2">
                No posts yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Be the first to share what's happening in your neighborhood!
              </p>
              <Button onClick={() => openReportForm("post")} data-testid="button-first-post">
                Create a Post
              </Button>
            </Card>
          ) : (
            posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                onCommentClick={() => handleCommentClick(post.id)}
              />
            ))
          )}
        </div>
      </main>
      </div>

      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}

      {/* Report Form Modal */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => {
          setReportFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/posts"] });
        }}
        entryPoint={reportEntryPoint}
        initialLocation={user?.preferredLocation || undefined}
      />
    </div>
  );
}
