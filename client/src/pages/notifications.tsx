import { useAuth } from "@/hooks/useAuth";
import { AppHeader } from "@/components/map/app-header";
import { NotificationSettings } from "@/components/notification-settings";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function Notifications() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader onMenuToggle={() => {}} />
        <div className="max-w-2xl mx-auto px-4 pt-20 pb-6">
          <div className="text-center py-16">
            <Bell className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Sign In Required</h2>
            <p className="text-muted-foreground mb-6">
              Please sign in to manage your notification preferences.
            </p>
            <Button asChild>
              <Link href="/api/login">Sign In</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader onMenuToggle={() => {}} />
      
      <div className="max-w-2xl mx-auto px-4 pt-20 pb-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">
            Notification Settings
          </h1>
          <p className="text-muted-foreground">
            Manage how you receive safety alerts and incident notifications.
          </p>
        </div>

        {/* Notification Settings Card */}
        <div className="space-y-6">
          <NotificationSettings />
          
          {/* Additional Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">About Safety Notifications</CardTitle>
              <CardDescription>
                How we keep you informed about incidents in your area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">
                    🚨 Emergency Incidents
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Real-time alerts from QLD Emergency Services about active incidents requiring immediate attention.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">
                    🚗 Traffic Events
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Major road closures, crashes, and traffic disruptions that may affect your travel.
                  </p>
                </div>
                
                <div>
                  <h4 className="text-sm font-medium text-foreground mb-1">
                    👥 Community Reports
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    Verified reports from your neighbors about safety concerns, suspicious activity, and local incidents.
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-border">
                <h4 className="text-sm font-medium text-foreground mb-2">
                  Your Privacy
                </h4>
                <p className="text-sm text-muted-foreground">
                  Notifications are sent based on your selected location preferences. We never share your exact location or personal information. You can disable notifications at any time.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}