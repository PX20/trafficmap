import { MapPin, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface QuickProximityFilterProps {
  distanceFilter: 'all' | '5km' | '10km' | '25km';
  hasLocation: boolean;
  onDistanceChange: (distance: 'all' | '5km' | '10km' | '25km') => void;
  className?: string;
  variant?: "default" | "outline" | "ghost";
}

export function QuickProximityFilter({ 
  distanceFilter, 
  hasLocation, 
  onDistanceChange,
  className = "",
  variant = "outline"
}: QuickProximityFilterProps) {
  
  const getDisplayText = () => {
    if (!hasLocation) return "Set Location";
    if (distanceFilter === 'all') return "All Areas";
    return `Within ${distanceFilter}`;
  };

  const getIcon = () => {
    if (!hasLocation) return <MapPin className="w-4 h-4 text-muted-foreground" />;
    return <MapPin className="w-4 h-4 text-blue-500" />;
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant={variant}
          size="sm" 
          className={`gap-2 ${className}`}
          data-testid="button-proximity-filter"
          disabled={!hasLocation}
        >
          {getIcon()}
          <span className="hidden sm:inline">{getDisplayText()}</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Proximity Filter</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuRadioGroup value={distanceFilter} onValueChange={(value) => onDistanceChange(value as any)}>
          <DropdownMenuRadioItem value="all" data-testid="radio-distance-all">
            All Areas
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="5km" data-testid="radio-distance-5km">
            Within 5km
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="10km" data-testid="radio-distance-10km">
            Within 10km
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="25km" data-testid="radio-distance-25km">
            Within 25km
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
        {!hasLocation && (
          <>
            <DropdownMenuSeparator />
            <div className="px-2 py-2 text-xs text-muted-foreground">
              Set a location in preferences to use proximity filtering
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
