import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { ArrowLeft, Save, X } from "lucide-react";

const editIncidentSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  categoryId: z.string().min(1, "Category is required"),
  subcategoryId: z.string().min(1, "Subcategory is required"),
});

type EditIncidentData = z.infer<typeof editIncidentSchema>;

interface EditIncidentProps {
  params: { id: string };
}

export default function EditIncident({ params }: EditIncidentProps) {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  const incidentId = params.id;
  
  // Decode the incident ID if it's URL-encoded
  const decodedId = incidentId ? decodeURIComponent(incidentId) : null;

  // Fetch posts data and find the specific post
  const { data: postsData, isLoading: incidentLoading } = useQuery({
    queryKey: ['/api/posts'],
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  // Find the post by ID
  const incident = (postsData as any)?.features?.find((feature: any) => {
    if (!decodedId) return false;
    return feature.id === decodedId || feature.properties?.id === decodedId;
  }) || null;

  // Load categories and subcategories
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const response = await fetch("/api/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data);
        }
      } catch (error) {
        console.error("Failed to load categories:", error);
      }
    };
    loadCategories();
  }, []);

  useEffect(() => {
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

    if (selectedCategoryId) {
      loadSubcategories(selectedCategoryId);
    } else {
      setSubcategories([]);
    }
  }, [selectedCategoryId]);

  const form = useForm<EditIncidentData>({
    resolver: zodResolver(editIncidentSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      categoryId: "",
      subcategoryId: "",
    },
  });

  // Update form when incident data loads
  useEffect(() => {
    if (incident && incident.properties) {
      const props = incident.properties;
      form.reset({
        title: props.title || "",
        description: props.description || "",
        location: props.location || props.locationDescription || "",
        categoryId: props.categoryId || "",
        subcategoryId: props.subcategoryId || "",
      });
      setSelectedCategoryId(props.categoryId || "");
    }
  }, [incident, form]);

  const updateIncidentMutation = useMutation({
    mutationFn: async (data: EditIncidentData) => {
      const response = await apiRequest("PUT", `/api/posts/${incidentId}`, data);
      if (!response.ok) throw new Error('Failed to update post');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Post Updated!",
        description: "Your post has been updated successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      queryClient.invalidateQueries({ queryKey: ['/api/posts', incidentId] });
      setLocation('/');
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update incident. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: EditIncidentData) => {
    updateIncidentMutation.mutate(data);
  };

  const handleCancel = () => {
    setLocation('/');
  };

  if (incidentLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading incident...</p>
        </div>
      </div>
    );
  }

  if (!incident) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Incident Not Found</h1>
          <p className="text-muted-foreground mb-4">The incident you're trying to edit doesn't exist.</p>
          <Button onClick={() => setLocation('/')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="max-w-2xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" onClick={handleCancel}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Edit Incident Report</h1>
            <p className="text-muted-foreground">Update your community incident report</p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Incident Details</CardTitle>
            <CardDescription>Make changes to your incident report</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                          <SelectTrigger data-testid="select-edit-category">
                            <SelectValue placeholder="Choose a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {categories.map((category: any) => (
                            <SelectItem key={category.id} value={category.id}>
                              {category.name}
                            </SelectItem>
                          ))}
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
                        <FormLabel>Specific Type</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-subcategory">
                              <SelectValue placeholder="Choose specific type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {subcategories.map((subcategory: any) => (
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

                {/* Title */}
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
                          data-testid="input-edit-title"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Location */}
                <FormField
                  control={form.control}
                  name="location"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Location</FormLabel>
                      <FormControl>
                        <LocationAutocomplete
                          value={field.value}
                          onChange={(location) => field.onChange(location)}
                          onClear={() => field.onChange("")}
                          placeholder="Enter street address, intersection, or landmark..."
                          disabled={false}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description (Optional)</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Provide additional details about the incident..."
                          className="min-h-24"
                          {...field}
                          data-testid="textarea-edit-description"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Form Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleCancel}
                    className="flex-1 sm:flex-none"
                    data-testid="button-cancel-edit"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={updateIncidentMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-edit"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {updateIncidentMutation.isPending ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}