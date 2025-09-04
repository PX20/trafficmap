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
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);

  // Extract incident ID from the incident object (safe to call even if incident is null)
  const incidentId = incident ? getIncidentId(incident) : null;

  // Share functionality
  const handleShare = async () => {
    console.log("Share button clicked!", { incident, incidentId });
    if (!incident || !incidentId) {
      console.log("No incident or incidentId");
      return;
    }

    const shareUrl = `${window.location.origin}?incident=${encodeURIComponent(incidentId)}`;
    const shareTitle = getIncidentTitle(incident);
    const shareText = `${shareTitle} - ${getIncidentLocation(incident)}`;

    console.log("Share data:", { shareUrl, shareTitle, shareText });

    // Try native Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        console.log("Native share successful");
        toast({
          title: "Shared successfully",
          description: "Incident details have been shared",
        });
        return;
      } catch (error) {
        console.log("Native share failed:", error);
        // User cancelled sharing or error occurred, fall back to clipboard
      }
    }

    // Fallback to clipboard copy (desktop browsers)
    try {
      await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
      console.log("Clipboard copy successful");
      toast({
        title: "Link copied",
        description: "Incident link has been copied to your clipboard",
      });
    } catch (error) {
      console.log("Clipboard copy failed:", error);
      // Final fallback - show URL in a prompt
      const fallbackText = `${shareText}\n${shareUrl}`;
      if (window.prompt) {
        window.prompt("Copy this link to share the incident:", fallbackText);
      } else {
        toast({
          title: "Share link",
          description: shareUrl,
          duration: 10000,
        });
      }
    }
  };

  // Like functionality
  const handleLike = () => {
    console.log("Like button clicked!", { isAuthenticated, incident });
    if (!isAuthenticated) {
      console.log("User not authenticated");
      toast({
        title: "Please log in",
        description: "You need to log in to like incidents",
        variant: "destructive",
      });
      return;
    }

    setIsLiked(!isLiked);
    setLikeCount(prev => isLiked ? prev - 1 : prev + 1);
    
    console.log("Showing like toast");
    toast({
      title: isLiked ? "Unliked" : "Liked",
      description: isLiked ? "Removed from your liked incidents" : "Added to your liked incidents",
    });
  };

  // Initialize like count when modal opens (demo data)
  useEffect(() => {
    if (isOpen && incident && incidentId) {
      // Demo like counts - in real app this would come from API
      const demoLikeCounts: Record<string, number> = {
        'crash': Math.floor(Math.random() * 50) + 5,
        'incident': Math.floor(Math.random() * 30) + 3,
        'emergency': Math.floor(Math.random() * 100) + 20,
      };
      
      const eventType = incident.type || 'incident';
      setLikeCount(demoLikeCounts[eventType] || Math.floor(Math.random() * 20) + 1);
      setIsLiked(false); // Reset like state for demo
    }
  }, [isOpen, incident, incidentId]);

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
      const roadName = incident.properties?.road_summary?.road_name || '';
      const locality = incident.properties?.road_summary?.locality || '';
      
      if (roadName && locality) {
        return `${roadName}, ${locality}`;
      }
      return roadName || locality || "Unknown location";
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
    // Check if this is the current logged-in user
    if (user && userId === user.id) {
      const displayName = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.username || 'You';
      return {
        name: displayName,
        avatar: user.profileImageUrl || '',
        location: user.homeSuburb || user.primarySuburb || 'Brisbane'
      };
    }
    
    // Mock users for demo purposes
    const users: Record<string, { name: string; avatar: string; location: string }> = {
      'user-001': { name: 'Sarah Chen', avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1-0/0/photo-1494790108755-2616b612b1-0.jpg?w=150&h=150&fit=crop&crop=face', location: 'Woolloongabba' },
      'user-002': { name: 'Mike Thompson', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face', location: 'South Brisbane' },
      'user-003': { name: 'Emma Rodriguez', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face', location: 'West End' },
      'user-004': { name: 'James Wilson', avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face', location: 'Kangaroo Point' },
      'user-005': { name: 'Lisa Nguyen', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face', location: 'Fortitude Valley' },
    };
    
    return users[userId] || { 
      name: `Community Member`, 
      avatar: '', 
      location: 'Queensland' 
    };
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
      <DialogContent className="max-w-lg max-h-[85vh] flex flex-col p-0 bg-gradient-to-br from-white via-gray-50 to-white border-0 shadow-2xl overflow-hidden" data-testid="modal-incident-details">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-orange-200/20 to-pink-200/20 rounded-full blur-lg"></div>
        
        <DialogHeader className="relative p-6 pb-4 flex-shrink-0 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm">
          {/* Enhanced Header */}
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="w-14 h-14 ring-4 ring-white shadow-xl">
                <AvatarFallback className={`${getSourceInfo(incident).color} text-white font-bold text-lg`}>
                  {getSourceInfo(incident).avatar}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-2 border-white animate-pulse"></div>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <h4 className="font-bold text-gray-900 text-lg truncate">
                  {getSourceInfo(incident).name}
                </h4>
                <Badge variant="secondary" className="px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200 font-medium">
                  {getSourceInfo(incident).type.split(' ')[0]}
                </Badge>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span className="font-medium">{getTimeAgo(
                    incident.properties?.published || 
                    incident.properties?.Response_Date || 
                    incident.properties?.createdAt || 
                    incident.properties?.timeReported ||
                    incident.properties?.last_updated
                  )}</span>
                </div>
                <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs font-medium">Live</span>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="w-10 h-10 p-0 shrink-0 rounded-full hover:bg-gray-100">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Enhanced Scrollable Content Container */}
        <div className="relative flex-1 overflow-y-auto">
          {/* Main Incident Card */}
          <div className="p-6 space-y-6">
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-white via-gray-50 to-white border border-gray-100 shadow-lg overflow-hidden">
              {/* Content decorative elements */}
              <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-br from-blue-200/20 to-purple-200/20 rounded-full blur-lg"></div>
              
              <div className="relative flex items-start gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                  {getIncidentIcon(incident)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <DialogTitle className="text-xl font-bold text-gray-900 leading-tight">
                      {getIncidentTitle(incident)}
                    </DialogTitle>
                    {getStatusBadge(incident)}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-semibold">{getIncidentLocation(incident)}</span>
                  </div>
                  
                  {/* Enhanced Description */}
                  <div className="space-y-4">
                    <div className="text-sm text-gray-700 leading-relaxed bg-white/80 p-4 rounded-xl border border-gray-200">
                      {getIncidentDescription(incident)}
                    </div>
                
                
                    {/* Enhanced Traffic Advice */}
                    {incident.type === 'traffic' && incident.properties?.advice && (
                      <div className="relative p-4 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-amber-200/30 to-orange-200/30 rounded-full blur-lg"></div>
                        <div className="relative flex items-start gap-3">
                          <div className="p-2 bg-amber-500 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-amber-900 mb-2 text-base">Advice</h4>
                            <p className="text-sm text-amber-800 font-medium leading-relaxed">{incident.properties.advice}</p>
                          </div>
                        </div>
                      </div>
                    )}
                
                    {/* Enhanced Emergency Incident Details */}
                    {!incident.properties?.userReported && incident.type !== 'traffic' && (
                      <div className="space-y-3">
                        {incident.properties?.Priority && incident.properties.Priority !== 'Unknown' && (
                          <div className="relative p-4 rounded-xl bg-gradient-to-r from-red-50 to-pink-50 border border-red-200 overflow-hidden">
                            <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-200/30 to-pink-200/30 rounded-full blur-lg"></div>
                            <div className="relative flex items-start gap-3">
                              <div className="p-2 bg-red-500 rounded-lg">
                                <Zap className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-red-900 mb-2 text-base">Priority Level</h4>
                                <p className="text-lg text-red-800 font-bold">{incident.properties.Priority}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {incident.properties?.CurrentStatus && incident.properties.CurrentStatus !== 'Unknown' && (
                          <div className="relative p-4 rounded-xl bg-gradient-to-r from-gray-50 to-blue-50 border border-gray-200 overflow-hidden">
                            <div className="relative flex items-start gap-3">
                              <div className="p-2 bg-gray-500 rounded-lg">
                                <Eye className="w-4 h-4 text-white" />
                              </div>
                              <div>
                                <h4 className="font-bold text-gray-900 mb-2 text-base">Current Status</h4>
                                <p className="text-sm text-gray-800 font-semibold">{incident.properties.CurrentStatus}</p>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {incident.properties?.Master_Incident_Number && (
                          <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded-lg">
                            <strong>Incident #:</strong> {incident.properties.Master_Incident_Number}
                          </div>
                        )}
                      </div>
                    )}
                
                    {/* Enhanced Community Report Details */}
                    {incident.properties?.userReported && incident.properties?.description && (
                      <div className="relative p-4 rounded-xl bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-purple-200/30 to-indigo-200/30 rounded-full blur-lg"></div>
                        <div className="relative flex items-start gap-3">
                          <div className="p-2 bg-purple-500 rounded-lg">
                            <MessageCircle className="w-4 h-4 text-white" />
                          </div>
                          <div>
                            <h4 className="font-bold text-purple-900 mb-2 text-base">Reporter Details</h4>
                            <p className="text-sm text-purple-800 font-medium leading-relaxed">{incident.properties.description}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          
            {/* Enhanced Incident Photo */}
            {incident?.properties?.photoUrl && (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg">
                <img 
                  src={`/api/compress-image?path=${encodeURIComponent(incident.properties.photoUrl)}`}
                  alt="Incident photo" 
                  className="w-full h-56 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                  data-testid="img-incident-photo"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
              </div>
            )}
          
            {/* Enhanced Social Interaction Bar */}
            <div className="relative p-4 rounded-2xl bg-gradient-to-r from-white/80 to-gray-50/80 backdrop-blur-sm border border-gray-200 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={`group flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md ${
                      isLiked 
                        ? 'bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100' 
                        : 'bg-white hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-gray-600 hover:text-blue-600'
                    }`}
                    onClick={handleLike}
                    data-testid="button-like-incident"
                  >
                    <div className="w-5 h-5 bg-blue-500 rounded-lg flex items-center justify-center">
                      <Heart className="w-3 h-3 text-white" />
                    </div>
                    {likeCount > 0 && (
                      <span className="text-sm font-semibold">{likeCount}</span>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-gray-600 hover:text-purple-600 transition-all duration-200 shadow-sm hover:shadow-md">
                    <div className="w-5 h-5 bg-purple-500 rounded-lg flex items-center justify-center">
                      <MessageCircle className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold">{comments.length || 0}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-green-50 border border-gray-200 hover:border-green-300 text-gray-600 hover:text-green-600 transition-all duration-200 shadow-sm hover:shadow-md"
                    onClick={handleShare}
                    data-testid="button-share-incident"
                  >
                    <div className="w-5 h-5 bg-green-500 rounded-lg flex items-center justify-center">
                      <Share2 className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-semibold">Share</span>
                  </Button>
                </div>
              </div>
            </div>
          
            {/* Enhanced Comments Section */}
            <div className="relative p-4 rounded-2xl bg-gradient-to-br from-gray-50/80 to-white/80 border border-gray-200 shadow-sm">
              <div className="mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                    <MessageCircle className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}