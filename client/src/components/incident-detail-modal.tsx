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
  Reply,
  Heart,
  Share2,
  MoreHorizontal
} from "lucide-react";
import { Link } from "wouter";
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
      const response = await fetch(`/api/incidents/${incidentId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: isOpen && !!incidentId && !!incident
  });

  const createCommentMutation = useMutation({
    mutationFn: async (data: { content: string; parentCommentId?: string }) => {
      return apiRequest("POST", `/api/incidents/${incidentId}/comments`, data);
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
      // Traffic incidents don't need impact badges
      return null;
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

  const renderComment = (comment: Comment, isReply = false) => {
    const userData = getUserData(comment.userId);
    
    return (
      <div key={comment.id} className={`${isReply ? 'ml-8 border-l-2 border-muted pl-4' : ''}`}>
        <div className="flex gap-3 mb-3">
          <Avatar className="w-8 h-8">
            <AvatarImage src={userData.avatar} alt={userData.name} />
            <AvatarFallback>{userData.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <div className="bg-muted p-3 rounded-lg">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <Link href={`/users/${comment.userId}`}>
                    <span className="text-sm font-medium text-blue-600 hover:text-blue-800 cursor-pointer hover:underline" data-testid={`link-user-${comment.userId}`}>
                      {userData.name}
                    </span>
                  </Link>
                  <span className="text-xs text-muted-foreground">• {userData.location}</span>
                </div>
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
  

  // User data mapping
  const getUserData = (userId: string) => {
    const users: Record<string, { name: string; avatar: string; location: string }> = {
      'user-001': { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1-0/0/photo-1494790108755-2616b612b1-0.jpg?w=150&h=150&fit=crop&crop=face', location: 'Woolloongabba' },
      'user-002': { name: 'Mike Thompson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', location: 'South Brisbane' },
      'user-003': { name: 'Emma Rodriguez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', location: 'West End' },
      'user-004': { name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', location: 'Kangaroo Point' },
      'user-005': { name: 'Lisa Nguyen', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', location: 'Fortitude Valley' },
      '40158122': { name: user?.firstName || 'You', avatar: user?.profileImageUrl || '', location: 'Brisbane' },
    };
    
    return users[userId] || { name: `User ${userId.slice(-4)}`, avatar: '', location: 'Brisbane' };
  };

  const getSourceInfo = (incident: any) => {
    if (incident.properties?.userReported) {
      // Extract user data from properties
      const reporterName = incident.properties?.reporterName || incident.properties?.reportedBy?.split('@')[0] || 'Anonymous User';
      return { 
        name: reporterName, 
        type: 'Community Report', 
        avatar: reporterName.split(' ').map((word: string) => word.charAt(0).toUpperCase()).join('').slice(0, 2), 
        color: 'bg-gradient-to-br from-purple-500 to-purple-600'
      };
    }
    
    // Determine government agency based on incident type and source
    if (incident.type === 'traffic') {
      return { 
        name: 'Transport and Main Roads', 
        type: 'TMR Official', 
        avatar: 'TMR', 
        color: 'bg-gradient-to-br from-orange-500 to-orange-600'
      };
    }
    
    // Emergency incident - determine specific service
    const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
    const description = incident.properties?.description?.toLowerCase() || '';
    
    if (eventType.includes('fire') || eventType.includes('burn') || eventType.includes('hazmat') || description.includes('fire')) {
      return { 
        name: 'Queensland Fire & Emergency', 
        type: 'QFES Official', 
        avatar: 'QFE', 
        color: 'bg-gradient-to-br from-red-500 to-red-600'
      };
    } else if (eventType.includes('police') || eventType.includes('crime') || eventType.includes('traffic enforcement') || description.includes('police')) {
      return { 
        name: 'Queensland Police Service', 
        type: 'QPS Official', 
        avatar: 'QPS', 
        color: 'bg-gradient-to-br from-blue-700 to-blue-800'
      };
    } else if (eventType.includes('medical') || eventType.includes('ambulance') || eventType.includes('cardiac') || description.includes('medical') || description.includes('ambulance')) {
      return { 
        name: 'Queensland Ambulance Service', 
        type: 'QAS Official', 
        avatar: 'QAS', 
        color: 'bg-gradient-to-br from-green-600 to-green-700'
      };
    } else {
      // Default to general emergency services
      return { 
        name: 'Emergency Services Queensland', 
        type: 'ESQ Official', 
        avatar: 'ESQ', 
        color: 'bg-gradient-to-br from-red-500 to-red-600'
      };
    }
  };

  // Don't render if no incident
  if (!incident) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col p-0" data-testid="modal-incident-details">
        <DialogHeader className="p-4 pb-2">
          {/* Compact User Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10 ring-2 ring-primary/20">
                <AvatarFallback className={`${getSourceInfo(incident).color} text-white font-bold text-sm shadow-lg`}>
                  {getSourceInfo(incident).avatar}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium text-foreground text-sm truncate">
                    {getSourceInfo(incident).name}
                  </h4>
                  <Badge variant="secondary" className="text-xs px-1.5 py-0.5 shrink-0">
                    {getSourceInfo(incident).type.split(' ')[0]}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>{getTimeAgo(
                    incident.properties?.Response_Date || 
                    incident.properties?.last_updated || 
                    incident.properties?.createdAt
                  )}</span>
                </div>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-8 h-8 p-0 shrink-0">
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Full Incident Details */}
        <div className="px-4 py-3 space-y-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              {getIncidentIcon(incident)}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <DialogTitle className="text-lg font-semibold leading-tight">
                  {getIncidentTitle(incident)}
                </DialogTitle>
                {getStatusBadge(incident)}
              </div>
              <div className="flex items-center gap-1 text-sm text-muted-foreground mb-3">
                <MapPin className="w-4 h-4" />
                <span>{getIncidentLocation(incident)}</span>
              </div>
              
              {/* Full Description */}
              <div className="space-y-3">
                <div className="text-sm text-foreground leading-relaxed">
                  {getIncidentDescription(incident)}
                </div>
                
                
                {/* Traffic Advice */}
                {incident.type === 'traffic' && incident.properties?.advice && (
                  <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg border-l-4 border-amber-400">
                    <h4 className="font-medium text-amber-900 dark:text-amber-100 mb-1">Advice</h4>
                    <p className="text-sm text-amber-800 dark:text-amber-200">{incident.properties.advice}</p>
                  </div>
                )}
                
                {/* Emergency Incident Details */}
                {!incident.properties?.userReported && incident.type !== 'traffic' && (
                  <div className="space-y-2">
                    {incident.properties?.Priority && incident.properties.Priority !== 'Unknown' && (
                      <div className="bg-red-50 dark:bg-red-950 p-3 rounded-lg border-l-4 border-red-400">
                        <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">Priority Level</h4>
                        <p className="text-sm text-red-800 dark:text-red-200 font-medium">{incident.properties.Priority}</p>
                      </div>
                    )}
                    
                    {incident.properties?.CurrentStatus && incident.properties.CurrentStatus !== 'Unknown' && (
                      <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg border-l-4 border-gray-400">
                        <h4 className="font-medium text-gray-900 dark:text-gray-100 mb-1">Current Status</h4>
                        <p className="text-sm text-gray-800 dark:text-gray-200">{incident.properties.CurrentStatus}</p>
                      </div>
                    )}
                    
                    {incident.properties?.Master_Incident_Number && (
                      <div className="text-xs text-muted-foreground">
                        <strong>Incident #:</strong> {incident.properties.Master_Incident_Number}
                      </div>
                    )}
                  </div>
                )}
                
                {/* Community Report Details */}
                {incident.properties?.userReported && incident.properties?.description && (
                  <div className="bg-purple-50 dark:bg-purple-950 p-3 rounded-lg border-l-4 border-purple-400">
                    <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">Reporter Details</h4>
                    <p className="text-sm text-purple-800 dark:text-purple-200">{incident.properties.description}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Incident Photo */}
          {incident?.properties?.photoUrl && (
            <div className="rounded-lg overflow-hidden bg-muted">
              <img 
                src={`/api/compress-image?path=${encodeURIComponent(incident.properties.photoUrl)}`}
                alt="Incident photo" 
                className="w-full h-48 object-cover cursor-pointer hover:opacity-90 transition-opacity"
                data-testid="img-incident-photo"
              />
            </div>
          )}
          
          {/* Social Interaction Bar */}
          <div className="flex items-center justify-between py-3 border-t border-b">
            <div className="flex items-center space-x-4">
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground hover:text-red-500 transition-colors">
                <Heart className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground hover:text-blue-500 transition-colors">
                <MessageCircle className="w-4 h-4" />
                <span className="text-sm font-medium">{comments.length || 0}</span>
              </Button>
              <Button variant="ghost" size="sm" className="flex items-center space-x-2 text-muted-foreground hover:text-green-500 transition-colors">
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Compact Comments Section */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          <div className="pt-3">
            <div className="flex items-center gap-2 mb-3">
              <MessageCircle className="w-4 h-4" />
              <h3 className="font-medium text-sm">
                Comments ({comments.length})
              </h3>
            </div>

            {commentsLoading ? (
              <div className="text-center py-4">
                <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-muted-foreground">Loading comments...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {Object.values(groupedComments).map((group: any) => (
                  <div key={group.comment?.id || Math.random()}>
                    {group.comment && renderComment(group.comment)}
                    {group.replies.map((reply: Comment) => renderComment(reply, true))}
                  </div>
                ))}
                
                {comments.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                )}
              </div>
            )}

            {/* Compact Comment Form */}
            {isAuthenticated ? (
              <div className="mt-3 pt-3 border-t">
                <div className="flex gap-2">
                  <Avatar className="w-7 h-7">
                    <AvatarImage src={user?.profileImageUrl || undefined} />
                    <AvatarFallback className="text-xs">
                      {user?.firstName?.[0] || user?.email?.[0] || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      rows={2}
                      className="mb-2 text-sm"
                      data-testid="textarea-new-comment"
                    />
                    <Button
                      size="sm"
                      onClick={handleCommentSubmit}
                      disabled={!newComment.trim() || createCommentMutation.isPending}
                      data-testid="button-post-comment"
                    >
                      <Send className="w-3 h-3 mr-1" />
                      {createCommentMutation.isPending ? 'Posting...' : 'Post'}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-3 pt-3 border-t text-center">
                <p className="text-xs text-muted-foreground">
                  Log in to comment
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}