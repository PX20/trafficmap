import { Link, useLocation } from "wouter";
import { Home, Map, PlusCircle, User, Bell } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

export function MobileNav() {
  const [location] = useLocation();
  const { user } = useAuth();

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  
  const unreadCount = unreadData?.count || 0;

  const navItems = [
    { href: "/feed", icon: Home, label: "Home", badge: 0 },
    { href: "/map", icon: Map, label: "Map", badge: 0 },
    { href: "/create", icon: PlusCircle, label: "Post", badge: 0 },
    { href: "/notifications", icon: Bell, label: "Alerts", badge: unreadCount },
    { href: "/profile", icon: User, label: "Profile", badge: 0 },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href === "/feed" && location === "/");
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                data-testid={`nav-${item.label.toLowerCase()}`}
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
                  isActive 
                    ? "text-blue-600 dark:text-blue-400" 
                    : "text-gray-500 dark:text-gray-400"
                )}
              >
                <div className="relative">
                  <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center px-1">
                      {item.badge > 99 ? "99+" : item.badge}
                    </span>
                  )}
                </div>
                <span className={cn(
                  "text-[10px] mt-1 font-medium",
                  isActive && "font-semibold"
                )}>
                  {item.label}
                </span>
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
