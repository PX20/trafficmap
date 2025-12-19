import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from "react";
import { useLocation } from "wouter";

type ViewMode = 'feed' | 'map';

interface ViewModeContextType {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  navigateToView: (mode: ViewMode) => void;
}

const ViewModeContext = createContext<ViewModeContextType | null>(null);

export function ViewModeProvider({ children }: { children: ReactNode }) {
  const [location, setLocation] = useLocation();
  
  // Check if we're on a feed/map page where view mode applies
  const isOnFeedMapPage = location === '/' || location === '/feed' || location === '/map';
  
  // Derive view mode from current location - this is the source of truth
  // When on /map route, show map. Otherwise show feed.
  const derivedMode: ViewMode = location === '/map' ? 'map' : 'feed';
  
  // Local state for when user toggles view without changing URL (instant switching)
  const [overrideMode, setOverrideMode] = useState<ViewMode | null>(null);
  
  // Track previous location to detect navigation changes
  const [prevLocation, setPrevLocation] = useState(location);
  
  // Only reset override when navigating AWAY from feed/map pages
  // This preserves the override when switching between views or arriving from other pages
  useEffect(() => {
    if (location !== prevLocation) {
      setPrevLocation(location);
      
      // Only reset if we're leaving the feed/map context entirely
      // (e.g., going to /profile, /notifications, etc.)
      const wasOnFeedMapPage = prevLocation === '/' || prevLocation === '/feed' || prevLocation === '/map';
      if (wasOnFeedMapPage && !isOnFeedMapPage) {
        setOverrideMode(null);
      }
    }
  }, [location, prevLocation, isOnFeedMapPage]);
  
  // Use override if set, otherwise use derived mode from URL
  const viewMode = overrideMode !== null ? overrideMode : derivedMode;

  const setViewMode = useCallback((mode: ViewMode) => {
    // Set override mode for instant switching without URL change
    setOverrideMode(mode);
  }, []);

  const navigateToView = useCallback((mode: ViewMode) => {
    setOverrideMode(mode);
    // Update URL without causing remount - navigate to feed page with the view mode
    setLocation('/feed');
  }, [setLocation]);

  return (
    <ViewModeContext.Provider value={{ viewMode, setViewMode, navigateToView }}>
      {children}
    </ViewModeContext.Provider>
  );
}

export function useViewMode() {
  const context = useContext(ViewModeContext);
  if (!context) {
    throw new Error('useViewMode must be used within a ViewModeProvider');
  }
  return context;
}
