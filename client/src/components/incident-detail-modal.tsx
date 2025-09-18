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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  MoreHorizontal,
  CheckCircle,
  ClipboardList,
  TrendingUp,
  Flag
} from "lucide-react";
import { Link, useLocation } from "wouter";
import type { Comment, IncidentFollowUp } from "@shared/schema";
import { ReportModal } from "@/components/report-modal";
import { getAgencyInfo, isUserReport } from "@/lib/agency-info";
import { ReporterAttribution } from "@/components/ReporterAttribution";

interface IncidentDetailModalProps {
  incident: any;
  isOpen: boolean;
  onClose: () => void;
}

export function IncidentDetailModal({ incident, isOpen, onClose }: IncidentDetailModalProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();

  // Mark Complete mutation
  const markCompleteMutation = useMutation({
    mutationFn: async () => {
      if (!incidentId) throw new Error('No incident ID');
      return apiRequest('PATCH', `/api/incidents/${incidentId}/status`, { status: 'completed' });
    },
    onSuccess: () => {
      toast({
        title: "Update successful",
        description: "Your community update has been marked as resolved",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/incidents'] });
      onClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to update incident status",
        variant: "destructive",
      });
    },
  });

  const handleMarkComplete = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to update incidents",
        variant: "destructive",
      });
      return;
    }
    
    markCompleteMutation.mutate();
  };
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [isLiked, setIsLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  
  // Follow-up states
  const [followUpDescription, setFollowUpDescription] = useState("");
  const [followUpStatus, setFollowUpStatus] = useState("");
  
  // Report modal states
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportEntityType, setReportEntityType] = useState<'incident' | 'comment'>('incident');
  const [reportEntityId, setReportEntityId] = useState('');
  const [reportEntityTitle, setReportEntityTitle] = useState('');

  // Check if current user is the creator of this incident
  const isIncidentCreator = user && incident && 
    incident.properties?.reporterId === user.id;
  
  // Check if incident is already completed
  const isIncidentCompleted = incident && 
    (incident.status === 'completed' || incident.properties?.status === 'completed');

  // Report functionality
  const handleReportIncident = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to report content",
        variant: "destructive",
      });
      return;
    }

    setReportEntityType('incident');
    setReportEntityId(incidentId || '');
    setReportEntityTitle(getIncidentTitle(incident));
    setReportModalOpen(true);
  };

  const handleReportComment = (commentId: string, commentContent: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to report content",
        variant: "destructive",
      });
      return;
    }

    setReportEntityType('comment');
    setReportEntityId(commentId);
    setReportEntityTitle(commentContent);
    setReportModalOpen(true);
  };

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

  // Reset like state when modal opens
  useEffect(() => {
    if (isOpen && incident && incidentId) {
      setLikeCount(0); // No fake counts - real functionality not implemented
      setIsLiked(false);
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

  // Follow-up queries and mutations
  const { data: followUps = [], isLoading: followUpsLoading } = useQuery({
    queryKey: ["/api/incidents", incidentId, "follow-ups"],
    queryFn: async () => {
      const response = await fetch(`/api/incidents/${incidentId}/follow-ups`);
      if (!response.ok) throw new Error('Failed to fetch follow-ups');
      return response.json();
    },
    enabled: isOpen && !!incidentId && !!incident
  });

  const createFollowUpMutation = useMutation({
    mutationFn: async (data: { status: string; description: string; photoUrl?: string }) => {
      return apiRequest("POST", `/api/incidents/${incidentId}/follow-ups`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "follow-ups"] });
      setFollowUpDescription("");
      setFollowUpStatus("");
      toast({
        title: "Follow-up posted",
        description: "Your status update has been added to the incident",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to post follow-up",
        description: error.message || "Please try again",
        variant: "destructive",
      });
    },
  });

  const handleSubmitFollowUp = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to post follow-ups",
        variant: "destructive",
      });
      return;
    }

    if (!followUpStatus || !followUpDescription.trim()) {
      toast({
        title: "Missing information",
        description: "Please select a status and provide a description",
        variant: "destructive",
      });
      return;
    }

    createFollowUpMutation.mutate({
      status: followUpStatus,
      description: followUpDescription.trim(),
    });
  };

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
    if (!incident) return "Incident";
    
    if (incident.type === 'traffic') {
      return incident.properties?.description || incident.properties?.event_type || "Traffic Event";
    }
    
    if (incident.properties?.userReported) {
      // Use the actual title submitted by the user, fall back to category name
      return incident.properties?.title || incident.properties?.categoryName || "Community Report";
    }
    
    // For ESQ incidents - check properties.title
    if (incident.properties?.title) {
      return incident.properties.title;
    }
    
    // For emergency incidents, create a meaningful title
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
      // Use the actual description submitted by the user
      return incident.properties?.description || 
             incident.properties?.subcategoryName || 
             "Community reported incident";
    }
    
    // For ESQ incidents - check properties.description
    if (incident.properties?.description) {
      return incident.properties.description;
    }
    
    // For emergency incidents, provide better description
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
    
    if (incident.type === 'traffic') {
      const roadName = incident.properties?.road_summary?.road_name || '';
      const locality = incident.properties?.road_summary?.locality || '';
      
      if (roadName && locality) {
        return `${roadName}, ${locality}`;
      }
      return roadName || locality || "Location not specified";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.locationDescription || 
             incident.properties?.location || 
             "Location not specified";
    }
    
    // For ESQ incidents - check properties.locationDescription
    if (incident.properties?.locationDescription) {
      return incident.properties.locationDescription;
    }
    
    // For emergency incidents, build location intelligently
    const location = incident.properties?.Location || '';
    const locality = incident.properties?.Locality || '';
    const locationDesc = incident.properties?.LocationDescription || '';
    
    // Try different combinations
    if (location && locality && location !== locality) {
      return `${location}, ${locality}`;
    }
    if (location) return location;
    if (locality) return locality;
    if (locationDesc) return locationDesc;
    
    return "Location not specified";
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
    
    if (incident.properties?.userReported) {
      return <Badge variant="secondary">Community Report</Badge>;
    }
    
    // Check status for completion
    const status = (
      incident.status || 
      incident.properties?.CurrentStatus || 
      incident.properties?.status ||
      incident.properties?.event_status ||
      incident.properties?.event_state ||
      ''
    ).toLowerCase();
    
    // Complete status
    if (status === 'completed' || status === 'closed' || status === 'resolved' || status === 'cleared' || status === 'patrolled' || status === 'complete') {
      return <Badge variant="outline" className="text-gray-600 border-gray-300">Complete</Badge>;
    }
    
    // Default to Active for all other incidents
    return <Badge variant="destructive">Active</Badge>;
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
            <div className="flex items-center gap-2 mt-1">
              {isAuthenticated && !isReply && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs"
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
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-1 text-xs text-gray-500 hover:text-red-600"
                  onClick={() => handleReportComment(comment.id, comment.content)}
                  data-testid={`button-report-comment-${comment.id}`}
                >
                  <Flag className="w-3 h-3 mr-1" />
                  Report
                </Button>
              )}
            </div>
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
  

  // User data mapping - NO FALLBACKS, return null if no user data
  const getUserData = (userId: string) => {
    // Check if this is the current logged-in user
    if (user && userId === user.id) {
      const displayName = user.displayName || `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'You';
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
    
    // Return user data if found, or null (no fallbacks) - use ReporterAttribution component for proper user handling
    return users[userId] || null;
  };

  // This function now only handles official agencies - user reports use ReporterAttribution component
  const agencyInfo = getAgencyInfo(incident);
  const isUserIncident = isUserReport(incident);

  // Don't render if no incident
  if (!incident) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) {
        setReportModalOpen(false);
        onClose();
      }
    }}>
      <DialogContent 
        className="w-[calc(100vw-1rem)] sm:w-[95vw] max-w-sm sm:max-w-lg max-h-[95vh] sm:max-h-[85vh] flex flex-col p-0 bg-gradient-to-br from-white via-gray-50 to-white border-0 shadow-2xl overflow-hidden" 
        data-testid="modal-incident-details"
        aria-describedby="modal-description"
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-200/30 to-purple-200/30 rounded-full blur-2xl"></div>
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-br from-orange-200/20 to-pink-200/20 rounded-full blur-lg"></div>
        
        <DialogHeader className="relative p-3 sm:p-6 pb-2 sm:pb-4 flex-shrink-0 bg-gradient-to-r from-gray-50/80 to-white/80 backdrop-blur-sm">
          {/* Enhanced Header */}
          <div className="flex items-center gap-4">
            {/* Handle user-reported incidents with ReporterAttribution */}
            {isUserIncident && incident.properties?.reporterId ? (
              <div 
                className="flex items-center gap-4 cursor-pointer hover:bg-gray-50 p-2 -ml-2 rounded-xl transition-colors flex-1"
                onClick={() => {
                  setLocation(`/users/${incident.properties.reporterId}`);
                  onClose(); // Close the modal when navigating to profile
                }}
                data-testid="button-user-profile"
              >
                <ReporterAttribution 
                  userId={incident.properties.reporterId} 
                  variant="default" 
                  className="flex-1"
                />
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
                </div>
              </div>
            ) : (
              // Non-clickable version for official incidents  
              <>
                {agencyInfo ? (
                  <>
                    <div className="relative">
                      <Avatar className="w-14 h-14 ring-4 ring-white shadow-xl">
                        <AvatarFallback className={`${agencyInfo.color} text-white font-bold text-lg`}>
                          {agencyInfo.avatar}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-2 mb-1 flex-wrap">
                        <h4 className="font-bold text-gray-900 text-base sm:text-lg leading-tight break-words flex-1 min-w-0">
                          {agencyInfo.name}
                        </h4>
                        <Badge variant="secondary" className="px-2 sm:px-3 py-1 bg-gradient-to-r from-blue-100 to-purple-100 text-blue-700 border-blue-200 font-medium text-xs sm:text-sm flex-shrink-0">
                          {agencyInfo.type.split(' ')[0]}
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
                      </div>
                    </div>
                  </>
                ) : (
                  // Fallback for incidents without clear agency info - use ReporterAttribution
                  <ReporterAttribution 
                    userId={incident.properties?.reporterId} 
                    variant="default" 
                    className="flex-1"
                  />
                )}
              </>
            )}
            <Button variant="ghost" size="sm" className="w-10 h-10 p-0 shrink-0 rounded-full hover:bg-gray-100">
              <MoreHorizontal className="w-5 h-5 text-gray-500" />
            </Button>
          </div>
        </DialogHeader>
        
        {/* Enhanced Scrollable Content Container */}
        <div className="relative flex-1 overflow-y-auto">
          {/* Main Incident Card */}
          <div className="p-3 sm:p-6 space-y-3 sm:space-y-6" id="modal-description">
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
                    <div className="flex flex-wrap gap-2">
                      {getStatusBadge(incident)}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-4">
                    <div className="p-1.5 bg-blue-500 rounded-lg">
                      <MapPin className="w-3.5 h-3.5 text-white" />
                    </div>
                    <span className="font-semibold">{getIncidentLocation(incident)}</span>
                  </div>
                  
                  {/* Enhanced Details */}
                  <div className="space-y-4">
                    {/* Enhanced Traffic Details - Government Style */}
                    {incident.type === 'traffic' && (
                      <div className="relative p-4 rounded-xl bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-blue-200/30 to-indigo-200/30 rounded-full blur-lg"></div>
                        <div className="relative space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-blue-600 rounded-lg">
                              <Car className="w-4 h-4 text-white" />
                            </div>
                            <h4 className="font-bold text-blue-900 text-lg">
                              {incident.properties?.event_type || incident.properties?.event_subtype || 'Traffic Event'}
                            </h4>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            {/* Suburbs/Localities */}
                            {incident.properties?.road_summary?.locality && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-blue-800 min-w-0 sm:w-32">Suburbs / Localities</div>
                                <div className="text-blue-900 break-words">{incident.properties.road_summary.locality}</div>
                              </div>
                            )}
                            
                            {/* Roads */}
                            {incident.properties?.road_summary?.road_name && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-blue-800 min-w-0 sm:w-32">Roads</div>
                                <div className="text-blue-900 break-words">{incident.properties.road_summary.road_name}</div>
                              </div>
                            )}
                            
                            {/* Location details */}
                            {incident.properties?.description && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-blue-800 min-w-0 sm:w-32">Location details</div>
                                <div className="text-blue-900 break-words">{incident.properties.description}</div>
                              </div>
                            )}
                            
                            {/* What to expect */}
                            {incident.properties?.advice && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-blue-800 min-w-0 sm:w-32">What to expect</div>
                                <div className="text-blue-900 break-words">{incident.properties.advice}</div>
                              </div>
                            )}
                            
                            {/* Traffic impact */}
                            {incident.properties?.traffic_impact && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-blue-800 min-w-0 sm:w-32">Impact</div>
                                <div className="text-blue-900 break-words">{incident.properties.traffic_impact}</div>
                              </div>
                            )}
                            
                            {/* Last updated */}
                            {incident.properties?.last_updated && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-blue-800 min-w-0 sm:w-32">Last updated</div>
                                <div className="text-blue-900 break-words">
                                  {new Date(incident.properties.last_updated).toLocaleString('en-AU', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Information provided by */}
                            <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                              <div className="font-semibold text-blue-800 min-w-0 sm:w-32">Information provided by</div>
                              <div className="text-blue-900 break-words">Department of Transport and Main Roads</div>
                            </div>
                            
                            {/* Event ID */}
                            {incident.properties?.id && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-blue-800 min-w-0 sm:w-32">Event ID</div>
                                <div className="text-blue-900 font-mono break-all">{incident.properties.id}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                
                    {/* Enhanced Emergency Incident Details - Government Style */}
                    {!incident.properties?.userReported && incident.type !== 'traffic' && (
                      <div className="relative p-4 rounded-xl bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 overflow-hidden">
                        <div className="absolute top-0 right-0 w-12 h-12 bg-gradient-to-br from-red-200/30 to-orange-200/30 rounded-full blur-lg"></div>
                        <div className="relative space-y-4">
                          <div className="flex items-center gap-3 mb-4">
                            <div className="p-2 bg-red-600 rounded-lg">
                              <Shield className="w-4 h-4 text-white" />
                            </div>
                            <h4 className="font-bold text-red-900 text-lg">
                              {incident.properties?.Event_Type || incident.properties?.GroupedType || 'Emergency Incident'}
                            </h4>
                          </div>
                          
                          <div className="space-y-3 text-sm">
                            {/* Incident Type */}
                            {incident.properties?.GroupedType && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Incident Type</div>
                                <div className="text-red-900 break-words">{incident.properties.GroupedType}</div>
                              </div>
                            )}
                            
                            {/* Specific Event */}
                            {incident.properties?.Event_Type && incident.properties.Event_Type !== incident.properties?.GroupedType && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Event Details</div>
                                <div className="text-red-900 break-words">{incident.properties.Event_Type}</div>
                              </div>
                            )}
                            
                            {/* Location */}
                            {incident.properties?.Location && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Location</div>
                                <div className="text-red-900 break-words">{incident.properties.Location}</div>
                              </div>
                            )}
                            
                            {/* Locality/Suburb */}
                            {incident.properties?.Locality && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Locality</div>
                                <div className="text-red-900 break-words">{incident.properties.Locality}</div>
                              </div>
                            )}
                            
                            {/* Current Status */}
                            {incident.properties?.CurrentStatus && incident.properties.CurrentStatus !== 'Unknown' && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Current Status</div>
                                <div className="text-red-900 font-semibold break-words">{incident.properties.CurrentStatus}</div>
                              </div>
                            )}
                            
                            {/* Priority Level */}
                            {incident.properties?.Priority && incident.properties.Priority !== 'Unknown' && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Priority Level</div>
                                <div className="text-red-900 font-bold break-words">{incident.properties.Priority}</div>
                              </div>
                            )}
                            
                            {/* Response Date */}
                            {incident.properties?.Response_Date && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Response Date</div>
                                <div className="text-red-900 break-words">
                                  {new Date(incident.properties.Response_Date).toLocaleString('en-AU', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Published Date */}
                            {incident.properties?.publishedDate && incident.properties.publishedDate !== incident.properties?.Response_Date && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Published</div>
                                <div className="text-red-900 break-words">
                                  {new Date(incident.properties.publishedDate).toLocaleString('en-AU', {
                                    day: 'numeric',
                                    month: 'short',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </div>
                              </div>
                            )}
                            
                            {/* Responsible Agency */}
                            {incident.properties?.Jurisdiction && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Responsible Agency</div>
                                <div className="text-red-900 break-words">
                                  {(() => {
                                    const jurisdiction = incident.properties.Jurisdiction;
                                    switch (jurisdiction) {
                                      case 'QFES': return 'Queensland Fire & Emergency Services';
                                      case 'QPS': return 'Queensland Police Service';
                                      case 'QAS': return 'Queensland Ambulance Service';
                                      case 'ESQ': return 'Emergency Services Queensland';
                                      default: return jurisdiction;
                                    }
                                  })()}
                                </div>
                              </div>
                            )}
                            
                            {/* Master Incident Number */}
                            {incident.properties?.Master_Incident_Number && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Incident Number</div>
                                <div className="text-red-900 font-mono break-all">{incident.properties.Master_Incident_Number}</div>
                              </div>
                            )}
                            
                            {/* Additional Description */}
                            {incident.properties?.Description && (
                              <div className="flex flex-col sm:flex-row gap-1 sm:gap-3">
                                <div className="font-semibold text-red-800 min-w-0 sm:w-32">Additional Info</div>
                                <div className="text-red-900 break-words">{incident.properties.Description}</div>
                              </div>
                            )}
                          </div>
                        </div>
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
          
            {/* Enhanced Incident Photo with Lazy Loading */}
            {incident?.properties?.photoUrl && (
              <div className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 shadow-lg">
                <img 
                  src={`/api/compress-image?path=${encodeURIComponent(incident.properties.photoUrl.startsWith('/') ? incident.properties.photoUrl : '/' + incident.properties.photoUrl)}&size=full&format=auto`}
                  alt="Incident photo" 
                  className="w-full h-56 object-cover cursor-pointer hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                  data-testid="img-incident-photo"
                  style={{
                    backgroundImage: `url('data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300"%3E%3Crect fill="%23f3f4f6" width="400" height="300"/%3E%3Ctext x="50%" y="50%" text-anchor="middle" dy=".3em" fill="%23d1d5db" font-family="sans-serif" font-size="14"%3ELoading...%3C/text%3E%3C/svg%3E')`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  }}
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
                    className={`group flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 ${
                      isLiked 
                        ? 'text-blue-600 hover:text-blue-700 hover:bg-blue-50' 
                        : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
                    }`}
                    onClick={handleLike}
                    data-testid="button-like-incident"
                  >
                    <Heart className={`w-4 h-4 transition-colors ${isLiked ? 'fill-blue-600 text-blue-600' : ''}`} />
                    {likeCount > 0 && (
                      <span className="text-sm font-medium">{likeCount}</span>
                    )}
                  </Button>
                  <Button variant="ghost" size="sm" className="group flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-purple-600 hover:bg-purple-50 transition-all duration-200">
                    <MessageCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">{comments.length || 0}</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="group flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-green-600 hover:bg-green-50 transition-all duration-200"
                    onClick={handleShare}
                    data-testid="button-share-incident"
                  >
                    <Share2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Share</span>
                  </Button>
                  
                  {/* Report Button - only show for authenticated users */}
                  {isAuthenticated && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="group flex items-center gap-2 px-3 py-2 rounded-lg text-gray-500 hover:text-red-600 hover:bg-red-50 transition-all duration-200"
                      onClick={handleReportIncident}
                      data-testid="button-report-incident"
                    >
                      <Flag className="w-4 h-4" />
                      <span className="text-sm font-medium">Report</span>
                    </Button>
                  )}
                  
                  {/* Mark Complete Button - only show for incident creator and not already completed */}
                  {isIncidentCreator && !isIncidentCompleted && incident.properties?.userReported && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="group flex items-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-teal-50 border border-gray-200 hover:border-teal-300 text-gray-600 hover:text-teal-600 transition-all duration-200 shadow-sm hover:shadow-md"
                      onClick={handleMarkComplete}
                      disabled={markCompleteMutation.isPending}
                      data-testid="button-mark-complete"
                    >
                      <div className="w-5 h-5 bg-teal-500 rounded-lg flex items-center justify-center">
                        <CheckCircle className="w-3 h-3 text-white" />
                      </div>
                      <span className="text-sm font-semibold">
                        {markCompleteMutation.isPending ? 'Updating...' : 'Mark Resolved'}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          
            {/* Follow-ups Section - Only show for user-reported incidents */}
            {incident?.properties?.userReported && (
              <div className="relative p-4 rounded-2xl bg-gradient-to-br from-green-50/80 to-emerald-50/80 border border-green-200 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                    <ClipboardList className="w-4 h-4 text-white" />
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg">
                    Status Updates ({followUps.length})
                  </h3>
                </div>

                {followUpsLoading ? (
                  <div className="text-center py-4">
                    <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
                    <p className="text-sm text-muted-foreground">Loading follow-ups...</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {followUps.map((followUp: IncidentFollowUp) => (
                      <div key={followUp.id} className="flex gap-3 p-3 bg-white/60 rounded-lg border border-green-100">
                        <Avatar className="w-8 h-8">
                          <AvatarFallback className="text-xs bg-green-100 text-green-700">
                            {getUserData(followUp.userId).name.split(' ').map(n => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm text-gray-900">
                              {getUserData(followUp.userId).name}
                            </span>
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${
                                followUp.status === 'resolved' ? 'bg-green-50 text-green-700 border-green-200' :
                                followUp.status === 'in_progress' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                followUp.status === 'escalated' ? 'bg-orange-50 text-orange-700 border-orange-200' :
                                'bg-gray-50 text-gray-700 border-gray-200'
                              }`}
                            >
                              <TrendingUp className="w-3 h-3 mr-1" />
                              {followUp.status.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {followUp.createdAt && new Date(followUp.createdAt).toLocaleString('en-AU', {
                                day: 'numeric',
                                month: 'short',
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 break-words">{followUp.description}</p>
                        </div>
                      </div>
                    ))}
                    
                    {followUps.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        No status updates yet. Share an update about this incident!
                      </p>
                    )}
                  </div>
                )}

                {/* Follow-up Form - Only show for incident creator */}
                {isIncidentCreator && isAuthenticated && (
                  <div className="mt-4 pt-4 border-t border-green-200">
                    <h4 className="font-semibold text-sm text-gray-900 mb-3">Post Status Update</h4>
                    <div className="space-y-3">
                      <Select value={followUpStatus} onValueChange={setFollowUpStatus}>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select status..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="resolved">Resolved</SelectItem>
                          <SelectItem value="escalated">Escalated</SelectItem>
                          <SelectItem value="closed">Closed</SelectItem>
                        </SelectContent>
                      </Select>
                      
                      <Textarea
                        placeholder="Provide an update on the current status..."
                        value={followUpDescription}
                        onChange={(e) => setFollowUpDescription(e.target.value)}
                        className="min-h-[80px] resize-none"
                        data-testid="textarea-followup-description"
                      />
                      
                      <Button 
                        onClick={handleSubmitFollowUp}
                        disabled={createFollowUpMutation.isPending || !followUpStatus || !followUpDescription.trim()}
                        className="w-full bg-green-600 hover:bg-green-700"
                        data-testid="button-submit-followup"
                      >
                        {createFollowUpMutation.isPending ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                            Posting...
                          </>
                        ) : (
                          <>
                            <Send className="w-4 h-4 mr-2" />
                            Post Update
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}

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
      
      {/* Report Modal */}
      <ReportModal
        isOpen={reportModalOpen}
        onClose={() => setReportModalOpen(false)}
        entityType={reportEntityType}
        entityId={reportEntityId}
        entityTitle={reportEntityTitle}
      />
    </Dialog>
  );
}