import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Heart, Send, X } from "lucide-react";
import { getIncidentId } from "@/lib/incident-utils";

interface InlineCommentsProps {
  incident: any;
  onClose: () => void;
}

export function InlineComments({ incident, onClose }: InlineCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  
  const incidentId = getIncidentId(incident);

  // Fetch comments
  const { data: comments = [], isLoading: commentsLoading } = useQuery({
    queryKey: ["/api/incidents", incidentId, "comments"],
    queryFn: async () => {
      const response = await fetch(`/api/incidents/${incidentId}/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!incidentId
  });

  // Comment submission
  const createCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return apiRequest("POST", `/api/incidents/${incidentId}/comments`, { content });
    },
    onSuccess: () => {
      setNewComment("");
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", incidentId, "comments"] });
      toast({
        title: "Comment posted",
        description: "Your comment has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    },
  });

  const handleSubmitComment = () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to comment",
        variant: "destructive",
      });
      return;
    }
    
    if (!newComment.trim()) return;
    createCommentMutation.mutate(newComment.trim());
  };

  const getTimeAgo = (dateString: string) => {
    if (!dateString) return 'Unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  return (
    <div className="border-t border-border/50 bg-muted/20">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Comments ({comments.length})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0 hover:bg-background"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-3 mb-4 max-h-60 overflow-y-auto">
          {commentsLoading ? (
            <div className="text-center py-4">
              <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm text-muted-foreground">Loading comments...</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-6">
              <MessageCircle className="w-8 h-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No comments yet</p>
              <p className="text-xs text-muted-foreground">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((comment: any) => (
              <div key={comment.id} className="flex gap-3">
                <Avatar className="w-8 h-8">
                  {comment.user?.profileImageUrl ? (
                    <img src={comment.user.profileImageUrl} alt={comment.user?.displayName || 'User'} className="w-full h-full object-cover" />
                  ) : (
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {(comment.user?.displayName || comment.user?.firstName || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-background rounded-lg px-3 py-2 shadow-sm border border-border/50">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">
                        {comment.user?.displayName || comment.user?.firstName || 'Anonymous'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {getTimeAgo(comment.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-foreground break-words">{comment.content}</p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="flex gap-3">
          <Avatar className="w-8 h-8">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={user?.displayName || 'You'} className="w-full h-full object-cover" />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                {(user?.displayName || user?.firstName || 'Y').charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="text"
                  placeholder={isAuthenticated ? "Write a comment..." : "Please log in to comment"}
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmitComment();
                    }
                  }}
                  disabled={!isAuthenticated || createCommentMutation.isPending}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-border bg-background focus:ring-2 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
                />
              </div>
              <Button
                onClick={handleSubmitComment}
                disabled={!isAuthenticated || !newComment.trim() || createCommentMutation.isPending}
                size="sm"
                className="h-10 px-3"
              >
                {createCommentMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}