import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Link, useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { IncidentDetailModal } from "@/components/incident-detail-modal";
import { IncidentReportForm } from "@/components/incident-report-form";
import { AppHeader } from "@/components/map/app-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { findRegionBySuburb, getRegionalSuburbs } from "@/lib/regions";
import { FilterState } from "@/pages/home";
import { useTrafficData } from "@/hooks/use-traffic-data";
import { SponsoredPost } from "@/components/sponsored-post";
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Camera, 
  Car, 
  Shield,
  Eye,
  Zap,
  RefreshCw,
  MessageCircle,
  Heart,
  Share,
  MoreHorizontal,
  User,
  Users,
  TrendingUp,
  Plus
} from "lucide-react";

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRegionalUpdates, setShowRegionalUpdates] = useState(true);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  
  // Initialize filter state with same defaults as map
  const [filters, setFilters] = useState<FilterState>({
    showTrafficEvents: true,
    showIncidents: true,
    showQFES: true,
    showUserReports: true,
    showUserSafetyCrime: true,
    showUserWildlife: true,
    showUserCommunity: true,
    showUserTraffic: true,
    showUserLostFound: true,
    showUserPets: true,
    // Status filters
    showActiveIncidents: true,
    showResolvedIncidents: false,
    // Priority filters
    showHighPriority: true,
    showMediumPriority: true,
    showLowPriority: true,
    // Auto-refresh and distance
    autoRefresh: true,
    distanceFilter: 'all',
    locationFilter: true,
  });

  // Fetch categories and subcategories to initialize filters (same as map)
  const { data: categories = [] } = useQuery({
    queryKey: ["/api/categories"],
    select: (data: any) => data || [],
  });

  const { data: subcategories = [] } = useQuery({
    queryKey: ["/api/subcategories"],
    select: (data: any) => data || [],
  });
  
  // Initialize all category and subcategory filters to true (same as map)
  useEffect(() => {
    if (categories.length > 0) {
      const categoryFilters: Record<string, boolean> = {};
      categories.forEach((category: any) => {
        categoryFilters[category.id] = true;
      });
      setFilters(prev => ({ ...prev, ...categoryFilters }));
    }
  }, [categories]);

  useEffect(() => {
    if (subcategories.length > 0) {
      const subcategoryFilters: Record<string, boolean> = {};
      subcategories.forEach((subcategory: any) => {
        subcategoryFilters[subcategory.id] = true;
      });
      setFilters(prev => ({ ...prev, ...subcategoryFilters }));
    }
  }, [subcategories]);

  // Load saved filters from localStorage (sync with map)
  useEffect(() => {
    const savedLocation = localStorage.getItem('homeLocation');
    const savedCoordinates = localStorage.getItem('homeCoordinates'); 
    const savedBoundingBox = localStorage.getItem('homeBoundingBox');
    const locationFilterSetting = localStorage.getItem('locationFilter');
    
    if (savedLocation && savedCoordinates) {
      try {
        const coordinates = JSON.parse(savedCoordinates);
        const boundingBox = savedBoundingBox ? JSON.parse(savedBoundingBox) : undefined;
        setFilters(prev => ({
          ...prev,
          homeLocation: savedLocation,
          homeCoordinates: coordinates,
          homeBoundingBox: boundingBox,
          locationFilter: locationFilterSetting ? locationFilterSetting === 'true' : true
        }));
      } catch (error) {
        console.error('Failed to load saved location:', error);
      }
    }
  }, []);

  // Listen for filter changes from map page (sync with map)
  useEffect(() => {
    const handleLocationChange = (event: CustomEvent) => {
      const { location, coordinates, boundingBox } = event.detail;
      setFilters(prev => ({
        ...prev,
        homeLocation: location,
        homeCoordinates: coordinates,
        homeBoundingBox: boundingBox,
        locationFilter: true
      }));
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'homeLocation') {
        const savedLocation = localStorage.getItem('homeLocation');
        const savedCoordinates = localStorage.getItem('homeCoordinates');
        const savedBoundingBox = localStorage.getItem('homeBoundingBox');
        
        if (savedLocation && savedCoordinates) {
          try {
            const coordinates = JSON.parse(savedCoordinates);
            const boundingBox = savedBoundingBox ? JSON.parse(savedBoundingBox) : undefined;
            setFilters(prev => ({
              ...prev,
              homeLocation: savedLocation,
              homeCoordinates: coordinates,
              homeBoundingBox: boundingBox
            }));
          } catch (error) {
            console.error('Failed to load updated location:', error);
          }
        }
      }
    };
    
    window.addEventListener('locationChanged', handleLocationChange as EventListener);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Use the same traffic data hook as the map for consistent filtering
  const { regionalEvents, regionalIncidents, events: allEvents, incidents: allIncidents } = useTrafficData(filters);
  
  // Sync selected suburb with filter location
  useEffect(() => {
    if (filters.homeLocation) {
      setSelectedSuburb(filters.homeLocation);
    } else if (user?.homeSuburb) {
      setSelectedSuburb(user.homeSuburb);
    } else if (user?.primarySuburb) {
      setSelectedSuburb(user.primarySuburb);
    }
  }, [filters.homeLocation, user?.homeSuburb, user?.primarySuburb]);

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/incidents/refresh", { method: "POST" });
      if (!response.ok) throw new Error('Failed to refresh incidents');
      return response.json();
    },
    onSuccess: () => {
      // Invalidate both all incidents and regional incidents queries
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
      queryClient.invalidateQueries({ queryKey: ["/api/incidents", filters.homeLocation] });
      toast({
        title: "Data refreshed",
        description: "Incidents have been updated from emergency services",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Refresh failed",
        description: error.message || "Failed to refresh incident data",
        variant: "destructive",
      });
    },
  });

  // Apply category/type filtering to regional data (already filtered by region from backend)
  // Fallback to all data if regional data is empty (user not logged in or no location set)
  const hasRegionalData = regionalEvents.length > 0 || regionalIncidents.length > 0;
  const eventsToFilter = hasRegionalData ? regionalEvents : allEvents;
  const incidentsToFilter = hasRegionalData ? regionalIncidents : allIncidents;
  
  const filteredRegionalEvents = eventsToFilter.filter(() => filters.showTrafficEvents === true);
  
  const filteredRegionalIncidents = incidentsToFilter.filter((incident: any) => {
    const isUserReported = incident.properties?.userReported;
    
    if (isUserReported) {
      const categoryId = incident.properties?.categoryId;
      
      if (categoryId === '792759f4-1b98-4665-b14c-44a54e9969e9') { // Safety & Crime
        return filters.showUserSafetyCrime === true;
      } else if (categoryId === 'd03f47a9-10fb-4656-ae73-92e959d7566a') { // Wildlife & Nature
        return filters.showUserWildlife === true;
      } else if (categoryId === '9b1d58d9-cfd1-4c31-93e9-754276a5f265') { // Infrastructure & Hazards (Traffic)
        return filters.showUserTraffic === true;
      } else if (categoryId === 'deaca906-3561-4f80-b79f-ed99561c3b04') { // Community Issues
        return filters.showUserCommunity === true;
      } else if (categoryId === 'd1dfcd4e-48e9-4e58-9476-4782a2a132f3') { // Lost & Found
        return filters.showUserLostFound === true;
      } else if (categoryId === '4ea3a6f0-c49e-4baf-9ca5-f074ca2811b0') { // Pets
        return filters.showUserPets === true;
      } else {
        // Fallback for unknown categories - show with community issues
        return filters.showUserCommunity === true;
      }
    } else {
      // Official incidents - check if it's QFES or ESQ
      const isQFES = incident.properties?.incidentType?.toLowerCase()?.includes('fire') ||
                     incident.properties?.GroupedType?.toLowerCase()?.includes('fire') ||
                     incident.properties?.description?.toLowerCase()?.includes('fire');
      if (isQFES) {
        return filters.showQFES === true;
      } else {
        return filters.showIncidents === true;
      }
    }
  });

  // Fetch ads for user's region
  const { data: ads = [] } = useQuery<any[]>({
    queryKey: ["/api/ads"],
    enabled: !!user?.homeSuburb,
  });

  const finalFilteredIncidents = [
    ...filteredRegionalIncidents.map((inc: any) => ({ ...inc, type: 'incident' })),
    ...filteredRegionalEvents.map((event: any) => ({ ...event, type: 'traffic' }))
  ];

  // Sort all incidents by time (most recent first)
  const sortedIncidents = finalFilteredIncidents
    .sort((a, b) => {
      const dateA = new Date(a.properties?.Response_Date || a.properties?.last_updated || a.properties?.createdAt || 0);
      const dateB = new Date(b.properties?.Response_Date || b.properties?.last_updated || b.properties?.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

  // Integrate ads into the feed every 5-7 posts
  const feedWithAds = useMemo(() => {
    const feedItems = [...sortedIncidents];
    const adsToInsert = [...ads];
    const adInterval = 6; // Insert ads every 6 posts on average
    
    let adIndex = 0;
    for (let i = adInterval; i < feedItems.length && adIndex < adsToInsert.length; i += adInterval) {
      feedItems.splice(i, 0, { 
        type: 'ad', 
        ad: adsToInsert[adIndex], 
        id: `ad-${adsToInsert[adIndex].id}-${i}` 
      });
      adIndex++;
      i++; // Account for the inserted ad
    }
    
    return feedItems;
  }, [sortedIncidents, ads]);

  // Set loading state - use query loading from traffic data hook
  const isLoading = false; // Data is already pre-filtered by the hook

  // Handle ad clicks
  const handleAdClick = useCallback((adId: string) => {
    console.log(`Ad clicked: ${adId}`);
    // Additional analytics tracking could go here
  }, []);

  // Helper functions
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

  const getIncidentIcon = (incident: any) => {
    if (incident.type === 'traffic') {
      return <Car className="w-5 h-5 text-orange-600" />;
    }
    if (incident.properties?.userReported) {
      return <Users className="w-5 h-5 text-purple-600" />;
    }
    
    const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
    const description = incident.properties?.description?.toLowerCase() || '';
    
    if (eventType.includes('fire') || description.includes('fire')) {
      return <Zap className="w-5 h-5 text-red-600" />;
    } else if (eventType.includes('medical') || description.includes('medical')) {
      return <Heart className="w-5 h-5 text-green-600" />;
    } else if (eventType.includes('police') || description.includes('police')) {
      return <Shield className="w-5 h-5 text-blue-600" />;
    }
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const getIncidentTitle = (incident: any) => {
    if (incident.type === 'traffic') {
      // Show the specific event type for TMR posts
      const eventType = incident.properties?.event_type || 
                       incident.properties?.Event_Type || 
                       incident.properties?.eventType || '';
      const eventSubtype = incident.properties?.event_subtype || 
                          incident.properties?.Event_Subtype || 
                          incident.properties?.eventSubtype || '';
      
      if (eventType && eventSubtype && eventType !== eventSubtype && eventSubtype !== 'N/A') {
        return `${eventType} - ${eventSubtype}`;
      } else if (eventType) {
        return eventType;
      } else if (eventSubtype && eventSubtype !== 'N/A') {
        return eventSubtype;
      }
      
      return incident.properties?.description || 'Traffic Event';
    }
    if (incident.properties?.userReported) {
      return incident.properties?.title || 'Community Report';
    }
    
    // For ESQ incidents - check properties.title
    if (incident.properties?.title) {
      return incident.properties.title;
    }
    
    // For emergency incidents, create a meaningful title
    const groupedType = incident.properties?.GroupedType || '';
    const locality = incident.properties?.Locality || '';
    
    if (groupedType && locality) {
      return `${groupedType} - ${locality}`;
    }
    return groupedType || incident.properties?.Event_Type || incident.properties?.description || 'Emergency Incident';
  };

  const getIncidentDescription = (incident: any) => {
    if (incident.type === 'traffic') {
      // For TMR posts, show the actual description rather than just road info
      return incident.properties?.description || 'Traffic disruption reported';
    }
    if (incident.properties?.userReported) {
      return incident.properties?.description || 'Community safety report';
    }
    
    // For ESQ incidents - check properties.description
    if (incident.properties?.description) {
      return incident.properties.description;
    }
    
    return incident.properties?.description || incident.properties?.Location || 'Emergency incident in progress';
  };

  const getIncidentLocation = (incident: any) => {
    if (incident.type === 'traffic') {
      const roadInfo = incident.properties?.road_summary;
      const roadName = roadInfo?.road_name || '';
      const locality = roadInfo?.locality || '';
      
      if (roadName && locality) {
        return `${roadName}, ${locality}`;
      }
      return roadName || locality || 'Location not specified';
    }
    if (incident.properties?.userReported) {
      // Check multiple possible location fields for user-reported incidents
      return incident.properties?.locationDescription || 
             incident.properties?.location || 
             incident.properties?.suburb ||
             'Location not specified';
    }
    
    // For ESQ incidents - check properties.locationDescription
    if (incident.properties?.locationDescription) {
      return incident.properties.locationDescription;
    }
    
    // For emergency incidents, build location intelligently
    const location = incident.properties?.Location || '';
    const locality = incident.properties?.Locality || '';
    const locationDesc = incident.properties?.LocationDescription || '';
    
    // Try different combinations
    if (location && locality && location !== locality) {
      return `${location}, ${locality}`;
    }
    if (location) return location;
    if (locality) return locality;
    if (locationDesc) return locationDesc;
    
    return 'Location not specified';
  };

  const handleIncidentClick = (incident: any) => {
    setSelectedIncident(incident);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIncident(null);
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader onMenuToggle={() => {}} />
      
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-6">
        {/* Compact Header with Stats and Refresh */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Safety Feed</h1>
            <p className="text-muted-foreground">
              {selectedSuburb && showRegionalUpdates ? (
                (() => {
                  const region = findRegionBySuburb(selectedSuburb.split(' ')[0]);
                  const regionName = region ? region.name : selectedSuburb;
                  return `${sortedIncidents.length} incidents in ${regionName} region`;
                })()
              ) : (
                sortedIncidents.length > 0 ? `${sortedIncidents.length} active incidents across Queensland` : 'Real-time incidents across Queensland'
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refreshMutation.mutate()}
            disabled={refreshMutation.isPending}
            className="gap-2"
            data-testid="button-refresh-incidents"
          >
            <RefreshCw className={`w-4 h-4 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
            {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-12">
            <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading latest incidents...</p>
          </div>
        )}

        {/* Incident Feed */}
        {!isLoading && (
          <div className="space-y-4">
            {sortedIncidents.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-green-50 dark:bg-green-950 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">All Clear!</h3>
                <p className="text-muted-foreground text-lg">
                  No recent incidents reported across Queensland
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Check back later for updates
                </p>
              </div>
            ) : (
              <>

                {feedWithAds.map((item, index) => {
                  // Handle ads differently
                  if (item.type === 'ad') {
                    return (
                      <SponsoredPost
                        key={item.id}
                        ad={{
                          id: item.ad.id,
                          businessName: item.ad.businessName,
                          title: item.ad.title,
                          content: item.ad.content,
                          imageUrl: item.ad.imageUrl,
                          websiteUrl: item.ad.websiteUrl,
                          address: item.ad.address,
                          suburb: item.ad.suburb,
                          cta: item.ad.cta
                        }}
                        onAdClick={handleAdClick}
                      />
                    );
                  }
                  
                  // Handle regular incidents
                  const incident = item;
                  // Create a more unique key to prevent React warnings
                  const getUniqueKey = (incident: any, index: number) => {
                    if (incident.type === 'traffic') {
                      return `traffic-${incident.properties?.id || incident.properties?.event_id || index}`;
                    }
                    if (incident.properties?.userReported) {
                      return `user-${incident.properties?.id || index}`;
                    }
                    return `incident-${incident.properties?.Master_Incident_Number || incident.properties?.id || index}`;
                  };

                  const getSourceInfo = (incident: any) => {
                    if (incident.type === 'traffic') {
                      return { 
                        name: 'Transport and Main Roads', 
                        type: 'TMR Official', 
                        avatar: 'TMR', 
                        color: 'bg-gradient-to-br from-orange-500 to-orange-600',
                        photoUrl: null
                      };
                    }
                    if (incident.properties?.userReported) {
                      // Extract user data from properties
                      const reporterName = incident.properties?.reporterName || incident.properties?.reportedBy?.split('@')[0] || 'Anonymous User';
                      const photoUrl = incident.properties?.photoUrl;
                      
                      // Create initials from the reporter name
                      const getInitials = (name: string) => {
                        return name.split(' ').map(word => word.charAt(0).toUpperCase()).join('').slice(0, 2);
                      };
                      
                      return { 
                        name: reporterName, 
                        type: 'Community Report', 
                        avatar: getInitials(reporterName), 
                        color: 'bg-gradient-to-br from-purple-500 to-purple-600',
                        photoUrl: photoUrl
                      };
                    }
                    // Determine specific emergency service based on incident data
                    const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
                    const description = incident.properties?.description?.toLowerCase() || '';
                    
                    if (eventType.includes('fire') || eventType.includes('burn') || eventType.includes('hazmat') || description.includes('fire')) {
                      return { 
                        name: 'Queensland Fire & Emergency', 
                        type: 'QFES Official', 
                        avatar: 'QFE', 
                        color: 'bg-gradient-to-br from-red-500 to-red-600',
                        photoUrl: null
                      };
                    } else if (eventType.includes('police') || eventType.includes('crime') || eventType.includes('traffic enforcement') || description.includes('police')) {
                      return { 
                        name: 'Queensland Police Service', 
                        type: 'QPS Official', 
                        avatar: 'QPS', 
                        color: 'bg-gradient-to-br from-blue-700 to-blue-800',
                        photoUrl: null
                      };
                    } else if (eventType.includes('medical') || eventType.includes('ambulance') || eventType.includes('cardiac') || description.includes('medical') || description.includes('ambulance')) {
                      return { 
                        name: 'Queensland Ambulance Service', 
                        type: 'QAS Official', 
                        avatar: 'QAS', 
                        color: 'bg-gradient-to-br from-green-600 to-green-700',
                        photoUrl: null
                      };
                    } else {
                      // Default to general emergency services
                      return { 
                        name: 'Emergency Services Queensland', 
                        type: 'ESQ Official', 
                        avatar: 'ESQ', 
                        color: 'bg-gradient-to-br from-red-500 to-red-600',
                        photoUrl: null
                      };
                    }
                  };

                  const sourceInfo = getSourceInfo(incident);
                  
                  // Only show engagement for user-reported incidents
                  const isUserReported = incident.properties?.userReported;

                  return (
                    <Card 
                      key={getUniqueKey(incident, index)} 
                      className="bg-card hover:bg-card/80 border border-border hover:shadow-lg transition-all duration-300 cursor-pointer group overflow-hidden"
                      onClick={() => handleIncidentClick(incident)}
                      data-testid={`card-incident-${index}`}
                    >
                      <CardContent className="p-0">
                        {/* Post Header */}
                        <div className="p-4 pb-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar 
                                className={`w-12 h-12 ring-2 ring-primary/20 ${isUserReported ? 'cursor-pointer hover:ring-primary/40 transition-all' : ''}`}
                                onClick={isUserReported && incident.properties?.reporterId ? (e) => {
                                  e.stopPropagation();
                                  setLocation(`/users/${incident.properties.reporterId}`);
                                } : undefined}
                              >
                                {sourceInfo.photoUrl ? (
                                  <img src={sourceInfo.photoUrl} alt={sourceInfo.name} className="w-full h-full object-cover" />
                                ) : (
                                  <AvatarFallback className={`${sourceInfo.color} text-white font-bold text-sm shadow-lg`}>
                                    {sourceInfo.avatar}
                                  </AvatarFallback>
                                )}
                              </Avatar>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 
                                    className={`font-bold text-foreground text-base ${isUserReported && incident.properties?.reporterId ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                                    onClick={isUserReported && incident.properties?.reporterId ? (e) => {
                                      e.stopPropagation();
                                      setLocation(`/users/${incident.properties.reporterId}`);
                                    } : undefined}
                                  >
                                    {sourceInfo.name}
                                  </h4>
                                  <Badge 
                                    variant={incident.properties?.userReported ? "secondary" : "default"} 
                                    className={`text-xs px-2 py-1 font-medium ${
                                      incident.properties?.userReported 
                                        ? 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-700' 
                                        : 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700'
                                    }`}
                                  >
                                    {sourceInfo.type}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  {getTimeAgo(
                                    incident.properties?.Response_Date || 
                                    incident.properties?.last_updated || 
                                    incident.properties?.createdAt
                                  )}
                                </p>
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>

                        {/* Post Content */}
                        <div className="px-4 pb-3">
                          <div className="flex items-start gap-3 mb-3">
                            <div className="p-2 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                              {getIncidentIcon(incident)}
                            </div>
                            <div className="flex-1">
                              <h3 className="font-bold text-foreground text-lg leading-tight mb-2">
                                {(() => {
                                  const title = getIncidentTitle(incident);
                                  // Truncate long titles to make them more social media friendly
                                  return title.length > 60 ? title.substring(0, 57) + '...' : title;
                                })()}
                              </h3>
                              
                              <p className="text-muted-foreground text-sm leading-relaxed mb-3">
                                {(() => {
                                  const description = getIncidentDescription(incident);
                                  // Truncate long descriptions to keep it social media style
                                  return description.length > 120 ? description.substring(0, 117) + '...' : description;
                                })()}
                              </p>
                              
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <MapPin className="w-3 h-3" />
                                <span>{getIncidentLocation(incident)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator className="opacity-50" />

                        {/* Action Bar - Social Media Style */}
                        <div className="px-4 py-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-6">
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex items-center gap-2 hover:text-blue-500 transition-colors p-2 h-auto"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIncidentClick(incident);
                                }}
                              >
                                <MessageCircle className="w-5 h-5" />
                                <span className="text-sm font-medium">
                                  {/* No comment count shown - functionality not implemented */}
                                </span>
                              </Button>
                              
                              <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-red-500 transition-colors p-2 h-auto">
                                <Heart className="w-5 h-5" />
                                <span className="text-sm font-medium">
                                  {/* No like count shown - functionality not implemented */}
                                </span>
                              </Button>
                              
                              <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-green-500 transition-colors p-2 h-auto">
                                <Share className="w-5 h-5" />
                              </Button>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              {getTimeAgo(
                                incident.properties?.Response_Date || 
                                incident.properties?.last_updated || 
                                incident.properties?.createdAt
                              )}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <IncidentDetailModal
          incident={selectedIncident}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
        />
      )}
      
      {/* Incident Report Form */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
      />
      
      {/* Floating Report Button - Desktop Only */}
      <div className="hidden md:block fixed bottom-6 right-6 z-30">
        <Button
          onClick={() => setReportFormOpen(true)}
          className="shadow-xl h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="button-report-incident"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

    </div>
  );
}