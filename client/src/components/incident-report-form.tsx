import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Navigation, Camera, Upload, Image, CheckCircle, MapPin, PenSquare, X } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { ObjectUploader } from "@/components/ObjectUploader";

const reportIncidentSchema = z.object({
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().min(1, "Subcategory is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  policeNotified: z.enum(["yes", "no", "not_needed", "unsure"]).optional(),
  photoUrl: z.string().optional(),
});

type ReportIncidentData = z.infer<typeof reportIncidentSchema>;

export type EntryPoint = "photo" | "location" | "post";

interface IncidentReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation?: string;
  entryPoint?: EntryPoint;
}

const entryPointConfig = {
  photo: {
    icon: Camera,
    label: "Share Photo",
    color: "bg-green-500",
    description: "Add a photo and share what you've seen",
  },
  location: {
    icon: MapPin,
    label: "Report Location",
    color: "bg-red-500",
    description: "Report something at a specific location",
  },
  post: {
    icon: PenSquare,
    label: "Create Post",
    color: "bg-primary",
    description: "Share what's happening in your area",
  },
};

export function IncidentReportForm({ isOpen, onClose, initialLocation, entryPoint = "post" }: IncidentReportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>("");
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  const [hasAutoTriggeredGPS, setHasAutoTriggeredGPS] = useState(false);
  const [lastEntryPoint, setLastEntryPoint] = useState<EntryPoint>(entryPoint);
  
  // Simple state for categories and subcategories
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const descriptionRef = useRef<HTMLTextAreaElement>(null);
  
  const config = entryPointConfig[entryPoint];
  const IconComponent = config.icon;
  
  const form = useForm<ReportIncidentData>({
    resolver: zodResolver(reportIncidentSchema),
    defaultValues: {
      categoryId: "",
      subcategoryId: "",
      title: "",
      description: "",
      location: initialLocation || "",
      policeNotified: "unsure",
      photoUrl: "",
    },
  });
  
  // Load categories when modal opens
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadCategories();
    }
  }, [isOpen]);
  
  // Handle entry point changes and modal open/close
  useEffect(() => {
    if (isOpen) {
      // Reset GPS trigger if entry point changed
      if (entryPoint !== lastEntryPoint) {
        setHasAutoTriggeredGPS(false);
        setLastEntryPoint(entryPoint);
      }
      
      // Focus title input when entry point is "post"
      if (entryPoint === "post") {
        setTimeout(() => {
          form.setFocus("title");
        }, 100);
      }
      
      // Auto-trigger GPS when entry point is "location"
      if (entryPoint === "location" && !hasAutoTriggeredGPS) {
        setHasAutoTriggeredGPS(true);
        // Prefill with initialLocation if available
        if (initialLocation && !form.getValues("location")) {
          form.setValue("location", initialLocation);
        }
        setTimeout(() => {
          handleGetCurrentLocation();
        }, 300);
      }
    } else {
      // Reset when modal closes
      setHasAutoTriggeredGPS(false);
    }
  }, [isOpen, entryPoint]);
  
  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!isOpen) {
      form.reset();
      setUploadedPhotoUrl("");
      setSelectedCategoryId("");
    }
  }, [isOpen]);
  
  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const response = await fetch("/api/categories");
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    } finally {
      setCategoriesLoading(false);
    }
  };
  
  const loadSubcategories = async (categoryId: string) => {
    try {
      const response = await fetch(`/api/subcategories?categoryId=${categoryId}`);
      if (response.ok) {
        const data = await response.json();
        setSubcategories(data);
      }
    } catch (error) {
      console.error("Failed to load subcategories:", error);
      setSubcategories([]);
    }
  };

  // Photo upload functions
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const responseData = await response.json();
    return {
      method: "PUT" as const,
      url: responseData.uploadURL,
    };
  };

  const handlePhotoUploadStart = () => {
    setIsPhotoUploading(true);
  };

  const handlePhotoUploadComplete = async (result: any) => {
    setIsPhotoUploading(false);
    if (result.successful && result.successful.length > 0) {
      const uploadURL = result.successful[0].uploadURL;
      
      try {
        const response = await fetch('/api/objects/process-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            uploadURL,
            type: 'incident-photo'
          })
        });
        
        if (!response.ok) {
          throw new Error('Failed to process upload');
        }
        
        const data = await response.json();
        const viewURL = data.viewURL;
        
        setUploadedPhotoUrl(viewURL);
        form.setValue("photoUrl", viewURL);
        toast({
          title: "Photo Uploaded",
          description: "Your photo has been uploaded successfully.",
        });
      } catch (error) {
        console.error('Photo processing error:', error);
        toast({
          title: "Upload Processing Failed",
          description: "Failed to process photo. Please try again.",
          variant: "destructive",
        });
      }
    } else {
      toast({
        title: "Upload Failed",
        description: "Failed to upload photo. Please try again.",
        variant: "destructive",
      });
    }
  };

  const reportIncidentMutation = useMutation({
    mutationFn: async (data: ReportIncidentData) => {
      await apiRequest("POST", "/api/incidents/report", data);
    },
    onSuccess: () => {
      toast({
        title: "Post Shared!",
        description: "Your post is now visible to the community.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/unified"] });
      form.reset();
      setUploadedPhotoUrl("");
      setSelectedCategoryId("");
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "You need to be logged in to share posts. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500);
        return;
      }
      
      toast({
        title: "Post Failed",
        description: error instanceof Error ? error.message : "Failed to share post. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetCurrentLocation = async () => {
    if (!navigator.geolocation) {
      toast({
        title: "Location not available",
        description: "Your device doesn't support GPS location services.",
        variant: "destructive",
      });
      return;
    }

    setIsGettingLocation(true);

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
        });
      });

      const lat = position.coords.latitude;
      const lon = position.coords.longitude;

      try {
        const response = await fetch(`/api/location/reverse?lat=${lat}&lon=${lon}`);
        if (response.ok) {
          const data = await response.json();
          
          const parts = [];
          if (data.road) parts.push(data.road);
          if (data.suburb) parts.push(data.suburb);
          if (data.postcode) parts.push(data.postcode);
          
          const address = parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
          form.setValue('location', address);
          
          toast({
            title: "Location found!",
            description: `Set to: ${address}`,
          });
        } else {
          throw new Error('Address lookup failed');
        }
      } catch (error) {
        const coords = `${lat.toFixed(4)}, ${lon.toFixed(4)}`;
        form.setValue('location', coords);
        toast({
          title: "Location found!",
          description: `Set to coordinates: ${coords}`,
        });
      }
    } catch (error) {
      let errorMessage = "Unable to get your location.";
      
      if ((error as GeolocationPositionError).code === 1) {
        errorMessage = "Location access denied. Please enable location services.";
      } else if ((error as GeolocationPositionError).code === 2) {
        errorMessage = "Location unavailable. Please check your GPS.";
      } else if ((error as GeolocationPositionError).code === 3) {
        errorMessage = "Location request timed out. Please try again.";
      }

      toast({
        title: "Location failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsGettingLocation(false);
    }
  };

  const onSubmit = (data: ReportIncidentData) => {
    reportIncidentMutation.mutate(data);
  };

  // Watch form values for preview
  const locationValue = form.watch("location");
  const titleValue = form.watch("title");
  const categoryValue = form.watch("categoryId");
  const subcategoryValue = form.watch("subcategoryId");
  const hasPhoto = !!uploadedPhotoUrl;
  
  // Count required fields completed
  const completedRequired = [
    !!locationValue,
    !!titleValue,
    !!categoryValue,
    !!subcategoryValue,
  ].filter(Boolean).length;

  // Photo Section Component
  const PhotoSection = () => (
    <div className={`p-4 ${entryPoint === "photo" ? "bg-green-50 dark:bg-green-900/10 border-l-4 border-green-500" : "bg-muted/30"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Camera className="w-5 h-5 text-green-600 dark:text-green-400" />
        <span className="font-medium">Photo</span>
        {hasPhoto && <Badge variant="secondary" className="text-xs">Added</Badge>}
      </div>
      <FormField
        control={form.control}
        name="photoUrl"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="space-y-3">
                {uploadedPhotoUrl ? (
                  <div className="relative">
                    <div className="relative overflow-hidden rounded-xl border border-border">
                      <img
                        src={uploadedPhotoUrl}
                        alt="Uploaded photo"
                        className="w-full h-32 object-cover"
                        data-testid="img-uploaded-photo"
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setUploadedPhotoUrl("");
                          form.setValue("photoUrl", "");
                        }}
                        className="absolute top-2 right-2"
                        data-testid="button-remove-photo"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-border rounded-xl p-4 text-center bg-background">
                    <Upload className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground mb-2">
                      Add a photo (optional)
                    </p>
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880}
                      onGetUploadParameters={handleGetUploadParameters}
                      onStart={handlePhotoUploadStart}
                      onComplete={handlePhotoUploadComplete}
                      buttonClassName="inline-flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm"
                    >
                      <Camera className="w-4 h-4" />
                      Choose Photo
                    </ObjectUploader>
                  </div>
                )}
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Location Section Component  
  const LocationSection = () => (
    <div className={`p-4 ${entryPoint === "location" ? "bg-red-50 dark:bg-red-900/10 border-l-4 border-red-500" : "bg-muted/30"}`}>
      <div className="flex items-center gap-2 mb-3">
        <MapPin className="w-5 h-5 text-red-600 dark:text-red-400" />
        <span className="font-medium">Location</span>
        <span className="text-xs text-destructive">*required</span>
        {locationValue && <Badge variant="secondary" className="text-xs ml-auto">Set</Badge>}
      </div>
      <FormField
        control={form.control}
        name="location"
        render={({ field }) => (
          <FormItem>
            <FormControl>
              <div className="space-y-2">
                <LocationAutocomplete
                  value={field.value}
                  onChange={(location) => {
                    field.onChange(location);
                  }}
                  onClear={() => {
                    field.onChange("");
                  }}
                  onSelectComplete={() => {
                    // Focus the description field after location is selected
                    setTimeout(() => {
                      descriptionRef.current?.focus();
                    }, 50);
                  }}
                  placeholder="Enter address or landmark..."
                  disabled={false}
                />
                <Button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  disabled={isGettingLocation}
                  variant="outline"
                  className="w-full gap-2"
                  data-testid="button-use-gps-location"
                >
                  {isGettingLocation ? (
                    <>
                      <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      Finding your location...
                    </>
                  ) : (
                    <>
                      <Navigation className="w-4 h-4" />
                      Use My Current Location
                    </>
                  )}
                </Button>
              </div>
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Details Section Component
  const DetailsSection = () => (
    <div className={`p-4 space-y-4 ${entryPoint === "post" ? "bg-primary/5 border-l-4 border-primary" : "bg-muted/30"}`}>
      <div className="flex items-center gap-2">
        <PenSquare className="w-5 h-5 text-primary" />
        <span className="font-medium">Post Details</span>
        <span className="text-xs text-destructive">*required</span>
      </div>
      
      {/* Title */}
      <FormField
        control={form.control}
        name="title"
        render={({ field }) => (
          <FormItem>
            <FormLabel>What's happening?</FormLabel>
            <FormControl>
              <Input
                placeholder="Brief description..."
                {...field}
                data-testid="input-incident-title"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Category Selection */}
      <FormField
        control={form.control}
        name="categoryId"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Category</FormLabel>
            <Select 
              value={field.value}
              onValueChange={(value) => {
                field.onChange(value);
                setSelectedCategoryId(value);
                form.setValue("subcategoryId", "");
              }}
            >
              <FormControl>
                <SelectTrigger data-testid="select-category">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                {categoriesLoading ? (
                  <div className="px-2 py-2 text-sm text-muted-foreground">Loading...</div>
                ) : categories.length > 0 ? (
                  categories.map((category: any) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}
                    </SelectItem>
                  ))
                ) : (
                  <div className="px-2 py-2 text-sm text-muted-foreground">No categories</div>
                )}
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
      
      {/* Subcategory Selection */}
      {selectedCategoryId && (
        <FormField
          control={form.control}
          name="subcategoryId"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Type</FormLabel>
              <Select value={field.value} onValueChange={field.onChange}>
                <FormControl>
                  <SelectTrigger data-testid="select-subcategory">
                    <SelectValue placeholder="Choose type" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                  {(subcategories as any[]).map((subcategory: any) => (
                    <SelectItem key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
      )}

      {/* Description */}
      <FormField
        control={form.control}
        name="description"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Additional Details (Optional)</FormLabel>
            <FormControl>
              <Textarea
                placeholder="Add more context..."
                className="min-h-16"
                {...field}
                ref={(e) => {
                  field.ref(e);
                  (descriptionRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = e;
                }}
                data-testid="textarea-incident-description"
              />
            </FormControl>
            <FormMessage />
          </FormItem>
        )}
      />

      {/* Police Notified */}
      <FormField
        control={form.control}
        name="policeNotified"
        render={({ field }) => (
          <FormItem>
            <FormLabel>Authorities notified? (if applicable)</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl>
                <SelectTrigger data-testid="select-police-notified">
                  <SelectValue placeholder="Select option" />
                </SelectTrigger>
              </FormControl>
              <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                <SelectItem value="yes">Yes - Authorities notified</SelectItem>
                <SelectItem value="no">No - Not yet contacted</SelectItem>
                <SelectItem value="not_needed">Not applicable</SelectItem>
                <SelectItem value="unsure">Unsure</SelectItem>
              </SelectContent>
            </Select>
            <FormMessage />
          </FormItem>
        )}
      />
    </div>
  );

  // Render sections in order based on entry point
  const renderSections = () => {
    switch (entryPoint) {
      case "photo":
        return (
          <>
            <PhotoSection />
            <LocationSection />
            <DetailsSection />
          </>
        );
      case "location":
        return (
          <>
            <LocationSection />
            <DetailsSection />
            <PhotoSection />
          </>
        );
      case "post":
      default:
        return (
          <>
            <DetailsSection />
            <LocationSection />
            <PhotoSection />
          </>
        );
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-lg lg:max-w-xl max-h-[90vh] flex flex-col p-0">
        {/* Custom Header with Entry Point Indicator */}
        <div className="flex-shrink-0 p-4 pb-3 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className={`p-1.5 rounded-lg ${config.color}`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <DialogTitle className="text-lg">{config.label}</DialogTitle>
            </div>
            <Badge variant={completedRequired === 4 ? "default" : "secondary"} className="text-xs">
              {completedRequired}/4 required
            </Badge>
          </div>
          <DialogDescription className="text-sm">
            {config.description}
          </DialogDescription>
        </div>
        
        <div className="flex-1 overflow-y-auto">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-0 divide-y divide-border">
              {renderSections()}

              {/* Submit Buttons */}
              <div className="flex gap-3 p-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  data-testid="button-cancel-report"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={reportIncidentMutation.isPending || isPhotoUploading}
                  className="flex-1"
                  data-testid="button-submit-report"
                >
                  {reportIncidentMutation.isPending ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Sharing...
                    </div>
                  ) : isPhotoUploading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Uploading...
                    </div>
                  ) : (
                    "Share Post"
                  )}
                </Button>
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
