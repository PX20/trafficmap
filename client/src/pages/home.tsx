import { useState, useEffect } from "react";
import { TrafficMap } from "@/components/map/traffic-map";
import { SimpleFilterSidebar } from "@/components/map/simple-filter-sidebar";
import { AppHeader } from "@/components/map/app-header";
import { IncidentDetailModal } from "@/components/incident-detail-modal";
import { IncidentReportForm } from "@/components/incident-report-form";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";

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
  timeRange: 'now' | '1h' | '6h' | '24h';
  // Location filtering
  locationFilter: boolean;
  homeLocation?: string;
  homeCoordinates?: { lat: number; lon: number };
  homeBoundingBox?: [number, number, number, number];
  // Dynamic category filters - any string key for category IDs
  [key: string]: boolean | string | { lat: number; lon: number } | [number, number, number, number] | undefined;
}

export default function Home() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    showTrafficEvents: true,
    showIncidents: true,
    showQFES: true,
    showUserReports: true,
    showUserSafetyCrime: true,
    showUserWildlife: true,
    showUserCommunity: true,
    showUserTraffic: true,
    timeRange: 'now',
    locationFilter: true,
    // Dynamic category filters will be added automatically when users interact with them
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
  
  // Load saved location from localStorage on startup
  useEffect(() => {
    const savedLocation = localStorage.getItem('homeLocation');
    const savedCoordinates = localStorage.getItem('homeCoordinates'); 
    const savedBoundingBox = localStorage.getItem('homeBoundingBox');
    const locationFilterSetting = localStorage.getItem('locationFilter');
    
    if (savedLocation && savedCoordinates) {
      try {
        const coordinates = JSON.parse(savedCoordinates);
        const boundingBox = savedBoundingBox ? JSON.parse(savedBoundingBox) : undefined;
        setFilters(prev => ({
          ...prev,
          homeLocation: savedLocation,
          homeCoordinates: coordinates,
          homeBoundingBox: boundingBox,
          // Auto-enable location filtering when home location exists (default to true)
          locationFilter: locationFilterSetting ? locationFilterSetting === 'true' : true
        }));
      } catch (error) {
        console.error('Failed to load saved location:', error);
      }
    }
  }, []);
  
  // Listen for location changes from other pages (custom events + storage events)
  useEffect(() => {
    const handleLocationChange = (event: CustomEvent) => {
      const { location, coordinates, boundingBox } = event.detail;
      setFilters(prev => ({
        ...prev,
        homeLocation: location,
        homeCoordinates: coordinates,
        homeBoundingBox: boundingBox,
        locationFilter: true
      }));
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'homeLocation') {
        const savedLocation = localStorage.getItem('homeLocation');
        const savedCoordinates = localStorage.getItem('homeCoordinates');
        const savedBoundingBox = localStorage.getItem('homeBoundingBox');
        const locationFilterSetting = localStorage.getItem('locationFilter');
        
        if (savedLocation && savedCoordinates) {
          try {
            const coordinates = JSON.parse(savedCoordinates);
            const boundingBox = savedBoundingBox ? JSON.parse(savedBoundingBox) : undefined;
            setFilters(prev => ({
              ...prev,
              homeLocation: savedLocation,
              homeCoordinates: coordinates,
              homeBoundingBox: boundingBox,
              // Auto-enable location filtering when home location exists (default to true)
              locationFilter: locationFilterSetting ? locationFilterSetting === 'true' : true
            }));
          } catch (error) {
            console.error('Failed to sync location from feed:', error);
          }
        } else {
          // Location was cleared
          setFilters(prev => ({
            ...prev,
            homeLocation: '',
            homeCoordinates: undefined,
            homeBoundingBox: undefined,
            locationFilter: false
          }));
        }
      }
    };
    
    window.addEventListener('locationChanged', handleLocationChange as EventListener);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);
  
  // Save location to localStorage when it changes and dispatch custom event
  useEffect(() => {
    if (filters.homeLocation && filters.homeCoordinates) {
      localStorage.setItem('homeLocation', filters.homeLocation);
      localStorage.setItem('homeCoordinates', JSON.stringify(filters.homeCoordinates));
      localStorage.setItem('locationFilter', String(filters.locationFilter));
      if (filters.homeBoundingBox) {
        localStorage.setItem('homeBoundingBox', JSON.stringify(filters.homeBoundingBox));
      }
      
      // Dispatch custom event to notify other pages of location change
      window.dispatchEvent(new CustomEvent('locationChanged', {
        detail: {
          location: filters.homeLocation,
          coordinates: filters.homeCoordinates,
          boundingBox: filters.homeBoundingBox
        }
      }));
    }
  }, [filters.homeLocation, filters.homeCoordinates, filters.homeBoundingBox, filters.locationFilter]);

  const handleFilterChange = (key: keyof FilterState, value: boolean | string | { lat: number; lon: number } | [number, number, number, number] | undefined) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <AppHeader onMenuToggle={toggleSidebar} />
      
      <SimpleFilterSidebar
        isOpen={sidebarOpen}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className={`absolute top-16 right-0 bottom-0 left-0 transition-all duration-300 ${
        sidebarOpen && !isMobile ? 'left-80' : 'left-0'
      } ${isMobile ? 'h-[calc(100vh-4rem)]' : ''}`}>
        <TrafficMap 
          filters={filters}
          onEventSelect={setSelectedIncident}
        />
      </main>


      {/* Report Incident Button */}
      <Button
        onClick={() => setReportFormOpen(true)}
        className="fixed bottom-6 left-6 z-30 shadow-lg"
        size="lg"
        data-testid="button-report-incident"
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z"></path>
        </svg>
        Report Safety Issue
      </Button>

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

      <IncidentDetailModal 
        incident={selectedIncident}
        isOpen={!!selectedIncident}
        onClose={() => setSelectedIncident(null)}
      />
      
      
      <IncidentReportForm 
        isOpen={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
      />
    </div>
  );
}
