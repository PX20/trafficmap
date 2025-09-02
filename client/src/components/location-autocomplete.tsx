import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { MapPin, X, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LocationSuggestion {
  display_name: string;
  lat: number;
  lon: number;
  address: {
    suburb?: string;
    city?: string;
    state?: string;
    postcode?: string;
    country?: string;
  };
  boundingbox?: [string, string, string, string]; // [min_lat, max_lat, min_lon, max_lon]
}

interface LocationAutocompleteProps {
  value: string;
  onChange: (location: string, coordinates?: { lat: number; lon: number }, boundingBox?: [number, number, number, number]) => void;
  onClear?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function LocationAutocomplete({ 
  value, 
  onChange, 
  onClear, 
  placeholder = "Enter your suburb or address...",
  disabled = false 
}: LocationAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const { toast } = useToast();
  const abortControllerRef = useRef<AbortController | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim().length > 2) {
        searchLocation(inputValue);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue]);

  const searchLocation = async (query: string) => {
    // Cancel previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    abortControllerRef.current = new AbortController();
    setIsLoading(true);

    try {
      // Using Nominatim (OpenStreetMap) as a free alternative
      // Focus on Queensland, Australia for better local results
      const response = await fetch(
        `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(query + ', Queensland, Australia')}&` +
        `format=json&` +
        `addressdetails=1&` +
        `limit=5&` +
        `countrycodes=au&` +
        `bounded=1&` +
        `viewbox=138.0,-29.0,154.0,-9.0`, // Queensland bounding box
        {
          signal: abortControllerRef.current.signal,
          headers: {
            'User-Agent': 'QLD Safety Monitor (contact: support@example.com)'
          }
        }
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      // Transform to our format and filter for Queensland suburbs
      const locationSuggestions: LocationSuggestion[] = data
        .filter((item: any) => 
          item.address && 
          (item.address.suburb || item.address.city || item.address.town) &&
          item.address.state && 
          (item.address.state.includes('Queensland') || item.address.state.includes('QLD'))
        )
        .map((item: any) => ({
          display_name: item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
          address: {
            suburb: item.address.suburb || item.address.city || item.address.town,
            city: item.address.city,
            state: item.address.state,
            postcode: item.address.postcode,
            country: item.address.country
          },
          boundingbox: item.boundingbox ? [
            item.boundingbox[0], // min_lat
            item.boundingbox[1], // max_lat
            item.boundingbox[2], // min_lon
            item.boundingbox[3]  // max_lon
          ] as [string, string, string, string] : undefined
        }));

      setSuggestions(locationSuggestions);
      setShowSuggestions(true);

    } catch (error) {
      if ((error as Error).name !== 'AbortError') {
        console.error('Location search failed:', error);
        toast({
          title: "Location search failed",
          description: "Unable to search for locations. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    const locationText = `${suggestion.address.suburb}, ${suggestion.address.state}`;
    setInputValue(locationText);
    setShowSuggestions(false);
    
    const boundingBox = suggestion.boundingbox ? [
      parseFloat(suggestion.boundingbox[0]), // min_lat
      parseFloat(suggestion.boundingbox[1]), // max_lat  
      parseFloat(suggestion.boundingbox[2]), // min_lon
      parseFloat(suggestion.boundingbox[3])  // max_lon
    ] as [number, number, number, number] : undefined;
    
    onChange(locationText, { lat: suggestion.lat, lon: suggestion.lon }, boundingBox);
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    setShowSuggestions(false);
    onClear?.();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={inputRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
          data-testid="input-location-search"
        />
        {inputValue && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClear}
            className="absolute right-1 top-1/2 transform -translate-y-1/2 h-6 w-6 p-0 hover:bg-muted"
            data-testid="button-clear-location"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
        {isLoading && (
          <div className="absolute right-8 top-1/2 transform -translate-y-1/2">
            <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        )}
      </div>
      
      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
          {suggestions.map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              className="w-full px-4 py-3 text-left hover:bg-muted/50 focus:bg-muted/50 focus:outline-none transition-colors border-b border-border last:border-b-0"
              data-testid={`button-suggestion-${index}`}
            >
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-foreground text-sm">
                    {suggestion.address.suburb}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.address.state} {suggestion.address.postcode}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
      
      {/* No results message */}
      {showSuggestions && suggestions.length === 0 && !isLoading && inputValue.trim().length > 2 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border border-border rounded-md shadow-lg p-4 text-center text-sm text-muted-foreground">
          No locations found. Try a different search term.
        </div>
      )}
    </div>
  );
}