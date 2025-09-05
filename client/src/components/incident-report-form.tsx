import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Navigation } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { ObjectUploader } from "@/components/ObjectUploader";
import { Camera } from "lucide-react";

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

interface IncidentReportFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation?: string;
}

export function IncidentReportForm({ isOpen, onClose, initialLocation }: IncidentReportFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [uploadedPhotoUrl, setUploadedPhotoUrl] = useState<string>("");
  
  // Fetch categories and subcategories
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    queryFn: async () => {
      const response = await fetch("/api/categories");
      if (!response.ok) throw new Error('Failed to fetch categories');
      return response.json();
    },
    select: (data: any) => data || [],
  });
  
  const { data: subcategories = [] } = useQuery({
    queryKey: ["/api/subcategories", selectedCategoryId],
    queryFn: async () => {
      if (!selectedCategoryId) return [];
      const response = await fetch(`/api/subcategories?categoryId=${selectedCategoryId}`);
      if (!response.ok) throw new Error('Failed to fetch subcategories');
      return response.json();
    },
    enabled: isOpen && !!selectedCategoryId,
  });
  
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

  // Photo upload functions
  const handleGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const responseData = await response.json();
    return {
      method: "PUT" as const,
      url: responseData.uploadURL,
    };
  };

  const handlePhotoUploadComplete = (result: any) => {
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      setUploadedPhotoUrl(uploadedUrl);
      form.setValue("photoUrl", uploadedUrl);
      toast({
        title: "Photo Uploaded",
        description: "Your photo has been uploaded successfully.",
      });
    }
  };

  const reportIncidentMutation = useMutation({
    mutationFn: async (data: ReportIncidentData) => {
      await apiRequest("POST", "/api/incidents/report", data);
    },
    onSuccess: () => {
      toast({
        title: "Incident Reported",
        description: "Your incident report has been submitted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to submit incident report",
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
          timeout: 15000,
          maximumAge: 300000 // 5 minutes
        });
      });

      const coordinates = {
        lat: position.coords.latitude,
        lon: position.coords.longitude
      };

      // Try to reverse geocode the coordinates to get a readable address
      try {
        const response = await fetch(`/api/location/reverse?lat=${coordinates.lat}&lon=${coordinates.lon}`);
        if (response.ok) {
          const locationData = await response.json();
          const locationText = locationData.suburb ? 
            `${locationData.suburb} ${locationData.postcode || ''}`.trim() :
            `${coordinates.lat.toFixed(5)}, ${coordinates.lon.toFixed(5)}`;

          form.setValue('location', locationText);

          toast({
            title: "Location found!",
            description: `Location set to ${locationText}`,
          });
        } else {
          throw new Error('Reverse geocoding failed');
        }
      } catch (error) {
        // Fallback to coordinates if reverse geocoding fails
        const locationText = `${coordinates.lat.toFixed(5)}, ${coordinates.lon.toFixed(5)}`;
        form.setValue('location', locationText);

        toast({
          title: "Location found!",
          description: "GPS coordinates have been added to the location field.",
        });
      }
    } catch (error) {
      let errorMessage = "Unable to get your location.";
      
      if ((error as GeolocationPositionError).code === 1) {
        errorMessage = "Location access denied. Please enable location services and allow access in your browser.";
      } else if ((error as GeolocationPositionError).code === 2) {
        errorMessage = "Location unavailable. Please check your GPS connection.";
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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Report Safety Incident</DialogTitle>
          <DialogDescription>
            Report any safety concern, incident, or suspicious activity you've observed to help keep the community informed and safe.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-1 sm:pr-2">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Category Selection */}
            <FormField
              control={form.control}
              name="categoryId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCategoryId(value);
                      form.setValue("subcategoryId", ""); // Reset subcategory when category changes
                    }} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {(categories as any[]).map((category: any) => (
                        <SelectItem key={category.id} value={category.id}>
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-3 h-3 rounded-full" 
                              style={{ backgroundColor: category.color }}
                            />
                            <span>{category.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Subcategory Selection - Only show when category is selected */}
            {selectedCategoryId && (
              <FormField
                control={form.control}
                name="subcategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specific Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subcategory">
                          <SelectValue placeholder="Choose specific type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(subcategories as any[]).map((subcategory: any) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            <div className="flex flex-col">
                              <span className="font-medium">{subcategory.name}</span>
                              {subcategory.description && (
                                <span className="text-xs text-muted-foreground">
                                  {subcategory.description}
                                </span>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Brief description of the incident"
                      {...field}
                      data-testid="input-incident-title"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <div className="flex gap-2">
                      <div className="flex-1">
                        <LocationAutocomplete
                          value={field.value}
                          onChange={(location) => {
                            field.onChange(location);
                          }}
                          onClear={() => {
                            field.onChange("");
                          }}
                          placeholder="Enter street address, intersection, or landmark..."
                          disabled={false}
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={handleGetCurrentLocation}
                        disabled={isGettingLocation}
                        size="sm"
                        variant="outline"
                        className="flex items-center gap-1 px-2 sm:px-3 flex-shrink-0"
                        data-testid="button-use-gps-location"
                      >
                        {isGettingLocation ? (
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Navigation className="w-4 h-4" />
                            <span className="text-xs hidden sm:inline">GPS</span>
                          </>
                        )}
                      </Button>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="policeNotified"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Have you notified police?</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-police-notified">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="yes">Yes - I have contacted police</SelectItem>
                      <SelectItem value="no">No - I haven't contacted police yet</SelectItem>
                      <SelectItem value="not_needed">Not needed - This doesn't require police</SelectItem>
                      <SelectItem value="unsure">Unsure - Not sure if police are needed</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Details (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Describe what you observed, number of people involved, vehicle descriptions, direction of travel, etc..."
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-incident-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Photo Upload Field */}
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Add Photo (Optional)</FormLabel>
                  <FormControl>
                    <div className="space-y-3">
                      {uploadedPhotoUrl ? (
                        <div className="relative">
                          <img
                            src={uploadedPhotoUrl}
                            alt="Uploaded incident photo"
                            className="max-w-full h-32 object-cover rounded-lg border"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadedPhotoUrl("");
                              form.setValue("photoUrl", "");
                            }}
                            className="absolute top-2 right-2"
                          >
                            Remove
                          </Button>
                        </div>
                      ) : (
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880}
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handlePhotoUploadComplete}
                          buttonClassName="w-full border-dashed border-2 border-gray-300 hover:border-gray-400"
                        >
                          <div className="flex items-center justify-center gap-2 py-8">
                            <Camera className="w-5 h-5 text-gray-500" />
                            <span className="text-gray-600">Add Photo</span>
                          </div>
                        </ObjectUploader>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                data-testid="button-cancel-report"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={reportIncidentMutation.isPending}
                data-testid="button-submit-report"
              >
                {reportIncidentMutation.isPending ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}