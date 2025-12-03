import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { MobileNav } from "@/components/mobile-nav";
import { StoriesBar } from "@/components/stories-bar";
import { PostCard } from "@/components/post-card";
import { IncidentReportForm } from "@/components/incident-report-form";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useIsMobile } from "@/hooks/use-mobile";
import { 
  Bell, 
  MessageCircle, 
  Search, 
  MapPin,
  Settings,
  RefreshCw,
  PenSquare,
  Image,
  Camera,
  MapPinned
} from "lucide-react";
import { Link } from "wouter";
import { queryClient } from "@/lib/queryClient";

export default function Feed() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [reportFormOpen, setReportFormOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const { data: unifiedData, isLoading, refetch } = useQuery({
    queryKey: ["/api/unified"],
    refetchInterval: 60000,
  });

  const { data: unreadCount = 0 } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    select: (data: any) => data?.count || 0,
  });

  const posts = (unifiedData as any)?.features
    ?.filter((f: any) => f.properties?.source === "user")
    ?.sort((a: any, b: any) => {
      const dateA = new Date(a.properties?.incidentTime || a.properties?.createdAt || 0);
      const dateB = new Date(b.properties?.incidentTime || b.properties?.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    }) || [];

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await refetch();
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const handleCommentClick = (postId: string) => {
    setLocation(`/incident/${postId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            <h1 className="text-xl font-bold text-blue-600">
              Neighbourhood
            </h1>
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="rounded-full bg-gray-100">
                <Search className="w-5 h-5 text-gray-600" />
              </Button>
              <Link href="/messages">
                <Button variant="ghost" size="icon" className="rounded-full bg-gray-100 relative">
                  <MessageCircle className="w-5 h-5 text-gray-600" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto pb-20">
        {/* Stories */}
        <StoriesBar />

        {/* Create Post Card */}
        <Card className="mx-0 sm:mx-4 mt-2 rounded-none sm:rounded-lg border-0 shadow-sm">
          <div className="p-3">
            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {user?.profileImageUrl && <AvatarImage src={user.profileImageUrl} />}
                <AvatarFallback className="bg-blue-100 text-blue-600">
                  {user?.displayName?.charAt(0) || user?.firstName?.charAt(0) || "?"}
                </AvatarFallback>
              </Avatar>
              <button
                onClick={() => setReportFormOpen(true)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 rounded-full px-4 py-2.5 text-left text-gray-500 transition-colors"
              >
                What's happening in your area?
              </button>
            </div>
            <div className="flex items-center justify-around mt-3 pt-3 border-t border-gray-100">
              <Button
                variant="ghost"
                className="flex-1 gap-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setReportFormOpen(true)}
              >
                <Camera className="w-5 h-5 text-green-500" />
                <span className="text-sm">Photo</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setReportFormOpen(true)}
              >
                <MapPinned className="w-5 h-5 text-red-500" />
                <span className="text-sm">Location</span>
              </Button>
              <Button
                variant="ghost"
                className="flex-1 gap-2 text-gray-600 hover:bg-gray-50"
                onClick={() => setReportFormOpen(true)}
              >
                <PenSquare className="w-5 h-5 text-blue-500" />
                <span className="text-sm">Post</span>
              </Button>
            </div>
          </div>
        </Card>

        {/* Location Filter */}
        {user?.preferredLocation && (
          <div className="px-4 py-2 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-600">
              Showing posts near <strong>{user.preferredLocation}</strong>
            </span>
            <Link href="/profile">
              <button className="text-sm text-blue-600 hover:underline ml-auto">
                Change
              </button>
            </Link>
          </div>
        )}

        {/* Refresh Button */}
        <div className="px-4 py-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full gap-2"
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            {isRefreshing ? "Refreshing..." : "Refresh Feed"}
          </Button>
        </div>

        {/* Posts Feed */}
        <div className="mt-2 space-y-2">
          {isLoading ? (
            Array(3).fill(0).map((_, i) => (
              <Card key={i} className="mx-0 sm:mx-4 p-4 border-0 rounded-none sm:rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4 mb-4" />
                <Skeleton className="h-48 w-full rounded-lg" />
              </Card>
            ))
          ) : posts.length === 0 ? (
            <Card className="mx-4 p-8 text-center border-0 rounded-lg">
              <div className="text-gray-400 mb-4">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
              </div>
              <h3 className="text-lg font-semibold text-gray-700 mb-2">
                No posts yet
              </h3>
              <p className="text-gray-500 mb-4">
                Be the first to share what's happening in your neighborhood!
              </p>
              <Button onClick={() => setReportFormOpen(true)}>
                Create a Post
              </Button>
            </Card>
          ) : (
            posts.map((post: any) => (
              <PostCard
                key={post.id}
                post={post}
                onCommentClick={() => handleCommentClick(post.id)}
              />
            ))
          )}
        </div>
      </main>

      {/* Mobile Navigation */}
      {isMobile && <MobileNav />}

      {/* Report Form Modal */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => {
          setReportFormOpen(false);
          queryClient.invalidateQueries({ queryKey: ["/api/unified"] });
        }}
      />
    </div>
  );
}
