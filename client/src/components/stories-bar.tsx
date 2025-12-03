import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, X, Camera } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content?: string;
  photoUrl?: string;
  location?: string;
  viewCount: number;
  createdAt: string;
  expiresAt: string;
  hasViewed: boolean;
}

export function StoriesBar() {
  const { user } = useAuth();
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);
  const [showCreateStory, setShowCreateStory] = useState(false);
  const [storyContent, setStoryContent] = useState("");

  const { data: stories = [] } = useQuery<Story[]>({
    queryKey: ["/api/stories"],
    refetchInterval: 60000,
  });

  const createStoryMutation = useMutation({
    mutationFn: async (content: string) => {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create story");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
      setShowCreateStory(false);
      setStoryContent("");
    },
  });

  const viewStoryMutation = useMutation({
    mutationFn: async (storyId: string) => {
      const res = await fetch(`/api/stories/${storyId}/view`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark story as viewed");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stories"] });
    },
  });

  const handleStoryClick = (story: Story) => {
    setSelectedStory(story);
    if (!story.hasViewed) {
      viewStoryMutation.mutate(story.id);
    }
  };

  const groupedStories = stories.reduce((acc, story) => {
    if (!acc[story.userId]) {
      acc[story.userId] = {
        userId: story.userId,
        userName: story.userName,
        userAvatar: story.userAvatar,
        stories: [],
        hasUnviewed: false,
      };
    }
    acc[story.userId].stories.push(story);
    if (!story.hasViewed) {
      acc[story.userId].hasUnviewed = true;
    }
    return acc;
  }, {} as Record<string, { userId: string; userName: string; userAvatar?: string; stories: Story[]; hasUnviewed: boolean }>);

  const storyUsers = Object.values(groupedStories);

  return (
    <>
      <div className="bg-white border-b border-gray-200">
        <div className="flex gap-3 px-4 py-3 overflow-x-auto scrollbar-hide">
          {/* Create Story Button */}
          <button
            onClick={() => setShowCreateStory(true)}
            className="flex flex-col items-center gap-1 min-w-[72px]"
          >
            <div className="relative">
              <Avatar className="w-16 h-16 border-2 border-gray-200">
                {user?.profileImageUrl ? (
                  <AvatarImage src={user.profileImageUrl} />
                ) : (
                  <AvatarFallback className="bg-gray-100">
                    {user?.displayName?.charAt(0) || user?.firstName?.charAt(0) || "?"}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center border-2 border-white">
                <Plus className="w-4 h-4 text-white" />
              </div>
            </div>
            <span className="text-xs text-gray-600 font-medium">Your story</span>
          </button>

          {/* Story Users */}
          {storyUsers.map((storyUser) => (
            <button
              key={storyUser.userId}
              onClick={() => handleStoryClick(storyUser.stories[0])}
              className="flex flex-col items-center gap-1 min-w-[72px]"
            >
              <div className={`p-0.5 rounded-full ${storyUser.hasUnviewed ? 'bg-gradient-to-tr from-blue-500 to-purple-500' : 'bg-gray-300'}`}>
                <Avatar className="w-16 h-16 border-2 border-white">
                  {storyUser.userAvatar ? (
                    <AvatarImage src={storyUser.userAvatar} />
                  ) : (
                    <AvatarFallback className="bg-blue-100 text-blue-600">
                      {storyUser.userName.charAt(0)}
                    </AvatarFallback>
                  )}
                </Avatar>
              </div>
              <span className="text-xs text-gray-600 truncate max-w-[72px]">
                {storyUser.userName.split(" ")[0]}
              </span>
            </button>
          ))}

          {stories.length === 0 && (
            <div className="flex items-center justify-center text-gray-400 text-sm px-4">
              No stories yet. Be the first to share!
            </div>
          )}
        </div>
      </div>

      {/* Story Viewer Modal */}
      <Dialog open={!!selectedStory} onOpenChange={() => setSelectedStory(null)}>
        <DialogContent className="max-w-md p-0 bg-black">
          {selectedStory && (
            <div className="relative h-[80vh] flex flex-col">
              {/* Story Header */}
              <div className="absolute top-0 left-0 right-0 z-10 p-4 bg-gradient-to-b from-black/50 to-transparent">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-white">
                      {selectedStory.userAvatar ? (
                        <AvatarImage src={selectedStory.userAvatar} />
                      ) : (
                        <AvatarFallback>{selectedStory.userName.charAt(0)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <p className="text-white font-semibold text-sm">{selectedStory.userName}</p>
                      <p className="text-white/70 text-xs">{selectedStory.location || "Nearby"}</p>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-white hover:bg-white/20"
                    onClick={() => setSelectedStory(null)}
                  >
                    <X className="w-6 h-6" />
                  </Button>
                </div>
              </div>

              {/* Story Content */}
              <div className="flex-1 flex items-center justify-center p-8">
                {selectedStory.photoUrl ? (
                  <img
                    src={selectedStory.photoUrl}
                    alt="Story"
                    className="max-w-full max-h-full object-contain rounded-lg"
                  />
                ) : (
                  <p className="text-white text-xl text-center font-medium px-8">
                    {selectedStory.content}
                  </p>
                )}
              </div>

              {/* Story Footer */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/50 to-transparent">
                <p className="text-white/70 text-xs text-center">
                  {selectedStory.viewCount} views
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Story Modal */}
      <Dialog open={showCreateStory} onOpenChange={setShowCreateStory}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create a Story</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="What's happening in your neighborhood?"
              value={storyContent}
              onChange={(e) => setStoryContent(e.target.value)}
              className="min-h-[120px]"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCreateStory(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => createStoryMutation.mutate(storyContent)}
                disabled={!storyContent.trim() || createStoryMutation.isPending}
              >
                {createStoryMutation.isPending ? "Posting..." : "Share Story"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
