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
    setIsLoading(true);

    try {
      // Use server endpoint that handles Nominatim API calls
      const response = await fetch(
        `/api/location/search?q=${encodeURIComponent(query)}`
      );

      if (!response.ok) {
        throw new Error('Geocoding request failed');
      }

      const data = await response.json();
      
      // Data is already transformed by the server
      const locationSuggestions: LocationSuggestion[] = data;

      setSuggestions(locationSuggestions);
      setShowSuggestions(true);

    } catch (error) {
      console.error('Location search failed:', error);
      toast({
        title: "Location search failed",
        description: "Unable to search for locations. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion: LocationSuggestion) => {
    // Debug logging to understand the data structure
    console.log('Suggestion clicked:', suggestion);
    console.log('Display name:', suggestion.display_name);
    console.log('Address object:', suggestion.address);
    
    // Extract address components
    const parts = suggestion.display_name.split(',').map(part => part.trim());
    const street = parts[0];
    const suburb = suggestion.address.suburb || suggestion.address.city;
    const postcode = suggestion.address.postcode;
    const state = suggestion.address.state || 'QLD';
    
    console.log('Parsed components:', { street, suburb, postcode, state, parts });
    
    // Build location string with street, suburb, postcode and state
    let locationText = '';
    
    // Start with street if it's different from suburb
    if (street && suburb && street !== suburb) {
      locationText = street;
      
      // Add suburb
      locationText += `, ${suburb}`;
    } else {
      // Just use suburb if no street or street is same as suburb
      locationText = suburb || street || '';
    }
    
    // Add postcode and state
    if (postcode) {
      locationText += ` ${postcode}`;
    }
    if (state) {
      locationText += `, ${state}`;
    }
    
    console.log('Final location text:', locationText);
    
    setInputValue(locationText.trim());
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
                    {(() => {
                      const parts = suggestion.display_name.split(',').map(part => part.trim());
                      const suburb = suggestion.address.suburb || suggestion.address.city;
                      const street = parts[0];
                      const postcode = suggestion.address.postcode;
                      
                      // If we have both street and suburb, show both
                      if (suburb && street && street !== suburb) {
                        return `${street}, ${suburb}`;
                      }
                      // Otherwise just show the suburb
                      return suburb || street;
                    })()}
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {suggestion.address.postcode ? `${suggestion.address.postcode}, QLD` : 'QLD'}
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