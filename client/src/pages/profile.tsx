import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { ObjectUploader } from "@/components/ObjectUploader";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { ArrowLeft, MapPin, Shield, Users, Phone, UserCheck, Camera } from "lucide-react";
import { Link } from "wouter";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || "",
    lastName: user?.lastName || "",
    preferredLocation: user?.preferredLocation || "",
    preferredLocationLat: user?.preferredLocationLat || null as number | null,
    preferredLocationLng: user?.preferredLocationLng || null as number | null,
    preferredLocationBounds: user?.preferredLocationBounds || null as [number, number, number, number] | null,
    phoneNumber: user?.phoneNumber || "",
    bio: user?.bio || "",
    // Business fields
    businessName: user?.businessName || "",
    businessCategory: user?.businessCategory || "",
    businessDescription: user?.businessDescription || "",
    businessWebsite: user?.businessWebsite || "",
    businessPhone: user?.businessPhone || "",
    businessAddress: user?.businessAddress || ""
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (profileData: typeof formData) => {
      const response = await fetch("/api/user/profile", {
        method: "PUT",
        body: JSON.stringify(profileData),
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${localStorage.getItem('token') || ''}`
        }
      });
      if (!response.ok) throw new Error('Failed to update profile');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      setIsEditing(false);
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  const uploadPhotoMutation = useMutation({
    mutationFn: async (photoURL: string) => {
      const response = await fetch("/api/user/profile-photo", {
        method: "PUT",
        body: JSON.stringify({ photoURL }),
        headers: { 
          "Content-Type": "application/json",
        }
      });
      if (!response.ok) throw new Error('Failed to update profile photo');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Photo updated",
        description: "Your profile photo has been updated successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Upload failed",
        description: "Failed to update profile photo. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleGetUploadParameters = async () => {
    const response = await fetch("/api/objects/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" }
    });
    if (!response.ok) throw new Error('Failed to get upload URL');
    const data = await response.json();
    return {
      method: "PUT" as const,
      url: data.uploadURL,
    };
  };

  const handlePhotoUploadComplete = (result: any) => {
    if (result.successful && result.successful[0]) {
      const uploadURL = result.successful[0].uploadURL;
      uploadPhotoMutation.mutate(uploadURL);
    }
  };

  const handleSave = () => {
    updateProfileMutation.mutate(formData);
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || "",
      lastName: user?.lastName || "",
      preferredLocation: user?.preferredLocation || "",
      preferredLocationLat: user?.preferredLocationLat || null,
      preferredLocationLng: user?.preferredLocationLng || null,
      preferredLocationBounds: user?.preferredLocationBounds || null,
      phoneNumber: user?.phoneNumber || "",
      bio: user?.bio || "",
      // Business fields
      businessName: user?.businessName || "",
      businessCategory: user?.businessCategory || "",
      businessDescription: user?.businessDescription || "",
      businessWebsite: user?.businessWebsite || "",
      businessPhone: user?.businessPhone || "",
      businessAddress: user?.businessAddress || ""
    });
    setIsEditing(false);
  };
  
  const handleLocationChange = (
    location: string, 
    coordinates?: { lat: number; lon: number },
    boundingBox?: [number, number, number, number]
  ) => {
    setFormData(prev => ({
      ...prev,
      preferredLocation: location,
      preferredLocationLat: coordinates?.lat || null,
      preferredLocationLng: coordinates?.lon || null,
      preferredLocationBounds: boundingBox || null
    }));
  };
  
  const handleLocationClear = () => {
    setFormData(prev => ({
      ...prev,
      preferredLocation: "",
      preferredLocationLat: null,
      preferredLocationLng: null,
      preferredLocationBounds: null
    }));
  };

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href="/">
            <Button variant="ghost" size="sm" data-testid="button-back-home">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Map
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-foreground">User Profile</h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Profile Card */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="relative flex-shrink-0">
                      <Avatar className="w-20 h-20">
                        <AvatarImage src={user.profileImageUrl || undefined} alt={user.firstName || 'User'} />
                        <AvatarFallback className="text-lg">
                          {user.firstName ? user.firstName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-2 -right-2">
                        <ObjectUploader
                          maxNumberOfFiles={1}
                          maxFileSize={5242880} // 5MB
                          onGetUploadParameters={handleGetUploadParameters}
                          onComplete={handlePhotoUploadComplete}
                          buttonClassName="rounded-full w-8 h-8 p-0 bg-primary hover:bg-primary/90"
                        >
                          <Camera className="w-4 h-4" />
                        </ObjectUploader>
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-xl truncate" data-testid="text-user-name">
                        {user.firstName && user.lastName 
                          ? `${user.firstName} ${user.lastName}` 
                          : user.firstName || user.email
                        }
                      </CardTitle>
                      <CardDescription className="block">
                        <span className="block truncate" data-testid="text-user-email">{user.email}</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-xs">
                            <UserCheck className="w-3 h-3 mr-1" />
                            Member
                          </Badge>
                        </div>
                      </CardDescription>
                      {user.preferredLocation && (
                        <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span className="truncate" data-testid="text-user-location">{user.preferredLocation}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {!isEditing && (
                    <Button 
                      onClick={() => setIsEditing(true)} 
                      className="w-full sm:w-auto flex-shrink-0"
                      data-testid="button-edit-profile"
                    >
                      Edit Profile
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <CardContent>
                {isEditing ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="firstName">First Name</Label>
                        <Input
                          id="firstName"
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          data-testid="input-first-name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input
                          id="lastName"
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          data-testid="input-last-name"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="preferredLocation">Your Location</Label>
                      <p className="text-xs text-muted-foreground mb-2">
                        Search for your suburb or city to filter posts near you
                      </p>
                      <LocationAutocomplete
                        value={formData.preferredLocation}
                        onChange={handleLocationChange}
                        onClear={handleLocationClear}
                        placeholder="Search for your suburb or city..."
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="phoneNumber">Phone Number</Label>
                      <Input
                        id="phoneNumber"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                        placeholder="e.g., +61 4XX XXX XXX"
                        data-testid="input-phone"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="bio">Bio</Label>
                      <Input
                        id="bio"
                        value={formData.bio}
                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                        placeholder="Tell others about yourself..."
                        data-testid="input-bio"
                      />
                    </div>

                    {/* Business Information Section for Business Accounts */}
                    {user.accountType === 'business' && (
                      <>
                        <Separator className="my-6" />
                        <h3 className="text-lg font-semibold mb-4">Business Information</h3>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="businessName">Business Name</Label>
                            <Input
                              id="businessName"
                              value={formData.businessName}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                              placeholder="Your business name"
                              data-testid="input-business-name"
                            />
                          </div>
                          <div>
                            <Label htmlFor="businessCategory">Business Category</Label>
                            <Input
                              id="businessCategory"
                              value={formData.businessCategory}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessCategory: e.target.value }))}
                              placeholder="e.g., Restaurant & Food"
                              data-testid="input-business-category"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="businessDescription">Business Description</Label>
                          <Input
                            id="businessDescription"
                            value={formData.businessDescription}
                            onChange={(e) => setFormData(prev => ({ ...prev, businessDescription: e.target.value }))}
                            placeholder="Describe your business..."
                            data-testid="input-business-description"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label htmlFor="businessWebsite">Business Website</Label>
                            <Input
                              id="businessWebsite"
                              value={formData.businessWebsite}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessWebsite: e.target.value }))}
                              placeholder="https://yourbusiness.com"
                              data-testid="input-business-website"
                            />
                          </div>
                          <div>
                            <Label htmlFor="businessPhone">Business Phone</Label>
                            <Input
                              id="businessPhone"
                              value={formData.businessPhone}
                              onChange={(e) => setFormData(prev => ({ ...prev, businessPhone: e.target.value }))}
                              placeholder="(07) 1234 5678"
                              data-testid="input-business-phone"
                            />
                          </div>
                        </div>
                        
                        <div>
                          <Label htmlFor="businessAddress">Business Address</Label>
                          <Input
                            id="businessAddress"
                            value={formData.businessAddress}
                            onChange={(e) => setFormData(prev => ({ ...prev, businessAddress: e.target.value }))}
                            placeholder="123 Business Street, City QLD 4000"
                            data-testid="input-business-address"
                          />
                        </div>
                      </>
                    )}
                    
                    <div className="flex gap-2 pt-4">
                      <Button 
                        onClick={handleSave} 
                        disabled={updateProfileMutation.isPending}
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                      <Button variant="outline" onClick={handleCancel} data-testid="button-cancel-edit">
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {user.bio && (
                      <div>
                        <h4 className="font-medium mb-2">About</h4>
                        <p className="text-sm text-muted-foreground" data-testid="text-user-bio">{user.bio}</p>
                      </div>
                    )}
                    
                    {user.phoneNumber && (
                      <div>
                        <h4 className="font-medium mb-2">Contact</h4>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span data-testid="text-user-phone">{user.phoneNumber}</span>
                        </div>
                      </div>
                    )}

                    {/* Business Information Display for Business Accounts */}
                    {user.accountType === 'business' && (
                      <>
                        <Separator className="my-4" />
                        <div>
                          <h4 className="font-medium mb-3">Business Information</h4>
                          <div className="space-y-3">
                            {user.businessName && (
                              <div>
                                <span className="text-sm text-muted-foreground">Business Name</span>
                                <p className="font-medium" data-testid="text-business-name">{user.businessName}</p>
                              </div>
                            )}
                            {user.businessCategory && (
                              <div>
                                <span className="text-sm text-muted-foreground">Category</span>
                                <p className="font-medium" data-testid="text-business-category">{user.businessCategory}</p>
                              </div>
                            )}
                            {user.businessDescription && (
                              <div>
                                <span className="text-sm text-muted-foreground">Description</span>
                                <p className="text-sm text-muted-foreground" data-testid="text-business-description">{user.businessDescription}</p>
                              </div>
                            )}
                            {user.businessWebsite && (
                              <div>
                                <span className="text-sm text-muted-foreground">Website</span>
                                <p className="font-medium" data-testid="text-business-website">
                                  <a href={user.businessWebsite} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                                    {user.businessWebsite}
                                  </a>
                                </p>
                              </div>
                            )}
                            {user.businessPhone && (
                              <div>
                                <span className="text-sm text-muted-foreground">Business Phone</span>
                                <p className="font-medium" data-testid="text-business-phone">{user.businessPhone}</p>
                              </div>
                            )}
                            {user.businessAddress && (
                              <div>
                                <span className="text-sm text-muted-foreground">Address</span>
                                <p className="font-medium" data-testid="text-business-address">{user.businessAddress}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Stats & Info Sidebar */}
          <div className="space-y-6">
            {/* Community Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Community Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reputation Score</span>
                  <Badge variant="secondary" data-testid="text-reputation-score">
                    <Shield className="w-3 h-3 mr-1" />
                    {user.reputationScore || 0}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Reports Submitted</span>
                  <span className="font-medium" data-testid="text-reports-count">0</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Comments Posted</span>
                  <span className="font-medium" data-testid="text-comments-count">0</span>
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Account Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Member Since</span>
                  <span className="text-sm font-medium" data-testid="text-member-since">
                    {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Account Status</span>
                  <Badge variant="default" data-testid="badge-account-status">
                    Active
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Privacy Level</span>
                  <span className="text-sm font-medium" data-testid="text-privacy-level">
                    Public
                  </span>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link href="/feed">
                  <Button variant="outline" className="w-full justify-start" data-testid="button-view-feed">
                    <Users className="w-4 h-4 mr-2" />
                    View Activity Feed
                  </Button>
                </Link>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => window.location.href = '/api/logout'}
                  data-testid="button-sign-out"
                >
                  Sign Out
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}