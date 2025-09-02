import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Camera, 
  Car, 
  Shield,
  Eye,
  Zap,
  MessageCircle,
  Send,
  Reply
} from "lucide-react";
import type { Comment } from "@shared/schema";

interface IncidentDetailModalProps {
  incident: any;
  isOpen: boolean;
  onClose: () => void;
}

export function IncidentDetailModal({ incident, isOpen, onClose }: IncidentDetailModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");

  // Extract incident ID from the incident object (safe to call even if incident is null)
  const incidentId = incident ? getIncidentId(incident) : null;
  

  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/incidents", incidentId, "comments"],
    queryFn: async () => {
      console.log('🔍 Fetching comments for:', incidentId);
      const response = await fetch(`/api/incidents/${incidentId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      const data = await response.json();
      console.log('📝 Comments received:', data.length, 'comments');
      return data;
    },
    enabled: isOpen && !!incidentId && !!incident,
    staleTime: 0, // Always fetch fresh data
    gcTime: 0, // Clear cache immediately
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentCommentId?: string }) => {
      return apiRequest(`/api/incidents/${incidentId}/comments`, "POST", data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "comments"] });
      setNewComment("");
      setReplyText("");
      setReplyingTo(null);
      toast({
        title: "Comment posted",
        description: "Your comment has been added to the incident",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post comment",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  function getIncidentId(incident: any): string {
    if (!incident) return `unknown-${Date.now()}`;
    
    if (incident.type === 'traffic') {
      return incident.properties?.id || incident.properties?.event_id || `traffic-${Date.now()}`;
    } else if (incident.properties?.userReported) {
      return `user-${incident.properties?.id || Date.now()}`;
    } else {
      return incident.properties?.Master_Incident_Number || incident.properties?.id || `incident-${Date.now()}`;
    }
  }

  const getIncidentIcon = (incident: any) => {
    if (!incident) return <AlertTriangle className="w-6 h-6 text-gray-500" />;
    
    if (incident.type === 'traffic') {
      const eventType = incident.properties?.event_type?.toLowerCase();
      if (eventType === 'crash') return <Car className="w-6 h-6 text-red-500" />;
      if (eventType === 'hazard') return <AlertTriangle className="w-6 h-6 text-yellow-500" />;
      return <AlertTriangle className="w-6 h-6 text-orange-500" />;
    }
    
    if (incident.properties?.userReported) {
      const incidentType = incident.properties?.incidentType;
      if (['Crime', 'Theft', 'Violence', 'Vandalism'].includes(incidentType)) {
        return <Shield className="w-6 h-6 text-purple-600" />;
      }
      if (incidentType === 'Suspicious') {
        return <Eye className="w-6 h-6 text-amber-600" />;
      }
      return <Zap className="w-6 h-6 text-indigo-600" />;
    }
    
    return <AlertTriangle className="w-6 h-6 text-red-600" />;
  };

  const getIncidentTitle = (incident: any) => {
    if (!incident) return "Unknown Incident";
    
    if (incident.type === 'traffic') {
      return incident.properties?.description || incident.properties?.event_type || "Traffic Event";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.incidentType || "Community Report";
    }
    
    return incident.properties?.GroupedType || "Emergency Incident";
  };

  const getIncidentDescription = (incident: any) => {
    if (!incident) return "No information available";
    
    if (incident.type === 'traffic') {
      return incident.properties?.information || incident.properties?.advice || "Traffic information";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.description || "Community reported incident";
    }
    
    return `Incident #${incident.properties?.Master_Incident_Number || 'Unknown'}`;
  };

  const getIncidentLocation = (incident: any) => {
    if (!incident) return "Unknown location";
    
    if (incident.type === 'traffic') {
      return incident.properties?.road_summary?.road_name || incident.properties?.road_summary?.locality || "Unknown location";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.locationDescription || "Unknown location";
    }
    
    return `${incident.properties?.Location || 'Unknown'}, ${incident.properties?.Locality || 'Unknown'}`;
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Unknown time";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const getStatusBadge = (incident: any) => {
    if (!incident) return <Badge variant="outline">Unknown</Badge>;
    
    if (incident.type === 'traffic') {
      const priority = incident.properties?.event_priority?.toLowerCase();
      if (priority === 'high' || priority === 'red alert') {
        return <Badge variant="destructive">High Impact</Badge>;
      }
      if (priority === 'medium') {
        return <Badge variant="secondary">Medium Impact</Badge>;
      }
      return <Badge variant="outline">Low Impact</Badge>;
    }
    
    if (incident.properties?.userReported) {
      return <Badge variant="secondary">Community Report</Badge>;
    }
    
    const status = incident.properties?.CurrentStatus?.toLowerCase();
    if (status === 'going' || status === 'active') {
      return <Badge variant="destructive">Active</Badge>;
    }
    if (status === 'patrolled' || status === 'monitoring') {
      return <Badge variant="secondary">Monitoring</Badge>;
    }
    if (status === 'completed' || status === 'closed') {
      return <Badge variant="outline">Resolved</Badge>;
    }
    return <Badge variant="secondary">Official</Badge>;
  };

  const handleCommentSubmit = () => {
    if (!newComment.trim() || !isAuthenticated) return;
    
    createCommentMutation.mutate({
      content: newComment.trim()
    });
  };

  const handleReplySubmit = (parentCommentId: string) => {
    if (!replyText.trim() || !isAuthenticated) return;
    
    createCommentMutation.mutate({
      content: replyText.trim(),
      parentCommentId
    });
  };

  const renderComment = (comment: Comment) => {
    const isReply = !!comment.parentCommentId;
    
    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-muted pl-4' : ''}`}>
        <div className="flex gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarFallback>{comment.userId.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium">User {comment.userId.slice(-4)}</span>
                <span className="text-xs text-muted-foreground">
                  {getTimeAgo(comment.createdAt?.toString() || '')}
                </span>
              </div>
              <p className="text-sm">{comment.content}</p>
            </div>
            {isAuthenticated && !isReply && (
              <Button
                variant="ghost"
                size="sm"
                className="mt-1 h-auto p-1 text-xs"
                onClick={() => {
                  if (replyingTo === comment.id) {
                    setReplyingTo(null);
                    setReplyText("");
                  } else {
                    setReplyingTo(comment.id);
                  }
                }}
                data-testid={`button-reply-${comment.id}`}
              >
                <Reply className="w-3 h-3 mr-1" />
                Reply
              </Button>
            )}
            {replyingTo === comment.id && (
              <div className="mt-2 flex gap-2">
                <Textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Write a reply..."
                  rows={2}
                  className="flex-1"
                  data-testid={`textarea-reply-${comment.id}`}
                />
                <div className="flex flex-col gap-1">
                  <Button
                    size="sm"
                    onClick={() => handleReplySubmit(comment.id)}
                    disabled={!replyText.trim() || createCommentMutation.isPending}
                    data-testid={`button-submit-reply-${comment.id}`}
                  >
                    <Send className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setReplyingTo(null);
                      setReplyText("");
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Group comments by parent/child relationship
  const groupedComments = comments.reduce((acc: any, comment: Comment) => {
    if (!comment.parentCommentId) {
      acc[comment.id] = { comment, replies: [] };
    } else {
      const parentId = comment.parentCommentId;
      if (!acc[parentId]) {
        acc[parentId] = { comment: null, replies: [] };
      }
      acc[parentId].replies.push(comment);
    }
    return acc;
  }, {});
  
  console.log('🔧 Grouped comments:', groupedComments);
  console.log('💬 Total comments array:', comments);

  // Don't render if no incident
  if (!incident) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="p-6 pb-0">
          <div className="flex items-start gap-3">
            {getIncidentIcon(incident)}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2">
                <DialogTitle className="truncate">
                  {getIncidentTitle(incident)}
                </DialogTitle>
                {getStatusBadge(incident)}
              </div>
              
              <p className="text-sm text-muted-foreground mb-3">
                {getIncidentDescription(incident)}
              </p>
              
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  <span className="truncate">{getIncidentLocation(incident)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeAgo(
                    incident.properties?.Response_Date || 
                    incident.properties?.last_updated || 
                    incident.properties?.createdAt
                  )}</span>
                </div>
              </div>
            </div>
          </div>
        </DialogHeader>

        {/* Comments Section */}
        <div className="flex-1 overflow-y-auto px-6 pb-6">
          <div className="border-t pt-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageCircle className="w-4 h-4" />
              <h3 className="font-medium">
                Discussion ({comments.length})
              </h3>
            </div>

            {commentsLoading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Debug info */}
                <div className="bg-yellow-100 p-2 rounded text-xs">
                  Debug: {comments.length} comments loaded
                </div>
                
                {/* Simple rendering - just show all comments */}
                {comments.map((comment: Comment) => (
                  <div key={comment.id} className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">User {comment.userId.slice(-4)}</span>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(comment.createdAt?.toString() || '')}
                      </span>
                    </div>
                    <p className="text-sm">{comment.content}</p>
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                )}
              </div>
            )}

            {/* New Comment Form */}
            {isAuthenticated ? (
              <div className="mt-4 pt-4 border-t">
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback>
                      {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Share your thoughts about this incident..."
                      rows={3}
                      className="mb-2"
                      data-testid="textarea-new-comment"
                    />
                    <Button
                      onClick={handleCommentSubmit}
                      disabled={!newComment.trim() || createCommentMutation.isPending}
                      data-testid="button-post-comment"
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {createCommentMutation.isPending ? 'Posting...' : 'Post Comment'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-4 pt-4 border-t text-center">
                <p className="text-sm text-muted-foreground">
                  Please log in to join the discussion
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}