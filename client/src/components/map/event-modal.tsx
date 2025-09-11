import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MessageCircle, Heart, Share2, MapPin, Clock, AlertTriangle, Car, Shield, Eye, Zap, Info, Timer, Route, Construction } from "lucide-react";
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

  const getDescription = () => {
    if (isTrafficEvent) {
      const originalProps = props.originalProperties || {};
      return originalProps.description || originalProps.information || props.description || 'No detailed description available';
    }
    
    if (isEmergencyEvent) {
      const originalProps = props.originalProperties || {};
      // Build a meaningful description from available emergency data
      const parts = [];
      if (originalProps.GroupedType) parts.push(originalProps.GroupedType);
      if (originalProps.CurrentStatus && originalProps.CurrentStatus !== originalProps.GroupedType) {
        parts.push(`Status: ${originalProps.CurrentStatus}`);
      }
      if (originalProps.VehiclesOnScene > 0) {
        parts.push(`${originalProps.VehiclesOnScene} vehicles on scene`);
      }
      return parts.length > 0 ? parts.join(' - ') : 'Emergency response in progress';
    }
    
    if (isUserReported) {
      return props.description || props.details || 'Community reported incident';
    }
    
    return 'No description available';
  };

  const getDuration = () => {
    if (isTrafficEvent) {
      const originalProps = props.originalProperties || {};
      if (originalProps.start_time && originalProps.end_time) {
        const start = new Date(originalProps.start_time);
        const end = new Date(originalProps.end_time);
        const duration = Math.floor((end.getTime() - start.getTime()) / (1000 * 60));
        if (duration > 0) {
          return duration < 60 ? `${duration} minutes` : `${Math.floor(duration / 60)} hours ${duration % 60} minutes`;
        }
      }
      if (originalProps.duration) {
        return originalProps.duration;
      }
    }
    return null;
  };

  const getRoadConditions = () => {
    if (isTrafficEvent) {
      const originalProps = props.originalProperties || {};
      const conditions = [];
      if (originalProps.road_condition) conditions.push(originalProps.road_condition);
      if (originalProps.lane_closure) conditions.push(`Lane closure: ${originalProps.lane_closure}`);
      if (originalProps.traffic_management) conditions.push(originalProps.traffic_management);
      return conditions.length > 0 ? conditions : null;
    }
    return null;
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

          {/* Prominent Description Section */}
          <div className="bg-muted/30 rounded-lg p-3 border-l-4 border-primary/40" data-testid="section-description">
            <div className="flex items-start space-x-2">
              <Info className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium text-foreground mb-1">Description</h4>
                <p className="text-sm text-muted-foreground leading-relaxed" data-testid="text-incident-description">
                  {getDescription()}
                </p>
              </div>
            </div>
          </div>

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

            {/* TMR Traffic Comprehensive Information */}
            {isTrafficEvent && props.originalProperties && (
              <div className="space-y-3" data-testid="traffic-details">
                {/* Traffic Impact & Advice */}
                {(props.originalProperties.impact || props.originalProperties.advice) && (
                  <div className="bg-orange-50 dark:bg-orange-950/20 rounded-lg p-3 border border-orange-200 dark:border-orange-800">
                    <div className="flex items-start space-x-2">
                      <AlertTriangle className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        {props.originalProperties.impact && (
                          <div>
                            <h5 className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Traffic Impact</h5>
                            <p className="text-xs text-orange-700 dark:text-orange-300" data-testid="traffic-impact">{props.originalProperties.impact}</p>
                          </div>
                        )}
                        {props.originalProperties.advice && (
                          <div>
                            <h5 className="text-xs font-medium text-orange-800 dark:text-orange-200 mb-1">Advice</h5>
                            <p className="text-xs text-orange-700 dark:text-orange-300" data-testid="traffic-advice">{props.originalProperties.advice}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Timeline & Duration */}
                {getDuration() && (
                  <div className="bg-blue-50 dark:bg-blue-950/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-start space-x-2">
                      <Timer className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h5 className="text-xs font-medium text-blue-800 dark:text-blue-200 mb-1">Duration</h5>
                        <p className="text-xs text-blue-700 dark:text-blue-300" data-testid="traffic-duration">{getDuration()}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Road Conditions & Restrictions */}
                {getRoadConditions() && (
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 rounded-lg p-3 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-start space-x-2">
                      <Construction className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h5 className="text-xs font-medium text-yellow-800 dark:text-yellow-200 mb-1">Road Conditions</h5>
                        <div className="space-y-1">
                          {getRoadConditions()?.map((condition, index) => (
                            <p key={index} className="text-xs text-yellow-700 dark:text-yellow-300" data-testid={`road-condition-${index}`}>{condition}</p>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Information */}
                {props.originalProperties.information && props.originalProperties.information !== getDescription() && (
                  <div className="text-xs space-y-1">
                    <h5 className="font-medium text-foreground">Additional Information</h5>
                    <p className="text-muted-foreground" data-testid="traffic-additional-info">{props.originalProperties.information}</p>
                  </div>
                )}
              </div>
            )}

            {/* Emergency Services Comprehensive Information */}
            {isEmergencyEvent && props.originalProperties && (
              <div className="space-y-3" data-testid="emergency-details">
                {/* Response Status */}
                <div className="bg-red-50 dark:bg-red-950/20 rounded-lg p-3 border border-red-200 dark:border-red-800">
                  <div className="flex items-start space-x-2">
                    <Shield className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <h5 className="text-xs font-medium text-red-800 dark:text-red-200 mb-2">Emergency Response</h5>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        {props.originalProperties.VehiclesOnScene !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-red-700 dark:text-red-300">On scene:</span>
                            <span className="font-medium text-red-800 dark:text-red-200" data-testid="vehicles-on-scene">{props.originalProperties.VehiclesOnScene}</span>
                          </div>
                        )}
                        {props.originalProperties.VehiclesOnRoute !== undefined && (
                          <div className="flex justify-between">
                            <span className="text-red-700 dark:text-red-300">En route:</span>
                            <span className="font-medium text-red-800 dark:text-red-200" data-testid="vehicles-en-route">{props.originalProperties.VehiclesOnRoute}</span>
                          </div>
                        )}
                        {props.originalProperties.VehiclesAssigned !== undefined && (
                          <div className="flex justify-between col-span-2">
                            <span className="text-red-700 dark:text-red-300">Total assigned:</span>
                            <span className="font-medium text-red-800 dark:text-red-200" data-testid="vehicles-assigned">{props.originalProperties.VehiclesAssigned}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Incident Details */}
                <div className="bg-gray-50 dark:bg-gray-950/20 rounded-lg p-3 border border-gray-200 dark:border-gray-800">
                  <div className="flex items-start space-x-2">
                    <Info className="w-4 h-4 text-gray-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <h5 className="text-xs font-medium text-gray-800 dark:text-gray-200">Incident Information</h5>
                      {props.originalProperties.Master_Incident_Number && (
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-gray-300 text-xs">Incident #:</span>
                          <span className="font-mono text-xs text-gray-800 dark:text-gray-200" data-testid="incident-number">{props.originalProperties.Master_Incident_Number}</span>
                        </div>
                      )}
                      {props.originalProperties.Jurisdiction && (
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-gray-300 text-xs">Jurisdiction:</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200" data-testid="jurisdiction">{props.originalProperties.Jurisdiction}</span>
                        </div>
                      )}
                      {props.originalProperties.Response_Date && (
                        <div className="flex justify-between">
                          <span className="text-gray-700 dark:text-gray-300 text-xs">Response time:</span>
                          <span className="text-xs text-gray-800 dark:text-gray-200" data-testid="response-time">{formatDate(props.originalProperties.Response_Date)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* User Report Comprehensive Details */}
            {isUserReported && (
              <div className="space-y-3" data-testid="user-report-details">
                {/* Verification Status */}
                {props.verificationStatus && (
                  <div className="bg-purple-50 dark:bg-purple-950/20 rounded-lg p-3 border border-purple-200 dark:border-purple-800">
                    <div className="flex items-start space-x-2">
                      <Eye className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h5 className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-1">Verification Status</h5>
                        <Badge variant={props.verificationStatus === 'official_verified' ? 'default' : 'outline'} className="text-xs" data-testid="verification-status">
                          {props.verificationStatus.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                )}

                {/* Community Impact */}
                {(props.category || props.incidentType) && (
                  <div className="bg-indigo-50 dark:bg-indigo-950/20 rounded-lg p-3 border border-indigo-200 dark:border-indigo-800">
                    <div className="flex items-start space-x-2">
                      <Zap className="w-4 h-4 text-indigo-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <h5 className="text-xs font-medium text-indigo-800 dark:text-indigo-200 mb-1">Incident Type</h5>
                        <p className="text-xs text-indigo-700 dark:text-indigo-300" data-testid="incident-category">{props.category || props.incidentType}</p>
                        {props.urgency && (
                          <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">Urgency: {props.urgency}</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                {(props.details || props.locationDescription) && (
                  <div className="text-xs space-y-1">
                    <h5 className="font-medium text-foreground">Additional Details</h5>
                    {props.details && (
                      <p className="text-muted-foreground" data-testid="user-report-details-text">{props.details}</p>
                    )}
                    {props.locationDescription && props.locationDescription !== getLocation() && (
                      <p className="text-muted-foreground" data-testid="location-description">
                        <strong>Location:</strong> {props.locationDescription}
                      </p>
                    )}
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
