import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { usePushNotifications } from "@/hooks/use-push-notifications";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  MapPin, 
  Bell, 
  Shield, 
  Check,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  AlertTriangle,
  TreePine,
  Users,
  PawPrint,
  Search
} from "lucide-react";

interface OnboardingWizardProps {
  open: boolean;
  onComplete: () => void;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  color: string;
  isActive: boolean;
}

const STEPS = [
  { id: "welcome", title: "Welcome", icon: Sparkles },
  { id: "location", title: "Your Location", icon: MapPin },
  { id: "notifications", title: "Notifications", icon: Bell },
  { id: "categories", title: "Alert Types", icon: Shield },
  { id: "radius", title: "Alert Radius", icon: MapPin },
  { id: "complete", title: "All Set!", icon: Check },
];

const RADIUS_OPTIONS = [
  { value: "1km", label: "1 km", description: "Very local" },
  { value: "2km", label: "2 km", description: "Neighborhood" },
  { value: "5km", label: "5 km", description: "Nearby areas" },
  { value: "10km", label: "10 km", description: "Wider area" },
  { value: "25km", label: "25 km", description: "Regional" },
  { value: "50km", label: "50 km", description: "Large region" },
];

const getCategoryIcon = (iconName: string) => {
  const icons: Record<string, typeof Shield> = {
    shield: Shield,
    "alert-triangle": AlertTriangle,
    flame: AlertTriangle,
    "tree-pine": TreePine,
    users: Users,
    "paw-print": PawPrint,
    search: Search,
  };
  return icons[iconName] || Shield;
};

