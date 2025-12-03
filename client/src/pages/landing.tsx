import { Button } from "@/components/ui/button";
import { Bell, MessageCircle, MapPin, Heart, Shield, Users } from "lucide-react";

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-6xl mx-auto px-6 py-16 lg:py-24">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground">
            Community Connect
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Your local community network for safety updates, lost & found, and neighbourhood news across Australia.
          </p>
          <Button 
            size="lg" 
            className="mt-4"
            onClick={() => window.location.href = '/auth'}
            data-testid="button-get-started"
          >
            Get Started
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="p-6 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
              <Bell className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Real-time Alerts</h3>
            <p className="text-muted-foreground">Get notified about incidents, emergencies, and important updates happening in your local area.</p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
              <MessageCircle className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Community Posts</h3>
            <p className="text-muted-foreground">Share updates, ask questions, and stay connected with your neighbours through our social feed.</p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
              <Heart className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Lost & Found</h3>
            <p className="text-muted-foreground">Help reunite pets and belongings with their owners. Post sightings and find what you've lost.</p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Safety Reports</h3>
            <p className="text-muted-foreground">Report suspicious activity, safety concerns, and help keep your community safe and informed.</p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
              <MapPin className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Interactive Map</h3>
            <p className="text-muted-foreground">See incidents and posts on an interactive map. Filter by category and distance from your home.</p>
          </div>
          
          <div className="p-6 rounded-lg border bg-card">
            <div className="p-3 rounded-full bg-primary/10 w-fit mb-4">
              <Users className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-lg font-semibold text-foreground mb-2">Local Focus</h3>
            <p className="text-muted-foreground">Content filtered to your suburb and surrounding areas. See what matters most to you.</p>
          </div>
        </div>
        
        <div className="text-center mt-16">
          <Button 
            size="lg"
            onClick={() => window.location.href = '/auth'}
            data-testid="button-login"
          >
            Sign In to Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}