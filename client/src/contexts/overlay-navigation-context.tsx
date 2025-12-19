import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

type OverlayPage = 'profile' | 'notifications' | 'saved' | 'reactions' | 'privacy' | 'help' | 'messages' | null;

interface OverlayNavigationContextType {
  activeOverlay: OverlayPage;
  openOverlay: (page: OverlayPage) => void;
  closeOverlay: () => void;
  isOverlayOpen: boolean;
}

const OverlayNavigationContext = createContext<OverlayNavigationContextType | null>(null);

const OVERLAY_ROUTES: Record<string, OverlayPage> = {
  '/profile': 'profile',
  '/notifications': 'notifications',
  '/saved': 'saved',
  '/reactions': 'reactions',
  '/privacy': 'privacy',
  '/help': 'help',
};

export function OverlayNavigationProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  const [activeOverlay, setActiveOverlay] = useState<OverlayPage>(null);
  
  useEffect(() => {
    const overlayPage = OVERLAY_ROUTES[location];
    if (overlayPage) {
      setActiveOverlay(overlayPage);
    } else if (location === '/' || location === '/feed' || location === '/map') {
      setActiveOverlay(null);
    }
  }, [location]);

  const openOverlay = useCallback((page: OverlayPage) => {
    setActiveOverlay(page);
    if (page) {
      const route = Object.entries(OVERLAY_ROUTES).find(([_, p]) => p === page)?.[0];
      if (route) {
        window.history.pushState({}, '', route);
      }
    }
  }, []);

  const closeOverlay = useCallback(() => {
    setActiveOverlay(null);
    setLocation('/feed');
  }, [setLocation]);

  const isOverlayOpen = activeOverlay !== null;

  return (
    <OverlayNavigationContext.Provider value={{ activeOverlay, openOverlay, closeOverlay, isOverlayOpen }}>
      {children}
    </OverlayNavigationContext.Provider>
  );
}

export function useOverlayNavigation() {
  const context = useContext(OverlayNavigationContext);
  if (!context) {
    throw new Error('useOverlayNavigation must be used within an OverlayNavigationProvider');
  }
  return context;
}
