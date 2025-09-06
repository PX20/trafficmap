import { useState, useEffect } from "react";
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
  
  // Load saved location from localStorage on startup (sync with map home location)
  useEffect(() => {
    const savedLocation = localStorage.getItem('homeLocation');
    if (savedLocation) {
      setSelectedSuburb(savedLocation);
    } else if (user?.homeSuburb) {
      setSelectedSuburb(user.homeSuburb);
    } else if (user?.primarySuburb) {
      setSelectedSuburb(user.primarySuburb);
    }
  }, [user?.homeSuburb, user?.primarySuburb]);
  
  // Listen for location changes from map page
  useEffect(() => {
    const handleLocationChange = (event: CustomEvent) => {
      const { location } = event.detail;
      if (location) {
        setSelectedSuburb(location);
      }
    };
    
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'homeLocation' && e.newValue) {
        setSelectedSuburb(e.newValue);
      }
    };
    
    window.addEventListener('locationChanged', handleLocationChange as EventListener);
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('locationChanged', handleLocationChange as EventListener);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

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

  // Apply regional filtering if location is selected
  let filteredIncidents = deduplicatedIncidents;
  
  if (showRegionalUpdates && selectedSuburb) {
    const region = findRegionBySuburb(selectedSuburb);
    
    if (region) {
      filteredIncidents = deduplicatedIncidents.filter((incident: any) => {
        // Filter traffic events by region
        if (incident.type === 'traffic') {
          const locality = incident.properties?.road_summary?.locality || '';
          const roadName = incident.properties?.road_summary?.road_name || '';
          const locationText = `${locality} ${roadName}`.toLowerCase();
          
          return region.suburbs.some(suburb => {
            const suburbLower = suburb.toLowerCase();
            return locationText.includes(suburbLower) ||
                   suburbLower.includes(locationText);
          });
        }
        
        // Filter emergency incidents by region
        if (!incident.properties?.userReported && incident.type !== 'traffic') {
          const locality = incident.properties?.Locality || '';
          const location = incident.properties?.Location || '';
          const locationDesc = incident.properties?.locationDescription || '';
          const locationText = `${locality} ${location} ${locationDesc}`.toLowerCase();
          
          return region.suburbs.some(suburb => {
            const suburbLower = suburb.toLowerCase();
            return locationText.includes(suburbLower) ||
                   suburbLower.includes(locationText);
          });
        }
        
        // For user-reported incidents, check if they match the region
        if (incident.properties?.userReported) {
          const location = incident.properties?.location || '';
          const suburb = incident.properties?.suburb || '';
          const locationText = `${location} ${suburb}`.toLowerCase();
          
          return region.suburbs.some(suburbRegion => {
            const suburbLower = suburbRegion.toLowerCase();
            return locationText.includes(suburbLower) ||
                   suburbLower.includes(locationText);
          });
        }
        
        return true; // Include other incident types by default
      });
    }
  }

  const allIncidents = filteredIncidents
    .sort((a, b) => {
      const dateA = new Date(a.properties?.Response_Date || a.properties?.last_updated || a.properties?.createdAt || 0);
      const dateB = new Date(b.properties?.Response_Date || b.properties?.last_updated || b.properties?.createdAt || 0);
      return dateB.getTime() - dateA.getTime();
    });

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
      return incident.properties?.description || 'Traffic Event';
    }
    if (incident.properties?.userReported) {
      return incident.properties?.title || 'Community Report';
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
      const roadInfo = incident.properties?.road_summary;
      if (roadInfo?.road_name && roadInfo?.locality) {
        return `${roadInfo.road_name}, ${roadInfo.locality}`;
      }
      return incident.properties?.description || 'Traffic disruption reported';
    }
    if (incident.properties?.userReported) {
      return incident.properties?.description || 'Community safety report';
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
                `${allIncidents.length} incidents in ${selectedSuburb} region`
              ) : (
                allIncidents.length > 0 ? `${allIncidents.length} active incidents across Queensland` : 'Real-time incidents across Queensland'
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
            {allIncidents.length === 0 ? (
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
                              
                              {isUserReported && (
                                <Button variant="ghost" size="sm" className="flex items-center gap-2 hover:text-red-500 transition-colors p-2 h-auto">
                                  <Heart className="w-5 h-5" />
                                  <span className="text-sm font-medium">
                                    {/* No like count shown - functionality not implemented */}
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
      />
      
      {/* Floating Report Button - Desktop Only */}
      <div className="hidden md:block">
        <Button
          onClick={() => setReportFormOpen(true)}
          className="fixed bottom-6 right-6 z-30 shadow-xl h-14 w-14 rounded-full bg-primary hover:bg-primary/90 text-primary-foreground"
          data-testid="button-report-incident"
        >
          <Plus className="w-6 h-6" />
        </Button>
      </div>

    </div>
  );
}