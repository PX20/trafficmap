import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft } from "lucide-react";
import { useOverlayNavigation } from "@/contexts/overlay-navigation-context";
import { Suspense, lazy } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const Profile = lazy(() => import("@/pages/profile"));
const Notifications = lazy(() => import("@/pages/notifications"));
const SavedPosts = lazy(() => import("@/pages/saved-posts"));
const MyReactions = lazy(() => import("@/pages/my-reactions"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Help = lazy(() => import("@/pages/help"));

const LoadingFallback = () => (
  <div className="flex items-center justify-center h-full">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

const overlayTitles: Record<string, string> = {
  profile: "Profile",
  notifications: "Notifications",
  saved: "Saved Posts",
  reactions: "My Reactions",
  privacy: "Privacy Policy",
  help: "Help & Support",
  messages: "Messages",
};

export function OverlayPages() {
  const { activeOverlay, closeOverlay, isOverlayOpen } = useOverlayNavigation();
  const isMobile = useIsMobile();
  
  const renderContent = () => {
    switch (activeOverlay) {
      case 'profile':
        return <Profile />;
      case 'notifications':
        return <Notifications />;
      case 'saved':
        return <SavedPosts />;
      case 'reactions':
        return <MyReactions />;
      case 'privacy':
        return <Privacy />;
      case 'help':
        return <Help />;
      default:
        return null;
    }
  };

  return (
    <Sheet open={isOverlayOpen} onOpenChange={(open) => !open && closeOverlay()}>
      <SheetContent 
        side={isMobile ? "bottom" : "right"} 
        className={isMobile 
          ? "h-[90vh] rounded-t-xl p-0 flex flex-col" 
          : "w-full sm:max-w-lg p-0 flex flex-col"
        }
      >
        <SheetHeader className="flex-shrink-0 flex flex-row items-center gap-2 p-4 border-b">
          <Button
            variant="ghost"
            size="icon"
            onClick={closeOverlay}
            className="h-9 w-9"
            data-testid="button-close-overlay"
          >
            {isMobile ? <ArrowLeft className="h-5 w-5" /> : <X className="h-5 w-5" />}
          </Button>
          <SheetTitle className="text-lg font-semibold">
            {activeOverlay ? overlayTitles[activeOverlay] : ''}
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto">
          <Suspense fallback={<LoadingFallback />}>
            {renderContent()}
          </Suspense>
        </div>
      </SheetContent>
    </Sheet>
  );
}
