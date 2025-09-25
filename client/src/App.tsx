import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import Feed from "@/pages/feed";
import Profile from "@/pages/profile";
import UserProfile from "@/pages/user-profile";
import Messages from "@/pages/messages";
import Notifications from "@/pages/notifications";
import CreateAd from "@/pages/create-ad";
import BusinessUpgrade from "@/pages/business-upgrade";
import BusinessDashboard from "@/pages/business-dashboard";
import AccountSetup from "@/pages/account-setup";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import EditAd from "@/pages/edit-ad";
import EditIncident from "@/pages/edit-incident";
import IncidentDetail from "@/pages/incident-detail";
import { TermsAndConditionsModal } from "@/components/terms-and-conditions-modal";

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [location] = useLocation();
  
  // Track the background route to maintain when showing incident modal
  const [backgroundRoute, setBackgroundRoute] = useState<string>('/');
  
  // Check if current route is an incident detail route
  const incidentMatch = location.match(/^\/incident\/(.+)$/);
  const isIncidentRoute = !!incidentMatch;
  
  // Update background route when not on incident route
  useEffect(() => {
    if (!isIncidentRoute && location !== backgroundRoute) {
      setBackgroundRoute(location);
    }
  }, [location, isIncidentRoute, backgroundRoute]);

  // Check if user needs to accept terms or complete account setup
  useEffect(() => {
    if (user && user.id && !user.termsAccepted) {
      setShowTermsModal(true);
    } else {
      setShowTermsModal(false);
    }
  }, [user]);

  // Check if new user needs account setup
  const needsAccountSetup = user && !user.accountType;

  // Preload unified incident data as soon as app starts
  useEffect(() => {
    // Start fetching unified data immediately for faster loading
    queryClient.prefetchQuery({
      queryKey: ["/api/unified"],
      queryFn: async () => {
        const response = await fetch("/api/unified");
        if (response.ok) return response.json();
        return null;
      },
      staleTime: 1 * 60 * 1000, // 1 minute - unified data changes frequently
    });
  }, []);

  // Show loading state while authentication is being determined
  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Handle unauthenticated users first
  if (!isAuthenticated) {
    return (
      <Switch>
        <Route path="/login" component={Login} />
        <Route path="/" component={AuthPage} />
        <Route component={AuthPage} />
      </Switch>
    );
  }

  // Handle authenticated users  
  // Determine which route to render (use background route if on incident route)
  const routeToRender = isIncidentRoute ? backgroundRoute : location;
  
  // Helper function to render route components properly  
  const renderRouteComponent = (route: string) => {
    if (needsAccountSetup) {
      return <AccountSetup />;
    }
    
    // Handle parameterized routes by creating a temporary Switch with the background route
    if (route.startsWith('/edit-ad/') || route.startsWith('/edit-incident/') || 
        route.startsWith('/users/') || route.startsWith('/messages/')) {
      return (
        <Switch location={route}>
          <Route path="/edit-ad/:id" component={EditAd} />
          <Route path="/edit-incident/:id" component={EditIncident} />
          <Route path="/users/:userId" component={UserProfile} />
          <Route path="/messages/:conversationId" component={Messages} />
          <Route path="/messages" component={Messages} />
        </Switch>
      );
    }
    
    // Handle simple routes
    switch (route) {
      case '/map': return <Home />;
      case '/feed': return <Feed />;
      case '/advertise':
      case '/create-ad': return <CreateAd />;
      case '/business-upgrade': return <BusinessUpgrade />;
      case '/business-dashboard': return <BusinessDashboard />;
      case '/account-setup': return <AccountSetup />;
      case '/profile': return <Profile />;
      case '/messages': return <Messages />;
      case '/notifications': return <Notifications />;
      case '/admin': return <AdminDashboard />;
      case '/login': return <Login />;
      default: return <Feed />; // Default to Feed
    }
  };
  
  return (
    <>
      {/* Render background route (or current route if not on incident) */}
      {renderRouteComponent(routeToRender)}
      
      {/* Incident Detail Modal Overlay - Render over any page when on incident route */}
      {isIncidentRoute && incidentMatch && (
        <IncidentDetail incidentId={incidentMatch[1]} />
      )}
      
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onAccept={() => setShowTermsModal(false)}
      />
    </>
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
