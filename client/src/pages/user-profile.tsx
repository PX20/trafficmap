import { useEffect, useState } from "react";
import { useParams, Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AppHeader } from "@/components/map/app-header";
import { 
  ArrowLeft, 
  MapPin, 
  Phone, 
  Calendar, 
  MessageSquare, 
  Mail,
  Star,
  User as UserIcon,
  UserCheck
} from "lucide-react";
import type { User } from "@shared/schema";

export default function UserProfile() {
  const { userId } = useParams();
  const { user: currentUser, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  
  // Fetch user data
  const { data: viewedUser, isLoading: userLoading } = useQuery({
    queryKey: ["/api/users", userId],
    enabled: !!userId,
  });

  // Check if viewing own profile
  const isOwnProfile = currentUser?.id === userId;

  if (!isAuthenticated || !userId) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Please log in to view user profiles.</p>
          </div>
        </div>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p>Loading user profile...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!viewedUser) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">User Not Found</h1>
            <p className="text-muted-foreground mb-4">The requested user profile could not be found.</p>
            <Link href="/">
              <Button>Back to Home</Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const user = viewedUser as User;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      
      <div className="container mx-auto px-4 py-8">
        {/* Navigation */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" className="mb-4" data-testid="button-back-to-map">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Map
            </Button>
          </Link>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Profile Header */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <div className="relative">
                  <Avatar className="w-24 h-24" data-testid="img-user-avatar">
                    <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                    <AvatarFallback className="text-2xl">
                      {user.firstName ? user.firstName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                    </AvatarFallback>
                  </Avatar>
                </div>

                <div className="flex-1 text-center sm:text-left">
                  <div className="space-y-2">
                    <CardTitle className="text-2xl" data-testid="text-user-name">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}` 
                        : user.firstName || user.email
                      }
                    </CardTitle>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      <Badge variant="secondary" className="text-xs">
                        <UserCheck className="w-3 h-3 mr-1" />
                        Member
                      </Badge>
                      {user.verifiedResident && (
                        <Badge variant="default" className="text-xs">
                          <Star className="w-3 h-3 mr-1" />
                          Verified Resident
                        </Badge>
                      )}
                    </div>
                    {user.primarySuburb && (
                      <div className="flex items-center justify-center sm:justify-start gap-1 text-sm text-muted-foreground">
                        <MapPin className="w-3 h-3" />
                        <span data-testid="text-user-suburb">{user.primarySuburb}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                {!isOwnProfile && user.allowDirectMessages && (
                  <div className="flex flex-col gap-2">
                    <Button 
                      className="w-full" 
                      onClick={async () => {
                        // Start a conversation with this user
                        try {
                          const response = await fetch('/api/conversations', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ otherUserId: userId })
                          });
                          
                          if (response.ok) {
                            const conversation = await response.json();
                            // Navigate to the conversation using React routing
                            setLocation(`/messages/${conversation.id}`);
                          }
                        } catch (error) {
                          console.error('Failed to start conversation:', error);
                        }
                      }}
                      data-testid="button-send-message"
                    >
                      <MessageSquare className="w-4 h-4 mr-2" />
                      Send Message
                    </Button>
                    {user.email && user.profileVisibility === 'public' && (
                      <Button variant="outline" size="sm" data-testid="button-email">
                        <Mail className="w-4 h-4 mr-2" />
                        Email
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </CardHeader>
          </Card>

          {/* User Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* About Section */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserIcon className="w-5 h-5" />
                  About
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {user.bio ? (
                  <div>
                    <p className="text-sm text-muted-foreground" data-testid="text-user-bio">
                      {user.bio}
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-sm text-muted-foreground italic">
                      No bio provided
                    </p>
                  </div>
                )}
                
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="w-4 h-4 text-muted-foreground" />
                  <span className="text-muted-foreground">
                    Member since {new Date(user.createdAt || '').toLocaleDateString('en-AU', {
                      month: 'long',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Community Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reputation Score</span>
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="font-medium" data-testid="text-reputation-score">
                      {user.reputationScore || 0}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Reports Submitted</span>
                  <span className="font-medium">0</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Comments Posted</span>
                  <span className="font-medium">0</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          {(user.phoneNumber && user.profileVisibility !== 'private') && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-muted-foreground" />
                  <span data-testid="text-user-phone">{user.phoneNumber}</span>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}