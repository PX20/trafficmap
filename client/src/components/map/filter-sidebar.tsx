import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronRight, Car, Shield, Construction, Zap, TreePine, Users, MapPin } from "lucide-react";
import type { FilterState } from "@/pages/home";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { getTrafficEvents, getIncidents } from "@/lib/traffic-api";

interface FilterSidebarProps {
  isOpen: boolean;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: boolean | string | { lat: number; lon: number } | [number, number, number, number] | undefined) => void;
  onClose: () => void;
}

export function FilterSidebar({ isOpen, filters, onFilterChange, onClose }: FilterSidebarProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [expandedSections, setExpandedSections] = useState({
    traffic: false,
    'Safety & Crime': false,
    'Infrastructure & Hazards': false,
    'Emergency Situations': false,
    'Wildlife & Nature': false,
    'Community Issues': false,
  });
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };
  
  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["/api/traffic/events"],
    select: (data: any) => data?.features || [],
  });

  const { data: incidents, refetch: refetchIncidents } = useQuery({
    queryKey: ["/api/incidents"],
    queryFn: getIncidents,
    select: (data: any) => data?.features || [],
  });
  
  // Fetch hierarchical categories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    select: (data: any) => data || [],
  });


  // Count incidents by category
  const getCategoryCount = (categoryId: string) => {
    let userIncidents = incidents?.filter((i: any) => i.properties?.userReported && i.properties?.categoryId === categoryId) || [];
    
    // For wildlife category, also count legacy incidents that should be wildlife
    if (categoryId === 'd03f47a9-10fb-4656-ae73-92e959d7566a') { // Wildlife & Nature ID
      const legacyWildlifeIncidents = incidents?.filter((i: any) => {
        const props = i.properties;
        if (!props?.userReported || props?.categoryId) return false;
        const description = props?.description?.toLowerCase() || '';
        const wildlifeType = props?.wildlifeType;
        return wildlifeType || description.includes('snake') || description.includes('python') || 
               description.includes('animal') || description.includes('wildlife');
      }) || [];
      userIncidents = [...userIncidents, ...legacyWildlifeIncidents];
    }
    
    return userIncidents.length;
  };
  
  const eventCounts = {
    crashes: events?.filter((e: any) => e.properties.event_type === "Crash").length || 0,
    hazards: events?.filter((e: any) => e.properties.event_type === "Hazard").length || 0,
    restrictions: events?.filter((e: any) => e.properties.event_type === "Roadworks" || e.properties.event_type === "Special event").length || 0,
    incidents: incidents?.filter((i: any) => !i.properties?.userReported).length || 0,
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
        description: "Failed to refresh safety data. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <>
      {/* Backdrop for mobile */}
      {isMobile && isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`fixed top-16 left-0 bottom-0 w-80 bg-card border-r border-border z-40 shadow-lg transform transition-transform duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${isMobile ? 'w-full' : ''}`}
      >
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">Filter Events</h2>
              <p className="text-sm text-muted-foreground">Show or hide safety and incident alerts</p>
            </div>
            {isMobile && (
              <Button variant="ghost" size="sm" onClick={onClose} data-testid="button-close-sidebar">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </Button>
            )}
          </div>
        </div>
        
        <div className="p-4 space-y-6 overflow-y-auto" style={{ height: 'calc(100vh - 8rem)' }}>
          {/* Incident Types - Main Section */}
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-4">Incident Types</h2>
            
            {/* Traffic - Collapsible */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('traffic')}
                className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
              >
                <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-500" />
                  Traffic
                </h3>
                {expandedSections.traffic ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedSections.traffic && (
                <div className="mt-3 ml-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="filter-crashes"
                      checked={filters.crashes}
                      onCheckedChange={(checked) => onFilterChange('crashes', !!checked)}
                      data-testid="checkbox-filter-crashes"
                    />
                    <Label htmlFor="filter-crashes" className="text-sm text-foreground flex-1">
                      Crashes
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-crashes">
                      {eventCounts.crashes}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="filter-hazards"
                      checked={filters.hazards}
                      onCheckedChange={(checked) => onFilterChange('hazards', !!checked)}
                      data-testid="checkbox-filter-hazards"
                    />
                    <Label htmlFor="filter-hazards" className="text-sm text-foreground flex-1">
                      Hazards
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-hazards">
                      {eventCounts.hazards}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="filter-restrictions"
                      checked={filters.restrictions}
                      onCheckedChange={(checked) => onFilterChange('restrictions', !!checked)}
                      data-testid="checkbox-filter-restrictions"
                    />
                    <Label htmlFor="filter-restrictions" className="text-sm text-foreground flex-1">
                      Road Restrictions
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-restrictions">
                      {eventCounts.restrictions}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="filter-incidents"
                      checked={filters.incidents}
                      onCheckedChange={(checked) => onFilterChange('incidents', !!checked)}
                      data-testid="checkbox-filter-incidents"
                    />
                    <Label htmlFor="filter-incidents" className="text-sm text-foreground flex-1">
                      Official Emergencies
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-incidents">
                      {eventCounts.incidents}
                    </span>
                  </div>
                </div>
              )}
            </div>
            
            {/* Individual Category Sections */}
            {(categories as any[]).map((category: any) => {
              const getCategoryIcon = (name: string) => {
                if (name.includes('Safety') || name.includes('Crime')) return <Shield className="w-4 h-4" style={{ color: category.color }} />;
                if (name.includes('Infrastructure') || name.includes('Hazards')) return <Construction className="w-4 h-4" style={{ color: category.color }} />;
                if (name.includes('Emergency')) return <Zap className="w-4 h-4" style={{ color: category.color }} />;
                if (name.includes('Wildlife') || name.includes('Nature')) return <TreePine className="w-4 h-4" style={{ color: category.color }} />;
                if (name.includes('Community')) return <Users className="w-4 h-4" style={{ color: category.color }} />;
                return <Shield className="w-4 h-4" style={{ color: category.color }} />;
              };
              
              return (
              <div key={category.id} className="mb-4">
                <button
                  onClick={() => toggleSection(category.name)}
                  className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
                >
                  <h3 className="text-sm font-medium text-foreground flex items-center gap-2">
                    {getCategoryIcon(category.name)}
                    {category.name}
                  </h3>
                  {expandedSections[category.name as keyof typeof expandedSections] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {expandedSections[category.name as keyof typeof expandedSections] && (
                  <div className="mt-3 ml-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={`filter-category-${category.id}`}
                        checked={filters[category.id as keyof FilterState] === true}
                        onCheckedChange={(checked) => onFilterChange(category.id as keyof FilterState, !!checked)}
                        data-testid={`checkbox-filter-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                      <Label htmlFor={`filter-category-${category.id}`} className="text-sm text-foreground flex-1">
                        All {category.name}
                      </Label>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {getCategoryCount(category.id)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>
          
          {/* Location Filter Section */}
          <div className="pt-4 border-t border-border">
            <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-500" />
              Location Filter
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <Checkbox
                  id="location-filter-enabled"
                  checked={filters.locationFilter}
                  onCheckedChange={(checked) => onFilterChange('locationFilter', !!checked)}
                  data-testid="checkbox-location-filter"
                />
                <Label htmlFor="location-filter-enabled" className="text-sm text-foreground flex-1">
                  Updates from my region
                </Label>
              </div>
              
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
                    // Auto-enable location filtering when a location is set
                    onFilterChange('locationFilter', true);
                  }}
                  onClear={() => {
                    onFilterChange('homeLocation', '');
                    onFilterChange('homeCoordinates', undefined);
                    onFilterChange('homeBoundingBox', undefined);
                    // Auto-disable location filtering when location is cleared
                    onFilterChange('locationFilter', false);
                  }}
                  placeholder="Enter your suburb..."
                  disabled={false}
                />
              </div>
              
              {filters.homeLocation && (
                <div className="p-3 bg-muted/30 rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Home Location:</div>
                  <div className="text-sm font-medium text-foreground">{filters.homeLocation}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {filters.locationFilter ? 'Filtering by nearby area' : 'Click checkbox above to enable location filtering'}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-border">
            <Button 
              onClick={handleRefresh}
              className="w-full"
              data-testid="button-refresh-data"
            >
              Refresh Data Now
            </Button>
          </div>
        </div>
      </aside>
    </>
  );
}
