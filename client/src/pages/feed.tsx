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
import { navigateToIncident } from "@/lib/incident-utils";
import { InlineComments } from "@/components/inline-comments";
import { CommentsCount } from "@/components/comments-count";
import { IncidentReportForm } from "@/components/incident-report-form";
import { AppHeader } from "@/components/map/app-header";
import { useIsMobile } from "@/hooks/use-mobile";
import { findRegionBySuburb, getRegionalSuburbs } from "@/lib/regions";
import { FilterState } from "@/pages/home";
import { useTrafficData } from "@/hooks/use-traffic-data";
import { SponsoredPost } from "@/components/sponsored-post";
import { getAgencyInfo, isUserReport } from "@/lib/agency-info";
import { ReporterAttribution } from "@/components/ReporterAttribution";
import { getReporterUserId, getIncidentIconProps } from "@/lib/incident-utils";
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
  Share,
  MoreHorizontal,
  User,
  Users,
  TrendingUp,
  Timer,
  Construction,
  Trees,
  Search,
  Flame,
  Plus,
  Info,
  MessageCircle
} from "lucide-react";

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [, setLocation] = useLocation();
  const [selectedSuburb, setSelectedSuburb] = useState("");
  // Modal functionality moved to unified /incident/:id route
  const [showRegionalUpdates, setShowRegionalUpdates] = useState(true);
  const [reportFormOpen, setReportFormOpen] = useState(false);
  
  // Track expanded comments for each card
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set());
  
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
    // Aging controls
    showExpiredIncidents: false,
    agingSensitivity: 'normal',
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
  // 🎯 UNIFIED PIPELINE: Use same data as map, then filter by location
  const { events: allEvents, incidents: allIncidents, regionalEvents, regionalIncidents } = useTrafficData(filters);
  
  // Filter to user's region for personalized feed view
  const feedEvents = filters.locationFilter ? regionalEvents : allEvents;
  const feedIncidents = filters.locationFilter ? regionalIncidents : allIncidents;
  
  console.log('📱 FEED: Using', feedEvents.length, 'events,', feedIncidents.length, 'incidents (location filter:', filters.locationFilter + ')');

  
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
      // Invalidate unified incidents query
      queryClient.invalidateQueries({ queryKey: ["/api/unified"] });
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

  // Apply category/type filtering to unified feed data
  const filteredFeedEvents = feedEvents.filter(() => filters.showTrafficEvents === true);
  
  const filteredFeedIncidents = feedIncidents.filter((incident: any) => {
    // Use the unified schema's source field for consistent identification
    const source = incident.source || incident.properties?.source;
    
    if (source === 'user') {
      // Community Posts - User-reported incidents
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
    } else if (source === 'tmr') {
      // Government API Feed - Transport and Main Roads traffic events
      return filters.showTrafficEvents === true;
    } else if (source === 'emergency') {
      // Government API Feed - Emergency Services
      // Determine if it's QFES (fire) or general emergency (ESQ)
      const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
      const description = incident.properties?.description?.toLowerCase() || '';
      
      const isQFES = eventType.includes('fire') || eventType.includes('burn') || eventType.includes('hazmat') || description.includes('fire');
      if (isQFES) {
        return filters.showQFES === true;
      } else {
        return filters.showIncidents === true;
      }
    } else {
      // Fallback for incidents without clear source (legacy data)
      // Try to determine from incident structure
      const isUserReported = incident.properties?.userReported;
      
      if (isUserReported) {
        // Apply user report filtering
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
          return filters.showUserCommunity === true;
        }
      } else {
        // Legacy official incidents
        const isQFES = incident.properties?.incidentType?.toLowerCase()?.includes('fire') ||
                       incident.properties?.GroupedType?.toLowerCase()?.includes('fire') ||
                       incident.properties?.description?.toLowerCase()?.includes('fire');
        if (isQFES) {
          return filters.showQFES === true;
        } else {
          return filters.showIncidents === true;
        }
      }
    }
  });

  // Fetch ads for user's region
  const { data: ads = [] } = useQuery<any[]>({
    queryKey: ["/api/ads"],
    enabled: !!user?.homeSuburb,
  });

  // Combine all incidents before deduplication
  const combinedIncidents = [
    ...filteredFeedIncidents.map((inc: any) => ({ ...inc, type: 'incident' })),
    ...filteredFeedEvents.map((event: any) => ({ ...event, type: 'traffic' }))
  ];

  // Deduplicate incidents using a Map for better performance and accuracy
  const incidentMap = new Map();
  
  for (const incident of combinedIncidents) {
    // Generate a unique identifier for each incident
    let incidentId: string;
    
    if (incident.type === 'traffic') {
      incidentId = incident.properties?.id || incident.properties?.event_id || `traffic-${incident.properties?.description}-${incident.properties?.road_summary?.road_name}`;
    } else if (incident.properties?.userReported) {
      // User reported incidents - use database ID
      incidentId = incident.id || `user-${incident.properties?.title}-${incident.properties?.createdAt}`;
    } else {
      // ESQ incidents - use incident number or fallback to other identifying info
      const incidentNumber = incident.properties?.IncidentNumber || incident.properties?.incidentNumber;
      const objectId = incident.properties?.ObjectId || incident.properties?.objectId;
      const description = incident.properties?.Description || incident.properties?.description;
      const eventType = incident.properties?.Event_Type || incident.properties?.event_type;
      const location = incident.properties?.Location || incident.properties?.location;
      
      incidentId = incidentNumber || objectId || `esq-${eventType}-${description}-${location}` || incident.id || `incident-${Date.now()}-${Math.random()}`;
    }
    
    // Only keep the most recent version if we have duplicates
    if (incidentMap.has(incidentId)) {
      const existing = incidentMap.get(incidentId);
      const existingDate = new Date(existing.properties?.incidentTime || existing.properties?.lastUpdated || existing.properties?.publishedAt || 0);
      const currentDate = new Date(incident.properties?.incidentTime || incident.properties?.lastUpdated || incident.properties?.publishedAt || 0);
      
      // Keep the more recent incident
      if (currentDate > existingDate) {
        incidentMap.set(incidentId, incident);
      }
    } else {
      incidentMap.set(incidentId, incident);
    }
  }
  
  const deduplicatedIncidents = Array.from(incidentMap.values());

  // Sort all deduplicated incidents by time (most recent first)
  const sortedIncidents = deduplicatedIncidents
    .sort((a, b) => {
      // Get timestamps from properties (unified structure)
      const dateA = new Date(a.properties?.incidentTime || a.properties?.lastUpdated || a.properties?.publishedAt || 0);
      const dateB = new Date(b.properties?.incidentTime || b.properties?.lastUpdated || b.properties?.publishedAt || 0);
      return dateB.getTime() - dateA.getTime(); // Newest first (descending order)
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
  const getTimeAgo = (incident: any) => {
    // Skip for ads
    if (incident.type === 'ad') return 'Unknown time';
    
    // Check for timestamp data in properties (unified structure)
    const timestamp = incident.properties?.incidentTime || incident.properties?.lastUpdated || incident.properties?.publishedAt;
    
    if (!timestamp) return 'Unknown time';
    
    const date = new Date(timestamp);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const getIncidentIcon = (incident: any) => {
    const { iconName, color } = getIncidentIconProps(incident);
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
      case 'Heart': return <AlertTriangle className={iconClass} />;
      case 'Search': return <Search className={iconClass} />;
      case 'Flame': return <Flame className={iconClass} />;
      case 'AlertTriangle':
      default: return <AlertTriangle className={iconClass} />;
    }
  };

  const getIncidentTitle = (incident: any) => {
    // Skip for ads
    if (incident.type === 'ad') return '';
    
    // Use unified structure title first, then build from other data
    if (incident.properties?.title) {
      const title = incident.properties.title;
      const location = getIncidentLocation(incident);
      const shortLocation = location.split(',')[0];
      
      // Make titles more social media friendly with emojis and location context
      if (title.toLowerCase().includes('accident')) {
        return `🚗💥 Accident on ${shortLocation}`;
      } else if (title.toLowerCase().includes('congestion')) {
        return `🚦 Heavy Traffic - ${shortLocation}`;
      } else if (title.toLowerCase().includes('roadwork')) {
        return `🚧 Roadwork on ${shortLocation}`;
      } else if (title.toLowerCase().includes('hazard')) {
        return `⚠️ Hazard on ${shortLocation}`;
      } else if (title.toLowerCase().includes('closure')) {
        return `🚫 ${shortLocation} Closed`;
      } else if (title.toLowerCase().includes('fire')) {
        return `🔥 Fire Emergency - ${shortLocation}`;
      } else if (title.toLowerCase().includes('medical')) {
        return `🚑 Medical Emergency - ${shortLocation}`;
      } else if (title.toLowerCase().includes('police')) {
        return `🚔 Police Incident - ${shortLocation}`;
      }
      
      // Default: add appropriate emoji and location
      if (incident.properties?.category === 'traffic') {
        return `🚙 ${title} - ${shortLocation}`;
      } else {
        return `🚨 ${title} - ${shortLocation}`;
      }
    }
    
    if (incident.type === 'traffic') {
      // Fallback for traffic without title
      const description = incident.properties?.description || '';
      const location = getIncidentLocation(incident);
      const shortLocation = location.split(',')[0];
      return `🚙 Traffic Alert - ${shortLocation}`;
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.title || '📢 Community Report';
    }
    
    return '🚨 Emergency Update';
  };

  const getIncidentDescription = (incident: any) => {
    // Skip for ads
    if (incident.type === 'ad') return '';
    
    // Use unified structure description with social media style formatting
    const description = incident.properties?.description || '';
    
    if (incident.properties?.category === 'traffic') {
      // Social media style traffic descriptions
      const advice = incident.properties?.originalProperties?.advice || '';
      
      // Make traffic descriptions more engaging and concise
      if (description.toLowerCase().includes('proceed with caution')) {
        return 'Exercise caution when driving through this area 🚗';
      } else if (description.toLowerCase().includes('delays')) {
        return 'Expect delays - plan extra travel time ⏰';
      } else if (description.toLowerCase().includes('closed')) {
        return 'Road closure affecting traffic flow 🚫';
      } else if (description.toLowerCase().includes('congestion')) {
        return 'Heavy traffic in the area - consider alternate routes 🚦';
      }
      
      // Use the advice field if it's more descriptive
      const bestDesc = (advice && advice.length > description.length) ? advice : description;
      
      // Truncate long descriptions and make them friendly
      const shortDesc = bestDesc.substring(0, 80);
      return shortDesc.length < bestDesc.length ? shortDesc + '...' : (shortDesc || 'Traffic disruption reported');
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.description || '';
    }
    
    // Emergency incidents - keep them simple and social media friendly
    if (description) {
      // Remove technical formatting and keep it simple
      const cleanDesc = description.replace(/Status:.*$/i, '').trim();
      const shortDesc = cleanDesc.substring(0, 100);
      return shortDesc.length < cleanDesc.length ? shortDesc + '...' : (shortDesc || 'Emergency response in progress');
    }
    
    return 'Emergency response in progress';
  };

  const getIncidentLocation = (incident: any) => {
    // Skip for ads
    if (incident.type === 'ad') return 'Location not specified';
    
    // First check unified structure location in properties
    if (incident.properties?.location) {
      return incident.properties.location;
    }
    
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
    navigateToIncident(incident, setLocation);
  };


  const handleShareClick = async (incident: any) => {
    const incidentId = incident.id || incident.properties?.id;
    const shareUrl = `${window.location.origin}?incident=${encodeURIComponent(incidentId)}`;
    const shareTitle = getIncidentTitle(incident);
    const shareText = `${shareTitle} - ${getIncidentLocation(incident)}`;

    // Try native Web Share API first (mobile devices)
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl,
        });
        toast({
          title: "Shared successfully",
          description: "Incident details have been shared",
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback to clipboard
      try {
        await navigator.clipboard.writeText(shareUrl);
        toast({
          title: "Link copied to clipboard",
          description: "You can now paste the incident link anywhere",
        });
      } catch (error) {
        console.error('Error copying to clipboard:', error);
        toast({
          title: "Unable to copy link",
          description: "Please share this page manually",
          variant: "destructive",
        });
      }
    }
  };

  const handleCommentsToggle = (incident: any) => {
    const incidentId = incident.id || incident.properties?.id;
    if (!incidentId) return;
    
    setExpandedComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(incidentId)) {
        newSet.delete(incidentId);
      } else {
        newSet.add(incidentId);
      }
      return newSet;
    });
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <AppHeader onMenuToggle={() => {}} />
      
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-6">
        {/* Compact Header with Stats and Refresh */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Safety Feed</h1>
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

                  // Get agency info for official sources only - NO user fallbacks
                  const agencyInfo = getAgencyInfo(incident);
                  const isUserIncident = isUserReport(incident);
                  
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
                              {isUserIncident ? (
                                <div 
                                  className="cursor-pointer hover:opacity-80 transition-all flex items-center gap-3"
                                  onClick={getReporterUserId(incident) ? (e) => {
                                    e.stopPropagation();
                                    setLocation(`/users/${getReporterUserId(incident)}`);
                                  } : undefined}
                                >
                                  <ReporterAttribution 
                                    userId={getReporterUserId(incident)} 
                                    variant="default"
                                  />
                                </div>
                              ) : agencyInfo ? (
                                <div className="flex items-center gap-3">
                                  <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                                    <AvatarFallback className={`${agencyInfo.color} text-white font-bold text-sm shadow-lg`}>
                                      {agencyInfo.avatar}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-bold text-foreground text-base">
                                        {agencyInfo.name}
                                      </h4>
                                      <Badge 
                                        variant="default" 
                                        className="text-xs px-2 py-1 font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                      >
                                        {agencyInfo.type.split(' ')[0]}
                                      </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                      {getTimeAgo(incident)}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                // Fallback for unrecognized incidents - detect emergency services
                                (() => {
                                  // Check if this looks like an emergency incident
                                  const title = getIncidentTitle(incident).toLowerCase();
                                  const description = getIncidentDescription(incident).toLowerCase();
                                  const eventType = incident.properties?.Event_Type?.toLowerCase() || '';
                                  
                                  if (title.includes('fire') || title.includes('qf') || eventType.includes('fire') || 
                                      description.includes('fire') || description.includes('qfes') ||
                                      title.includes('rescue') || title.includes('ambulance') || 
                                      title.includes('police') || title.includes('hazmat')) {
                                    // This is an emergency incident - show as Emergency Services
                                    return (
                                      <div className="flex items-center gap-3">
                                        <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                                          <AvatarFallback className="bg-gradient-to-br from-red-500 to-red-600 text-white font-bold text-sm shadow-lg">
                                            ES
                                          </AvatarFallback>
                                        </Avatar>
                                        <div>
                                          <div className="flex items-center gap-2">
                                            <h4 className="font-bold text-foreground text-base">
                                              Emergency Services
                                            </h4>
                                            <Badge 
                                              variant="default" 
                                              className="text-xs px-2 py-1 font-medium bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-700"
                                            >
                                              Official
                                            </Badge>
                                          </div>
                                          <p className="text-xs text-muted-foreground">
                                            {getTimeAgo(incident)}
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  }
                                  
                                  // For truly unknown incidents, show anonymous
                                  return (
                                    <ReporterAttribution 
                                      userId={null} 
                                      variant="default"
                                    />
                                  );
                                })()
                              )}
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        </div>

                        {/* Post Content - Social Media Style */}
                        <div className="px-4 pb-2">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-full bg-gradient-to-br from-primary/10 to-primary/5 group-hover:from-primary/20 group-hover:to-primary/10 transition-all duration-300">
                              {getIncidentIcon(incident)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground text-base leading-tight mb-1 break-words hyphens-auto w-full" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical' as const,
                                overflow: 'hidden',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                              }}>
                                {getIncidentTitle(incident)}
                              </h3>
                              
                              <p className="text-muted-foreground text-sm leading-relaxed mb-2 break-words w-full" style={{
                                display: '-webkit-box',
                                WebkitLineClamp: 3,
                                WebkitBoxOrient: 'vertical' as const,
                                overflow: 'hidden',
                                wordBreak: 'break-word',
                                overflowWrap: 'break-word'
                              }}>
                                {getIncidentDescription(incident)}
                              </p>
                              
                              <div className="flex items-start gap-2 text-xs md:text-sm text-muted-foreground">
                                <MapPin className="w-3 h-3 md:w-4 md:h-4 flex-shrink-0 mt-0.5" />
                                <span className="break-words hyphens-auto leading-relaxed" style={{
                                  display: '-webkit-box',
                                  WebkitLineClamp: 2,
                                  WebkitBoxOrient: 'vertical' as const,
                                  overflow: 'hidden',
                                  wordBreak: 'break-word',
                                  overflowWrap: 'break-word'
                                }}>{getIncidentLocation(incident)}</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        <Separator className="opacity-50" />

                        {/* Action Bar - Compact Social Media Style */}
                        <div className="px-4 py-2 border-t border-border/50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 md:gap-4">
                              {/* Comments Button */}
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className={`flex items-center gap-1 transition-colors px-3 py-2 h-auto text-xs md:text-sm min-h-[44px] ${
                                  expandedComments.has(incident.id || incident.properties?.id) 
                                    ? 'text-blue-500 hover:text-blue-600' 
                                    : 'hover:text-blue-500'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleCommentsToggle(incident);
                                }}
                                data-testid={`button-comments-${incident.id || incident.properties?.id}`}
                              >
                                <MessageCircle className="w-4 h-4" />
                                <span className="hidden sm:inline">Comments</span>
                                <CommentsCount incidentId={incident.id || incident.properties?.id} />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex items-center gap-1 hover:text-green-500 transition-colors px-3 py-2 h-auto text-xs md:text-sm min-h-[44px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareClick(incident);
                                }}
                              >
                                <Share className="w-4 h-4" />
                                <span className="hidden sm:inline">Share</span>
                              </Button>
                              
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="flex items-center gap-1 hover:text-purple-500 transition-colors px-3 py-2 h-auto text-xs md:text-sm min-h-[44px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleIncidentClick(incident);
                                }}
                              >
                                <Info className="w-4 h-4" />
                                <span className="hidden sm:inline">Details</span>
                              </Button>
                            </div>
                            
                            <div className="text-xs md:text-sm text-muted-foreground">
                              {getTimeAgo(incident)}
                            </div>
                          </div>
                        </div>

                        {/* Inline Comments Section */}
                        {expandedComments.has(incident.id || incident.properties?.id) && (
                          <div className="px-4 pb-4 border-t border-blue-200/60 bg-blue-50/30">
                            <InlineComments 
                              incident={incident}
                              onClose={() => handleCommentsToggle(incident)}
                            />
                          </div>
                        )}

                      </CardContent>
                    </Card>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>


      {/* Modal functionality moved to unified /incident/:id route */}
      
      {/* Incident Report Form */}
      <IncidentReportForm
        isOpen={reportFormOpen}
        onClose={() => setReportFormOpen(false)}
      />
      
      {/* Floating Report Button - Mobile Friendly */}
      <div className="fixed bottom-6 right-4 md:right-6 z-30">
        <Button
          onClick={() => setReportFormOpen(true)}
          className="shadow-xl h-12 w-12 md:h-14 md:w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground transition-all"
          data-testid="button-report-incident"
        >
          <Plus className="w-5 h-5 md:w-6 md:h-6" />
        </Button>
      </div>

    </div>
  );
}