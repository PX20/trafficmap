import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, X, MapPin, Clock, AlertTriangle, Shield, Car, Flame, Heart, Users, Construction, Trees, Search, Zap } from "lucide-react";
import { decodeIncidentId } from "@/lib/incident-utils";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { InlineComments } from "@/components/inline-comments";
import { getIncidentCategory, getIncidentSubcategory, getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";
import { getIncidentTitle, getIncidentLocation } from "@/lib/incident-utils";

export interface IncidentDetailPageProps {
  /** Whether to render as a modal overlay (default) or full page */
  asModal?: boolean;
  /** Incident ID to display - if provided, overrides URL params */
  incidentId?: string;
}

function IncidentDetailPage({ asModal = true, incidentId: propIncidentId }: IncidentDetailPageProps) {
  const { incidentId: urlIncidentId } = useParams<{ incidentId: string }>();
  const [, setLocation] = useLocation();
  
  // Use prop incidentId if provided, otherwise use URL param
  const incidentId = propIncidentId || urlIncidentId;
  
  // Decode the URL-encoded incident ID
  const decodedId = incidentId ? decodeIncidentId(incidentId) : null;
  
  // Fetch unified incidents data
  const { data: unifiedData, isLoading } = useQuery({
    queryKey: ["/api/unified"],
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  // Find the specific incident by ID, handling prefixed IDs from navigateToIncident
  const incident = (unifiedData as any)?.features?.find((feature: any) => {
    if (!decodedId) return false;
    
    // Handle prefixed IDs created by getIncidentId/navigateToIncident
    if (decodedId.startsWith('tmr:')) {
      const tmrId = decodedId.substring(4); // Remove "tmr:" prefix
      return feature.properties?.id === tmrId;
    }
    
    if (decodedId.startsWith('esq:')) {
      const esqId = decodedId.substring(4); // Remove "esq:" prefix
      return feature.properties?.Master_Incident_Number === esqId ||
             feature.properties?.Incident_Number === esqId ||
             feature.properties?.IncidentNumber === esqId;
    }
    
    // For unprefixed IDs (direct matches and user reports)
    return feature.id === decodedId || 
           feature.properties?.id === decodedId ||
           feature.properties?.Master_Incident_Number === decodedId ||
           feature.properties?.reporterId === decodedId;
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
  
  // Helper function to get the appropriate icon
  const getIcon = (iconName: string) => {
    const iconMap: { [key: string]: any } = {
      'Car': Car,
      'AlertTriangle': AlertTriangle,
      'Shield': Shield,
      'Flame': Flame,
      'Heart': Heart,
      'Users': Users,
      'Construction': Construction,
      'Trees': Trees,
      'Search': Search,
      'Zap': Zap
    };
    return iconMap[iconName] || AlertTriangle;
  };

  const IconComponent = getIcon(iconName);

  const content = (
    <div className="relative">
      {/* Close Button */}
      <Button 
        variant="ghost" 
        size="sm" 
        onClick={handleClose}
        className="absolute top-0 right-0 z-10"
        data-testid="close-incident-detail"
      >
        <X className="h-4 w-4" />
      </Button>

      {/* Main Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-gray-50/30 to-white">
        <CardHeader className={`pb-4 rounded-t-lg ${
          source === 'emergency' ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200' :
          source === 'tmr' ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200' :
          source === 'user' ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200' :
          'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200'
        }`}>
          {/* Header Section */}
          <div className="flex items-start gap-4">
            {/* Incident Icon */}
            <div className={`flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center shadow-lg ring-2 ${
              source === 'emergency' ? 'bg-gradient-to-br from-red-500 to-red-600 ring-red-200' :
              source === 'tmr' ? 'bg-gradient-to-br from-orange-500 to-orange-600 ring-orange-200' :
              source === 'user' ? 'bg-gradient-to-br from-purple-500 to-purple-600 ring-purple-200' :
              'bg-gradient-to-br from-gray-500 to-gray-600 ring-gray-200'
            }`}>
              <IconComponent className="h-6 w-6 text-white" />
            </div>
            
            {/* Title and Meta */}
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-gray-900 mb-2 leading-tight" data-testid="incident-title">
                {title}
              </h1>
              
              {/* Location with icon */}
              <div className="flex items-center gap-2 text-gray-600 mb-3">
                <MapPin className="h-4 w-4" />
                <span className="text-sm" data-testid="incident-location">{location}</span>
              </div>
              
              {/* Categories and Source */}
              <div className="flex flex-wrap gap-2">
                {category && (
                  <Badge variant="secondary" className={`${
                    source === 'emergency' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                    source === 'tmr' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                    source === 'user' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                    'bg-gray-100 text-gray-800 hover:bg-gray-200'
                  } text-xs font-medium`}>
                    {category}
                  </Badge>
                )}
                {subcategory && (
                  <Badge variant="outline" className="text-xs">
                    {subcategory}
                  </Badge>
                )}
                <Badge className={`text-xs font-medium ${
                  source === 'emergency' ? 'bg-red-500 hover:bg-red-600' :
                  source === 'tmr' ? 'bg-orange-500 hover:bg-orange-600' :
                  source === 'user' ? 'bg-purple-500 hover:bg-purple-600' :
                  'bg-gray-500 hover:bg-gray-600'
                }`}>
                  {source === 'emergency' ? 'Emergency Services' :
                   source === 'tmr' ? 'TMR Traffic' :
                   source === 'user' ? 'Community Report' :
                   'Unknown Source'}
                </Badge>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 p-6">
          {/* Reporter attribution for user reports */}
          {isUserReport && reporterUserId && (
            <div className={`rounded-xl p-4 border-l-4 ${
              source === 'user' ? 'bg-purple-50 border-purple-200' : 'bg-gray-50 border-gray-200'
            }`}>
              <p className="text-sm font-medium text-gray-600 mb-3">Reported by</p>
              <ReporterAttribution 
                userId={reporterUserId} 
                variant="default"
              />
            </div>
          )}
          
          {/* Description Card */}
          <Card className="border border-gray-200/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <h3 className="font-semibold text-gray-900">Description</h3>
              </div>
              <p className="text-gray-700 leading-relaxed whitespace-pre-wrap" data-testid="incident-description">
                {description}
              </p>
            </CardContent>
          </Card>
          
          {/* Timestamp Card */}
          {timestamp && (
            <Card className="border border-gray-200/60 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="font-semibold text-gray-900">Time</h3>
                </div>
                <p className="text-gray-700">
                  {new Date(timestamp).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Comments section for user reports */}
          {isUserReport && incident && (
            <Card className="border border-purple-200/60 shadow-sm bg-purple-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <Users className="h-4 w-4 text-purple-600" />
                  <h3 className="font-semibold text-gray-900">Comments</h3>
                </div>
                <InlineComments 
                  incident={incident} 
                  onClose={() => {}} // Comments don't need close functionality in this context
                />
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
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
export default function IncidentDetailRoute(props: IncidentDetailPageProps) {
  return <IncidentDetailPage asModal={true} {...props} />;
}