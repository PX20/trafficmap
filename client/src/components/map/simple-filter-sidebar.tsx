import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import { ChevronDown, ChevronRight, Car, Shield, Users, MapPin, Flame, Zap, Trees } from "lucide-react";
import type { FilterState } from "@/pages/home";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { useTrafficData } from "@/hooks/use-traffic-data";

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
    'Agency Data': true,
    'User Reports': true,
  });
  
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev]
    }));
  };
  
  // Use shared data processing hook 
  const { counts } = useTrafficData(filters);

  const handleRefresh = async () => {
    try {
      // Force refetch by invalidating the query cache
      window.location.reload();
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
                  <Car className="w-4 h-4 text-orange-500" />
                  <Label htmlFor="filter-tmr" className="text-sm text-foreground flex-1">
                    TMR Traffic Events
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-esq"
                    checked={filters.showIncidents === true}
                    onCheckedChange={(checked) => onFilterChange('showIncidents', !!checked)}
                    data-testid="checkbox-filter-esq"
                  />
                  <Zap className="w-4 h-4 text-blue-500" />
                  <Label htmlFor="filter-esq" className="text-sm text-foreground flex-1">
                    ESQ Emergency Data
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-qfes"
                    checked={filters.showQFES === true}
                    onCheckedChange={(checked) => onFilterChange('showQFES', !!checked)}
                    data-testid="checkbox-filter-qfes"
                  />
                  <Flame className="w-4 h-4 text-red-500" />
                  <Label htmlFor="filter-qfes" className="text-sm text-foreground flex-1">
                    QFES Fire & Emergency
                  </Label>
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
                    checked={filters.showUserSafetyCrime === true}
                    onCheckedChange={(checked) => onFilterChange('showUserSafetyCrime', !!checked)}
                    data-testid="checkbox-filter-user-safety"
                  />
                  <Shield className="w-4 h-4 text-purple-500" />
                  <Label htmlFor="filter-user-safety" className="text-sm text-foreground flex-1">
                    Safety & Crime
                  </Label>
                </div>
                
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-wildlife"
                    checked={filters.showUserWildlife === true}
                    onCheckedChange={(checked) => onFilterChange('showUserWildlife', !!checked)}
                    data-testid="checkbox-filter-user-wildlife"
                  />
                  <Trees className="w-4 h-4 text-green-600" />
                  <Label htmlFor="filter-user-wildlife" className="text-sm text-foreground flex-1">
                    Wildlife & Nature
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-community"
                    checked={filters.showUserCommunity === true}
                    onCheckedChange={(checked) => onFilterChange('showUserCommunity', !!checked)}
                    data-testid="checkbox-filter-user-community"
                  />
                  <Users className="w-4 h-4 text-gray-500" />
                  <Label htmlFor="filter-user-community" className="text-sm text-foreground flex-1">
                    Community Issues
                  </Label>
                </div>

                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id="filter-user-traffic"
                    checked={filters.showUserTraffic === true}
                    onCheckedChange={(checked) => onFilterChange('showUserTraffic', !!checked)}
                    data-testid="checkbox-filter-user-traffic"
                  />
                  <Car className="w-4 h-4 text-orange-500" />
                  <Label htmlFor="filter-user-traffic" className="text-sm text-foreground flex-1">
                    Road & Traffic
                  </Label>
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