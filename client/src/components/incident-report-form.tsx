import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

const reportIncidentSchema = z.object({
  incidentType: z.string().min(1, "Incident type is required"),
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  location: z.string().min(1, "Location is required"),
  priority: z.enum(["High", "Medium", "Low"]).optional(),
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
  
  const form = useForm<ReportIncidentData>({
    resolver: zodResolver(reportIncidentSchema),
    defaultValues: {
      incidentType: "",
      title: "",
      description: "",
      location: initialLocation || "",
      priority: "Medium",
    },
  });

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

  const onSubmit = (data: ReportIncidentData) => {
    reportIncidentMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report Traffic Incident</DialogTitle>
          <DialogDescription>
            Report a traffic incident or hazard you've observed to help other drivers stay informed.
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="incidentType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Incident Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-incident-type">
                        <SelectValue placeholder="Select incident type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="Accident">Accident</SelectItem>
                      <SelectItem value="Breakdown">Vehicle Breakdown</SelectItem>
                      <SelectItem value="Roadwork">Roadwork</SelectItem>
                      <SelectItem value="Hazard">Road Hazard</SelectItem>
                      <SelectItem value="Weather">Weather Related</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    <Input
                      placeholder="Street name, intersection, or landmark"
                      {...field}
                      data-testid="input-incident-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="priority"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Priority Level</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-priority">
                        <SelectValue placeholder="Select priority" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="High">High - Blocking traffic</SelectItem>
                      <SelectItem value="Medium">Medium - Causing delays</SelectItem>
                      <SelectItem value="Low">Low - Minor hazard</SelectItem>
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
                      placeholder="Provide any additional details about the incident..."
                      className="min-h-20"
                      {...field}
                      data-testid="textarea-incident-description"
                    />
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
      </DialogContent>
    </Dialog>
  );
}