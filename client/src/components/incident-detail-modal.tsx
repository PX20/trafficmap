import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Car, 
  Shield,
  Eye,
  Zap,
  MessageCircle,
  Send,
  Heart,
  Share2,
  Edit,
  Trash,
  X,
  Users,
  Check,
  ArrowLeft,
  Timer,
  Construction,
  Trees,
  Search,
  Flame
} from "lucide-react";
import { useLocation } from "wouter";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { getIncidentCategory, getIncidentSubcategory, getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";

interface IncidentDetailModalProps {
  incident: any;
  isOpen: boolean;
  onClose: () => void;
}

export function IncidentDetailModal({ incident, isOpen, onClose }: IncidentDetailModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Extract incident ID from the incident object
  const getIncidentId = (incident: any): string => {
    if (!incident) return `unknown-${Date.now()}`;
    
    if (incident.type === 'traffic') {
      return incident.properties?.id || incident.properties?.event_id || `traffic-${Date.now()}`;
    } else if (incident.properties?.userReported) {
      return `user-${incident.properties?.id || Date.now()}`;
    } else {
      return incident.properties?.Master_Incident_Number || incident.properties?.id || `incident-${Date.now()}`;
    }
  };

  const incidentId = incident ? getIncidentId(incident) : null;

  // Check if current user is the creator of this incident
  const isIncidentCreator = user && incident && 
    getReporterUserId(incident) === user.id;

  // Get social data for the incident
  const { data: socialData } = useQuery({
    queryKey: ["/api/incidents", incidentId, "social"],
    queryFn: async () => {
      if (!incidentId) return null;
      
      const [commentsRes, likesRes] = await Promise.all([
        fetch(`/api/incidents/${incidentId}/social/comments`).then(r => r.json()),
        fetch(`/api/incidents/${incidentId}/social/likes`).then(r => r.json())
      ]);

      return {
        comments: commentsRes.comments || [],
        commentCount: commentsRes.count || 0,
        likeCount: likesRes.count || 0
      };
    },
    enabled: !!incidentId && isOpen
  });

  // Like toggle mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!incidentId) throw new Error("No incident ID");
      return apiRequest("POST", `/api/incidents/${incidentId}/social/likes/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "social"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Comment submission
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!incidentId) throw new Error("No incident ID");
      return apiRequest("POST", `/api/incidents/${incidentId}/social/comments`, { content });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "social"] });
      setNewComment("");
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete incident mutation
  const deleteIncidentMutation = useMutation({
    mutationFn: async () => {
      if (!incidentId) throw new Error('No incident ID');
      return apiRequest('DELETE', `/api/incidents/${incidentId}`);
    },
    onSuccess: () => {
      toast({
        title: "Report deleted",
        description: "Your incident report has been deleted",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/unified'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to delete incident",
        variant: "destructive",
      });
    },
  });

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !isAuthenticated) return;
    commentMutation.mutate(newComment.trim());
  };

  const handleEditIncident = () => {
    setLocation(`/edit-incident/${incidentId}`);
    onClose();
  };

  // Helper functions
  const getIncidentIcon = (incident: any) => {
    const { iconName, color } = getIncidentIconProps(incident);
    const iconClass = `w-5 h-5 ${color}`;
    
    // Map icon names to components
    switch (iconName) {
      case 'Car': return <Car className={iconClass} />;
      case 'Timer': return <Timer className={iconClass} />;
      case 'Shield': return <Shield className={iconClass} />;
      case 'Construction': return <Construction className={iconClass} />;
      case 'Zap': return <Zap className={iconClass} />;
      case 'Trees': return <Trees className={iconClass} />;
      case 'Users': return <Users className={iconClass} />;
      case 'Heart': return <Heart className={iconClass} />;
      case 'Search': return <Search className={iconClass} />;
      case 'Flame': return <Flame className={iconClass} />;
      case 'AlertTriangle':
      default: return <AlertTriangle className={iconClass} />;
    }
  };

  const getIncidentTitle = (incident: any) => {
    if (!incident) return "Incident";
    
    if (incident.type === 'traffic') {
      return incident.properties?.description || incident.properties?.event_type || "Traffic Event";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.title || incident.properties?.categoryName || "Community Report";
    }
    
    if (incident.properties?.title) {
      return incident.properties.title;
    }
    
    const groupedType = incident.properties?.GroupedType || '';
    const locality = incident.properties?.Locality || '';
    
    if (groupedType && locality) {
      return `${groupedType} - ${locality}`;
    }
    return groupedType || "Emergency Incident";
  };

  const getIncidentDescription = (incident: any) => {
    if (!incident) return "No information available";
    
    if (incident.type === 'traffic') {
      return incident.properties?.information || incident.properties?.advice || "Traffic information";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.description || 
             incident.properties?.subcategoryName || 
             "Community reported incident";
    }
    
    if (incident.properties?.description) {
      return incident.properties.description;
    }
    
    const masterIncident = incident.properties?.Master_Incident_Number;
    const groupedType = incident.properties?.GroupedType || '';
    const status = incident.properties?.CurrentStatus || '';
    
    if (masterIncident) {
      if (status && status !== 'Active') {
        return `Incident #${masterIncident} - ${status}`;
      }
      return `Incident #${masterIncident}`;
    }
    
    return groupedType || "Emergency incident";
  };

  const getIncidentLocation = (incident: any) => {
    if (!incident) return "Location not specified";
    
    // Handle TMR traffic incidents from unified API
    if (incident.type === 'traffic' || incident.source === 'tmr') {
      const roadName = incident.properties?.road_summary?.road_name || '';
      const locality = incident.properties?.road_summary?.locality || '';
      
      if (roadName && locality) {
        return `${roadName}, ${locality}`;
      }
      
      // Fallback to unified location field for TMR incidents
      if (incident.properties?.location) {
        return incident.properties.location;
      }
      
      return roadName || locality || "Location not specified";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.locationDescription || 
             incident.properties?.location || 
             "Location not specified";
    }
    
    // For emergency incidents, try unified location field first
    if (incident.source === 'emergency' && incident.properties?.location) {
      return incident.properties.location;
    }
    
    if (incident.properties?.locationDescription) {
      return incident.properties.locationDescription;
    }
    
    const location = incident.properties?.Location || '';
    const locality = incident.properties?.Locality || '';
    const locationDesc = incident.properties?.LocationDescription || '';
    
    if (location && locality && location !== locality) {
      return `${location}, ${locality}`;
    }
    if (location) return location;
    if (locality) return locality;
    if (locationDesc) return locationDesc;
    
    return "Location not specified";
  };

  const getTimeAgo = (incident: any) => {
    if (!incident) return 'Unknown time';
    
    const timestamp = incident.properties?.incidentTime || incident.properties?.lastUpdated || incident.properties?.publishedAt;
    
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getCategoryDisplayName = (incident: any): string => {
    const category = getIncidentCategory(incident);
    const subcategory = getIncidentSubcategory(incident);
    
    return subcategory || category || 'Incident';
  };

  // Share functionality
  const handleShare = async () => {
    if (!incident || !incidentId) return;

    const shareUrl = `${window.location.origin}?incident=${encodeURIComponent(incidentId)}`;
    const shareTitle = getIncidentTitle(incident);
    const shareText = `${shareTitle} - ${getIncidentLocation(incident)}`;

    try {
      if (navigator.share && navigator.canShare({ title: shareTitle, text: shareText, url: shareUrl })) {
        await navigator.share({ title: shareTitle, text: shareText, url: shareUrl });
        toast({
          title: "Shared successfully",
          description: "Incident shared using device share function",
        });
      } else {
        await navigator.clipboard.writeText(shareUrl);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast({
          title: "Link copied",
          description: "Incident link copied to clipboard",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to share or copy link",
        variant: "destructive",
      });
    }
  };

  const comments = socialData?.comments || [];

  // Recursive comment rendering function
  const renderComment = (comment: any, depth: number = 0): JSX.Element => {
    const maxDepth = 3;
    const actualDepth = Math.min(depth, maxDepth);
    
    return (
      <div key={comment.id} className={`${actualDepth > 0 ? 'ml-10 border-l border-muted/50 pl-3 mt-2' : ''}`}>
        <div className="group flex space-x-3 pb-2" data-testid={`comment-${comment.id}`}>
          <ReporterAttribution 
            userId={comment.userId} 
            variant="compact" 
            className="flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <div className="bg-muted/40 rounded-2xl px-3 py-2.5 inline-block max-w-full">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xs text-muted-foreground">
                  {getTimeAgo({ properties: { incidentTime: comment.createdAt } })}
                </span>
              </div>
              <p className="text-sm break-words" data-testid={`comment-content-${comment.id}`}>
                {comment.content}
              </p>
            </div>
          </div>
        </div>
        
        {comment.replies && comment.replies.map((reply: any) => 
          renderComment(reply, depth + 1)
        )}
      </div>
    );
  };

  if (!incident) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" data-testid="modal-incident-details">
        {!showComments ? (
          // Main Incident View - Matching EventModal structure
          <div className="flex flex-col">
            {/* Clean Header */}
            <div className="p-6 pb-4 border-b bg-muted/10">
              <div className="flex items-start justify-between mb-3">
                <Badge 
                  variant="secondary" 
                  className="bg-blue-100 text-blue-800 border-blue-200 font-medium"
                >
                  {getIncidentIcon(incident)}
                  <span className="ml-1">
                    {getCategoryDisplayName(incident)}
                  </span>
                </Badge>
              </div>
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-foreground flex-1" data-testid="text-incident-title">
                  {getIncidentTitle(incident)}
                </h2>
                
                {/* Edit/Delete buttons for user's own posts */}
                {isIncidentCreator && (
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleEditIncident}
                      className="h-8 px-3 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                      data-testid="button-edit-incident"
                    >
                      <Edit className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteIncidentMutation.mutate()}
                      className="h-8 px-3 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                      disabled={deleteIncidentMutation.isPending}
                      data-testid="button-delete-incident"
                    >
                      <Trash className="w-3 h-3 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* Reporter Information Section */}
            <div className="px-6 pt-4 pb-2 border-b bg-muted/5">
              <div className="bg-muted/30 rounded-lg p-4">
                <ReporterAttribution 
                  userId={getReporterUserId(incident)} 
                  variant="default" 
                  showAccountType={true}
                />
                <p className="text-xs text-muted-foreground mt-2">
                  {incident.properties?.userReported ? 'Community report' : 
                   incident.type === 'traffic' ? 'Official traffic report' : 
                   'Emergency services report'} • {getTimeAgo(incident)}
                </p>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 space-y-5">
              {/* Description */}
              {getIncidentDescription(incident) && (
                <div>
                  <p className="text-foreground leading-relaxed" data-testid="text-incident-description">
                    {getIncidentDescription(incident)}
                  </p>
                </div>
              )}

              {/* Image Thumbnail */}
              {incident.properties?.photoUrl && (
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={incident.properties.photoUrl} 
                    alt="Incident photo" 
                    className="w-full h-48 object-cover"
                    data-testid="img-incident-thumbnail"
                  />
                </div>
              )}

              {/* Location and Time */}
              <div className="space-y-3">
                {getIncidentLocation(incident) && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate" data-testid="text-incident-location">
                        {getIncidentLocation(incident)}
                      </p>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground" data-testid="text-incident-time">
                      {getTimeAgo(incident)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="border-t bg-muted/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(true)}
                    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                    data-testid="button-comments"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm">
                      {socialData?.commentCount || 0} Comments
                    </span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => isAuthenticated ? likeMutation.mutate() : null}
                    disabled={!isAuthenticated}
                    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                    data-testid="button-like"
                  >
                    <Heart className="w-4 h-4" />
                    <span className="text-sm">
                      {socialData?.likeCount || 0} Likes
                    </span>
                  </Button>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleShare}
                  className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                  data-testid="button-share"
                >
                  {copySuccess ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                  <span className="text-sm">Share</span>
                </Button>
              </div>
            </div>
          </div>
        ) : (
          // Comments View - Matching EventModal comments structure
          <div className="flex flex-col h-full">
            {/* Comments Header */}
            <div className="flex items-center justify-between p-4 border-b bg-muted/10">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowComments(false)}
                  className="p-0 h-auto"
                  data-testid="button-back-from-comments"
                >
                  <ArrowLeft className="w-5 h-5" />
                </Button>
                <h3 className="font-semibold text-lg" data-testid="text-comments-title">
                  Comments ({socialData?.commentCount || 0})
                </h3>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageCircle className="w-12 h-12 text-muted-foreground/50 mx-auto mb-3" />
                  <p className="text-muted-foreground mb-1">No comments yet</p>
                  <p className="text-sm text-muted-foreground">Be the first to share your thoughts!</p>
                </div>
              ) : (
                comments.map((comment: any) => renderComment(comment))
              )}
            </div>

            {/* Comment Input */}
            {isAuthenticated ? (
              <div className="border-t p-4 bg-muted/5">
                <form onSubmit={handleCommentSubmit} className="space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="min-h-[80px] resize-none"
                    data-testid="textarea-comment"
                  />
                  <div className="flex justify-end">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!newComment.trim() || commentMutation.isPending}
                      data-testid="button-post-comment"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      Post Comment
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="border-t p-4 bg-muted/5 text-center">
                <p className="text-muted-foreground text-sm">
                  Please log in to comment
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}