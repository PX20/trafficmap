import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { IncidentDetailModal } from "@/components/incident-detail-modal";
import { IncidentReportForm } from "@/components/incident-report-form";
import { AppHeader } from "@/components/map/app-header";
import { findRegionBySuburb, getRegionalSuburbs } from "@/lib/regions";
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
  const [selectedSuburb, setSelectedSuburb] = useState("");
  const [selectedIncident, setSelectedIncident] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showRegionalUpdates, setShowRegionalUpdates] = useState(true); // Default to true
  const [reportFormOpen, setReportFormOpen] = useState(false);
  
  // Load saved location from localStorage on startup (sync with map home location)
  useEffect(() => {
    const savedLocation = localStorage.getItem('homeLocation');
    if (savedLocation) {
      setSelectedSuburb(savedLocation);
    } else if (user?.homeSuburb) {
      setSelectedSuburb(user.homeSuburb);
    } else if (user?.primarySuburb) {
      setSelectedSuburb(user.primarySuburb);
      // Also sync this to localStorage so location filter is enabled
      syncLocationToStorage(user.primarySuburb);
    }
  }, [user?.homeSuburb, user?.primarySuburb]);
  
  // Listen for localStorage changes (when location changes on map)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'homeLocation' && e.newValue) {
        setSelectedSuburb(e.newValue);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);
  
  // Function to sync location to localStorage (so map gets updated)
  const syncLocationToStorage = (location: string, coordinates?: { lat: number; lon: number }, boundingBox?: [number, number, number, number]) => {
    if (location) {
      localStorage.setItem('homeLocation', location);
      localStorage.setItem('locationFilter', 'true');
      if (coordinates) {
        localStorage.setItem('homeCoordinates', JSON.stringify(coordinates));
      }
      if (boundingBox) {
        localStorage.setItem('homeBoundingBox', JSON.stringify(boundingBox));
      }
      // Trigger storage event for other tabs/components
      window.dispatchEvent(new StorageEvent('storage', {
        key: 'homeLocation',
        newValue: location,
        oldValue: selectedSuburb
      }));
    }
  };

  const { data: incidents, isLoading: incidentsLoading, data: rawIncidentData } = useQuery({
    queryKey: ["/api/incidents"],
    queryFn: async () => {
      const response = await fetch("/api/incidents");
      if (!response.ok) throw new Error('Failed to fetch incidents');
      return response.json();
    },
    select: (data: any) => data?.features || [],
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/incidents/refresh", { method: "POST" });
      if (!response.ok) throw new Error('Failed to refresh incidents');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/incidents"] });
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

  const { data: eventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/traffic/events"],
    queryFn: async () => {
      const response = await fetch("/api/traffic/events");
      if (!response.ok) throw new Error('Failed to fetch traffic events');
      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 10 * 60 * 1000, // 10 minutes
  });

  // Extract events data
  const events = eventsData?.features || [];

  // Only consider loading if incidents are loading (since traffic events take too long)
  const isLoading = incidentsLoading;

  const handleSuburbUpdate = async () => {
    if (!selectedSuburb.trim()) {
      toast({
        title: "Suburb required",
        description: "Please enter your suburb name",
        variant: "destructive",
      });
      return;
    }

    try {
      const response = await fetch("/api/user/suburb", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ homeSuburb: selectedSuburb }),
      });

      if (!response.ok) throw new Error("Failed to update suburb");

      toast({
        title: "Suburb updated",
        description: `Your home suburb has been set to ${selectedSuburb}`,
      });
    } catch (error) {
      toast({
        title: "Update failed",
        description: "Failed to update your home suburb",
        variant: "destructive",
      });
    }
  };

  // Combine, deduplicate, and sort all incidents by time
  const combinedIncidents = [
    ...(incidents || []).map((inc: any) => ({ ...inc, type: 'incident' })),
    ...(events || []).map((event: any) => ({ ...event, type: 'traffic' }))
  ];

  // Deduplicate incidents using a Map for better performance and accuracy
  const incidentMap = new Map();
  
  for (const incident of combinedIncidents) {
    // Generate a unique identifier for each incident
    let incidentId: string;
    
    if (incident.type === 'traffic') {
      incidentId = incident.properties?.id || incident.properties?.event_id || `traffic-${incident.properties?.description}-${incident.properties?.road_summary?.road_name}`;
    } else if (incident.properties?.userReported) {
      incidentId = `user-${incident.properties?.id || incident.properties?.createdAt}`;
    } else {
      // For emergency incidents, use Master_Incident_Number as primary identifier
      incidentId = incident.properties?.Master_Incident_Number || incident.properties?.id || `incident-${incident.properties?.Response_Date}-${incident.properties?.Location}`;
    }
    
    // Check if we already have this incident
    if (incidentMap.has(incidentId)) {
      // Keep the more recent one
      const existing = incidentMap.get(incidentId);
      const existingTime = new Date(existing.properties?.Response_Date || existing.properties?.last_updated || existing.properties?.createdAt || 0);
      const currentTime = new Date(incident.properties?.Response_Date || incident.properties?.last_updated || incident.properties?.createdAt || 0);
      
      if (currentTime > existingTime) {
        incidentMap.set(incidentId, incident);
      }
    } else {
      incidentMap.set(incidentId, incident);
    }
  }
  
  const deduplicatedIncidents = Array.from(incidentMap.values());

  // Debug: Log the types of incidents we have
  console.log('📊 Feed Debug - Raw incidents by type:');
  console.log('- Emergency incidents:', deduplicatedIncidents.filter(i => i.type === 'incident' && !i.properties?.userReported).length);
  console.log('- Community reports:', deduplicatedIncidents.filter(i => i.properties?.userReported).length);
  console.log('- Traffic events:', deduplicatedIncidents.filter(i => i.type === 'traffic').length);
  console.log('- Total incidents:', deduplicatedIncidents.length);

  // Apply regional filtering if location is selected (but more permissive for debugging)
  let filteredIncidents = deduplicatedIncidents;
  
  console.log('📊 Debug: Total incidents before filtering:', deduplicatedIncidents.length);
  console.log('🔍 Location filter - selectedSuburb:', selectedSuburb, 'showRegionalUpdates:', showRegionalUpdates);
  
  // For now, show ALL incidents regardless of location to test display
  // TODO: Implement better location filtering later
  console.log('🔍 Final filtered incidents count:', filteredIncidents.length);

  // Sort by most recent first  
  const allIncidents = filteredIncidents.sort((a, b) => {
    const aTime = new Date(a.properties?.Response_Date || a.properties?.last_updated || a.properties?.createdAt || a.properties?.timeReported || 0);
    const bTime = new Date(b.properties?.Response_Date || b.properties?.last_updated || b.properties?.createdAt || b.properties?.timeReported || 0);
    return bTime.getTime() - aTime.getTime();
  });


  const getIncidentIcon = (incident: any) => {
    if (incident.type === 'traffic') {
      const eventType = incident.properties?.event_type?.toLowerCase();
      if (eventType === 'crash') return <Car className="w-5 h-5 text-red-500" />;
      if (eventType === 'hazard') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    }
    
    if (incident.properties?.userReported) {
      const incidentType = incident.properties?.incidentType;
      if (['Crime', 'Theft', 'Violence', 'Vandalism'].includes(incidentType)) {
        return <Shield className="w-5 h-5 text-purple-600" />;
      }
      if (incidentType === 'Suspicious') {
        return <Eye className="w-5 h-5 text-amber-600" />;
      }
      return <Zap className="w-5 h-5 text-indigo-600" />;
    }
    
    return <AlertTriangle className="w-5 h-5 text-red-600" />;
  };

  const getIncidentTitle = (incident: any) => {
    if (incident.type === 'traffic') {
      return incident.properties?.description || incident.properties?.event_type || "Traffic Event";
    }
    
    if (incident.properties?.userReported) {
      // Use the actual title from the database, not the incident type
      return incident.properties?.title || incident.properties?.description || "Community Report";
    }
    
    return incident.properties?.GroupedType || "Emergency Incident";
  };

  const getIncidentDescription = (incident: any) => {
    if (incident.type === 'traffic') {
      return incident.properties?.information || incident.properties?.advice || "Traffic information";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.description || "Community reported incident";
    }
    
    return `Incident #${incident.properties?.Master_Incident_Number || 'Unknown'}`;
  };

  const getIncidentLocation = (incident: any) => {
    if (incident.type === 'traffic') {
      return incident.properties?.road_summary?.road_name || incident.properties?.road_summary?.locality || "Unknown location";
    }
    
    if (incident.properties?.userReported) {
      return incident.properties?.locationDescription || "Unknown location";
    }
    
    return `${incident.properties?.Location || 'Unknown'}, ${incident.properties?.Locality || 'Unknown'}`;
  };

  const getTimeAgo = (dateStr: string) => {
    if (!dateStr) return "Unknown time";
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const handleIncidentClick = (incident: any) => {
    setSelectedIncident(incident);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedIncident(null);
  };

  const getStatusBadge = (incident: any) => {
    if (incident.type === 'traffic') {
      // Traffic incidents don't need impact badges
      return null;
    }
    
    if (incident.properties?.userReported) {
      return <Badge variant="secondary">Community Report</Badge>;
    }
    
    const status = incident.properties?.CurrentStatus?.toLowerCase();
    if (status === 'going' || status === 'active') {
      return <Badge variant="destructive">Active</Badge>;
    }
    if (status === 'patrolled' || status === 'monitoring') {
      return <Badge variant="secondary">Monitoring</Badge>;
    }
    if (status === 'completed' || status === 'closed') {
      return <Badge variant="outline">Resolved</Badge>;
    }
    return <Badge variant="secondary">Official</Badge>;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation Header */}
      <AppHeader onMenuToggle={() => {}} />

      <div className="max-w-2xl mx-auto px-4 pt-20 pb-6">
        {/* Location Card */}
        <Card className="mb-6 border-none shadow-lg bg-gradient-to-br from-card to-card/50">
          <CardContent className="p-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <MapPin className="w-6 h-6 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-foreground">Your Location</h3>
                <p className="text-muted-foreground">
                  Connect with your local community
                </p>
              </div>
              <div className="flex items-center gap-2">
                {rawIncidentData?.lastUpdated && (
                  <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                    Updated {new Date(rawIncidentData.lastUpdated).toLocaleTimeString()}
                  </div>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => refreshMutation.mutate()}
                  disabled={refreshMutation.isPending}
                  data-testid="button-refresh-incidents"
                >
                  <RefreshCw className={`w-4 h-4 mr-1 ${refreshMutation.isPending ? 'animate-spin' : ''}`} />
                  {refreshMutation.isPending ? 'Refreshing...' : 'Refresh'}
                </Button>
              </div>
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <LocationAutocomplete
                  value={selectedSuburb}
                  onChange={(location, coordinates, boundingBox) => {
                    setSelectedSuburb(location);
                    // Sync with map home location
                    syncLocationToStorage(location, coordinates, boundingBox);
                    // Automatically update when location is selected
                    setTimeout(() => handleSuburbUpdate(), 100);
                  }}
                  onClear={() => {
                    setSelectedSuburb('');
                    // Clear from localStorage too
                    localStorage.removeItem('homeLocation');
                    localStorage.removeItem('homeCoordinates');
                    localStorage.removeItem('homeBoundingBox');
                    localStorage.setItem('locationFilter', 'false');
                    // Trigger storage event
                    window.dispatchEvent(new StorageEvent('storage', {
                      key: 'homeLocation',
                      newValue: null,
                      oldValue: selectedSuburb
                    }));
                    // Clear the feed when location is cleared
                    setTimeout(() => handleSuburbUpdate(), 100);
                  }}
                  placeholder="Enter your suburb (e.g., Brisbane City, Surfers Paradise)"
                  disabled={false}
                />
              </div>
              <Button 
                onClick={handleSuburbUpdate} 
                className="rounded-full px-6"
                data-testid="button-update-suburb"
              >
                Update
              </Button>
            </div>
            
            {/* Regional Updates Checkbox */}
            {selectedSuburb && (
              <div className="flex items-center space-x-3 mt-4 pt-3 border-t border-border/50">
                <Checkbox
                  id="feed-regional-updates"
                  checked={showRegionalUpdates}
                  onCheckedChange={(checked) => setShowRegionalUpdates(!!checked)}
                  data-testid="checkbox-regional-updates"
                />
                <Label htmlFor="feed-regional-updates" className="text-sm text-foreground flex-1">
                  Updates from my region
                </Label>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Loading State */}
        {isLoading && selectedSuburb && (
          <div className="text-center py-8">
            <div className="w-8 h-8 border-2 border-muted border-t-primary rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-muted-foreground">Loading incidents for {selectedSuburb}...</p>
          </div>
        )}

        {/* No Suburb Selected */}
        {!selectedSuburb && (
          <div className="text-center py-16">
            <div className="bg-muted/30 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
            <h3 className="text-2xl font-bold text-foreground mb-3">Welcome to Safety Feed</h3>
            <p className="text-muted-foreground text-lg mb-2">
              Connect with your local community and stay informed
            </p>
            <p className="text-sm text-muted-foreground">
              Enter your suburb above to see local safety incidents and traffic events
            </p>
          </div>
        )}

        {/* Incident Feed */}
        {selectedSuburb && !isLoading && (
          <div className="space-y-3">
            {allIncidents.length === 0 ? (
              <div className="text-center py-16">
                <div className="bg-green-50 dark:bg-green-950 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6">
                  <Shield className="w-12 h-12 text-green-600" />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">All Clear!</h3>
                <p className="text-muted-foreground text-lg">
                  No recent incidents reported in {selectedSuburb}
                  {showRegionalUpdates && selectedSuburb ? (() => {
                    const region = findRegionBySuburb(selectedSuburb);
                    return region ? ` (${region.name} region)` : '';
                  })() : ''}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Check back later for updates
                </p>
              </div>
            ) : (
              <>
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950 dark:to-purple-950 rounded-xl p-6 mb-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-foreground mb-2">
                        Live Safety Feed
                      </h2>
                      <p className="text-muted-foreground">
                        {selectedSuburb}
                        {showRegionalUpdates && selectedSuburb ? (() => {
                          const region = findRegionBySuburb(selectedSuburb);
                          return region ? ` (${region.name} region)` : '';
                        })() : ''} • {allIncidents.length} active incidents
                      </p>
                    </div>
                    <div className="bg-background rounded-full p-3">
                      <TrendingUp className="w-6 h-6 text-primary" />
                    </div>
                  </div>
                </div>

                {allIncidents.map((incident, index) => {
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
                    const location = incident.properties?.Location || '';
                    
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
                  const actualComments = incident.properties?.commentCount || 0;
                  const actualLikes = incident.properties?.likeCount || 0;

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
                              <Avatar className="w-12 h-12 ring-2 ring-primary/20">
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
                                  <h4 className="font-bold text-foreground text-base">
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
                                  {actualComments > 0 ? actualComments : ''}
                                </span>
                              </Button>
                              
                              {isUserReported && (
                                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-red-500 transition-colors p-2 h-auto">
                                  <Heart className="w-5 h-5" />
                                  <span className="text-sm font-medium">
                                    {actualLikes > 0 ? actualLikes : ''}
                                  </span>
                                </Button>
                              )}
                              
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
        initialLocation={selectedSuburb}
      />
      
      {/* Floating Report Button */}
      <Button
        onClick={() => setReportFormOpen(true)}
        className="fixed bottom-6 right-6 z-30 shadow-lg h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
        data-testid="button-report-incident"
      >
        <Plus className="w-6 h-6" />
      </Button>
    </div>
  );
}