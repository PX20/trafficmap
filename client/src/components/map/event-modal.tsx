import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Share2, MapPin, Clock, AlertTriangle, Car, Shield, Eye, Zap } from "lucide-react";
import { useLocation } from "wouter";

interface EventModalProps {
  eventId: string | null;
  onClose: () => void;
}

export function EventModal({ eventId, onClose }: EventModalProps) {
  const [, setLocation] = useLocation();
  
  // Use unified incidents API
  const { data: unifiedData } = useQuery({
    queryKey: ["/api/unified"],
  });

  // Find event in unified incidents data
  const event = (unifiedData as any)?.features?.find((f: any) => 
    f.properties.id?.toString() === eventId ||
    f.id?.toString() === eventId
  );

  if (!event) return null;

  const props = event.properties;
  const source = props.source; // 'tmr', 'emergency', 'user'
  const isUserReported = source === 'user';
  const isTrafficEvent = source === 'tmr';
  const isEmergencyEvent = source === 'emergency';
  const getIncidentIcon = () => {
    if (isTrafficEvent) {
      const originalProps = props.originalProperties || {};
      const eventTypeStr = originalProps.event_type?.toLowerCase() || props.category?.toLowerCase();
      if (eventTypeStr?.includes('crash') || eventTypeStr?.includes('accident')) return <Car className="w-5 h-5 text-red-500" />;
      if (eventTypeStr?.includes('hazard')) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      if (eventTypeStr?.includes('congestion')) return <Car className="w-5 h-5 text-orange-500" />;
      return <AlertTriangle className="w-5 h-5 text-orange-500" />;
    }
    
    if (isEmergencyEvent) {
      const originalProps = props.originalProperties || {};
      const groupedType = (originalProps.GroupedType || '').toUpperCase();
      if (groupedType.includes('FIRE')) return <AlertTriangle className="w-5 h-5 text-red-600" />;
      if (groupedType.includes('POLICE')) return <Shield className="w-5 h-5 text-blue-600" />;
      if (groupedType.includes('AMBULANCE')) return <AlertTriangle className="w-5 h-5 text-green-600" />;
      return <AlertTriangle className="w-5 h-5 text-red-600" />;
    }
    
    if (isUserReported) {
      const incidentType = props.category || props.incidentType;
      if (['crime', 'theft', 'violence', 'vandalism'].includes(incidentType?.toLowerCase())) {
        return <Shield className="w-5 h-5 text-purple-600" />;
      }
      if (incidentType?.toLowerCase() === 'suspicious') {
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
    
    if (isEmergencyEvent) {
      const originalProps = props.originalProperties || {};
      const groupedType = (originalProps.GroupedType || '').toUpperCase();
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
    }
    
    return { name: 'Queensland Services', agency: 'QLD', initials: 'QLD' };
  };
  
  const getTitle = () => {
    if (isTrafficEvent) {
      return props.description || props.event_type || "Traffic Event";
    }
    if (isUserReported) {
      return props.title || props.description || "Community Report";
    }
    // For emergency incidents, create a meaningful title
    const groupedType = props.GroupedType || '';
    const locality = props.Locality || '';
    
    if (groupedType && locality) {
      return `${groupedType} - ${locality}`;
    }
    return groupedType || "Emergency Incident";
  };
  
  const getLocation = () => {
    if (isTrafficEvent) {
      const originalProps = props.originalProperties || {};
      const roadSummary = originalProps.road_summary || {};
      const roadName = roadSummary.road_name || '';
      const locality = roadSummary.locality || '';
      if (roadName && locality) {
        return `${roadName}, ${locality}`;
      }
      return roadName || locality || props.location || 'Location not specified';
    }
    
    if (isEmergencyEvent) {
      // First try the processed location field which is already properly formatted
      if (props.location && props.location !== 'Queensland') {
        return props.location;
      }
      
      // Fallback to original properties if processed location is generic
      const originalProps = props.originalProperties || {};
      const location = originalProps.Location || '';
      const locality = originalProps.Locality || '';
      
      if (location && locality && location !== locality) {
        return `${location}, ${locality}`;
      }
      return location || locality || props.location || 'Location not specified';
    }
    
    if (isUserReported) {
      return props.location || props.locationDescription || 'Location not specified';
    }
    
    return props.location || 'Location not specified';
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
            <Avatar 
              className={`w-10 h-10 ${isUserReported && props.reporterId ? 'cursor-pointer hover:ring-2 hover:ring-primary/40 transition-all' : ''}`}
              onClick={isUserReported && props.reporterId ? () => {
                setLocation(`/users/${props.reporterId}`);
              } : undefined}
            >
              <AvatarFallback className={`text-sm font-medium ${getAgencyColor(reporterInfo.agency)}`}>
                {reporterInfo.initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <p 
                className={`text-sm font-medium text-foreground ${isUserReported && props.reporterId ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
                onClick={isUserReported && props.reporterId ? () => {
                  setLocation(`/users/${props.reporterId}`);
                } : undefined}
                data-testid="link-reporter-profile"
              >
                {reporterInfo.name}
              </p>
              <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span data-testid="text-event-time">
                  {formatDate(
                    isTrafficEvent && (props.originalProperties?.published || props.originalProperties?.last_updated || props.incidentTime) ||
                    isEmergencyEvent && (props.originalProperties?.Response_Date || props.originalProperties?.LastUpdate || props.incidentTime) ||
                    isUserReported && props.publishedAt ||
                    props.lastUpdated
                  )}
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

          {/* Enhanced Status Info - Source Specific */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Badge variant="secondary" className="text-xs" data-testid="badge-incident-status">
                {isTrafficEvent && (props.originalProperties?.event_type || props.category) || 
                 isEmergencyEvent && (props.originalProperties?.CurrentStatus || props.status) || 
                 isUserReported && (props.status || props.category) || 
                 'Active'}
              </Badge>
              <Badge variant="outline" className={`text-xs ${
                props.severity === 'critical' ? 'border-red-500 text-red-600' :
                props.severity === 'high' ? 'border-orange-500 text-orange-600' :
                props.severity === 'medium' ? 'border-yellow-500 text-yellow-600' :
                'border-green-500 text-green-600'
              }`} data-testid="badge-priority">
                {props.severity || 'Low'} Priority
              </Badge>
            </div>

            {/* TMR Traffic Rich Information */}
            {isTrafficEvent && props.originalProperties && (
              <div className="text-xs space-y-1" data-testid="traffic-details">
                {props.originalProperties.advice && (
                  <p className="text-muted-foreground italic" data-testid="traffic-advice">{props.originalProperties.advice}</p>
                )}
                {props.originalProperties.impact && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Traffic impact:</span>
                    <span className="font-medium" data-testid="traffic-impact">{props.originalProperties.impact}</span>
                  </div>
                )}
                {props.originalProperties.information && (
                  <p className="text-sm text-muted-foreground" data-testid="traffic-info">{props.originalProperties.information}</p>
                )}
              </div>
            )}

            {/* Emergency Services Rich Information */}
            {isEmergencyEvent && props.originalProperties && (
              <div className="text-xs space-y-1" data-testid="emergency-details">
                {props.originalProperties.VehiclesOnScene !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Vehicles on scene:</span>
                    <span className="font-medium" data-testid="vehicles-on-scene">{props.originalProperties.VehiclesOnScene}</span>
                  </div>
                )}
                {props.originalProperties.VehiclesOnRoute !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">En route:</span>
                    <span className="font-medium" data-testid="vehicles-en-route">{props.originalProperties.VehiclesOnRoute}</span>
                  </div>
                )}
                {props.originalProperties.VehiclesAssigned !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total assigned:</span>
                    <span className="font-medium" data-testid="vehicles-assigned">{props.originalProperties.VehiclesAssigned}</span>
                  </div>
                )}
                {props.originalProperties.Master_Incident_Number && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Incident #:</span>
                    <span className="font-mono text-xs" data-testid="incident-number">{props.originalProperties.Master_Incident_Number}</span>
                  </div>
                )}
                {props.originalProperties.Jurisdiction && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Jurisdiction:</span>
                    <span className="font-medium" data-testid="jurisdiction">{props.originalProperties.Jurisdiction}</span>
                  </div>
                )}
              </div>
            )}

            {/* User Report Verification */}
            {isUserReported && (
              <div className="text-xs space-y-1" data-testid="user-report-details">
                {props.verificationStatus && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Verification:</span>
                    <Badge variant={props.verificationStatus === 'official_verified' ? 'default' : 'outline'} className="text-xs" data-testid="verification-status">
                      {props.verificationStatus.replace('_', ' ')}
                    </Badge>
                  </div>
                )}
              </div>
            )}
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
