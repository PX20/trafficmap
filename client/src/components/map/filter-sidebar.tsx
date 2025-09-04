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
  // Force cache refresh
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
    queryKey: ["/api/traffic/events"],
    queryFn: getTrafficEvents,
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
  });

  const { data: incidents, refetch: refetchIncidents } = useQuery({
    queryKey: ["/api/incidents"],
    queryFn: async () => {
      const response = await fetch('/api/incidents');
      if (!response.ok) throw new Error('Failed to fetch incidents');
      return response.json();
    },
    select: (data: any) => {
      const features = data?.features || [];
      return Array.isArray(features) ? features : [];
    },
  });
  
  // Fetch hierarchical categories
  const { data: categories = [], isLoading: categoriesLoading, error: categoriesError } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: subcategories = [], isLoading: subcategoriesLoading } = useQuery({
    queryKey: ["/api/subcategories"],
    queryFn: async () => {
      const response = await fetch("/api/subcategories");
      if (!response.ok) throw new Error('Failed to fetch subcategories');
      return response.json();
    },
    retry: 3,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });


  // Simple source-based filtering
  const getSourceCounts = () => {
    const counts = {
      // Agency Data Sources
      tmr: Array.isArray(events) ? events.length : 0,
      esq: Array.isArray(incidents) ? incidents.filter((i: any) => !i.properties?.userReported).length : 0,
      
      // User Report Categories  
      userSafetyCrime: Array.isArray(incidents) ? incidents.filter((i: any) => 
        i.properties?.userReported && i.properties?.incidentType === 'crime'
      ).length : 0,
      userWildlife: Array.isArray(incidents) ? incidents.filter((i: any) => 
        i.properties?.userReported && i.properties?.incidentType === 'wildlife'
      ).length : 0,
      userCommunity: Array.isArray(incidents) ? incidents.filter((i: any) => 
        i.properties?.userReported && !['crime', 'wildlife', 'traffic'].includes(i.properties?.incidentType)
      ).length : 0,
      userTraffic: Array.isArray(incidents) ? incidents.filter((i: any) => 
        i.properties?.userReported && i.properties?.incidentType === 'traffic'
      ).length : 0,
    };
    
    return counts;
  };
  
  const sourceCounts = getSourceCounts();


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
            
            
            
            {/* Traffic Events Section */}
            <div className="mb-4">
              <button
                onClick={() => toggleSection('traffic')}
                className="flex items-center justify-between w-full p-2 text-left hover:bg-muted/50 rounded-md transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Car className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-medium text-foreground">Live Traffic</h3>
                  <span className="text-xs text-muted-foreground bg-blue-100 text-blue-800 px-2 py-1 rounded-full ml-auto">
                    {eventCounts.crashes + eventCounts.hazards + eventCounts.restrictions}
                  </span>
                </div>
                {expandedSections.traffic ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
              
              {expandedSections.traffic && (
                <div className="mt-3 ml-4 space-y-3">
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="filter-traffic-crashes"
                      checked={filters.crashes === true}
                      onCheckedChange={(checked) => onFilterChange('crashes', !!checked)}
                      data-testid="checkbox-filter-crashes"
                    />
                    <Label htmlFor="filter-traffic-crashes" className="text-sm text-foreground flex-1">
                      Crashes
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {eventCounts.crashes}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="filter-traffic-hazards"
                      checked={filters.hazards === true}
                      onCheckedChange={(checked) => onFilterChange('hazards', !!checked)}
                      data-testid="checkbox-filter-hazards"
                    />
                    <Label htmlFor="filter-traffic-hazards" className="text-sm text-foreground flex-1">
                      Road Hazards
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {eventCounts.hazards}
                    </span>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <Checkbox 
                      id="filter-traffic-restrictions"
                      checked={filters.restrictions === true}
                      onCheckedChange={(checked) => onFilterChange('restrictions', !!checked)}
                      data-testid="checkbox-filter-restrictions"
                    />
                    <Label htmlFor="filter-traffic-restrictions" className="text-sm text-foreground flex-1">
                      Roadworks & Events
                    </Label>
                    <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                      {eventCounts.restrictions}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Individual Category Sections */}
            {categoriesLoading ? (
              <div className="text-sm text-muted-foreground p-4 text-center">
                Loading categories...
              </div>
            ) : categoriesError ? (
              <div className="text-sm text-red-500 p-4 text-center">
                Error loading categories: {categoriesError.message}
              </div>
            ) : !categories || categories.length === 0 ? (
              <div className="text-sm text-muted-foreground p-4 text-center">
                No categories found
              </div>
            ) : (
              categories.map((category: any) => {
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
                  <div className="flex items-center gap-2">
                    {getCategoryIcon(category.name)}
                    <h3 className="text-sm font-medium text-foreground">{category.name}</h3>
                    <span className="text-xs text-muted-foreground bg-gray-100 text-gray-800 px-2 py-1 rounded-full ml-auto">
                      {getCategoryCount(category.id)}
                    </span>
                  </div>
                  {expandedSections[category.name as keyof typeof expandedSections] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                
                {expandedSections[category.name as keyof typeof expandedSections] && (
                  <div className="mt-3 ml-4 space-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox 
                        id={`filter-category-${category.id}`}
                        checked={filters[category.id as keyof FilterState] === true}
                        onCheckedChange={(checked) => {
                          // Update the main category filter
                          onFilterChange(category.id as keyof FilterState, !!checked);
                          
                          // Update all subcategories under this category
                          const categorySubcategories = subcategories.filter((sub: any) => sub.categoryId === category.id);
                          categorySubcategories.forEach((subcategory: any) => {
                            onFilterChange(subcategory.id as keyof FilterState, !!checked);
                          });
                        }}
                        data-testid={`checkbox-filter-${category.name.toLowerCase().replace(/\s+/g, '-')}`}
                      />
                      <Label htmlFor={`filter-category-${category.id}`} className="text-sm text-foreground flex-1">
                        All {category.name}
                      </Label>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                        {getCategoryCount(category.id)}
                      </span>
                    </div>
                    
                    {/* Individual Subcategories */}
                    {subcategories
                      .filter((sub: any) => sub.categoryId === category.id)
                      .sort((a: any, b: any) => a.order - b.order)
                      .map((subcategory: any) => (
                        <div key={subcategory.id} className="flex items-center space-x-3 ml-4">
                          <Checkbox 
                            id={`filter-subcategory-${subcategory.id}`}
                            checked={filters[subcategory.id as keyof FilterState] === true}
                            onCheckedChange={(checked) => onFilterChange(subcategory.id as keyof FilterState, !!checked)}
                            data-testid={`checkbox-filter-${subcategory.name.toLowerCase().replace(/\s+/g, '-')}`}
                          />
                          <Label htmlFor={`filter-subcategory-${subcategory.id}`} className="text-sm text-foreground flex-1">
                            {subcategory.name}
                          </Label>
                          <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                            {subcategory.reportCount || 0}
                          </span>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
            })
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
                <div className="p-3 bg-muted/30 rounded-md">
                  <div className="text-xs text-muted-foreground mb-1">Home Location:</div>
                  <div className="text-sm font-medium text-foreground">{filters.homeLocation}</div>
                  <div className="text-xs text-muted-foreground mt-1">
                    Showing events from your region
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
