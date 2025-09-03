import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Share2, MapPin, Clock, AlertTriangle, Car, Shield, Eye, Zap } from "lucide-react";

interface EventModalProps {
  eventId: string | null;
  onClose: () => void;
}

export function EventModal({ eventId, onClose }: EventModalProps) {
  const { data: trafficData } = useQuery({
    queryKey: ["/api/traffic/events"],
  });
  
  const { data: incidentsData } = useQuery({
    queryKey: ["/api/incidents"],
  });

  // Find event in either traffic or incidents data
  let event = null;
  let eventType = 'traffic';
  
  if ((trafficData as any)?.features) {
    event = (trafficData as any).features.find((f: any) => f.properties.id?.toString() === eventId);
  }
  
  if (!event && (incidentsData as any)?.features) {
    event = (incidentsData as any).features.find((f: any) => 
      f.properties.id?.toString() === eventId ||
      f.properties.Master_Incident_Number === eventId
    );
    eventType = 'incident';
  }

  if (!event) return null;

  const props = event.properties;
  const isUserReported = props.userReported;
  const isTrafficEvent = eventType === 'traffic';
  const getIncidentIcon = () => {
    if (isTrafficEvent) {
      const eventTypeStr = props.event_type?.toLowerCase();
      if (eventTypeStr === 'crash') return <Car className="w-5 h-5 text-red-500" />;
      if (eventTypeStr === 'hazard') return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    }
    
    if (isUserReported) {
      const incidentType = props.incidentType;
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
  
  const getAgencyColor = (agency: string) => {
    if (agency === 'TMR') return 'text-orange-600';
    if (agency === 'QFES') return 'text-red-600';
    if (agency === 'QPS') return 'text-blue-600';
    if (agency === 'QAS') return 'text-green-600';
    if (agency === 'ESQ') return 'text-red-600';
    return 'text-purple-600'; // Community
  };
  
  const getReporterInfo = () => {
    if (isUserReported) {
      return {
        name: props.reporterName || 'Anonymous',
        agency: 'Community',
        initials: (props.reporterName || 'A').slice(0, 2).toUpperCase()
      };
    }
    
    if (isTrafficEvent) {
      return {
        name: 'TMR Queensland',
        agency: 'TMR',
        initials: 'TMR'
      };
    }
    
    // Emergency incident - determine agency
    const groupedType = props.GroupedType || '';
    if (groupedType.includes('FIRE')) {
      return { name: 'QLD Fire & Emergency', agency: 'QFES', initials: 'QFES' };
    }
    if (groupedType.includes('POLICE')) {
      return { name: 'QLD Police Service', agency: 'QPS', initials: 'QPS' };
    }
    if (groupedType.includes('AMBULANCE')) {
      return { name: 'QLD Ambulance Service', agency: 'QAS', initials: 'QAS' };
    }
    return { name: 'Emergency Services QLD', agency: 'ESQ', initials: 'ESQ' };
  };
  
  const getTitle = () => {
    if (isTrafficEvent) {
      return props.description || props.event_type || "Traffic Event";
    }
    if (isUserReported) {
      return props.title || props.description || "Community Report";
    }
    return props.GroupedType || "Emergency Incident";
  };
  
  const getLocation = () => {
    if (isTrafficEvent) {
      return `${props.road_summary?.road_name || 'Unknown Road'}, ${props.road_summary?.locality || 'Unknown Area'}`;
    }
    if (isUserReported) {
      return props.locationDescription || props.Location || 'Unknown location';
    }
    return `${props.Location || 'Unknown location'}, ${props.Locality || ''}`;
  };
  
  const getThumbnail = () => {
    if (isUserReported && props.photoUrl) {
      return props.photoUrl;
    }
    return null;
  };
  
  const reporterInfo = getReporterInfo();
  const thumbnail = getThumbnail();

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase();
    if (p === 'high' || p === 'red alert') return 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300';
    if (p === 'medium') return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-300';
    return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300';
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diff < 60) return `${diff} minutes ago`;
    if (diff < 1440) return `${Math.floor(diff / 60)} hours ago`;
    return date.toLocaleDateString();
  };

  return (
    <Dialog open={!!eventId} onOpenChange={onClose}>
      <DialogContent className="max-w-md" data-testid="modal-event-details">
        <DialogHeader className="pb-3">
          {/* Reporter Info Header */}
          <div className="flex items-center space-x-3">
            <Avatar className="w-10 h-10">
              <AvatarFallback className={`text-sm font-medium ${getAgencyColor(reporterInfo.agency)}`}>
                {reporterInfo.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{reporterInfo.name}</p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span data-testid="text-event-time">
                  {formatDate(props.published || props.Response_Date || props.createdAt || props.timeReported)}
                </span>
              </div>
            </div>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 bg-muted`}>
              {getIncidentIcon()}
            </div>
          </div>
        </DialogHeader>
        
        <div className="space-y-3">
          {/* Title and Summary */}
          <div>
            <DialogTitle className="text-base font-semibold text-foreground mb-1 line-clamp-2">
              {getTitle()}
            </DialogTitle>
            <div className="flex items-center space-x-1 text-sm text-muted-foreground">
              <MapPin className="w-3 h-3" />
              <span className="line-clamp-1">{getLocation()}</span>
            </div>
          </div>

          {/* Image Thumbnail */}
          {thumbnail && (
            <div className="rounded-lg overflow-hidden bg-muted">
              <img 
                src={thumbnail} 
                alt="Incident photo" 
                className="w-full h-32 object-cover"
                data-testid="img-incident-thumbnail"
              />
            </div>
          )}

          {/* Compact Status Info */}
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <Badge variant="secondary" className="text-xs">
              {isTrafficEvent ? props.event_type : (props.CurrentStatus || props.status || reporterInfo.agency)}
            </Badge>
            <span className="text-xs">
              {isTrafficEvent ? 'Traffic Update' : (isUserReported ? 'Community Report' : 'Emergency Response')}
            </span>
          </div>

          {/* Social Interaction Bar */}
          <div className="flex items-center justify-between py-2 border-t">
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-muted-foreground hover:text-foreground">
              <MessageCircle className="w-4 h-4" />
              <span className="text-xs">12</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-muted-foreground hover:text-foreground">
              <Heart className="w-4 h-4" />
              <span className="text-xs">24</span>
            </Button>
            <Button variant="ghost" size="sm" className="flex items-center space-x-1 text-muted-foreground hover:text-foreground">
              <Share2 className="w-4 h-4" />
              <span className="text-xs">Share</span>
            </Button>
            <Button size="sm" data-testid="button-view-details">
              View Details
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
