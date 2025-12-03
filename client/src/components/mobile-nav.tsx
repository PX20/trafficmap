import { Link, useLocation } from "wouter";
import { Home, Map, PlusCircle, MessageCircle, User, Bell } from "lucide-react";
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
    { href: "/feed", icon: Home, label: "Home", badge: 0, isCreate: false },
    { href: "/map", icon: Map, label: "Map", badge: 0, isCreate: false },
    { href: "/create", icon: PlusCircle, label: "Post", isCreate: true, badge: 0 },
    { href: "/notifications", icon: Bell, label: "Alerts", badge: unreadCount, isCreate: false },
    { href: "/profile", icon: User, label: "Profile", badge: 0, isCreate: false },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => {
          const isActive = location === item.href || 
            (item.href === "/feed" && location === "/");
          const Icon = item.icon;
          
          return (
            <Link key={item.href} href={item.href}>
              <button
                className={cn(
                  "flex flex-col items-center justify-center w-16 h-full relative transition-colors",
                  item.isCreate 
                    ? "text-white" 
                    : isActive 
                      ? "text-blue-600" 
                      : "text-gray-500 hover:text-gray-700"
                )}
              >
                {item.isCreate ? (
                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center shadow-lg -mt-4">
                    <Icon className="w-6 h-6" />
                  </div>
                ) : (
                  <>
                    <div className="relative">
                      <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                      {item.badge && item.badge > 0 && (
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
                  </>
                )}
              </button>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
