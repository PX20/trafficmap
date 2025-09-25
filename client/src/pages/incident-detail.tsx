import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, X } from "lucide-react";
import { decodeIncidentId } from "@/lib/incident-utils";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { InlineComments } from "@/components/inline-comments";
import { getIncidentCategory, getIncidentSubcategory, getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";
import { getIncidentTitle, getIncidentLocation } from "@/lib/incident-utils";

interface IncidentDetailPageProps {
  /** Whether to render as a modal overlay (default) or full page */
  asModal?: boolean;
}

function IncidentDetailPage({ asModal = true }: IncidentDetailPageProps) {
  const { incidentId } = useParams<{ incidentId: string }>();
  const [, setLocation] = useLocation();
  
  // Decode the URL-encoded incident ID
  const decodedId = incidentId ? decodeIncidentId(incidentId) : null;
  
  // Fetch unified incidents data
  const { data: unifiedData, isLoading } = useQuery({
    queryKey: ["/api/unified"],
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  // Find the specific incident by ID
  const incident = (unifiedData as any)?.features?.find((feature: any) => {
    // Check multiple possible ID formats
    return feature.id === decodedId || 
           feature.properties?.id === decodedId ||
           feature.properties?.Master_Incident_Number === decodedId ||
           feature.properties?.reportId === decodedId;
  }) || null;
  
  // Handle close - navigate back or to home
  const handleClose = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation('/');
    }
  };
  
  // If no incident found, show error
  if (!isLoading && !incident) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Incident Not Found</DialogTitle>
          </DialogHeader>
          <div className="p-4 text-center">
            <p className="text-muted-foreground mb-4">
              The incident you're looking for could not be found.
            </p>
            <Button onClick={handleClose}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Loading state
  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading incident details...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  // Extract incident details
  const title = getIncidentTitle(incident);
  const location = getIncidentLocation(incident);
  const category = getIncidentCategory(incident);
  const subcategory = getIncidentSubcategory(incident);
  const reporterUserId = getReporterUserId(incident);
  const { iconName, color } = getIncidentIconProps(incident);
  
  // Extract source and determine if it's user-reported
  const source = incident?.properties?.source || 'unknown';
  const isUserReport = source === 'user_reports' || incident?.properties?.userReported;
  
  // Extract description
  const description = incident?.properties?.description || 
                     incident?.properties?.Event_Type || 
                     incident?.properties?.details || 
                     'No description available';
  
  // Extract timestamp
  const timestamp = incident?.properties?.incidentTime || 
                   incident?.properties?.lastUpdated || 
                   incident?.properties?.publishedAt ||
                   incident?.properties?.createdAt;
  
  const content = (
    <div className="space-y-6">
      {/* Header with close button */}
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <h1 className="text-2xl font-bold mb-2" data-testid="incident-title">
            {title}
          </h1>
          <p className="text-muted-foreground" data-testid="incident-location">
            📍 {location}
          </p>
        </div>
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleClose}
          className="ml-4"
          data-testid="close-incident-detail"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      {/* Category and source info */}
      <div className="flex flex-wrap gap-2">
        {category && (
          <span className="px-2 py-1 bg-primary/10 text-primary rounded text-sm">
            {category}
          </span>
        )}
        {subcategory && (
          <span className="px-2 py-1 bg-secondary/10 text-secondary-foreground rounded text-sm">
            {subcategory}
          </span>
        )}
        <span className={`px-2 py-1 rounded text-sm ${
          source === 'emergency' ? 'bg-red-100 text-red-800' :
          source === 'tmr' ? 'bg-blue-100 text-blue-800' :
          source === 'user_reports' ? 'bg-green-100 text-green-800' :
          'bg-gray-100 text-gray-800'
        }`}>
          {source === 'emergency' ? 'Emergency Services' :
           source === 'tmr' ? 'TMR Traffic' :
           source === 'user_reports' ? 'Community Report' :
           'Unknown Source'}
        </span>
      </div>
      
      {/* Reporter attribution for user reports */}
      {isUserReport && reporterUserId && (
        <div className="border-l-4 border-primary/20 pl-4">
          <p className="text-sm text-muted-foreground mb-2">Reported by</p>
          <ReporterAttribution 
            userId={reporterUserId} 
            variant="default"
          />
        </div>
      )}
      
      {/* Description */}
      <div>
        <h3 className="font-semibold mb-2">Description</h3>
        <p className="text-muted-foreground whitespace-pre-wrap" data-testid="incident-description">
          {description}
        </p>
      </div>
      
      {/* Timestamp */}
      {timestamp && (
        <div>
          <h3 className="font-semibold mb-2">Time</h3>
          <p className="text-muted-foreground">
            {new Date(timestamp).toLocaleString()}
          </p>
        </div>
      )}
      
      {/* Comments section for user reports */}
      {isUserReport && incident && (
        <div>
          <h3 className="font-semibold mb-4">Comments</h3>
          <InlineComments 
            incident={incident} 
            onClose={() => {}} // Comments don't need close functionality in this context
          />
        </div>
      )}
    </div>
  );
  
  // Render as modal or full page
  if (asModal) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto p-6">
      {content}
    </div>
  );
}

// Route wrapper component that matches wouter expectations
export default function IncidentDetailRoute() {
  return <IncidentDetailPage asModal={true} />;
}