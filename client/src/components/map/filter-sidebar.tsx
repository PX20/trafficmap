import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import type { FilterState } from "@/pages/home";
import { getTrafficEvents, getIncidents } from "@/lib/traffic-api";

interface FilterSidebarProps {
  isOpen: boolean;
  filters: FilterState;
  onFilterChange: (key: keyof FilterState, value: boolean | string) => void;
  onClose: () => void;
}

export function FilterSidebar({ isOpen, filters, onFilterChange, onClose }: FilterSidebarProps) {
  const isMobile = useIsMobile();
  const { toast } = useToast();
  
  const { data: events, refetch: refetchEvents } = useQuery({
    queryKey: ["/api/traffic/events"],
    select: (data: any) => data?.features || [],
  });


  const { data: incidents, refetch: refetchIncidents } = useQuery({
    queryKey: ["/api/incidents"],
    queryFn: getIncidents,
    select: (data: any) => data?.features || [],
  });


  const eventCounts = {
    crashes: events?.filter((e: any) => e.properties.event_type === "Crash").length || 0,
    hazards: events?.filter((e: any) => e.properties.event_type === "Hazard").length || 0,
    restrictions: events?.filter((e: any) => e.properties.event_type === "Roadworks" || e.properties.event_type === "Special event").length || 0,
    incidents: incidents?.filter((i: any) => !i.properties?.userReported).length || 0,
    crime: incidents?.filter((i: any) => i.properties?.userReported && ['Crime', 'Theft', 'Violence', 'Vandalism'].includes(i.properties?.incidentType)).length || 0,
    suspicious: incidents?.filter((i: any) => i.properties?.userReported && i.properties?.incidentType === 'Suspicious').length || 0,
    emergency: incidents?.filter((i: any) => i.properties?.userReported && ['Public Safety', 'Fire', 'Utility'].includes(i.properties?.incidentType)).length || 0,
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
          className="fixed inset-0 bg-black/50 z-15"
          onClick={onClose}
        />
      )}
      
      <aside 
        className={`absolute top-16 left-0 bottom-0 w-80 bg-card border-r border-border z-20 shadow-lg transform transition-transform duration-300 ${
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
        
        <div className="p-4 space-y-6 overflow-y-auto h-full pb-20">
          {/* Event Type Filters */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Traffic Events</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter-crashes"
                  checked={filters.crashes}
                  onCheckedChange={(checked) => onFilterChange('crashes', !!checked)}
                  data-testid="checkbox-filter-crashes"
                />
                <div className="w-4 h-4 bg-red-500 rounded-full"></div>
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
                <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
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
                <div className="w-4 h-4 bg-orange-500 rounded-full"></div>
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
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <Label htmlFor="filter-incidents" className="text-sm text-foreground flex-1">
                  Emergency Incidents
                </Label>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-incidents">
                  {eventCounts.incidents}
                </span>
              </div>
              
              
            </div>
          </div>
          
          {/* Emergency & Crime Events */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Emergency & Safety</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter-incidents"
                  checked={filters.incidents}
                  onCheckedChange={(checked) => onFilterChange('incidents', !!checked)}
                  data-testid="checkbox-filter-incidents"
                />
                <div className="w-4 h-4 bg-red-600 rounded-full"></div>
                <Label htmlFor="filter-incidents" className="text-sm text-foreground flex-1">
                  Official Emergencies
                </Label>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-incidents">
                  {eventCounts.incidents}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter-crime"
                  checked={filters.crime}
                  onCheckedChange={(checked) => onFilterChange('crime', !!checked)}
                  data-testid="checkbox-filter-crime"
                />
                <div className="w-4 h-4 bg-purple-600 rounded-full"></div>
                <Label htmlFor="filter-crime" className="text-sm text-foreground flex-1">
                  Crime Reports
                </Label>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-crime">
                  {eventCounts.crime}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter-suspicious"
                  checked={filters.suspicious}
                  onCheckedChange={(checked) => onFilterChange('suspicious', !!checked)}
                  data-testid="checkbox-filter-suspicious"
                />
                <div className="w-4 h-4 bg-amber-600 rounded-full"></div>
                <Label htmlFor="filter-suspicious" className="text-sm text-foreground flex-1">
                  Suspicious Activity
                </Label>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-suspicious">
                  {eventCounts.suspicious}
                </span>
              </div>
              
              <div className="flex items-center space-x-3">
                <Checkbox 
                  id="filter-emergency"
                  checked={filters.emergency}
                  onCheckedChange={(checked) => onFilterChange('emergency', !!checked)}
                  data-testid="checkbox-filter-emergency"
                />
                <div className="w-4 h-4 bg-indigo-600 rounded-full"></div>
                <Label htmlFor="filter-emergency" className="text-sm text-foreground flex-1">
                  Other Emergencies
                </Label>
                <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full" data-testid="text-count-emergency">
                  {eventCounts.emergency}
                </span>
              </div>
            </div>
          </div>
          
          {/* Impact Level Filter */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Impact Level</h3>
            <RadioGroup 
              value={filters.impactLevel} 
              onValueChange={(value) => onFilterChange('impactLevel', value)}
              data-testid="radio-impact-level"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="all" id="impact-all" />
                <Label htmlFor="impact-all" className="text-sm text-foreground">All Levels</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="high" id="impact-high" />
                <Label htmlFor="impact-high" className="text-sm text-foreground">High Impact Only</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="medium" id="impact-medium" />
                <Label htmlFor="impact-medium" className="text-sm text-foreground">Medium & High</Label>
              </div>
            </RadioGroup>
          </div>
          
          {/* Time Range */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Time Range</h3>
            <Select value={filters.timeRange} onValueChange={(value) => onFilterChange('timeRange', value)}>
              <SelectTrigger className="w-full" data-testid="select-time-range">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="now">Current Events</SelectItem>
                <SelectItem value="1h">Last Hour</SelectItem>
                <SelectItem value="6h">Last 6 Hours</SelectItem>
                <SelectItem value="24h">Last 24 Hours</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          {/* Auto Refresh */}
          <div>
            <h3 className="text-sm font-medium text-foreground mb-3">Auto Refresh</h3>
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="auto-refresh"
                checked={filters.autoRefresh}
                onCheckedChange={(checked) => onFilterChange('autoRefresh', !!checked)}
                data-testid="checkbox-auto-refresh"
              />
              <Label htmlFor="auto-refresh" className="text-sm text-foreground">
                Enable (30 seconds)
              </Label>
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
