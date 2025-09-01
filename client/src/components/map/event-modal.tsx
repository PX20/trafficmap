import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface EventModalProps {
  eventId: string | null;
  onClose: () => void;
}

export function EventModal({ eventId, onClose }: EventModalProps) {
  const { data: eventsData } = useQuery({
    queryKey: ["/api/traffic/events"],
  });

  const event = (eventsData as any)?.features?.find((f: any) => f.properties.id.toString() === eventId);

  if (!event) return null;

  const props = event.properties;
  const getEventIcon = (eventType: string) => {
    if (eventType?.toLowerCase() === 'crash') {
      return (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
        </svg>
      );
    }
    return (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
      </svg>
    );
  };

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
      <DialogContent className="max-w-lg" data-testid="modal-event-details">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {props.description || props.event_type}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              props.event_type?.toLowerCase() === 'crash' 
                ? 'bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-400' 
                : 'bg-yellow-100 text-yellow-600 dark:bg-yellow-950 dark:text-yellow-400'
            }`}>
              {getEventIcon(props.event_type)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                {props.information || props.description}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {props.road_summary?.road_name}, {props.road_summary?.locality}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Impact:</span>
              <Badge className={`ml-2 ${getPriorityColor(props.event_priority)}`}>
                {props.event_priority || 'Unknown'}
              </Badge>
            </div>
            <div>
              <span className="text-muted-foreground">Reported:</span>
              <span className="ml-1" data-testid="text-event-reported">
                {formatDate(props.published)}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Status:</span>
              <span className="ml-1 font-medium" data-testid="text-event-status">
                {props.status}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Source:</span>
              <span className="ml-1" data-testid="text-event-source">
                {props.source?.provided_by || props.source?.source_name || 'TMR'}
              </span>
            </div>
          </div>
          
          {props.advice && (
            <div className="bg-muted p-3 rounded-lg">
              <p className="text-sm text-muted-foreground" data-testid="text-event-advice">
                {props.advice}
              </p>
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button className="flex-1" data-testid="button-get-directions">
              Get Directions
            </Button>
            <Button variant="outline" data-testid="button-share-event">
              Share
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
