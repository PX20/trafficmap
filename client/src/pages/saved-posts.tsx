import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Bookmark, ArrowLeft } from "lucide-react";
import { Link } from "wouter";
import { PostCard } from "@/components/post-card";
import { getQueryFn } from "@/lib/queryClient";

export default function SavedPosts() {
  const { user, isAuthenticated } = useAuth();

  const { data: savedPosts, isLoading } = useQuery({
    queryKey: ["/api/saved-posts"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isAuthenticated,
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
          <div className="text-center py-16">
            <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to view your saved posts.
            </p>
            <Button asChild>
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
        <div className="mb-6">
          <Link href="/feed">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Saved Posts
          </h1>
          <p className="text-muted-foreground">
            Posts you've bookmarked for later.
          </p>
        </div>

        <div className="space-y-4">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </Card>
            ))
          ) : (savedPosts as any[])?.length === 0 ? (
            <Card className="p-8 text-center">
              <Bookmark className="w-16 h-16 text-muted-foreground mx-auto mb-4 opacity-50" />
              <h3 className="text-lg font-semibold mb-2">No saved posts yet</h3>
              <p className="text-muted-foreground mb-4">
                When you save posts, they'll appear here for easy access.
              </p>
              <Button asChild>
                <Link href="/feed">Browse Feed</Link>
              </Button>
            </Card>
          ) : (
            (savedPosts as any[])?.map((post: any) => (
              <PostCard key={post.id} post={post} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
