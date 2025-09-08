import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import Feed from "@/pages/feed";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Messages from "@/pages/messages";
import Notifications from "@/pages/notifications";

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;

  // Preload incident data as soon as app starts
  useEffect(() => {
    // Start fetching data immediately for faster loading
    queryClient.prefetchQuery({
      queryKey: ["/api/incidents"],
      queryFn: async () => {
        const response = await fetch("/api/incidents");
        if (response.ok) return response.json();
        return null;
      },
      staleTime: 2 * 60 * 1000, // 2 minutes - consider data fresh for this long
    });
    
    queryClient.prefetchQuery({
      queryKey: ["/api/traffic/events"],
      queryFn: async () => {
        const response = await fetch("/api/traffic/events");
        if (response.ok) return response.json();
        return null;
      },
      staleTime: 1 * 60 * 1000, // 1 minute - traffic data changes more frequently
    });
  }, []);

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={AuthPage} />
          {/* Redirect all other routes to auth page for unauthenticated users */}
          <Route component={AuthPage} />
        </>
      ) : (
        <>
          <Route path="/" component={Feed} />
          <Route path="/map" component={Home} />
          <Route path="/feed" component={Feed} />
          <Route path="/profile" component={Profile} />
          <Route path="/users/:userId" component={UserProfile} />
          <Route path="/messages" component={Messages} />
          <Route path="/messages/:conversationId" component={Messages} />
          <Route path="/notifications" component={Notifications} />
          <Route component={NotFound} />
        </>
      )}
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
