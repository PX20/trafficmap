import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import { 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Camera, 
  Car, 
  Shield,
  Eye,
  Zap
} from "lucide-react";

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedSuburb, setSelectedSuburb] = useState(user?.homeSuburb || "");

  const { data: incidents, isLoading: incidentsLoading } = useQuery({
    queryKey: ["/api/incidents", selectedSuburb],
    enabled: !!selectedSuburb,
    select: (data: any) => data?.features || [],
  });

  const { data: events, isLoading: eventsLoading } = useQuery({
    queryKey: ["/api/traffic/events", selectedSuburb],
    enabled: !!selectedSuburb,
    select: (data: any) => data?.features || [],
  });

  const isLoading = incidentsLoading || eventsLoading;

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

  // Combine and sort all incidents by time
  const allIncidents = [
    ...(incidents || []).map((inc: any) => ({ ...inc, type: 'incident' })),
    ...(events || []).map((event: any) => ({ ...event, type: 'traffic' }))
  ].sort((a, b) => {
    const aTime = new Date(a.properties?.Response_Date || a.properties?.last_updated || a.properties?.createdAt || 0);
    const bTime = new Date(b.properties?.Response_Date || b.properties?.last_updated || b.properties?.createdAt || 0);
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
      return incident.properties?.incidentType || "Community Report";
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

  const getStatusBadge = (incident: any) => {
    if (incident.type === 'traffic') {
      const priority = incident.properties?.event_priority?.toLowerCase();
      if (priority === 'high' || priority === 'red alert') {
        return <Badge variant="destructive">High Impact</Badge>;
      }
      if (priority === 'medium') {
        return <Badge variant="secondary">Medium Impact</Badge>;
      }
      return <Badge variant="outline">Low Impact</Badge>;
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
      {/* Header */}
      <header className="bg-card border-b border-border sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-foreground">Safety Feed</h1>
              <p className="text-sm text-muted-foreground">Local incidents in your area</p>
            </div>
            <Link href="/">
              <Button variant="outline" data-testid="button-back-to-map">
                <MapPin className="w-4 h-4 mr-2" />
                Back to Map
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Suburb Selection */}
        <Card className="mb-6">
          <CardHeader>
            <h3 className="text-lg font-semibold">Your Location</h3>
            <p className="text-sm text-muted-foreground">
              Set your home suburb to see local incidents
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="suburb-input">Home Suburb</Label>
                <Input
                  id="suburb-input"
                  value={selectedSuburb}
                  onChange={(e) => setSelectedSuburb(e.target.value)}
                  placeholder="e.g., Brisbane City, Surfers Paradise"
                  data-testid="input-suburb"
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleSuburbUpdate} data-testid="button-update-suburb">
                  Update
                </Button>
              </div>
            </div>
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
          <div className="text-center py-12">
            <MapPin className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">Choose Your Suburb</h3>
            <p className="text-muted-foreground">
              Enter your suburb above to see local safety incidents and traffic events
            </p>
          </div>
        )}

        {/* Incident Feed */}
        {selectedSuburb && !isLoading && (
          <div className="space-y-4">
            {allIncidents.length === 0 ? (
              <div className="text-center py-12">
                <Shield className="w-12 h-12 text-green-600 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">All Clear!</h3>
                <p className="text-muted-foreground">
                  No recent incidents reported in {selectedSuburb}
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-foreground">
                    Recent Activity in {selectedSuburb}
                  </h2>
                  <Badge variant="outline" data-testid="text-incident-count">
                    {allIncidents.length} incidents
                  </Badge>
                </div>

                {allIncidents.map((incident, index) => (
                  <Card key={`${incident.type}-${incident.properties?.id || incident.properties?.Master_Incident_Number || index}`} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        {getIncidentIcon(incident)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className="font-semibold text-foreground truncate">
                              {getIncidentTitle(incident)}
                            </h4>
                            {getStatusBadge(incident)}
                          </div>
                          
                          <p className="text-sm text-muted-foreground mb-3">
                            {getIncidentDescription(incident)}
                          </p>
                          
                          <div className="flex items-center gap-4 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <MapPin className="w-3 h-3" />
                              <span className="truncate">{getIncidentLocation(incident)}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              <span>{getTimeAgo(
                                incident.properties?.Response_Date || 
                                incident.properties?.last_updated || 
                                incident.properties?.createdAt
                              )}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}