export function OnboardingWizard({ open, onComplete }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [location, setLocation] = useState("");
  const [locationCoords, setLocationCoords] = useState<{ lat: number; lon: number } | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<number[]>([]);
  const [notificationRadius, setNotificationRadius] = useState("10km");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);
  
  const { toast } = useToast();
  const { user } = useAuth();
  const { 
    isSupported: pushSupported, 
    permission, 
    subscribe, 
    requestPermission,
    isLoading: pushLoading 
  } = usePushNotifications();

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ["/api/categories"],
  });

  const activeCategories = categories.filter(c => c.isActive);

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setHasInitialized(false);
      setCurrentStep(0);
    }
  }, [open]);

  // Preload user's existing preferences when wizard opens
  useEffect(() => {
    if (open && user && !hasInitialized) {
      // Load existing location
      if (user.preferredLocation) {
        setLocation(user.preferredLocation);
      }
      if (user.preferredLocationLat && user.preferredLocationLng) {
        setLocationCoords({
          lat: user.preferredLocationLat,
          lon: user.preferredLocationLng
        });
      }
      // Load existing notification preferences
      if (user.notificationRadius) {
        setNotificationRadius(user.notificationRadius);
      }
      if (user.notificationCategories && Array.isArray(user.notificationCategories)) {
        setSelectedCategories(user.notificationCategories.map((c: any) => 
          typeof c === 'number' ? c : parseInt(c)
        ));
      }
      setHasInitialized(true);
    }
  }, [open, user, hasInitialized]);

  const handleLocationChange = (
    newLocation: string,
    coordinates?: { lat: number; lon: number }
  ) => {
    setLocation(newLocation);
    if (coordinates) {
      setLocationCoords(coordinates);
    }
  };

  const handleCategoryToggle = (categoryId: number) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === activeCategories.length) {
      setSelectedCategories([]);
    } else {
      setSelectedCategories(activeCategories.map(c => c.id));
    }
  };

  const handleEnableNotifications = async () => {
    if (permission === "granted") {
      await subscribe();
    } else {
      const granted = await requestPermission();
      if (granted) {
        await subscribe();
      }
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest("PATCH", "/api/users/me", {
        preferredLocation: location || undefined,
        preferredLocationLat: locationCoords?.lat || undefined,
        preferredLocationLng: locationCoords?.lon || undefined,
        notificationCategories: selectedCategories.length > 0 ? selectedCategories : null,
        notificationRadius,
        onboardingCompleted: true,
      });

      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      
      toast({
        title: "Welcome to Community Connect!",
        description: "Your preferences have been saved. You're all set to start exploring.",
      });
      
      onComplete();
    } catch (error) {
      console.error("Failed to save onboarding preferences:", error);
      toast({
        title: "Error",
        description: "Failed to save your preferences. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSkip = async () => {
    setIsSubmitting(true);
    try {
      await apiRequest("PATCH", "/api/users/me", {
        onboardingCompleted: true,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      onComplete();
    } catch (error) {
      console.error("Failed to skip onboarding:", error);
      onComplete();
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStepContent = () => {
    switch (STEPS[currentStep].id) {
      case "welcome":
        return (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-xl font-semibold">Welcome to Community Connect</h3>
            <p className="text-muted-foreground">
              Stay informed about safety incidents and community updates in your area. 
              Let's set up your preferences to give you the best experience.
            </p>
            <div className="flex flex-col gap-2 pt-4">
              <div className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Set your location for local alerts</span>
              </div>
              <div className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                <Bell className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Enable push notifications</span>
              </div>
              <div className="flex items-center gap-3 text-left p-3 rounded-md bg-muted/50">
                <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">Choose what incidents to receive alerts for</span>
              </div>
            </div>
          </div>
        );

      case "location":
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Set Your Location</h3>
              <p className="text-sm text-muted-foreground mt-1">
                We'll show you incidents and updates near this location
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="location">Your suburb or area</Label>
              <LocationAutocomplete
                value={location}
                onChange={handleLocationChange}
                placeholder="Search for your suburb..."
              />
            </div>
            {location && (
              <div className="flex items-center gap-2 p-3 rounded-md bg-green-500/10 text-green-700 dark:text-green-400">
                <Check className="w-4 h-4" />
                <span className="text-sm">{location}</span>
              </div>
            )}
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Bell className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Enable Notifications</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Get instant alerts about incidents in your area
              </p>
            </div>
            
            {!pushSupported ? (
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-muted-foreground">
                    Push notifications aren't supported on this device. You can still view incidents in the app.
                  </p>
                </CardContent>
              </Card>
            ) : permission === "granted" ? (
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-medium">Notifications Enabled</p>
                      <p className="text-sm text-muted-foreground">You'll receive alerts for incidents nearby</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : permission === "denied" ? (
              <Card>
                <CardContent className="p-4 text-center space-y-2">
                  <p className="text-muted-foreground">
                    Notifications are blocked. To enable them, please update your browser settings.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <Card 
                className="hover-elevate cursor-pointer" 
                onClick={handleEnableNotifications}
                data-testid="card-enable-notifications"
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">Enable Push Notifications</p>
                        <p className="text-sm text-muted-foreground">Tap to allow notifications</p>
                      </div>
                    </div>
                    {pushLoading ? (
                      <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <ChevronRight className="w-5 h-5 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>
            )}
            
            <p className="text-xs text-center text-muted-foreground">
              You can change this anytime in your profile settings
            </p>
          </div>
        );

      case "categories":
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Choose Alert Types</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Select which types of incidents you want to be notified about
              </p>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAllCategories}
              className="w-full"
              data-testid="button-select-all-categories"
            >
              {selectedCategories.length === activeCategories.length ? "Deselect All" : "Select All"}
            </Button>

            <div className="grid grid-cols-1 gap-2 max-h-[250px] overflow-y-auto">
              {activeCategories.map((category) => {
                const IconComponent = getCategoryIcon(category.icon);
                const isSelected = selectedCategories.includes(category.id);
                return (
                  <div
                    key={category.id}
                    className={`flex items-center gap-3 p-3 rounded-md border cursor-pointer transition-colors ${
                      isSelected 
                        ? "border-primary bg-primary/5" 
                        : "border-border hover:bg-muted/50"
                    }`}
                    onClick={() => handleCategoryToggle(category.id)}
                    data-testid={`category-${category.id}`}
                  >
                    <Checkbox 
                      checked={isSelected}
                      className="pointer-events-none"
                    />
                    <div 
                      className="w-8 h-8 rounded-full flex items-center justify-center"
                      style={{ backgroundColor: `${category.color}20` }}
                    >
                      <IconComponent 
                        className="w-4 h-4" 
                        style={{ color: category.color }}
                      />
                    </div>
                    <span className="font-medium">{category.name}</span>
                  </div>
                );
              })}
            </div>

            {selectedCategories.length > 0 && (
              <p className="text-sm text-center text-muted-foreground">
                {selectedCategories.length} of {activeCategories.length} categories selected
              </p>
            )}
          </div>
        );

      case "radius":
        const radiusIndex = RADIUS_OPTIONS.findIndex(r => r.value === notificationRadius);
        return (
          <div className="space-y-4 py-4">
            <div className="text-center mb-6">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Set Your Alert Radius</h3>
              <p className="text-sm text-muted-foreground mt-1">
                How far from your location should we send alerts?
              </p>
            </div>

            <div className="space-y-6">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">
                  {RADIUS_OPTIONS[radiusIndex]?.label || "10 km"}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {RADIUS_OPTIONS[radiusIndex]?.description || "Wider area"}
                </p>
              </div>

              <Slider
                value={[radiusIndex >= 0 ? radiusIndex : 3]}
                min={0}
                max={RADIUS_OPTIONS.length - 1}
                step={1}
                onValueChange={([value]) => setNotificationRadius(RADIUS_OPTIONS[value].value)}
                className="py-4"
                data-testid="slider-notification-radius"
              />

              <div className="flex justify-between text-xs text-muted-foreground">
                <span>1 km</span>
                <span>50 km</span>
              </div>
            </div>
          </div>
        );

      case "complete":
        return (
          <div className="text-center space-y-4 py-4">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h3 className="text-xl font-semibold">You're All Set!</h3>
            <p className="text-muted-foreground">
              Your preferences have been configured. You're ready to stay connected with your community.
            </p>
            
            <div className="space-y-2 pt-4 text-left">
              {location && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{location}</span>
                </div>
              )}
              {permission === "granted" && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Bell className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">Push notifications enabled</span>
                </div>
              )}
              {selectedCategories.length > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Shield className="w-5 h-5 text-primary flex-shrink-0" />
                  <span className="text-sm">{selectedCategories.length} alert categories selected</span>
                </div>
              )}
              <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                <MapPin className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm">{notificationRadius} alert radius</span>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent 
        className="sm:max-w-md max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="space-y-3">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg">
              {STEPS[currentStep].title}
            </DialogTitle>
            <Badge variant="secondary" className="text-xs">
              {currentStep + 1} of {STEPS.length}
            </Badge>
          </div>
          <Progress value={progress} className="h-1" />
        </DialogHeader>

        <div className="min-h-[300px]">
          {renderStepContent()}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          {currentStep === 0 ? (
            <>
              <Button 
                variant="ghost" 
                onClick={handleSkip}
                disabled={isSubmitting}
                className="w-full sm:w-auto"
                data-testid="button-skip-onboarding"
              >
                Skip for now
              </Button>
              <Button 
                onClick={handleNext}
                className="w-full sm:w-auto"
                data-testid="button-get-started"
              >
                Get Started
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          ) : currentStep === STEPS.length - 1 ? (
            <Button 
              onClick={handleComplete}
              disabled={isSubmitting}
              className="w-full"
              data-testid="button-complete-onboarding"
            >
              {isSubmitting ? "Saving..." : "Start Exploring"}
            </Button>
          ) : (
            <>
              <Button 
                variant="ghost" 
                onClick={handleBack}
                className="w-full sm:w-auto"
                data-testid="button-back"
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Back
              </Button>
              <Button 
                onClick={handleNext}
                className="w-full sm:w-auto"
                data-testid="button-next"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
