import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ArrowLeft, X, MapPin, Clock, AlertTriangle, Shield, Car, Flame, Heart, Users, Construction, Trees, Search, Zap, MessageCircle, Share } from "lucide-react";
import { decodeIncidentId } from "@/lib/incident-utils";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { InlineComments } from "@/components/inline-comments";
import { getIncidentCategory, getIncidentSubcategory, getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";
import { getIncidentTitle, getIncidentLocation } from "@/lib/incident-utils";
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
  const [isLiked, setIsLiked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  
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
  
  // Fetch like status for authenticated users
  const { data: likeStatus } = useQuery({
    queryKey: ["/api/incidents", decodedId, "social", "likes"],
    queryFn: async () => {
      if (!decodedId) return null;
      const response = await fetch(`/api/incidents/${decodedId}/social/likes/status`, {
        credentials: 'include'
      });
      if (response.status === 401) {
        // Not authenticated, return default state
        const countResponse = await fetch(`/api/incidents/${decodedId}/social/likes`);
        if (countResponse.ok) {
          const countData = await countResponse.json();
          return { liked: false, count: countData.count || 0 };
        }
        return { liked: false, count: 0 };
      }
      if (!response.ok) throw new Error('Failed to fetch like status');
      return response.json();
    },
    enabled: !!decodedId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });

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

  // Initialize like state from like status data
  useEffect(() => {
    if (likeStatus?.liked !== undefined) {
      setIsLiked(likeStatus.liked);
    }
  }, [likeStatus]);

  // Like mutation using existing API
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!decodedId) throw new Error('No incident ID');
      return apiRequest('POST', `/api/incidents/${decodedId}/social/likes/toggle`);
    },
    onSuccess: (data: any) => {
      const liked = data?.liked || false;
      setIsLiked(liked);
      
      // Invalidate social cache to sync with other views  
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", decodedId, "social", "likes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", decodedId, "social"] });
      // Also invalidate unified data since likes affect display
      queryClient.invalidateQueries({ queryKey: ["/api/unified"] });
      
      toast({
        title: liked ? "Liked incident" : "Removed like",
        description: liked ? "You've liked this incident." : "You've removed your like from this incident.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to toggle like",
        variant: "destructive",
      });
    },
  });

  // Social interaction handlers
  const handleLikeClick = () => {
    if (!user) {
      toast({
        title: "Please log in",
        description: "You need to log in to like incidents",
        variant: "destructive",
      });
      return;
    }
    likeMutation.mutate();
  };

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
          
          {/* Social Interaction Bar */}
          <Card className="border border-gray-200/60 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  {/* Comments Button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`flex items-center gap-1 transition-colors px-3 py-2 h-auto text-xs md:text-sm min-h-[44px] ${
                      showComments 
                        ? 'text-blue-500 hover:text-blue-600' 
                        : 'hover:text-blue-500'
                    }`}
                    onClick={handleCommentsToggle}
                    data-testid={`button-comments-${decodedId}`}
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="hidden sm:inline">Comments</span>
                    <span className="text-muted-foreground">({commentsData?.count || 0})</span>
                  </Button>
                  
                  {/* Like Button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`flex items-center gap-1 transition-colors px-3 py-2 h-auto text-xs md:text-sm min-h-[44px] ${
                      isLiked 
                        ? 'text-red-500 hover:text-red-600' 
                        : 'hover:text-red-500'
                    }`}
                    onClick={handleLikeClick}
                    disabled={likeMutation.isPending}
                    data-testid={`button-like-${decodedId}`}
                  >
                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                    <span className="text-muted-foreground">
                      ({likeStatus?.count || 0})
                    </span>
                  </Button>
                  
                  {/* Share Button */}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="flex items-center gap-1 transition-colors px-3 py-2 h-auto text-xs md:text-sm min-h-[44px] hover:text-green-500"
                    onClick={handleShareClick}
                    data-testid={`button-share-${decodedId}`}
                  >
                    <Share className="w-4 h-4" />
                    <span className="hidden sm:inline">Share</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Comments Section (conditionally shown) */}
          {showComments && (
            <Card className="border border-blue-200/60 shadow-sm bg-blue-50/30">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-4">
                  <MessageCircle className="h-4 w-4 text-blue-600" />
                  <h3 className="font-semibold text-gray-900">Comments</h3>
                </div>
                <InlineComments 
                  incident={incident} 
                  onClose={() => setShowComments(false)}
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