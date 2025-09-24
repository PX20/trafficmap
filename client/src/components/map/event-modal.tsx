import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Share2, MapPin, Clock, AlertTriangle, Car, Shield, Eye, Zap, Info, Timer, Route, Construction, Copy, Check, ArrowLeft, Camera, ImageIcon, X, Loader2, ExternalLink, Edit, Trash, MoreHorizontal, Upload, CheckCircle, Trees, Search, Flame, Users } from "lucide-react";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { ObjectUploader } from "@/components/ObjectUploader";
import { getIncidentCategory, getIncidentSubcategory, getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";

interface EventModalProps {
  eventId: string | null;
  onClose: () => void;
}

export function EventModal({ eventId, onClose }: EventModalProps) {
  const [, setLocation] = useLocation();
  const [showDetails, setShowDetails] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [commentsView, setCommentsView] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [newComment, setNewComment] = useState("");
  const [replyingTo, setReplyingTo] = useState<string | null>(null); // Track which comment we're replying to
  const [replyContent, setReplyContent] = useState("");
  
  // Photo upload state management
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [selectedReplyPhoto, setSelectedReplyPhoto] = useState<File | null>(null);
  const [replyPhotoPreview, setReplyPhotoPreview] = useState<string | null>(null);
  const [photoAltText, setPhotoAltText] = useState("");
  const [replyPhotoAltText, setReplyPhotoAltText] = useState("");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  // Photo modal state
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<{url: string; alt: string} | null>(null);
  
  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedEditCategoryId, setSelectedEditCategoryId] = useState<string>("");
  const [editUploadedPhotoUrl, setEditUploadedPhotoUrl] = useState<string>("");
  const [isEditPhotoUploading, setIsEditPhotoUploading] = useState(false);
  
  // Edit form schema - matches submission form
  const editIncidentSchema = z.object({
    title: z.string().min(1, "Title is required"),
    description: z.string().optional(),
    location: z.string().min(1, "Location is required"),
    categoryId: z.string().min(1, "Category is required"),
    subcategoryId: z.string().min(1, "Subcategory is required"),
    photoUrl: z.string().optional(),
    policeNotified: z.enum(["yes", "no", "not_needed", "unsure"]).optional(),
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  // Use unified incidents API
  const { data: unifiedData } = useQuery({
    queryKey: ["/api/unified"],
  });

  // Fetch categories and subcategories for edit form
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["/api/subcategories"],
  });

  // Get filtered subcategories for the selected category in edit form
  const editSubcategories = (subcategories as any[]).filter((sub: any) => 
    selectedEditCategoryId ? sub.categoryId === selectedEditCategoryId : false
  );

  // Find event in unified incidents data
  const event = (unifiedData as any)?.features?.find((f: any) => 
    f.properties.id?.toString() === eventId ||
    f.id?.toString() === eventId
  );

  // Edit form setup
  const editForm = useForm<z.infer<typeof editIncidentSchema>>({
    resolver: zodResolver(editIncidentSchema),
    defaultValues: {
      title: "",
      description: "",
      location: "",
      categoryId: "",
      subcategoryId: "",
      photoUrl: "",
      policeNotified: "unsure",
    },
  });

  // Populate edit form when modal opens
  useEffect(() => {
    if (showEditModal && event) {
      const props = event.properties;
      setSelectedEditCategoryId(props.category || "");
      setEditUploadedPhotoUrl(props.photoUrl || "");
      editForm.reset({
        title: props.title || "",
        description: props.description || "",
        location: props.location || "",
        categoryId: props.category || "",
        subcategoryId: props.subcategory || "",
        photoUrl: props.photoUrl || "",
        policeNotified: props.policeNotified || "unsure",
      });
    }
  }, [showEditModal, event, editForm]);

  // Photo upload functions for edit form
  const handleEditGetUploadParameters = async () => {
    const response = await apiRequest("POST", "/api/objects/upload", {});
    const responseData = await response.json();
    return {
      method: "PUT" as const,
      url: responseData.uploadURL,
    };
  };

  const handleEditPhotoUploadStart = () => {
    setIsEditPhotoUploading(true);
  };

  const handleEditPhotoUploadComplete = (result: any) => {
    setIsEditPhotoUploading(false);
    if (result.successful && result.successful.length > 0) {
      const uploadedUrl = result.successful[0].uploadURL;
      setEditUploadedPhotoUrl(uploadedUrl);
      editForm.setValue("photoUrl", uploadedUrl);
      toast({
        title: "Photo uploaded",
        description: "Your photo has been uploaded successfully.",
      });
    }
  };

  const handleEditPhotoUploadError = (error: any) => {
    setIsEditPhotoUploading(false);
    toast({
      title: "Upload failed",
      description: "Failed to upload photo. Please try again.",
      variant: "destructive",
    });
  };

  // Get social data for the incident
  const { data: socialData } = useQuery({
    queryKey: ["/api/incidents", eventId, "social"],
    queryFn: async () => {
      if (!eventId) return null;
      
      const [commentsRes, likesRes] = await Promise.all([
        fetch(`/api/incidents/${eventId}/social/comments`).then(r => r.json()),
        fetch(`/api/incidents/${eventId}/social/likes`).then(r => r.json())
      ]);

      return {
        comments: commentsRes.comments || [],
        commentCount: commentsRes.count || 0,
        likeCount: likesRes.count || 0
      };
    },
    enabled: !!eventId
  });

  // Like toggle mutation
  const likeMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("No event ID");
      return apiRequest("POST", `/api/incidents/${eventId}/social/likes/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", eventId, "social"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Edit incident mutation
  const editIncidentMutation = useMutation({
    mutationFn: async (data: any) => {
      if (!eventId) throw new Error("No event ID");
      return apiRequest("PUT", `/api/unified-incidents/${eventId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/unified"] });
      toast({
        title: "Incident updated",
        description: "Your incident report has been updated successfully",
      });
      setShowEditModal(false);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update incident. Please try again.",
        variant: "destructive",
      });
    }
  });

  const comments = socialData?.comments || [];

  // Handle comment submission
  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    
    commentMutation.mutate({
      content: newComment.trim(),
      photo: selectedPhoto || undefined,
      altText: photoAltText || undefined
    });
  };

  // Comment mutation
  const commentMutation = useMutation({
    mutationFn: async ({ content, parentCommentId, photo, altText }: { content: string; parentCommentId?: string; photo?: File; altText?: string }) => {
      if (!eventId) throw new Error("No event ID");
      
      // If photo is included, use FormData and multipart endpoint
      if (photo) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('photo', photo);
        if (altText) formData.append('altText', altText);
        if (parentCommentId) formData.append('parentCommentId', parentCommentId);
        
        setIsUploadingPhoto(true);
        
        // Use fetch directly for multipart data
        const response = await fetch(`/api/incidents/${eventId}/social/comments/with-photo`, {
          method: 'POST',
          body: formData,
          credentials: 'include'
        });
        
        if (!response.ok) {
          throw new Error('Failed to upload comment with photo');
        }
        
        return response.json();
      } else {
        // Use regular endpoint for text-only comments
        return apiRequest("POST", `/api/incidents/${eventId}/social/comments`, { content, parentCommentId });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", eventId, "social"] });
      setNewComment("");
      setReplyContent("");
      setReplyingTo(null);
      
      // Clear photo state
      setSelectedPhoto(null);
      setPhotoPreview(null);
      setSelectedReplyPhoto(null);
      setReplyPhotoPreview(null);
      setPhotoAltText("");
      setReplyPhotoAltText("");
      setIsUploadingPhoto(false);
      
      toast({
        title: "Comment added",
        description: "Your comment has been posted successfully",
      });
    },
    onError: () => {
      setIsUploadingPhoto(false);
      toast({
        title: "Error",
        description: "Failed to post comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete comment mutation  
  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!eventId) throw new Error("No event ID");
      return apiRequest("DELETE", `/api/incidents/${eventId}/social/comments/${commentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", eventId, "social"] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to delete comment. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Delete incident mutation
  const deleteIncidentMutation = useMutation({
    mutationFn: async () => {
      if (!eventId) throw new Error("No event ID");
      return apiRequest("DELETE", `/api/unified-incidents/${eventId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/unified"] });
      toast({
        title: "Incident deleted",
        description: "Your incident report has been deleted",
      });
      onClose(); // Close the modal after deletion
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete incident. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Comment like mutation
  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      if (!eventId) throw new Error("No event ID");
      return apiRequest("POST", `/api/incidents/${eventId}/social/comments/${commentId}/likes/toggle`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", eventId, "social"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  });

  // Photo handling functions
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, isReply: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: "Invalid file type",
        description: "Please select an image file (JPEG, PNG, GIF, etc.)",
        variant: "destructive",
      });
      return;
    }
    
    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 5MB",
        variant: "destructive",
      });
      return;
    }
    
    if (isReply) {
      setSelectedReplyPhoto(file);
      setReplyPhotoPreview(URL.createObjectURL(file));
    } else {
      setSelectedPhoto(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };
  
  const removePhoto = (isReply: boolean = false) => {
    if (isReply) {
      setSelectedReplyPhoto(null);
      if (replyPhotoPreview) {
        URL.revokeObjectURL(replyPhotoPreview);
        setReplyPhotoPreview(null);
      }
      setReplyPhotoAltText("");
    } else {
      setSelectedPhoto(null);
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview);
        setPhotoPreview(null);
      }
      setPhotoAltText("");
    }
  };
  
  // Photo preview component for uploads
  const PhotoPreview = ({ preview, altText, setAltText, onRemove, isReply = false }: {
    preview: string;
    altText: string;
    setAltText: (text: string) => void;
    onRemove: () => void;
    isReply?: boolean;
  }) => (
    <div className="relative mt-2 p-2 border rounded-lg bg-muted/30">
      <div className="relative inline-block">
        <img 
          src={preview} 
          alt="Photo preview" 
          className="max-w-24 max-h-24 rounded object-cover" 
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={onRemove}
          className="absolute -top-2 -right-2 w-6 h-6 p-0 bg-background border rounded-full shadow-sm hover:bg-destructive hover:text-destructive-foreground"
          data-testid={`button-remove-photo${isReply ? '-reply' : ''}`}
        >
          <X className="w-3 h-3" />
        </Button>
      </div>
      <input
        type="text"
        placeholder="Alt text for accessibility (optional)"
        value={altText}
        onChange={(e) => setAltText(e.target.value)}
        className="w-full mt-2 px-2 py-1 text-xs border rounded bg-background"
        data-testid={`input-alt-text${isReply ? '-reply' : ''}`}
      />
    </div>
  );

  // Facebook-style comment photo component  
  const CommentPhoto = ({ photoUrl, photoAlt, commentId }: {
    photoUrl: string;
    photoAlt?: string;
    commentId: string;
  }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [hasError, setHasError] = useState(false);

    const handlePhotoClick = () => {
      setSelectedPhotoModal({ url: photoUrl, alt: photoAlt || 'Comment photo' });
    };

    const handlePhotoLoad = () => {
      setIsLoading(false);
      setHasError(false);
    };

    const handlePhotoError = () => {
      setIsLoading(false);
      setHasError(true);
    };

    return (
      <div className="mt-2 max-w-sm" data-testid={`comment-photo-${commentId}`}>
        {isLoading && (
          <div className="flex items-center justify-center w-full h-48 bg-muted/30 rounded-xl border border-muted/50">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}
        {hasError && (
          <div className="flex items-center justify-center w-full h-48 bg-muted/30 rounded-xl border border-muted/50">
            <div className="text-center space-y-1">
              <ImageIcon className="w-6 h-6 text-muted-foreground mx-auto" />
              <p className="text-xs text-muted-foreground">Failed to load image</p>
            </div>
          </div>
        )}
        {!hasError && (
          <div className="relative overflow-hidden rounded-xl border border-muted/50 bg-muted/20">
            <img
              src={photoUrl}
              alt={photoAlt || 'Comment photo'}
              onLoad={handlePhotoLoad}
              onError={handlePhotoError}
              onClick={handlePhotoClick}
              className={`w-full h-auto max-h-80 object-cover cursor-pointer transition-all hover:scale-[1.02] ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              style={{ minHeight: '120px' }}
              data-testid={`img-comment-photo-${commentId}`}
            />
            <div className="absolute inset-0 bg-black/0 hover:bg-black/5 transition-colors flex items-center justify-center opacity-0 hover:opacity-100">
              <div className="bg-black/20 rounded-full p-2">
                <ExternalLink className="w-4 h-4 text-white drop-shadow-lg" />
              </div>
            </div>
            {photoAlt && (
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-2">
                <p className="text-xs text-white text-center">{photoAlt}</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Photo modal component
  const PhotoModal = () => {
    if (!selectedPhotoModal) return null;

    return (
      <Dialog open={!!selectedPhotoModal} onOpenChange={() => setSelectedPhotoModal(null)}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black/90 border-none" data-testid="photo-modal">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedPhotoModal.url}
              alt={selectedPhotoModal.alt}
              className="max-w-full max-h-full object-contain"
              data-testid="img-modal-photo"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 w-8 h-8 p-0 bg-black/50 hover:bg-black/70 text-white border-none"
              data-testid="button-close-photo-modal"
            >
              <X className="w-4 h-4" />
            </Button>
            {selectedPhotoModal.alt && (
              <div className="absolute bottom-4 left-4 right-4 text-center">
                <p className="text-sm text-white/80 bg-black/50 px-3 py-1 rounded-full inline-block max-w-full">
                  {selectedPhotoModal.alt}
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };
  
  // Share functionality
  const handleShare = async () => {
    const shareData = {
      title: event?.properties?.title || 'QLD Safety Incident',
      text: event?.properties?.description || 'View this safety incident on QLD Safety Monitor',
      url: window.location.href
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({
          title: "Shared successfully",
          description: "Incident shared using device share function",
        });
      } else {
        // Fallback to clipboard
        await navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast({
          title: "Link copied",
          description: "Incident link copied to clipboard",
        });
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(window.location.href);
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
        toast({
          title: "Link copied",
          description: "Incident link copied to clipboard",
        });
      } catch (clipboardError) {
        toast({
          title: "Error",
          description: "Failed to share or copy link",
          variant: "destructive",
        });
      }
    }
  };

  // Helper function for relative timestamps (Facebook-style)
  const getRelativeTime = (dateString: string): string => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'now';
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    
    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) return `${diffInHours}h`;
    
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d`;
    
    const diffInWeeks = Math.floor(diffInDays / 7);
    if (diffInWeeks < 4) return `${diffInWeeks}w`;
    
    return date.toLocaleDateString();
  };

  // Recursive comment rendering function for nested comments (Facebook-style)
  const renderComment = (comment: any, depth: number = 0): JSX.Element => {
    const maxDepth = 3; // Limit nesting depth to prevent excessive indentation
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
            {/* Content Container - Facebook style */}
            <div className="bg-muted/40 rounded-2xl px-3 py-2.5 inline-block max-w-full">
              <div className="flex items-center space-x-2 mb-1">
                {/* Only show delete button for own comments */}
                {user?.id === comment.userId && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteCommentMutation.mutate(comment.id)}
                    className="text-xs h-5 px-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 ml-auto opacity-0 group-hover:opacity-100 transition-opacity"
                    disabled={deleteCommentMutation.isPending}
                    data-testid={`button-delete-comment-${comment.id}`}
                  >
                    ×
                  </Button>
                )}
              </div>
              <p className="text-sm text-foreground leading-relaxed break-words">{comment.content}</p>
            </div>
            
            {/* Display photo if exists - positioned below text like Facebook */}
            {comment.photoUrl && (
              <div className="mt-1">
                <CommentPhoto 
                  photoUrl={comment.photoUrl} 
                  photoAlt={comment.photoAlt} 
                  commentId={comment.id}
                />
              </div>
            )}
            
            {/* Action buttons - Facebook style */}
            <div className="flex items-center space-x-4 mt-1 mb-2 px-1">
              <span className="text-xs text-muted-foreground font-medium">
                {getRelativeTime(comment.createdAt)}
              </span>
              <button 
                onClick={() => commentLikeMutation.mutate(comment.id)}
                disabled={commentLikeMutation.isPending}
                className={`text-xs font-semibold transition-colors cursor-pointer ${
                  comment.isLiked ? 'text-blue-600 hover:text-blue-700' : 'text-muted-foreground hover:text-foreground'
                }`}
                data-testid={`button-like-comment-${comment.id}`}
              >
                {comment.isLiked ? '👍 Liked' : 'Like'}
                {(comment.likeCount > 0) && ` (${comment.likeCount})`}
              </button>
              <button 
                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                data-testid={`button-reply-${comment.id}`}
              >
                Reply
              </button>
            </div>
            
            {/* Facebook-style Reply Form */}
            {replyingTo === comment.id && (
              <div className="flex space-x-3 mt-3">
                <ReporterAttribution 
                  userId={user?.id} 
                  variant="compact" 
                  className="flex-shrink-0"
                />
                <div className="flex-1 space-y-2">
                  <div className="bg-muted/40 rounded-2xl px-3 py-2 border border-muted">
                    <input
                      type="text"
                      placeholder="Write a reply..."
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && replyContent.trim()) {
                          commentMutation.mutate({ 
                            content: replyContent.trim(), 
                            parentCommentId: comment.id,
                            photo: selectedReplyPhoto || undefined,
                            altText: replyPhotoAltText || undefined
                          });
                        }
                        if (e.key === 'Escape') {
                          setReplyingTo(null);
                          setReplyContent("");
                          removePhoto(true);
                        }
                      }}
                      className="w-full bg-transparent text-sm placeholder:text-muted-foreground border-none outline-none resize-none"
                      disabled={commentMutation.isPending || isUploadingPhoto}
                      data-testid={`input-reply-${comment.id}`}
                      autoFocus
                    />
                  </div>
                  
                  {/* Photo Upload Input for Reply */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handlePhotoSelect(e, true)}
                        className="hidden"
                        id={`reply-photo-upload-${comment.id}`}
                        disabled={commentMutation.isPending || isUploadingPhoto}
                        data-testid={`input-reply-photo-${comment.id}`}
                      />
                      <label 
                        htmlFor={`reply-photo-upload-${comment.id}`}
                        className="flex items-center space-x-1 px-2 py-1 text-xs rounded-full bg-muted/50 hover:bg-muted transition-colors cursor-pointer"
                      >
                        <Camera className="w-3 h-3" />
                        <span>Photo</span>
                      </label>
                      {selectedReplyPhoto && (
                        <span className="text-xs text-muted-foreground">
                          📸 {selectedReplyPhoto.name}
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setReplyingTo(null);
                          setReplyContent("");
                          removePhoto(true);
                        }}
                        className="h-7 px-3 text-xs text-muted-foreground hover:text-foreground"
                        data-testid={`button-cancel-reply-${comment.id}`}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => {
                          if (replyContent.trim()) {
                            commentMutation.mutate({ 
                              content: replyContent.trim(), 
                              parentCommentId: comment.id,
                              photo: selectedReplyPhoto || undefined,
                              altText: replyPhotoAltText || undefined
                            });
                          }
                        }}
                        disabled={!replyContent.trim() || commentMutation.isPending || isUploadingPhoto}
                        className="h-7 px-3 text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                        data-testid={`button-post-reply-${comment.id}`}
                      >
                        {commentMutation.isPending || isUploadingPhoto ? "..." : "Reply"}
                      </Button>
                    </div>
                  </div>
                  
                  {/* Photo Preview for Reply */}
                  {replyPhotoPreview && (
                    <PhotoPreview 
                      preview={replyPhotoPreview}
                      altText={replyPhotoAltText}
                      setAltText={setReplyPhotoAltText}
                      onRemove={() => removePhoto(true)}
                      isReply={true}
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Render replies recursively */}
        {comment.replies && comment.replies.length > 0 && (
          <div className="space-y-2">
            {comment.replies.map((reply: any) => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!event) return null;

  const props = event.properties;
  const source = String(props.source || '').toLowerCase(); // normalize source defensively
  
  // Check both explicit source field AND userReported property for user incidents
  const isUserReported = source === 'user' || props.userReported === true;
  const isTrafficEvent = source === 'tmr';
  const isEmergencyEvent = source === 'emergency';
  
  // Robust data access helper - checks prioritized key lists across normalized and original properties
  const valueFrom = (keys: string[], fallback: string = ''): string => {
    const originalProps = props.originalProperties || {};
    
    // First check normalized top-level properties
    for (const key of keys) {
      if (props[key]) {
        if (typeof props[key] === 'string' && props[key].trim()) {
          return props[key].trim();
        }
        // Handle objects by converting to JSON or extracting relevant info
        if (typeof props[key] === 'object' && props[key] !== null) {
          const objStr = extractStringFromObject(props[key]);
          if (objStr) return objStr;
        }
      }
    }
    
    // Then check originalProperties with both camelCase and snake_case variants
    for (const key of keys) {
      // Check exact key
      if (originalProps[key]) {
        if (typeof originalProps[key] === 'string' && originalProps[key].trim()) {
          return originalProps[key].trim();
        }
        // Handle objects by converting to JSON or extracting relevant info
        if (typeof originalProps[key] === 'object' && originalProps[key] !== null) {
          const objStr = extractStringFromObject(originalProps[key]);
          if (objStr) return objStr;
        }
      }
      
      // Check snake_case variant
      const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (originalProps[snakeKey]) {
        if (typeof originalProps[snakeKey] === 'string' && originalProps[snakeKey].trim()) {
          return originalProps[snakeKey].trim();
        }
        if (typeof originalProps[snakeKey] === 'object' && originalProps[snakeKey] !== null) {
          const objStr = extractStringFromObject(originalProps[snakeKey]);
          if (objStr) return objStr;
        }
      }
      
      // Check camelCase variant
      const camelKey = key.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
      if (originalProps[camelKey]) {
        if (typeof originalProps[camelKey] === 'string' && originalProps[camelKey].trim()) {
          return originalProps[camelKey].trim();
        }
        if (typeof originalProps[camelKey] === 'object' && originalProps[camelKey] !== null) {
          const objStr = extractStringFromObject(originalProps[camelKey]);
          if (objStr) return objStr;
        }
      }
    }
    
    return fallback;
  };

  // Helper to extract meaningful string from complex objects
  const extractStringFromObject = (obj: any): string => {
    try {
      if (!obj || typeof obj !== 'object') return '';
      
      // Handle traffic impact objects
      if (obj.impact_type && obj.direction) {
        const parts = [];
        if (obj.impact_type) parts.push(obj.impact_type);
        if (obj.direction) parts.push(`towards ${obj.direction}`);
        if (obj.delay) parts.push(`${obj.delay} delay`);
        return parts.join(' - ');
      }
      
      // Handle duration objects
      if (obj.start && obj.end) {
        const parts = [];
        if (obj.start) parts.push(`From ${obj.start}`);
        if (obj.end) parts.push(`until ${obj.end}`);
        if (obj.active_days && Array.isArray(obj.active_days)) {
          parts.push(`on ${obj.active_days.join(', ')}`);
        }
        return parts.join(' ');
      }
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.filter(item => typeof item === 'string').join(', ');
      }
      
      // Extract first string value found
      for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
      
      return '';
    } catch (e) {
      return '';
    }
  };
  
  // Get nested value helper for complex objects
  const getNestedValue = (obj: any, path: string): string => {
    const keys = path.split('.');
    let current = obj;
    for (const key of keys) {
      if (!current || typeof current !== 'object') return '';
      current = current[key];
    }
    return (typeof current === 'string' && current.trim()) ? current.trim() : '';
  };
  const getIncidentIcon = () => {
    const { iconName, color } = getIncidentIconProps(event);
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
  
  const getAgencyColor = (agency: string) => {
    if (agency === 'TMR') return 'text-orange-600';
    if (agency === 'QFES') return 'text-red-600';
    if (agency === 'QPS') return 'text-blue-600';
    if (agency === 'QAS') return 'text-green-600';
    if (agency === 'ESQ') return 'text-red-600';
    return 'text-purple-600'; // Community
  };
  
  // Check if current user owns this incident
  const isCurrentUserOwner = () => {
    if (!user || !isUserReported) return false;
    return user.id === props.userId;
  };

  const getReporterInfo = () => {
    // Access user details from originalProperties  
    const originalProps = props.originalProperties || {};
    
    // Trust props.source explicitly when present, only use fallbacks when source is missing
    if (isUserReported) {
      // Always prioritize the actual author's information over current viewer
      const displayName = originalProps.reporterName || 
        originalProps.reportedBy?.split('@')[0] ||
        originalProps.authorName ||
        originalProps.userName ||
        (user && user.id === (originalProps.reporterId || props.userId) ? (user.displayName || user.firstName || user.email?.split('@')[0]) : undefined) || 
        (() => {
          const id = props.userId || originalProps.reporterId;
          return id ? `User ${id.slice(-4)}` : 'Anonymous Reporter';
        })();
      
      return {
        name: displayName,
        agency: 'Community',
        initials: displayName.slice(0, 2).toUpperCase(),
        avatar: originalProps.reporterAvatar || (user?.id === (originalProps.reporterId || props.userId) ? user?.profileImageUrl : undefined)
      };
    }
    
    if (isTrafficEvent) {
      return {
        name: 'TMR Queensland',
        agency: 'TMR',
        initials: 'TMR'
      };
    }
    
    if (isEmergencyEvent) {
      const originalProps = props.originalProperties || {};
      const groupedType = (originalProps.GroupedType || '').toUpperCase();
      if (groupedType.includes('FIRE')) {
        return { name: 'QLD Fire & Emergency', agency: 'QFES', initials: 'QFES' };
      }
      if (groupedType.includes('POLICE')) {
        return { name: 'QLD Police Service', agency: 'QPS', initials: 'QPS' };
      }
      if (groupedType.includes('AMBULANCE')) {
        return { name: 'QLD Ambulance Service', agency: 'QAS', initials: 'QAS' };
      }
      return { name: 'Emergency Services QLD', agency: 'ESQ', initials: 'ESQ' };
    }
    
    // Handle legacy source distinctly
    if (source === 'legacy') {
      const fallbackId = props.userId || props.reporterId || props.id;
      const displayName = fallbackId && fallbackId !== 'Unknown' ? 
        `Community Reporter ${fallbackId.slice(-4)}` : 'Community Reporter';
      return {
        name: displayName,
        agency: 'Legacy Report',
        initials: 'LR'
      };
    }
    
    // Fallback only when source is missing/unknown - check for user indicators
    if (!source || source === 'unknown') {
      const hasUserIndicators = props.userReported || props.reporterId || props.reporterName || props.reportedBy || props.userId || props.authorName || props.userName;
      if (hasUserIndicators) {
        const fallbackId = props.userId || props.reporterId || props.id;
        const displayName = fallbackId && fallbackId !== 'Unknown' ? 
          `Community Reporter ${fallbackId.slice(-4)}` : 'Community Reporter';
        return { 
          name: displayName, 
          agency: 'Community', 
          initials: 'CR' 
        };
      }
    }
    
    // Final fallback for unrecognized sources
    return { 
      name: 'Unknown Source', 
      agency: 'Unknown', 
      initials: 'UK' 
    };
  };
  
  const getTitle = () => {
    if (isTrafficEvent) {
      // Prioritized title keys for traffic events
      const title = valueFrom([
        'title', 'heading', 'summary', 'description', 'information', 
        'event_type', 'eventType', 'category', 'type'
      ]);
      return title || "Traffic Event";
    }
    
    if (isUserReported) {
      // Prioritized title keys for user reports
      const title = valueFrom([
        'title', 'heading', 'subject', 'summary', 'description', 
        'category', 'incidentType', 'type'
      ]);
      return title || "Community Report";
    }
    
    if (isEmergencyEvent) {
      // For emergency incidents, create a meaningful title
      const groupedType = valueFrom(['GroupedType', 'groupedType', 'type', 'category', 'incidentType']);
      const locality = valueFrom(['Locality', 'locality', 'location', 'address', 'suburb']);
      
      if (groupedType && locality) {
        return `${groupedType} - ${locality}`;
      }
      return groupedType || "Emergency Incident";
    }
    
    // Fallback for any other source types
    return valueFrom(['title', 'heading', 'description', 'type'], 'Incident');
  };
  
  const getLocation = () => {
    if (isTrafficEvent) {
      // Check for road summary data first
      const originalProps = props.originalProperties || {};
      const roadName = getNestedValue(originalProps, 'road_summary.road_name') || 
                      getNestedValue(originalProps, 'roadSummary.roadName');
      const locality = getNestedValue(originalProps, 'road_summary.locality') || 
                      getNestedValue(originalProps, 'roadSummary.locality');
      
      if (roadName && locality) {
        return `${roadName}, ${locality}`;
      }
      
      // Fallback to general location fields
      const location = valueFrom([
        'location', 'address', 'road', 'street', 'roadName', 'road_name',
        'locality', 'suburb', 'city', 'place'
      ]);
      
      return roadName || locality || location || 'Location not specified';
    }
    
    if (isEmergencyEvent) {
      // First try the processed location field which is already properly formatted
      const processedLocation = valueFrom(['location', 'address', 'formattedLocation']);
      if (processedLocation && processedLocation !== 'Queensland') {
        return processedLocation;
      }
      
      // Build location from components
      const location = valueFrom(['Location', 'location', 'address', 'street', 'road']);
      const locality = valueFrom(['Locality', 'locality', 'suburb', 'city', 'place']);
      
      if (location && locality && location !== locality) {
        return `${location}, ${locality}`;
      }
      
      return location || locality || processedLocation || 'Location not specified';
    }
    
    if (isUserReported) {
      const location = valueFrom([
        'location', 'locationDescription', 'address', 'place', 
        'street', 'road', 'suburb', 'locality'
      ]);
      return location || 'Location not specified';
    }
    
    // Fallback for any other source types
    return valueFrom(['location', 'address', 'place'], 'Location not specified');
  };
  
  const getThumbnail = () => {
    if (isUserReported && props.photoUrl) {
      return props.photoUrl;
    }
    return null;
  };
  
  const reporterInfo = getReporterInfo();
  const thumbnail = getThumbnail();

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase();
    if (p === 'high' || p === 'red alert') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    if (p === 'medium') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
    return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Unknown';
      
      const now = new Date();
      const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
      
      if (diff < 1) return 'Just now';
      if (diff < 60) return `${diff} minutes ago`;
      if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
      if (diff < 10080) return `${Math.floor(diff / 1440)} days ago`;
      return date.toLocaleDateString();
    } catch {
      return 'Unknown';
    }
  };
  
  // Get timestamp using robust data access
  const getTimestamp = () => {
    if (isTrafficEvent) {
      return valueFrom([
        'published', 'publishedAt', 'timestamp', 'lastUpdated', 'incidentTime',
        'last_updated', 'updated', 'created', 'createdAt', 'date'
      ]);
    }
    
    if (isEmergencyEvent) {
      return valueFrom([
        'published', 'publishedAt', 'timestamp', 'lastUpdated', 'incidentTime',
        'Response_Date', 'ResponseDate', 'LastUpdate', 'lastUpdate',
        'updated', 'created', 'createdAt', 'date'
      ]);
    }
    
    if (isUserReported) {
      return valueFrom([
        'publishedAt', 'published', 'timestamp', 'lastUpdated', 'incidentTime',
        'createdAt', 'created', 'submitted', 'date'
      ]);
    }
    
    // Fallback for any source
    return valueFrom([
      'published', 'publishedAt', 'timestamp', 'lastUpdated', 'incidentTime',
      'created', 'createdAt', 'date'
    ]);
  };

  const getDescription = () => {
    if (isTrafficEvent) {
      // Prioritized description keys for traffic events
      const description = valueFrom([
        'description', 'information', 'details', 'message', 'summary',
        'advice', 'impact', 'notes', 'comments'
      ]);
      return description || 'No detailed description available';
    }
    
    if (isEmergencyEvent) {
      // Try to get a direct description first
      const directDescription = valueFrom([
        'description', 'information', 'details', 'message', 'summary', 'notes'
      ]);
      
      if (directDescription) {
        return directDescription;
      }
      
      // Build a meaningful description from available emergency data
      const originalProps = props.originalProperties || {};
      const parts = [];
      
      const groupedType = valueFrom(['GroupedType', 'groupedType', 'type', 'category']);
      const currentStatus = valueFrom(['CurrentStatus', 'currentStatus', 'status']);
      
      if (groupedType) parts.push(groupedType);
      if (currentStatus && currentStatus !== groupedType) {
        parts.push(`Status: ${currentStatus}`);
      }
      
      // Check vehicles data from both normalized and original props
      const vehiclesOnScene = props.vehiclesOnScene || originalProps.VehiclesOnScene || originalProps.vehiclesOnScene;
      if (vehiclesOnScene && vehiclesOnScene > 0) {
        parts.push(`${vehiclesOnScene} vehicles on scene`);
      }
      
      return parts.length > 0 ? parts.join(' - ') : 'Emergency response in progress';
    }
    
    if (isUserReported) {
      // For user reports, check all possible sources for the description
      const description = valueFrom([
        'description', 'details', 'information', 'message', 'summary',
        'notes', 'comments', 'report', 'content', 'text'
      ]);
      
      // Also check originalProperties and direct props
      const originalDescription = props.originalProperties?.description;
      const directDescription = props.description;
      
      // Check the incident data directly (from unified ingestion)
      const incidentDescription = event?.description;
      
      // Return the first valid description found, prioritizing user content
      return directDescription || incidentDescription || description || originalDescription || 'Community reported incident';
    }
    
    // Fallback for any other source types
    return valueFrom(['description', 'information', 'details', 'message'], 'No description available');
  };

  // Helper function to get human-readable category/subcategory display
  const getCategoryDisplayName = (incident: any): string => {
    const category = getIncidentCategory(incident);
    const subcategory = getIncidentSubcategory(incident);
    
    // If we have a subcategory, use it; otherwise use category
    return subcategory || category || 'Incident';
  };

  const getDuration = () => {
    if (isTrafficEvent) {
      const originalProps = props.originalProperties || {};
      if (originalProps.start_time && originalProps.end_time) {
        const start = new Date(originalProps.start_time);
        const end = new Date(originalProps.end_time);
        const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
        if (duration > 0) {
          return duration < 60 ? `${duration} minutes` : `${Math.floor(duration / 60)} hours ${duration % 60} minutes`;
        }
      }
      if (originalProps.duration) {
        if (typeof originalProps.duration === 'string') {
          return originalProps.duration;
        }
        // Handle duration objects
        if (typeof originalProps.duration === 'object') {
          const durationStr = extractStringFromObject(originalProps.duration);
          return durationStr || 'Duration information available';
        }
      }
    }
    return null;
  };

  const getRoadConditions = () => {
    if (isTrafficEvent) {
      const originalProps = props.originalProperties || {};
      const conditions = [];
      if (originalProps.road_condition) conditions.push(originalProps.road_condition);
      if (originalProps.lane_closure) conditions.push(`Lane closure: ${originalProps.lane_closure}`);
      if (originalProps.traffic_management) conditions.push(originalProps.traffic_management);
      return conditions.length > 0 ? conditions : null;
    }
    return null;
  };

  return (
    <Dialog open={!!eventId} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-0" data-testid="modal-event-details">
        {!commentsView ? (
          // Main Incident View - Redesigned for clarity
          <div className="flex flex-col">
            {/* Clean Header */}
            <div className="p-6 pb-4 border-b bg-muted/10">
              <div className="flex items-start justify-between mb-3">
                <Badge 
                  variant="secondary" 
                  className="bg-blue-100 text-blue-800 border-blue-200 font-medium"
                >
                  {getIncidentIcon()}
                  <span className="ml-1">
                    {getCategoryDisplayName(event)}
                  </span>
                </Badge>
              </div>
              <div className="flex items-start justify-between">
                <h2 className="text-xl font-bold text-foreground flex-1" data-testid="social-title">
                  {getTitle()}
                </h2>
                
                {/* Edit/Delete buttons for user's own posts */}
                {(user?.id && (
                  props.reporterId === user.id || 
                  props.userId === user.id ||
                  props.originalProperties?.reporterId === user.id ||
                  (props.originalProperties?.reportedBy === user.email)
                )) && (
                  <div className="flex items-center space-x-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowEditModal(true)}
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

            {/* Reporter Information - Moved to Top */}
            <div className="px-6 pt-4 pb-2 border-b bg-muted/5">
              <div className="bg-muted/30 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Avatar 
                    className={`w-10 h-10 ${isUserReported && props.reporterId ? 'cursor-pointer hover:ring-2 hover:ring-blue-200 transition-all' : ''}`}
                    onClick={isUserReported && props.reporterId ? () => {
                      setLocation(`/users/${props.reporterId}`);
                    } : undefined}
                  >
                    <AvatarImage src={reporterInfo.avatar} alt={reporterInfo.name} data-testid="img-reporter-avatar" />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                      {reporterInfo.initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-sm font-medium text-foreground" data-testid="text-reporter-name">
                        {reporterInfo.name}
                      </h4>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getAgencyColor(reporterInfo.agency)}`}
                      >
                        {reporterInfo.agency}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {isUserReported ? 'Community report' : 
                       isTrafficEvent ? 'Official traffic report' : 
                       'Emergency services report'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Content Section */}
            <div className="p-6 space-y-5">
              {/* Description */}
              {getDescription() && (
                <div>
                  <p className="text-foreground leading-relaxed" data-testid="text-incident-description">
                    {getDescription()}
                  </p>
                </div>
              )}

              {/* Image Thumbnail */}
              {thumbnail && (
                <div className="rounded-lg overflow-hidden bg-muted">
                  <img 
                    src={thumbnail} 
                    alt="Incident photo" 
                    className="w-full h-48 object-cover"
                    data-testid="img-incident-thumbnail"
                  />
                </div>
              )}

              {/* Location and Time */}
              <div className="space-y-3">
                {getLocation() && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                      <MapPin className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">
                        {getLocation()}
                      </p>
                    </div>
                  </div>
                )}
                
                {getTimestamp() && (
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-muted/50 flex items-center justify-center">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground" data-testid="text-event-time">
                        {formatDate(getTimestamp())}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Additional Details for Traffic/Emergency */}
              {(isTrafficEvent || isEmergencyEvent) && (
                <div className="space-y-3">
                  {/* Traffic Information */}
                  {isTrafficEvent && props.originalProperties && (
                    <>
                      {(props.originalProperties.impact || props.originalProperties.advice) && (
                        <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                          <div className="flex items-start space-x-2">
                            <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 space-y-2">
                              {props.originalProperties.impact && (
                                <div>
                                  <h5 className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Traffic Impact</h5>
                                  <p className="text-xs text-orange-700 dark:text-orange-300" data-testid="traffic-impact">
                                    {typeof props.originalProperties.impact === 'string' 
                                      ? props.originalProperties.impact 
                                      : extractStringFromObject(props.originalProperties.impact) || 'Traffic impact information available'
                                    }
                                  </p>
                                </div>
                              )}
                              {props.originalProperties.advice && (
                                <div>
                                  <h5 className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Advice</h5>
                                  <p className="text-xs text-orange-700 dark:text-orange-300" data-testid="traffic-advice">
                                    {typeof props.originalProperties.advice === 'string' 
                                      ? props.originalProperties.advice 
                                      : extractStringFromObject(props.originalProperties.advice) || 'Traffic advice information available'
                                    }
                                  </p>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="border-t bg-muted/10 px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCommentsView(true)}
                    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                    data-testid="button-comments"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>{socialData?.commentCount || 0}</span>
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => likeMutation.mutate()}
                    disabled={likeMutation.isPending}
                    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                    data-testid="button-like"
                  >
                    <Heart className="w-4 h-4" />
                    <span>{socialData?.likeCount || 0}</span>
                  </Button>
                </div>
                
                <div className="flex items-center space-x-1">
                  {/* Edit and Delete buttons for user-owned incidents */}
                  {isCurrentUserOwner() && (
                    <>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowEditModal(true)}
                        className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                        data-testid="button-edit-incident"
                      >
                        <Edit className="w-4 h-4" />
                        <span>Edit</span>
                      </Button>
                      
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (window.confirm("Are you sure you want to delete this incident? This action cannot be undone.")) {
                            deleteIncidentMutation.mutate();
                          }
                        }}
                        disabled={deleteIncidentMutation.isPending}
                        className="flex items-center space-x-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                        data-testid="button-delete-incident"
                      >
                        <Trash className="w-4 h-4" />
                        <span>Delete</span>
                      </Button>
                    </>
                  )}
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleShare}
                    className="flex items-center space-x-2 text-muted-foreground hover:text-foreground"
                    data-testid="button-share"
                  >
                    {copySuccess ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                    <span>Share</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          // Social Media-Style Comments View
          <>
            <DialogHeader className="pb-3">
              <div className="flex items-center space-x-3">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCommentsView(false)}
                  className="flex items-center space-x-2"
                  data-testid="button-back-to-incident"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back</span>
                </Button>
                <div className="flex-1 flex items-center justify-center">
                  <h2 className="text-sm font-semibold">Comments</h2>
                </div>
                <div className="w-12"></div> {/* Spacer for centering */}
              </div>
            </DialogHeader>

            <div className="flex-1 overflow-y-auto space-y-4 pr-2">
              {/* Incident Summary */}
              <div className="bg-muted/30 rounded-lg p-3 border">
                <div className="flex items-start space-x-3">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted`}>
                    {getIncidentIcon()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium line-clamp-1">{getTitle()}</h3>
                    <div className="flex items-center space-x-1 text-xs text-muted-foreground mt-1">
                      <MapPin className="w-3 h-3 flex-shrink-0" />
                      <span className="line-clamp-1">{getLocation()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Add Comment Form */}
              <div className="space-y-3 border-b pb-4">
                <div className="flex space-x-3">
                  <Avatar className="w-10 h-10 flex-shrink-0">
                    <AvatarFallback className="text-sm font-medium bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {user?.firstName?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <form onSubmit={handleCommentSubmit} className="space-y-3">
                      <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Write a comment..."
                        className="w-full p-3 rounded-lg border bg-background text-foreground min-h-[80px] resize-none"
                        data-testid="textarea-comment"
                      />
                      <div className="flex justify-end">
                        <Button 
                          type="submit" 
                          size="sm"
                          disabled={!newComment.trim() || commentMutation.isPending}
                          data-testid="button-submit-comment"
                        >
                          {commentMutation.isPending ? 'Posting...' : 'Post'}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              {/* Comments List */}
              {comments.length > 0 ? (
                <div className="space-y-4">
                  {comments.map((comment: any) => (
                    <div key={comment.id} className="flex space-x-3">
                      <Avatar className="w-8 h-8 flex-shrink-0">
                        <AvatarFallback className="text-xs bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                          {comment.authorName?.[0]?.toUpperCase() || 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium">{comment.authorName}</span>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(comment.createdAt)}
                            </span>
                          </div>
                          <p className="text-sm">{comment.content}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageCircle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No comments yet. Be the first to comment!</p>
                </div>
              )}
            </div>
          </>
        )}
      </DialogContent>

      {/* Edit Incident Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md w-full max-h-[90vh] overflow-y-auto" data-testid="edit-incident-modal">
          <DialogHeader>
            <DialogTitle>Edit Incident Report</DialogTitle>
          </DialogHeader>
          
          <Form {...editForm}>
            <form onSubmit={editForm.handleSubmit((data) => editIncidentMutation.mutate(data))} className="space-y-4">
              <FormField
                control={editForm.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Brief description"
                        {...field}
                        data-testid="input-edit-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="location"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Location</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter location"
                        {...field}
                        data-testid="input-edit-location"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={editForm.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Additional details..."
                        rows={3}
                        {...field}
                        data-testid="textarea-edit-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Category Selection */}
              <FormField
                control={editForm.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Category</FormLabel>
                    <Select value={field.value} onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedEditCategoryId(value);
                      editForm.setValue("subcategoryId", ""); // Reset subcategory when category changes
                    }}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-category">
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {(categories as any[]).map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Subcategory Selection */}
              <FormField
                control={editForm.control}
                name="subcategoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Subcategory</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange} disabled={!selectedEditCategoryId}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-subcategory">
                          <SelectValue placeholder="Select subcategory" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {editSubcategories.map((subcategory) => (
                          <SelectItem key={subcategory.id} value={subcategory.id}>
                            {subcategory.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Photo Upload */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Photo (Optional)</label>
                <ObjectUploader
                  getUploadParameters={handleEditGetUploadParameters}
                  onUploadStart={handleEditPhotoUploadStart}
                  onUploadComplete={handleEditPhotoUploadComplete}
                  onUploadError={handleEditPhotoUploadError}
                  maxFiles={1}
                  acceptedFileTypes={['image/*']}
                  className="w-full"
                />
                {isEditPhotoUploading && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading photo...</span>
                  </div>
                )}
                {editUploadedPhotoUrl && (
                  <div className="flex items-center space-x-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    <span>Photo uploaded successfully</span>
                  </div>
                )}
              </div>

              {/* Police Notified */}
              <FormField
                control={editForm.control}
                name="policeNotified"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Police Notified</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger data-testid="select-edit-police-notified">
                          <SelectValue placeholder="Select option" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="yes">Yes</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                        <SelectItem value="not_needed">Not Needed</SelectItem>
                        <SelectItem value="unsure">Unsure</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex space-x-2 pt-4">
                <Button
                  type="submit"
                  disabled={editIncidentMutation.isPending}
                  className="flex-1"
                  data-testid="button-save-changes"
                >
                  {editIncidentMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowEditModal(false)}
                  disabled={editIncidentMutation.isPending}
                  className="flex-1"
                  data-testid="button-cancel-edit"
                >
                  Cancel
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Photo Modal for full-size viewing */}
      <Dialog open={!!selectedPhotoModal} onOpenChange={() => setSelectedPhotoModal(null)}>
        <DialogContent className="max-w-4xl w-full h-[90vh] p-0 bg-black/90 border-none" data-testid="photo-modal">
          <div className="relative w-full h-full flex items-center justify-center">
            <img
              src={selectedPhotoModal?.url}
              alt={selectedPhotoModal?.alt}
              className="max-w-full max-h-full object-contain"
              data-testid="img-modal-photo"
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSelectedPhotoModal(null)}
              className="absolute top-4 right-4 bg-black/50 hover:bg-black/70 text-white"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
