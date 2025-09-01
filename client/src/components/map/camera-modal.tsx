import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface CameraModalProps {
  cameraId: string | null;
  onClose: () => void;
}

export function CameraModal({ cameraId, onClose }: CameraModalProps) {
  const { data: camerasData } = useQuery({
    queryKey: ["/api/traffic/cameras"],
  });

  const camera = (camerasData as any)?.features?.find((f: any) => f.properties.id?.toString() === cameraId);

  if (!camera) return null;

  const props = camera.properties;

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
    <Dialog open={!!cameraId} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl" data-testid="modal-camera-feed">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-foreground">
            {props.name || 'Traffic Camera'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
            {props.image_url ? (
              <img 
                src={props.image_url} 
                alt="Live traffic camera feed"
                className="w-full h-full object-cover rounded-lg"
                data-testid="img-camera-feed"
              />
            ) : (
              <div className="text-center text-muted-foreground">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"></path>
                </svg>
                <p>Camera feed unavailable</p>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Location:</span> 
              <span className="ml-1" data-testid="text-camera-location">
                {props.location || 'Unknown location'}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Last Updated:</span> 
              <span className="ml-1" data-testid="text-camera-updated">
                {formatDate(props.last_updated)}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium">Status:</span> 
              <span className="text-green-600 dark:text-green-400 font-medium ml-1" data-testid="text-camera-status">
                {props.status || 'Active'}
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
