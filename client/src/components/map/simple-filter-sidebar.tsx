import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronRight, Car, Shield, Users, MapPin, Flame } from "lucide-react";
import type { FilterState } from "@/pages/home";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { getTrafficEvents } from "@/lib/traffic-api";

interface SimpleFilterSidebarProps {
  isOpen: boolean;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: boolean | string | { lat: number; lon: number } | [number, number, number, number] | undefined) => void;
  onClose: () => void;
}

export function SimpleFilterSidebar({ isOpen, filters, onFilterChange, onClose }: SimpleFilterSidebarProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState({
    'Agency Data': false,
    'User Reports': false,
  });
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };
  
  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["/api/traffic/events", filters.homeLocation],
    queryFn: async () => {
      // Extract just the suburb name from location like "Caloundra 4551" -> "Caloundra"  
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      const url = suburb 
        ? `/api/traffic/events?suburb=${encodeURIComponent(suburb)}`
        : '/api/traffic/events';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch traffic events');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
  });

  const { data: incidents, refetch: refetchIncidents } = useQuery({
    queryKey: ["/api/incidents", filters.homeLocation],
    queryFn: async () => {
      // Extract just the suburb name from location like "Caloundra 4551" -> "Caloundra"  
      const suburb = filters.homeLocation?.split(' ')[0] || '';
      const url = suburb 
        ? `/api/incidents?suburb=${encodeURIComponent(suburb)}`
        : '/api/incidents';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch incidents');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
  });
  
  // Helper function to identify QFES incidents
  const isQFESIncident = (incident: any) => {
    const incidentType = incident.properties?.incidentType?.toLowerCase() || '';
    const groupedType = incident.properties?.GroupedType?.toLowerCase() || '';
    const description = incident.properties?.description?.toLowerCase() || '';
    
    // QFES handles fire, smoke, chemical/hazmat incidents
    return incidentType.includes('fire') || 
           incidentType.includes('smoke') || 
           incidentType.includes('chemical') || 
           incidentType.includes('hazmat') ||
           groupedType.includes('fire') || 
           groupedType.includes('smoke') || 
           groupedType.includes('chemical') || 
           groupedType.includes('hazmat') ||
           description.includes('fire') || 
           description.includes('smoke');
  };

  // Simple source-based counting
  const allIncidents = Array.isArray(incidents) ? incidents : [];
  const nonUserIncidents = allIncidents.filter((i: any) => !i.properties?.userReported);
  const qfesIncidents = nonUserIncidents.filter(isQFESIncident);
  const esqIncidents = nonUserIncidents.filter(incident => !isQFESIncident(incident));
  
  const counts = {
    tmr: Array.isArray(events) ? events.length : 0,
    esq: esqIncidents.length,
    qfes: qfesIncidents.length,
    userSafetyCrime: allIncidents.filter((i: any) => 
      i.properties?.userReported && i.properties?.incidentType === 'crime'
    ).length,
    userWildlife: allIncidents.filter((i: any) => 
      i.properties?.userReported && i.properties?.incidentType === 'wildlife'
    ).length,
    userCommunity: allIncidents.filter((i: any) => 
      i.properties?.userReported && !['crime', 'wildlife', 'traffic'].includes(i.properties?.incidentType)
    ).length,
    userTraffic: allIncidents.filter((i: any) => 
      i.properties?.userReported && i.properties?.incidentType === 'traffic'
    ).length,
  };

  const handleRefresh = async () => {
    try {
      await Promise.all([refetchEvents(), refetchIncidents()]);
      toast({
        title: "Data updated",
        description: "Safety data has been refreshed successfully.",
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to refresh data. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Overlay for mobile */}
      {isMobile && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        ${isMobile 
          ? 'fixed top-0 left-0 w-80 h-full z-50' 
          : 'w-80 h-full'
        }
        bg-background border-r border-border shadow-lg flex flex-col
      `}>
        {/* Header */}
        <div className="p-4 border-b border-border flex items-center justify-between bg-muted/50">
          <h1 className="text-lg font-semibold text-foreground">Safety Filters</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRefresh}
            className="text-muted-foreground hover:text-foreground"
          >
            Refresh
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          
          {/* Agency Data Sources */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('Agency Data')}
              className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <Car className="w-4 h-4 text-blue-500" />
                <h3 className="text-sm font-medium text-foreground">Agency Data</h3>
              </div>
              {expandedSections['Agency Data'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {expandedSections['Agency Data'] && (
              <div className="mt-3 ml-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-tmr"
                    checked={filters.showTrafficEvents === true}
                    onCheckedChange={(checked) => onFilterChange('showTrafficEvents', !!checked)}
                    data-testid="checkbox-filter-tmr"
                  />
                  <Label htmlFor="filter-tmr" className="text-sm text-foreground flex-1">
                    TMR Traffic Events
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {counts.tmr}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-esq"
                    checked={filters.showIncidents === true}
                    onCheckedChange={(checked) => onFilterChange('showIncidents', !!checked)}
                    data-testid="checkbox-filter-esq"
                  />
                  <Label htmlFor="filter-esq" className="text-sm text-foreground flex-1">
                    ESQ Emergency Data
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {counts.esq}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-qfes"
                    checked={filters.showQFES === true}
                    onCheckedChange={(checked) => onFilterChange('showQFES', !!checked)}
                    data-testid="checkbox-filter-qfes"
                  />
                  <Label htmlFor="filter-qfes" className="text-sm text-foreground flex-1">
                    QFES Fire & Emergency
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {counts.qfes}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* User Reports */}
          <div className="mb-4">
            <button
              onClick={() => toggleSection('User Reports')}
              className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
            >
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" />
                <h3 className="text-sm font-medium text-foreground">User Reports</h3>
              </div>
              {expandedSections['User Reports'] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            
            {expandedSections['User Reports'] && (
              <div className="mt-3 ml-4 space-y-3">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-safety"
                    checked={filters.showUserReports === true}
                    onCheckedChange={(checked) => onFilterChange('showUserReports', !!checked)}
                    data-testid="checkbox-filter-user-safety"
                  />
                  <Label htmlFor="filter-user-safety" className="text-sm text-foreground flex-1">
                    Safety & Crime
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {counts.userSafetyCrime}
                  </span>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-wildlife"
                    checked={filters.showUserReports === true}
                    onCheckedChange={(checked) => onFilterChange('showUserReports', !!checked)}
                    data-testid="checkbox-filter-user-wildlife"
                  />
                  <Label htmlFor="filter-user-wildlife" className="text-sm text-foreground flex-1">
                    Wildlife & Nature
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {counts.userWildlife}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-community"
                    checked={filters.showUserReports === true}
                    onCheckedChange={(checked) => onFilterChange('showUserReports', !!checked)}
                    data-testid="checkbox-filter-user-community"
                  />
                  <Label htmlFor="filter-user-community" className="text-sm text-foreground flex-1">
                    Community Issues
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {counts.userCommunity}
                  </span>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-traffic"
                    checked={filters.showUserReports === true}
                    onCheckedChange={(checked) => onFilterChange('showUserReports', !!checked)}
                    data-testid="checkbox-filter-user-traffic"
                  />
                  <Label htmlFor="filter-user-traffic" className="text-sm text-foreground flex-1">
                    Road & Traffic
                  </Label>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    {counts.userTraffic}
                  </span>
                </div>
              </div>
            )}
          </div>
          
          {/* Location Setting Section */}
          <div className="pt-4 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Your Location
            </h2>
            
            <div className="space-y-4">              
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Set your home suburb:</Label>
                <LocationAutocomplete
                  value={filters.homeLocation || ''}
                  onChange={(location, coordinates, boundingBox) => {
                    onFilterChange('homeLocation', location);
                    if (coordinates) {
                      onFilterChange('homeCoordinates', coordinates);
                    }
                    if (boundingBox) {
                      onFilterChange('homeBoundingBox', boundingBox);
                    }
                  }}
                  onClear={() => {
                    onFilterChange('homeLocation', '');
                    onFilterChange('homeCoordinates', undefined);
                    onFilterChange('homeBoundingBox', undefined);
                  }}
                  placeholder="Enter your suburb..."
                  disabled={false}
                />
              </div>
              
              {filters.homeLocation && (
                <div className="bg-muted/50 p-3 rounded-md">
                  <div className="text-sm text-foreground">
                    <strong>Home Location:</strong>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {filters.homeLocation}
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Showing events from your region
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}