import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { 
  ThumbsUp, 
  MessageCircle, 
  Share2, 
  MoreHorizontal,
  MapPin,
  Clock,
  Heart,
  Frown,
  AlertTriangle,
  Laugh,
  HeartHandshake
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface PostCardProps {
  post: any;
  onCommentClick?: () => void;
}

const reactionTypes = [
  { type: "like", icon: ThumbsUp, label: "Like", color: "text-blue-500" },
  { type: "love", icon: Heart, label: "Love", color: "text-red-500" },
  { type: "care", icon: HeartHandshake, label: "Care", color: "text-orange-500" },
  { type: "wow", icon: Laugh, label: "Wow", color: "text-yellow-500" },
  { type: "sad", icon: Frown, label: "Sad", color: "text-purple-500" },
  { type: "angry", icon: AlertTriangle, label: "Angry", color: "text-red-600" },
];

export function PostCard({ post, onCommentClick }: PostCardProps) {
  const { user } = useAuth();
  const [showReactions, setShowReactions] = useState(false);

  const incidentId = post.id || post.properties?.id;
  
  const { data: reactionData } = useQuery({
    queryKey: ["/api/reactions", incidentId],
    queryFn: async () => {
      const res = await fetch(`/api/reactions/${incidentId}`);
      if (!res.ok) return { count: 0, userReaction: null, reactions: {} };
      return res.json();
    },
    enabled: !!incidentId,
  });

  const { data: commentCount = 0 } = useQuery({
    queryKey: ["/api/incidents", incidentId, "comments-count"],
    queryFn: async () => {
      const res = await fetch(`/api/incidents/${incidentId}/comments-count`);
      if (!res.ok) return 0;
      const data = await res.json();
      return data.count || 0;
    },
    enabled: !!incidentId,
  });

  const reactMutation = useMutation({
    mutationFn: async (reactionType: string) => {
      const res = await fetch(`/api/reactions/${incidentId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactionType }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to react");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reactions", incidentId] });
    },
  });

  const getTimeAgo = (timestamp: string | undefined) => {
    if (!timestamp) return "Just now";
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return "Just now";
    if (diffInMinutes < 60) return `${diffInMinutes}m`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h`;
    if (diffInMinutes < 10080) return `${Math.floor(diffInMinutes / 1440)}d`;
    return `${Math.floor(diffInMinutes / 10080)}w`;
  };

  const props = post.properties || {};
  const title = props.title || "Community Update";
  const description = props.description || "";
  const location = props.location || props.locationDescription || "";
  const photoUrl = props.photoUrl;
  const timestamp = props.incidentTime || props.lastUpdated || props.publishedAt;
  const category = props.category || "Community";
  
  const posterName = props.reporterName || props.userName || "Community Member";
  const posterAvatar = props.reporterAvatar || props.userAvatar;
  const posterId = props.userId || props.reporterId;

  const handleReaction = (type: string) => {
    reactMutation.mutate(type);
    setShowReactions(false);
  };

  const userReaction = reactionData?.userReaction;
  const totalReactions = reactionData?.count || 0;

  return (
    <Card className="border-0 shadow-sm bg-card rounded-none sm:rounded-lg mb-2">
      <CardContent className="p-0">
        {/* Post Header */}
        <div className="flex items-start justify-between p-3 sm:p-4 pb-2">
          <div className="flex items-center gap-3">
            <Link href={posterId ? `/users/${posterId}` : "#"}>
              <Avatar className="h-10 w-10 sm:h-11 sm:w-11 cursor-pointer">
                {posterAvatar && <AvatarImage src={posterAvatar} />}
                <AvatarFallback className="bg-primary/10 text-primary font-medium">
                  {posterName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <Link href={posterId ? `/users/${posterId}` : "#"}>
                <p className="font-semibold text-sm text-foreground hover:underline cursor-pointer">
                  {posterName}
                </p>
              </Link>
              <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span>{getTimeAgo(timestamp)}</span>
                {location && (
                  <>
                    <span>·</span>
                    <MapPin className="w-3 h-3" />
                    <span className="truncate max-w-[120px] sm:max-w-[150px]">{location}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>Save post</DropdownMenuItem>
              <DropdownMenuItem>Hide post</DropdownMenuItem>
              <DropdownMenuItem className="text-destructive">Report</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Category Badge */}
        <div className="px-3 sm:px-4 pb-2">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
            {category}
          </span>
        </div>

        {/* Post Content */}
        <div className="px-3 sm:px-4 pb-3">
          <h3 className="font-semibold text-foreground mb-1">{title}</h3>
          {description && (
            <p className="text-muted-foreground text-sm leading-relaxed">{description}</p>
          )}
        </div>

        {/* Post Image */}
        {photoUrl && (
          <Link href={`/incident/${incidentId}`}>
            <div className="relative cursor-pointer">
              <img
                src={photoUrl}
                alt={title}
                className="w-full object-cover max-h-[400px]"
                loading="lazy"
              />
            </div>
          </Link>
        )}

        {/* Reaction & Comment Counts */}
        {(totalReactions > 0 || commentCount > 0) && (
          <div className="flex items-center justify-between px-3 py-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              {totalReactions > 0 && (
                <>
                  <div className="flex -space-x-1">
                    {reactionTypes
                      .filter(r => reactionData?.reactions?.[r.type] > 0)
                      .slice(0, 3)
                      .map((reaction) => {
                        const Icon = reaction.icon;
                        const bgColor = reaction.type === 'like' ? 'bg-blue-500' 
                          : reaction.type === 'love' ? 'bg-red-500'
                          : reaction.type === 'care' ? 'bg-orange-500'
                          : reaction.type === 'wow' ? 'bg-yellow-500'
                          : reaction.type === 'sad' ? 'bg-purple-500'
                          : 'bg-red-600';
                        return (
                          <span 
                            key={reaction.type}
                            className={`w-5 h-5 ${bgColor} rounded-full flex items-center justify-center`}
                          >
                            <Icon className="w-3 h-3 text-white" />
                          </span>
                        );
                      })}
                  </div>
                  <span className="ml-1">{totalReactions}</span>
                </>
              )}
            </div>
            {commentCount > 0 && (
              <button 
                onClick={onCommentClick}
                className="hover:underline"
              >
                {commentCount} {commentCount === 1 ? "comment" : "comments"}
              </button>
            )}
          </div>
        )}

        {/* Action Buttons */}
        <div className="border-t border-border">
          <div className="flex items-center justify-around py-1">
            {/* Like Button with Reactions */}
            <Popover open={showReactions} onOpenChange={setShowReactions}>
              <PopoverTrigger asChild>
                <Button
                  variant="ghost"
                  className={cn(
                    "flex-1 gap-2 h-10 rounded-none",
                    userReaction && reactionTypes.find(r => r.type === userReaction)?.color
                  )}
                  onMouseEnter={() => setShowReactions(true)}
                  onClick={() => handleReaction(userReaction ? "remove" : "like")}
                  data-testid="button-like"
                >
                  {userReaction ? (
                    (() => {
                      const reaction = reactionTypes.find(r => r.type === userReaction);
                      const Icon = reaction?.icon || ThumbsUp;
                      return <Icon className="w-5 h-5" />;
                    })()
                  ) : (
                    <ThumbsUp className="w-5 h-5" />
                  )}
                  <span className="text-sm font-medium">
                    {userReaction 
                      ? reactionTypes.find(r => r.type === userReaction)?.label || "Like"
                      : "Like"
                    }
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-auto p-2 flex gap-1" 
                side="top"
                onMouseLeave={() => setShowReactions(false)}
              >
                {reactionTypes.map((reaction) => {
                  const Icon = reaction.icon;
                  return (
                    <button
                      key={reaction.type}
                      onClick={() => handleReaction(reaction.type)}
                      className={cn(
                        "p-2 rounded-full hover:bg-muted transition-all hover:scale-110",
                        reaction.color
                      )}
                      title={reaction.label}
                      data-testid={`button-reaction-${reaction.type}`}
                    >
                      <Icon className="w-5 h-5" />
                    </button>
                  );
                })}
              </PopoverContent>
            </Popover>

            {/* Comment Button */}
            <Button
              variant="ghost"
              className="flex-1 gap-2 h-10 sm:h-11 rounded-none text-muted-foreground"
              onClick={onCommentClick}
              data-testid="button-comment"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm font-medium">Comment</span>
            </Button>

            {/* Share Button */}
            <Button
              variant="ghost"
              className="flex-1 gap-2 h-10 sm:h-11 rounded-none text-muted-foreground"
              onClick={() => {
                if (navigator.share) {
                  navigator.share({
                    title: title,
                    text: description,
                    url: `${window.location.origin}/incident/${incidentId}`,
                  });
                }
              }}
              data-testid="button-share"
            >
              <Share2 className="w-5 h-5" />
              <span className="text-sm font-medium">Share</span>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
