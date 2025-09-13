import { useState, useEffect } from "react";
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
import { Camera, Upload, Image, CheckCircle } from "lucide-react";

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
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  
  // Simple state for categories and subcategories
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  
  // Load categories when modal opens
  useEffect(() => {
    if (isOpen && categories.length === 0) {
      loadCategories();
    }
  }, [isOpen]);
  
  // Load subcategories when category changes
  useEffect(() => {
    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);
  
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

  const handlePhotoUploadStart = () => {
    setIsPhotoUploading(true);
  };

  const handlePhotoUploadComplete = (result: any) => {
    setIsPhotoUploading(false);
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      setUploadedPhotoUrl(uploadedUrl);
      form.setValue("photoUrl", uploadedUrl);
      toast({
        title: "Photo Uploaded",
        description: "Your photo has been uploaded successfully.",
      });
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
        title: "Report Submitted! ✅",
        description: "Your incident will appear on the map shortly. Thank you for keeping the community informed.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      form.reset();
      onClose();
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Login Required",
          description: "You need to be logged in to report incidents. Redirecting to login...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 1500); // Give users time to read the message
        return;
      }
      
      toast({
        title: "Report Failed",
        description: error instanceof Error ? error.message : "Failed to submit incident report. Please try again.",
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

      // Try to get readable address
      try {
        const response = await fetch(`/api/location/reverse?lat=${lat}&lon=${lon}`);
        if (response.ok) {
          const data = await response.json();
          
          // Build address string with street name and suburb
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
        // Fallback to coordinates
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
      <DialogContent className="w-[95vw] sm:max-w-lg lg:max-w-xl max-h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Share Community Information</DialogTitle>
          <DialogDescription>
            Share local information, observations, or community updates to help keep neighbors informed and connected.
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
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCategoryId(value);
                      form.setValue("subcategoryId", ""); // Reset subcategory when category changes
                    }}
                  >
                    <FormControl>
                      <SelectTrigger data-testid="select-category">
                        <SelectValue placeholder="Choose a category" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                      {categoriesLoading ? (
                        <div className="px-2 py-2 text-sm text-gray-500">Loading categories...</div>
                      ) : categories.length > 0 ? (
                        categories.map((category: any) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="px-2 py-2 text-sm text-gray-500">No categories available</div>
                      )}
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
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-subcategory">
                          <SelectValue placeholder="Choose specific type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
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
                      placeholder="Brief description of what you want to share"
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
                  <FormLabel>Have authorities been notified? (if applicable)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-police-notified">
                        <SelectValue placeholder="Select option" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent position="popper" sideOffset={4} className="z-[9999]" side="bottom" align="start">
                      <SelectItem value="yes">Yes - Authorities have been notified</SelectItem>
                      <SelectItem value="no">No - Authorities haven't been contacted yet</SelectItem>
                      <SelectItem value="not_needed">Not applicable - No authorities needed</SelectItem>
                      <SelectItem value="unsure">Unsure - Not sure if authorities are needed</SelectItem>
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
                      placeholder="Provide additional context, details, or helpful information for the community..."
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-incident-description"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modern Photo Upload Section */}
            <FormField
              control={form.control}
              name="photoUrl"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel className="text-base font-semibold text-gray-900 flex items-center gap-2">
                    <div className="p-1.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                      <Image className="w-4 h-4 text-white" />
                    </div>
                    Add Photo (Optional)
                  </FormLabel>
                  <FormControl>
                    <div className="space-y-4">
                      {uploadedPhotoUrl ? (
                        <div className="relative group">
                          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 shadow-sm">
                            <img
                              src={uploadedPhotoUrl}
                              alt="Uploaded photo"
                              className="w-full h-48 object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                            <div className="absolute top-3 right-3 flex gap-2">
                              <div className="p-1.5 bg-green-500 rounded-full">
                                <CheckCircle className="w-4 h-4 text-white" />
                              </div>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setUploadedPhotoUrl("");
                              form.setValue("photoUrl", "");
                            }}
                            className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm hover:bg-white border-gray-200 hover:border-gray-300 shadow-sm"
                          >
                            Remove Photo
                          </Button>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          <div className="border-2 border-dashed border-blue-300 rounded-2xl p-8 text-center bg-gradient-to-br from-blue-50/50 via-white to-purple-50/50 hover:from-blue-100/60 hover:via-white hover:to-purple-100/60 transition-all duration-300 hover:border-blue-400 hover:shadow-lg">
                            <div className="space-y-4">
                              <div className="flex justify-center">
                                <div className="relative">
                                  <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl transition-all duration-300 shadow-lg">
                                    <Upload className="w-8 h-8 text-white" />
                                  </div>
                                  <div className="absolute -top-1 -right-1 p-1 bg-white rounded-full shadow-sm">
                                    <Camera className="w-4 h-4 text-gray-600" />
                                  </div>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  Add Photo
                                </h4>
                                <p className="text-gray-600">
                                  Choose an image to help share information
                                </p>
                                <div className="flex items-center justify-center gap-4 pt-2">
                                  <div className="px-3 py-1 bg-white/60 rounded-full border border-gray-200 text-xs text-gray-500">
                                    JPG, PNG, GIF
                                  </div>
                                  <div className="px-3 py-1 bg-white/60 rounded-full border border-gray-200 text-xs text-gray-500">
                                    Max 5MB
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <ObjectUploader
                            maxNumberOfFiles={1}
                            maxFileSize={5242880}
                            onGetUploadParameters={handleGetUploadParameters}
                            onStart={handlePhotoUploadStart}
                            onComplete={handlePhotoUploadComplete}
                            buttonClassName="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-md hover:shadow-lg transition-all duration-200"
                          >
                            <div className="flex items-center justify-center gap-2">
                              <Camera className="w-5 h-5" />
                              Choose Photo
                            </div>
                          </ObjectUploader>
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="flex-1 sm:flex-none px-6 py-3 border-gray-300 hover:border-gray-400 hover:bg-gray-50"
                data-testid="button-cancel-report"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={reportIncidentMutation.isPending || isPhotoUploading}
                className="flex-1 px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                data-testid="button-submit-report"
              >
                {reportIncidentMutation.isPending ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Submitting Report...
                  </div>
                ) : isPhotoUploading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Uploading Photo...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Share Information
                  </div>
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