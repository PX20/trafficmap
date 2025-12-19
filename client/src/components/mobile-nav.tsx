import { Link, useLocation } from "wouter";
import { Home, Map, PlusCircle, User, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { useViewMode } from "@/contexts/view-mode-context";

export function MobileNav() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { viewMode, setViewMode } = useViewMode();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  
  const unreadCount = unreadData?.count || 0;

  const currentPath = location === "/" ? "/feed" : location;
  
  // Check if we're on a feed/map page (where view mode applies)
  const isOnFeedPage = location === "/" || location === "/feed" || location === "/map";
  
  const handleNavClick = (target: string) => {
    if (target === "/feed") {
      if (isOnFeedPage) {
        // Just toggle view mode without navigation - instant!
        setViewMode('feed');
      } else {
        // Navigate to feed page and set view mode
        setViewMode('feed');
        setLocation('/feed');
      }
    } else if (target === "/map") {
      if (isOnFeedPage) {
        // Just toggle view mode without navigation - instant!
        setViewMode('map');
      } else {
        // Navigate to feed page and set view mode
        setViewMode('map');
        setLocation('/feed');
      }
    }
  };

  // Determine active state based on view mode when on feed page
  const isHomeActive = isOnFeedPage && viewMode === 'feed';
  const isMapActive = isOnFeedPage && viewMode === 'map';

  return (
    <nav className="mobile-bottom-nav bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {/* Home/Feed Button - Uses context for instant switching */}
        <button
          onClick={() => handleNavClick('/feed')}
          data-testid="nav-home"
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
            isHomeActive 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          <div className="relative">
            <Home className={cn("w-6 h-6", isHomeActive && "stroke-[2.5px]")} />
          </div>
          <span className={cn(
            "text-[10px] mt-1 font-medium",
            isHomeActive && "font-semibold"
          )}>
            Home
          </span>
        </button>

        {/* Map Button - Uses context for instant switching */}
        <button
          onClick={() => handleNavClick('/map')}
          data-testid="nav-map"
          className={cn(
            "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
            isMapActive 
              ? "text-blue-600 dark:text-blue-400" 
              : "text-gray-500 dark:text-gray-400"
          )}
        >
          <div className="relative">
            <Map className={cn("w-6 h-6", isMapActive && "stroke-[2.5px]")} />
          </div>
          <span className={cn(
            "text-[10px] mt-1 font-medium",
            isMapActive && "font-semibold"
          )}>
            Map
          </span>
        </button>

        {/* Create Post Button - Standard navigation */}
        <Link href={`/create?from=${encodeURIComponent(currentPath)}`}>
          <button
            data-testid="nav-post"
            className="flex flex-col items-center justify-center w-16 h-full relative transition-colors text-gray-500 dark:text-gray-400"
          >
            <div className="relative">
              <PlusCircle className="w-6 h-6" />
            </div>
            <span className="text-[10px] mt-1 font-medium">Post</span>
          </button>
        </Link>

        {/* Notifications Button - Standard navigation */}
        <Link href="/notifications">
          <button
            data-testid="nav-alerts"
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
              location === "/notifications"
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <div className="relative">
              <Bell className={cn("w-6 h-6", location === "/notifications" && "stroke-[2.5px]")} />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              )}
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-medium",
              location === "/notifications" && "font-semibold"
            )}>
              Alerts
            </span>
          </button>
        </Link>

        {/* Profile Button - Standard navigation */}
        <Link href="/profile">
          <button
            data-testid="nav-profile"
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
              location === "/profile"
                ? "text-blue-600 dark:text-blue-400" 
                : "text-gray-500 dark:text-gray-400"
            )}
          >
            <div className="relative">
              <User className={cn("w-6 h-6", location === "/profile" && "stroke-[2.5px]")} />
            </div>
            <span className={cn(
              "text-[10px] mt-1 font-medium",
              location === "/profile" && "font-semibold"
            )}>
              Profile
            </span>
          </button>
        </Link>
      </div>
    </nav>
  );
}
