import { useState, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MessageCircle, Heart, Send, X, Reply, Image as ImageIcon } from "lucide-react";
import { getIncidentId } from "@/lib/incident-utils";

interface InlineCommentsProps {
  incident: any;
  onClose: () => void;
}

// Recursive comment component for threaded display - moved outside to prevent re-creation
const Comment = ({ 
  comment, 
  depth = 0, 
  replyingTo, 
  setReplyingTo, 
  replyContent, 
  setReplyContent, 
  handleSubmitReply, 
  user, 
  isAuthenticated, 
  createCommentMutation, 
  getTimeAgo 
}: { 
  comment: any; 
  depth?: number; 
  replyingTo: string | null; 
  setReplyingTo: (id: string | null) => void; 
  replyContent: string; 
  setReplyContent: (content: string) => void; 
  handleSubmitReply: (id: string) => void; 
  user: any; 
  isAuthenticated: boolean; 
  createCommentMutation: any; 
  getTimeAgo: (dateString: string) => string; 
}) => {
  const maxDepth = 3; // Limit nesting depth to avoid UI breaking
  const actualDepth = Math.min(depth, maxDepth);
  
  return (
    <div key={comment.id} className={`${actualDepth > 0 ? 'ml-6 md:ml-8' : ''}`}>
      <div className="flex gap-3">
        <Avatar className="w-9 h-9 md:w-8 md:h-8 flex-shrink-0">
          {comment.user?.profileImageUrl ? (
            <img src={comment.user.profileImageUrl} alt={comment.user?.displayName || 'User'} className="w-full h-full object-cover" />
          ) : (
            <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
              {(comment.user?.displayName || comment.user?.firstName || 'U').charAt(0).toUpperCase()}
            </AvatarFallback>
          )}
        </Avatar>
        <div className="flex-1 min-w-0">
          <div className="bg-background rounded-lg px-3 py-2 md:px-4 md:py-3 shadow-sm border border-border/50">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-medium text-sm md:text-base">
                {comment.user?.firstName && comment.user?.lastName 
                  ? `${comment.user.firstName} ${comment.user.lastName}`
                  : comment.user?.displayName || comment.user?.firstName || 'Anonymous'}
              </span>
              <span className="text-xs md:text-sm text-muted-foreground">
                {getTimeAgo(comment.createdAt)}
              </span>
            </div>
            <p className="text-sm md:text-base text-foreground break-words leading-relaxed">{comment.content}</p>
            
            {/* Reply button */}
            {actualDepth < maxDepth && (
              <div className="mt-2 pt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setReplyingTo(replyingTo === comment.id ? null : comment.id);
                  }}
                  className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                  data-testid={`button-reply-${comment.id}`}
                >
                  <Reply className="w-3 h-3 mr-1" />
                  Reply
                </Button>
              </div>
            )}
          </div>
          
          {/* Reply form */}
          {replyingTo === comment.id && (
            <div className="mt-3 flex gap-2">
              <Avatar className="w-7 h-7 flex-shrink-0">
                {user?.profileImageUrl ? (
                  <img src={user.profileImageUrl} alt={user?.displayName || 'You'} className="w-full h-full object-cover" />
                ) : (
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                    {(user?.displayName || user?.firstName || 'Y').charAt(0).toUpperCase()}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  placeholder="Write a reply..."
                  value={replyContent}
                  onChange={(e) => setReplyContent(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.stopPropagation();
                      handleSubmitReply(comment.id);
                    }
                  }}
                  onClick={(e) => e.stopPropagation()}
                  onFocus={(e) => e.stopPropagation()}
                  disabled={!isAuthenticated || createCommentMutation.isPending}
                  className="flex-1 px-2 py-1 text-sm rounded border border-border bg-background focus:ring-1 focus:ring-primary focus:border-transparent outline-none disabled:opacity-50"
                  data-testid={`input-reply-${comment.id}`}
                />
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    handleSubmitReply(comment.id);
                  }}
                  disabled={!isAuthenticated || !replyContent.trim() || createCommentMutation.isPending}
                  size="sm"
                  className="h-8 w-8 px-0"
                  data-testid={`button-submit-reply-${comment.id}`}
                >
                  {createCommentMutation.isPending ? (
                    <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Send className="w-3 h-3" />
                  )}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="mt-3 space-y-3">
          {comment.replies.map((reply: any) => (
            <Comment 
              key={reply.id} 
              comment={reply} 
              depth={actualDepth + 1} 
              replyingTo={replyingTo}
              setReplyingTo={setReplyingTo}
              replyContent={replyContent}
              setReplyContent={setReplyContent}
              handleSubmitReply={handleSubmitReply}
              user={user}
              isAuthenticated={isAuthenticated}
              createCommentMutation={createCommentMutation}
              getTimeAgo={getTimeAgo}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export function InlineComments({ incident, onClose }: InlineCommentsProps) {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");
  const [selectedPhotos, setSelectedPhotos] = useState<File[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [isUploadingPhotos, setIsUploadingPhotos] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const incidentId = getIncidentId(incident);

  // Fetch comments
  const { data: commentsData, isLoading: commentsLoading } = useQuery({
    queryKey: [`/api/incidents/${incidentId}/social/comments`],
    queryFn: async () => {
      const response = await fetch(`/api/incidents/${incidentId}/social/comments`);
      if (!response.ok) throw new Error('Failed to fetch comments');
      return response.json();
    },
    enabled: !!incidentId
  });

  const comments = commentsData?.comments || [];

  // Photo upload handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    
    if (selectedPhotos.length + files.length > 3) {
      toast({
        title: "Too many photos",
        description: "Maximum 3 photos allowed per comment",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file sizes
    const invalidFiles = files.filter(file => file.size > 5 * 1024 * 1024);
    if (invalidFiles.length > 0) {
      toast({
        title: "File too large",
        description: "Each photo must be less than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    setSelectedPhotos(prev => [...prev, ...files]);
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const uploadPhotos = async () => {
    if (selectedPhotos.length === 0) return [];
    
    setIsUploadingPhotos(true);
    try {
      const formData = new FormData();
      selectedPhotos.forEach(photo => {
        formData.append('photos', photo);
      });
      
      const response = await fetch('/api/upload/comment-photos', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Photo upload failed');
      }
      
      const data = await response.json();
      return data.urls || [];
    } catch (error: any) {
      toast({
        title: "Photo upload failed",
        description: error.message || "Failed to upload photos",
        variant: "destructive",
      });
      throw error;
    } finally {
      setIsUploadingPhotos(false);
    }
  };

  // Comment submission
  const createCommentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId, photoUrls }: { content: string; parentCommentId?: string; photoUrls?: string[] }) => {
      return apiRequest("POST", `/api/incidents/${incidentId}/social/comments`, { 
        content, 
        parentCommentId: parentCommentId || null,
        photoUrls: photoUrls || []
      });
    },
    onSuccess: () => {
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
      setSelectedPhotos([]);
      setUploadedPhotoUrls([]);
      queryClient.invalidateQueries({ queryKey: [`/api/incidents/${incidentId}/social/comments`] });
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

  const handleSubmitComment = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to comment",
        variant: "destructive",
      });
      return;
    }
    
    if (!newComment.trim()) return;
    
    try {
      // Upload photos first if any are selected
      const photoUrls = await uploadPhotos();
      
      // Submit comment with photo URLs
      createCommentMutation.mutate({ 
        content: newComment.trim(),
        photoUrls 
      });
    } catch (error) {
      // Error already handled in uploadPhotos
      return;
    }
  };

  const handleSubmitReply = (parentCommentId: string) => {
    if (!isAuthenticated) {
      toast({
        title: "Please log in",
        description: "You need to log in to reply",
        variant: "destructive",
      });
      return;
    }
    
    if (!replyContent.trim()) return;
    createCommentMutation.mutate({ 
      content: replyContent.trim(), 
      parentCommentId 
    });
  };

  // Organize comments into threaded structure
  const organizeComments = (comments: any[]) => {
    const commentMap = new Map();
    const rootComments: any[] = [];
    
    // First pass: create comment objects with replies array
    comments.forEach(comment => {
      commentMap.set(comment.id, { ...comment, replies: [] });
    });
    
    // Second pass: organize into tree structure
    comments.forEach(comment => {
      if (comment.parentCommentId && commentMap.has(comment.parentCommentId)) {
        // This is a reply, add it to parent's replies
        commentMap.get(comment.parentCommentId).replies.push(commentMap.get(comment.id));
      } else {
        // This is a root comment
        rootComments.push(commentMap.get(comment.id));
      }
    });
    
    return rootComments;
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


  const organizedComments = organizeComments(comments);

  return (
    <div className="border-t border-border/50 bg-muted/20">
      <div className="p-4">
        {/* Close button for mobile only */}
        <div className="flex justify-end mb-4 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-10 w-10 p-0 hover:bg-background min-h-[44px]"
            data-testid="button-close-comments"
          >
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Comments List */}
        <div className="space-y-3 md:space-y-4 mb-4">
          {commentsLoading ? (
            <div className="text-center py-4 md:py-6">
              <div className="w-6 h-6 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-sm md:text-base text-muted-foreground">Loading comments...</p>
            </div>
          ) : organizedComments.length === 0 ? (
            <div className="text-center py-6 md:py-8">
              <MessageCircle className="w-8 h-8 md:w-10 md:h-10 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm md:text-base text-muted-foreground">No comments yet</p>
              <p className="text-xs md:text-sm text-muted-foreground">Be the first to comment!</p>
            </div>
          ) : (
            organizedComments.map((comment: any) => (
              <Comment 
                key={comment.id} 
                comment={comment} 
                depth={0} 
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyContent={replyContent}
                setReplyContent={setReplyContent}
                handleSubmitReply={handleSubmitReply}
                user={user}
                isAuthenticated={isAuthenticated}
                createCommentMutation={createCommentMutation}
                getTimeAgo={getTimeAgo}
              />
            ))
          )}
        </div>

        {/* Comment Input */}
        <div className="flex gap-3">
          <Avatar className="w-9 h-9 md:w-8 md:h-8 flex-shrink-0 mt-1">
            {user?.profileImageUrl ? (
              <img src={user.profileImageUrl} alt={user?.displayName || 'You'} className="w-full h-full object-cover" />
            ) : (
              <AvatarFallback className="bg-primary text-primary-foreground text-xs md:text-sm">
                {(user?.displayName || user?.firstName || 'Y').charAt(0).toUpperCase()}
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex-1">
            <div onClick={(e) => e.stopPropagation()}>
              {/* Photo previews */}
              {selectedPhotos.length > 0 && (
                <div className="mb-2 flex gap-2 flex-wrap">
                  {selectedPhotos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img 
                        src={URL.createObjectURL(photo)} 
                        alt={`Upload ${index + 1}`}
                        className="w-20 h-20 object-cover rounded border border-border"
                      />
                      <button
                        onClick={() => removePhoto(index)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        data-testid={`button-remove-photo-${index}`}
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              
              {/* Textarea and action buttons */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Textarea
                    placeholder={isAuthenticated ? "Write a comment..." : "Please log in to comment"}
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSubmitComment();
                      }
                    }}
                    onClick={(e) => e.stopPropagation()}
                    onFocus={(e) => e.stopPropagation()}
                    disabled={!isAuthenticated || createCommentMutation.isPending || isUploadingPhotos}
                    className="min-h-[100px] resize-none text-sm md:text-base"
                    data-testid="input-comment"
                  />
                  
                  {/* Photo upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handlePhotoSelect}
                    className="hidden"
                    data-testid="input-photo-upload"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!isAuthenticated || selectedPhotos.length >= 3 || createCommentMutation.isPending || isUploadingPhotos}
                    className="mt-2 h-8 text-xs text-muted-foreground hover:text-foreground"
                    data-testid="button-add-photo"
                  >
                    <ImageIcon className="w-4 h-4 mr-1" />
                    Add Photo {selectedPhotos.length > 0 && `(${selectedPhotos.length}/3)`}
                  </Button>
                </div>
                
                <Button
                  onClick={handleSubmitComment}
                  disabled={!isAuthenticated || !newComment.trim() || createCommentMutation.isPending || isUploadingPhotos}
                  size="sm"
                  className="h-12 w-12 md:h-10 md:w-10 px-0 min-h-[44px] md:min-h-[40px] mb-[2px]"
                  data-testid="button-submit-comment"
                >
                  {createCommentMutation.isPending || isUploadingPhotos ? (
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
    </div>
  );
}