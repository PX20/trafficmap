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
import { ArrowLeft, MapPin, Shield, Users, Phone, UserCheck, Camera, Bell, Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { usePushNotifications } from "@/hooks/use-push-notifications";

export default function Profile() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isSupported: pushSupported, isSubscribed: pushSubscribed, subscribe: subscribePush, unsubscribe: unsubscribePush, permission: pushPermission } = usePushNotifications();
  
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

  // Fetch categories for notification preferences
  const { data: categoriesData } = useQuery({
    queryKey: ["/api/categories"],
  });
  const dbCategories = (categoriesData as any[]) || [];
  
  // Add TMR Traffic as a special source option alongside regular categories
  const TMR_SOURCE = { id: 'tmr', name: 'Traffic Alerts', isSource: true };
  const categories = [TMR_SOURCE, ...dbCategories];

  // Local state for optimistic UI updates
  const [localNotificationsEnabled, setLocalNotificationsEnabled] = useState<boolean | null>(null);
  const [localNotificationCategories, setLocalNotificationCategories] = useState<string[] | null>(null);
  const [localNotificationRadius, setLocalNotificationRadius] = useState<string | null>(null);

  // Get effective values (local state takes precedence for immediate UI feedback)
  const effectiveNotificationsEnabled = localNotificationsEnabled ?? user?.notificationsEnabled ?? true;
  const effectiveNotificationCategories = localNotificationCategories ?? (user?.notificationCategories as string[]) ?? [];
  const effectiveNotificationRadius = localNotificationRadius ?? user?.notificationRadius ?? '10km';

  // Notification preferences mutation
  const updateNotificationsMutation = useMutation({
    mutationFn: async (prefs: { 
      notificationsEnabled?: boolean; 
      notificationCategories?: string[] | null;
      notificationRadius?: string;
    }) => {
      const response = await fetch("/api/user/notification-preferences", {
        method: "PATCH",
        body: JSON.stringify(prefs),
        headers: { "Content-Type": "application/json" },
        credentials: "include"
      });
      if (!response.ok) throw new Error('Failed to update notification preferences');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      // Clear local state after successful server update
      setLocalNotificationsEnabled(null);
      setLocalNotificationCategories(null);
      setLocalNotificationRadius(null);
    },
    onError: () => {
      // Revert local state on error
      setLocalNotificationsEnabled(null);
      setLocalNotificationCategories(null);
      setLocalNotificationRadius(null);
      toast({
        title: "Update failed",
        description: "Failed to update notification preferences.",
        variant: "destructive",
      });
    },
  });

  const handleToggleNotifications = async (enabled: boolean) => {
    setLocalNotificationsEnabled(enabled);
    
    if (enabled) {
      // When enabling, request browser permission and subscribe to push
      if (pushSupported) {
        const subscribed = await subscribePush();
        if (!subscribed) {
          // If subscription failed, revert the toggle
          setLocalNotificationsEnabled(false);
          return;
        }
      }
    } else {
      // When disabling, unsubscribe from push
      if (pushSupported && pushSubscribed) {
        await unsubscribePush();
      }
    }
    
    updateNotificationsMutation.mutate({ notificationsEnabled: enabled });
  };

  const handleToggleCategory = (categoryId: string) => {
    const currentCategories = effectiveNotificationCategories;
    let newCategories: string[];
    
    if (currentCategories.length === 0) {
      // Currently receiving all - switch to all except this one
      newCategories = categories
        .filter((c: any) => c.id !== categoryId)
        .map((c: any) => c.id);
    } else if (currentCategories.includes(categoryId)) {
      // Remove this category
      newCategories = currentCategories.filter(id => id !== categoryId);
    } else {
      // Add this category
      newCategories = [...currentCategories, categoryId];
    }
    
    // Update local state immediately for responsive UI
    setLocalNotificationCategories(newCategories);
    updateNotificationsMutation.mutate({ notificationCategories: newCategories.length > 0 ? newCategories : null });
  };

  const handleRadiusChange = (radius: string) => {
    setLocalNotificationRadius(radius);
    updateNotificationsMutation.mutate({ notificationRadius: radius });
  };

  const isCategoryEnabled = (categoryId: string): boolean => {
    if (effectiveNotificationCategories.length === 0) return true; // All enabled
    return effectiveNotificationCategories.includes(categoryId);
  };

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
    <div className="min-h-screen bg-background pb-20 sm:pb-6">
      {/* Mobile-optimized header */}
      <div className="sticky top-0 z-40 bg-background border-b border-border sm:relative sm:border-0">
        <div className="max-w-4xl mx-auto px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <Link href="/">
              <Button variant="ghost" size="icon" className="sm:hidden" data-testid="button-back-home-mobile">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <Button variant="ghost" size="sm" className="hidden sm:flex" data-testid="button-back-home">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Feed
              </Button>
            </Link>
            <h1 className="text-lg sm:text-2xl font-bold text-foreground">Profile</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
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
                        <div className="flex items-start gap-1 text-sm text-muted-foreground mt-1">
                          <MapPin className="w-3 h-3 flex-shrink-0 mt-0.5" />
                          <span className="break-words" data-testid="text-user-location">{user.preferredLocation}</span>
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                    
                    <div className="flex flex-col-reverse sm:flex-row gap-2 pt-4">
                      <Button variant="outline" onClick={handleCancel} className="w-full sm:w-auto" data-testid="button-cancel-edit">
                        Cancel
                      </Button>
                      <Button 
                        onClick={handleSave} 
                        disabled={updateProfileMutation.isPending}
                        className="w-full sm:w-auto"
                        data-testid="button-save-profile"
                      >
                        {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
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

            {/* Notification Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Bell className="w-4 h-4" />
                  Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Push Notification Status */}
                {!pushSupported && (
                  <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-md">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Push notifications are not supported on this browser. Try adding this app to your home screen on mobile.
                    </p>
                  </div>
                )}
                
                {pushSupported && pushPermission === 'denied' && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-md">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Notifications are blocked. Please enable them in your browser settings.
                    </p>
                  </div>
                )}

                {pushSupported && pushSubscribed && (
                  <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-md">
                    <p className="text-sm text-green-600 dark:text-green-400 flex items-center gap-2">
                      <Check className="w-4 h-4" />
                      Push notifications are enabled
                    </p>
                  </div>
                )}

                {/* Master Toggle */}
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-sm font-medium">Enable Notifications</span>
                    <p className="text-xs text-muted-foreground">
                      {pushSupported && !pushSubscribed && pushPermission !== 'denied' 
                        ? "Tap to enable push notifications" 
                        : "Receive alerts for nearby posts"}
                    </p>
                  </div>
                  <Switch
                    checked={effectiveNotificationsEnabled}
                    onCheckedChange={handleToggleNotifications}
                    disabled={pushPermission === 'denied'}
                    data-testid="switch-notifications-enabled"
                  />
                </div>

                {effectiveNotificationsEnabled && (
                  <>
                    <Separator />
                    
                    {/* Proximity Radius */}
                    <div>
                      <span className="text-sm font-medium block mb-2">Notification Radius</span>
                      <p className="text-xs text-muted-foreground mb-2">
                        Only notify for posts within this distance
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {['1km', '2km', '5km', '10km', '25km', '50km'].map((radius) => (
                          <Button
                            key={radius}
                            variant={effectiveNotificationRadius === radius ? "default" : "outline"}
                            size="sm"
                            onClick={() => handleRadiusChange(radius)}
                            data-testid={`button-radius-${radius}`}
                          >
                            {radius}
                          </Button>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    {/* Category Selection */}
                    <div>
                      <span className="text-sm font-medium block mb-2">Categories</span>
                      <p className="text-xs text-muted-foreground mb-2">
                        Choose which types of posts to be notified about
                      </p>
                      <div className="space-y-2">
                        {categories.map((category: any) => (
                          <button
                            key={category.id}
                            onClick={() => handleToggleCategory(category.id)}
                            className={`w-full flex items-center justify-between p-2 rounded-md text-sm transition-colors ${
                              isCategoryEnabled(category.id)
                                ? 'bg-primary/10 text-foreground'
                                : 'bg-muted/50 text-muted-foreground'
                            }`}
                            data-testid={`button-category-${category.id}`}
                          >
                            <span>{category.name}</span>
                            {isCategoryEnabled(category.id) && (
                              <Check className="w-4 h-4 text-primary" />
                            )}
                          </button>
                        ))}
                        {categories.length === 0 && (
                          <p className="text-xs text-muted-foreground">Loading categories...</p>
                        )}
                      </div>
                    </div>
                  </>
                )}
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