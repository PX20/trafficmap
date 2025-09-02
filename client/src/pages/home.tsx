import { useState } from "react";
import { TrafficMap } from "@/components/map/traffic-map";
import { FilterSidebar } from "@/components/map/filter-sidebar";
import { AppHeader } from "@/components/map/app-header";
import { MapLegend } from "@/components/map/map-legend";
import { IncidentDetailModal } from "@/components/incident-detail-modal";
import { IncidentReportForm } from "@/components/incident-report-form";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";

export interface FilterState {
  crashes: boolean;
  hazards: boolean;
  restrictions: boolean;
  incidents: boolean;
  crime: boolean;
  suspicious: boolean;
  emergency: boolean;
  impactLevel: 'all' | 'high' | 'medium';
  timeRange: 'now' | '1h' | '6h' | '24h';
  autoRefresh: boolean;
}

export default function Home() {
  const isMobile = useIsMobile();
  const [sidebarOpen, setSidebarOpen] = useState(!isMobile);
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [filters, setFilters] = useState<FilterState>({
    crashes: true,
    hazards: true,
    restrictions: true,
    incidents: true,
    crime: true,
    suspicious: true,
    emergency: true,
    impactLevel: 'all',
    timeRange: 'now',
    autoRefresh: false,
  });

  const handleFilterChange = (key: keyof FilterState, value: boolean | string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="relative h-screen overflow-hidden bg-background">
      <AppHeader onMenuToggle={toggleSidebar} />
      
      <FilterSidebar 
        isOpen={sidebarOpen}
        filters={filters}
        onFilterChange={handleFilterChange}
        onClose={() => setSidebarOpen(false)}
      />
      
      <main className={`absolute top-16 right-0 bottom-0 transition-all duration-300 ${
        sidebarOpen && !isMobile ? 'left-80' : 'left-0'
      }`}>
        <TrafficMap 
          filters={filters}
          onEventSelect={setSelectedIncident}
        />
      </main>

      {!isMobile && <MapLegend sidebarOpen={sidebarOpen} />}

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
