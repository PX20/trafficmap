import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, X, MapPin, Clock, AlertTriangle, Shield, Car, Flame, Heart, Users, Construction, Trees, Search, Zap, MessageCircle, Share, Pencil, Trash } from "lucide-react";
import { decodeIncidentId } from "@/lib/incident-utils";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { InlineComments } from "@/components/inline-comments";
import { getIncidentCategory, getIncidentSubcategory, getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";
import { getIncidentTitle, getIncidentLocation } from "@/lib/incident-utils";
import { getAgencyInfo } from "@/lib/agency-info";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";

export interface IncidentDetailPageProps {
  /** Whether to render as a modal overlay (default) or full page */
  asModal?: boolean;
  /** Incident ID to display - if provided, overrides URL params */
  incidentId?: string;
}

function IncidentDetailPage({ asModal = true, incidentId: propIncidentId }: IncidentDetailPageProps) {
  const { incidentId: urlIncidentId } = useParams<{ incidentId: string }>();
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Use prop incidentId if provided, otherwise use URL param
  const incidentId = propIncidentId || urlIncidentId;
  
  // Social interaction state
  const [showComments, setShowComments] = useState(false);
  
  // Decode the URL-encoded incident ID
  const decodedId = incidentId ? decodeIncidentId(incidentId) : null;
  
  // Delete mutation
  const deleteIncidentMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/unified-incidents/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Incident Deleted",
        description: "Your incident has been deleted successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/unified"] });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: "Delete Failed",
        description: error.message || "Failed to delete incident. Please try again.",
        variant: "destructive",
      });
    },
  });
  
  // Fetch unified incidents data
  const { data: unifiedData, isLoading } = useQuery({
    queryKey: ["/api/unified"],
    staleTime: 1 * 60 * 1000, // 1 minute
  });
  
  // Find the specific incident by ID, handling prefixed IDs from navigateToIncident
  const incident = (unifiedData as any)?.features?.find((feature: any) => {
    if (!decodedId) return false;
    
    // Direct ID match (works for all unified incident IDs: tmr:xxx, user:xxx, esq:xxx)
    if (feature.id === decodedId) {
      return true;
    }
    
    // Also check properties.id for backward compatibility
    if (feature.properties?.id === decodedId) {
      return true;
    }
    
    // Handle legacy prefixed emergency IDs (esq:xxx format)
    if (decodedId.startsWith('esq:')) {
      const esqId = decodedId.substring(4); // Remove "esq:" prefix
      return feature.properties?.Master_Incident_Number === esqId ||
             feature.properties?.Incident_Number === esqId ||
             feature.properties?.IncidentNumber === esqId;
    }
    
    // For user reports with reporterId
    if (feature.properties?.reporterId === decodedId) {
      return true;
    }
    
    return false;
  }) || null;
  

  // Fetch comments count
  const { data: commentsData } = useQuery({
    queryKey: ["/api/incidents", decodedId, "comments"],
    queryFn: async () => {
      if (!decodedId) return null;
      const response = await fetch(`/api/incidents/${decodedId}/social/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!decodedId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });


  // Social interaction handlers

  const handleCommentsToggle = () => {
    setShowComments(!showComments);
  };

  const handleShareClick = async () => {
    if (!incident) return;
    
    const shareUrl = `${window.location.origin}/incident/${incidentId}`;
    const shareTitle = getIncidentTitle(incident);
    const shareText = `${shareTitle} - ${getIncidentLocation(incident)}`;

    // Try native Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "Shared successfully",
          description: "Incident shared successfully.",
        });
        return;
      } catch (error) {
        // User cancelled or error occurred - fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copied",
        description: "Incident link copied to clipboard.",
      });
    } catch (error) {
      toast({
        title: "Share failed",
        description: "Unable to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };
  
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
  const source = incident?.source || incident?.properties?.source || 'unknown';
  const isUserReport = source === 'user' || incident?.properties?.userReported;
  
  // Check if current user is the incident creator
  const isIncidentCreator = user && reporterUserId && user.id === reporterUserId;
  
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
      {/* Main Card */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-white via-gray-50/30 to-white">
        <CardHeader className={`pb-3 pt-4 px-3 md:px-6 rounded-t-lg ${
          source === 'emergency' ? 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200' :
          source === 'tmr' ? 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200' :
          source === 'user' ? 'bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200' :
          'bg-gradient-to-br from-gray-50 to-gray-100/50 border-gray-200'
        }`}>
          {/* Header Section */}
          <div className="flex items-start gap-3">
            {/* Incident Icon */}
            <div className={`flex-shrink-0 w-11 h-11 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-lg ring-2 ${
              source === 'emergency' ? 'bg-gradient-to-br from-red-500 to-red-600 ring-red-200' :
              source === 'tmr' ? 'bg-gradient-to-br from-orange-500 to-orange-600 ring-orange-200' :
              source === 'user' ? 'bg-gradient-to-br from-purple-500 to-purple-600 ring-purple-200' :
              'bg-gradient-to-br from-gray-500 to-gray-600 ring-gray-200'
            }`}>
              <IconComponent className="h-5 w-5 md:h-6 md:w-6 text-white" />
            </div>
            
            {/* Title and Meta */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <h1 className="text-lg md:text-xl font-bold text-gray-900 leading-tight flex-1" data-testid="incident-title">
                  {title}
                </h1>
                
                {/* Edit and Delete buttons for incident creator */}
                {isIncidentCreator && isUserReport && (
                  <div className="flex gap-1.5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setLocation(`/edit-incident/${incidentId}`)}
                      className="h-8 px-2 hover:bg-purple-100 hover:text-purple-700"
                      data-testid="button-edit-incident"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this incident? This action cannot be undone.')) {
                          deleteIncidentMutation.mutate(decodedId!);
                        }
                      }}
                      className="h-8 px-2 hover:bg-red-100 hover:text-red-700"
                      data-testid="button-delete-incident"
                    >
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
              
              {/* Location with icon */}
              <div className="flex items-center gap-1.5 text-gray-700">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="text-sm font-medium" data-testid="incident-location">{location}</span>
              </div>
              
              {/* Compact Category Badge - Combined categories into single pill */}
              {category && (
                <Badge variant="secondary" className={`${
                  source === 'emergency' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                  source === 'tmr' ? 'bg-orange-100 text-orange-800 hover:bg-orange-200' :
                  source === 'user' ? 'bg-purple-100 text-purple-800 hover:bg-purple-200' :
                  'bg-gray-100 text-gray-800 hover:bg-gray-200'
                } text-xs font-medium`}>
                  {category}{subcategory ? ` • ${subcategory}` : ''}
                </Badge>
              )}
              
              {/* Inline Official Source Chip - Moved from separate section */}
              {(() => {
                const agencyInfo = getAgencyInfo(incident);
                if (agencyInfo) {
                  return (
                    <div className="flex items-center gap-2 text-xs">
                      <Avatar className={`h-6 w-6 ${agencyInfo.color} text-white`}>
                        <AvatarFallback className="bg-transparent text-white text-[10px] font-semibold">
                          {agencyInfo.avatar}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-semibold text-gray-900">{agencyInfo.name}</span>
                    </div>
                  );
                } else if (reporterUserId) {
                  return (
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Community Report</span>
                    </div>
                  );
                }
                return null;
              })()}
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4 p-3 md:p-6">
          {/* Reporter attribution - only show for user reports that need detailed attribution */}
          {reporterUserId && !getAgencyInfo(incident) && (
            <div className="rounded-xl p-3 md:p-4 border-l-4 bg-purple-50 border-purple-200">
              <p className="text-xs md:text-sm font-medium text-gray-600 mb-2">
                Reported by
              </p>
              <ReporterAttribution 
                userId={reporterUserId} 
                variant="default"
                showAccountType={true}
              />
            </div>
          )}
          
          {/* Photo Card - for user incidents with photos */}
          {(incident?.photoUrl || incident?.properties?.photoUrl) && (
            <Card className="border border-gray-200/60 shadow-sm">
              <CardContent className="p-0">
                <img
                  src={incident.photoUrl || incident.properties?.photoUrl}
                  alt="Incident photo"
                  className="w-full h-64 object-cover rounded-lg"
                  loading="lazy"
                  onError={(e) => {
                    // Hide card if image fails to load
                    const card = (e.target as HTMLImageElement).closest('.border-gray-200\\/60');
                    if (card) (card as HTMLElement).style.display = 'none';
                  }}
                />
              </CardContent>
            </Card>
          )}

          {/* Description Card */}
          <Card className="border border-gray-200/60 shadow-sm">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-900">Description</h3>
              </div>
              <p className="text-sm md:text-base text-gray-800 leading-relaxed whitespace-pre-wrap" data-testid="incident-description">
                {description}
              </p>
            </CardContent>
          </Card>
          
          {/* Timestamp Card */}
          {timestamp && (
            <Card className="border border-gray-200/60 shadow-sm">
              <CardContent className="p-3 md:p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <h3 className="text-sm font-semibold text-gray-900">Time</h3>
                </div>
                <p className="text-sm md:text-base text-gray-800">
                  {new Date(timestamp).toLocaleString()}
                </p>
              </CardContent>
            </Card>
          )}
          
          {/* Social Interaction Bar - Sticky on mobile */}
          <div className="sticky bottom-0 -mx-3 md:mx-0 md:static">
            <Card className="border-t md:border border-gray-200/60 shadow-sm rounded-none md:rounded-lg">
              <CardContent className="p-2 md:p-3">
                <div className="flex items-center gap-2 md:gap-3">
                  {/* Comments Button - 48px touch target */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`flex-1 md:flex-none flex items-center justify-center gap-2 transition-colors px-4 py-3 h-12 text-sm font-medium ${
                      showComments 
                        ? 'text-blue-600 bg-blue-50 hover:bg-blue-100' 
                        : 'hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={handleCommentsToggle}
                    data-testid={`button-comments-${decodedId}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>Comments</span>
                    <span className="text-muted-foreground ml-1">({commentsData?.count || 0})</span>
                  </Button>
                  
                  {/* Share Button - 48px touch target */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 transition-colors px-4 py-3 h-12 text-sm font-medium hover:text-green-600 hover:bg-green-50"
                    onClick={handleShareClick}
                    data-testid={`button-share-${decodedId}`}
                  >
                    <Share className="w-4 h-4" />
                    <span>Share</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Comments Section - Bottom sheet style */}
          {showComments && (
            <div className="-mx-3 md:mx-0 bg-blue-50/50 border-t border-blue-200 md:rounded-lg md:border">
              <div className="p-3 md:p-4 border-b border-blue-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-blue-600" />
                    <h3 className="text-sm font-semibold text-gray-900">
                      Comments ({commentsData?.count || 0})
                    </h3>
                  </div>
                  {/* Close button */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(false)}
                    className="h-8 w-8 p-0"
                    data-testid="close-comments"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="bg-white">
                <InlineComments 
                  incident={incident} 
                  onClose={() => setShowComments(false)}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
  
  // Render as modal or full page
  if (asModal) {
    return (
      <Dialog open={true} onOpenChange={handleClose}>
        <DialogContent className="max-w-3xl max-h-[95vh] flex flex-col p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Incident Details</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto p-3 md:p-6">
            {content}
          </div>
        </DialogContent>
      </Dialog>
    );
  }
  
  return (
    <div className="container max-w-3xl mx-auto p-3 md:p-6">
      {content}
    </div>
  );
}

// Route wrapper component that matches wouter expectations
export default function IncidentDetailRoute(props: IncidentDetailPageProps) {
  return <IncidentDetailPage asModal={true} {...props} />;
}