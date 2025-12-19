import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { useEffect, useState, Suspense, lazy } from "react";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import AuthPage from "@/pages/auth-page";
import Feed from "@/pages/feed";
import UserProfile from "@/pages/user-profile";
import Messages from "@/pages/messages";
import CreateAd from "@/pages/create-ad";
import BusinessUpgrade from "@/pages/business-upgrade";
import BusinessDashboard from "@/pages/business-dashboard";
import AccountSetup from "@/pages/account-setup";
import Login from "@/pages/login";
import AdminDashboard from "@/pages/admin-dashboard";
import EditAd from "@/pages/edit-ad";
import EditIncident from "@/pages/edit-incident";
import IncidentDetail from "@/pages/incident-detail";
import Create from "@/pages/create";
import { TermsAndConditionsModal } from "@/components/terms-and-conditions-modal";
import { OnboardingWizard } from "@/components/onboarding-wizard";
import { ViewModeProvider } from "@/contexts/view-mode-context";

const Profile = lazy(() => import("@/pages/profile"));
const Notifications = lazy(() => import("@/pages/notifications"));
const SavedPosts = lazy(() => import("@/pages/saved-posts"));
const MyReactions = lazy(() => import("@/pages/my-reactions"));
const Privacy = lazy(() => import("@/pages/privacy"));
const Help = lazy(() => import("@/pages/help"));

const OVERLAY_ROUTES = ['/profile', '/notifications', '/saved', '/reactions', '/privacy', '/help'];

const PageLoading = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
);

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
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

  // Check if user needs to accept terms or complete onboarding
  useEffect(() => {
    if (user && user.id && !user.termsAccepted) {
      setShowTermsModal(true);
      setShowOnboarding(false);
    } else if (user && user.id && user.termsAccepted && !user.onboardingCompleted) {
      setShowTermsModal(false);
      setShowOnboarding(true);
    } else {
      setShowTermsModal(false);
      setShowOnboarding(false);
    }
  }, [user]);

  // Check if new user needs account setup
  const needsAccountSetup = user && !user.accountType;

  // Preload posts data as soon as app starts
  useEffect(() => {
    // Start fetching posts data immediately for faster loading
    queryClient.prefetchQuery({
      queryKey: ["/api/posts"],
      queryFn: async () => {
        const response = await fetch("/api/posts");
        if (response.ok) return response.json();
        return null;
      },
      staleTime: 1 * 60 * 1000, // 1 minute - posts data changes frequently
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
      <Suspense fallback={<PageLoading />}>
        <Switch>
          <Route path="/login" component={Login} />
          <Route path="/privacy" component={Privacy} />
          <Route path="/help" component={Help} />
          <Route path="/" component={AuthPage} />
          <Route component={AuthPage} />
        </Switch>
      </Suspense>
    );
  }

  // Handle authenticated users  
  // Determine which route to render (use background route if on incident route)
  const routeToRender = isIncidentRoute ? backgroundRoute : location;
  const routePath = routeToRender.split('?')[0];
  
  // Check if we're on an overlay route (profile, notifications, etc.)
  // These pages should render on top of Feed while keeping Feed mounted
  const isOverlayRoute = OVERLAY_ROUTES.includes(routePath);
  
  // Check if we're on a page that needs full unmount (create, admin, business pages, etc.)
  const isFullPageRoute = [
    '/create', '/advertise', '/create-ad', '/business-upgrade', 
    '/business-dashboard', '/account-setup', '/admin', '/login', '/messages'
  ].includes(routePath) || 
    routePath.startsWith('/edit-ad/') || 
    routePath.startsWith('/edit-incident/') || 
    routePath.startsWith('/users/') || 
    routePath.startsWith('/messages/');
  
  // Helper function to render overlay pages with Suspense
  const renderOverlayPage = () => {
    switch (routePath) {
      case '/profile': return <Suspense fallback={<PageLoading />}><Profile /></Suspense>;
      case '/notifications': return <Suspense fallback={<PageLoading />}><Notifications /></Suspense>;
      case '/saved': return <Suspense fallback={<PageLoading />}><SavedPosts /></Suspense>;
      case '/reactions': return <Suspense fallback={<PageLoading />}><MyReactions /></Suspense>;
      case '/privacy': return <Suspense fallback={<PageLoading />}><Privacy /></Suspense>;
      case '/help': return <Suspense fallback={<PageLoading />}><Help /></Suspense>;
      default: return null;
    }
  };
  
  // Helper function to render full page routes  
  const renderFullPageRoute = () => {
    if (needsAccountSetup) {
      return <AccountSetup />;
    }
    
    // Handle parameterized routes by creating a temporary Switch with the background route
    if (routePath.startsWith('/edit-ad/') || routePath.startsWith('/edit-incident/') || 
        routePath.startsWith('/users/') || routePath.startsWith('/messages/')) {
      return (
        <Switch location={routeToRender}>
          <Route path="/edit-ad/:id" component={EditAd} />
          <Route path="/edit-incident/:id" component={EditIncident} />
          <Route path="/users/:userId" component={UserProfile} />
          <Route path="/messages/:conversationId" component={Messages} />
          <Route path="/messages" component={Messages} />
        </Switch>
      );
    }
    
    switch (routePath) {
      case '/create': return <Create />;
      case '/advertise':
      case '/create-ad': return <CreateAd />;
      case '/business-upgrade': return <BusinessUpgrade />;
      case '/business-dashboard': return <BusinessDashboard />;
      case '/account-setup': return <AccountSetup />;
      case '/messages': return <Messages />;
      case '/admin': return <AdminDashboard />;
      case '/login': return <Login />;
      default: return <Feed />;
    }
  };
  
  return (
    <>
      {/* 
        ALWAYS keep Feed mounted unless we're on a full-page route.
        This prevents Leaflet map from being destroyed on navigation to overlay pages.
        Overlay pages render on top of Feed with their own layout.
      */}
      {isFullPageRoute ? (
        renderFullPageRoute()
      ) : (
        <>
          {/* Feed is always visible/mounted for feed, map, and overlay routes */}
          <div className={isOverlayRoute ? "hidden" : undefined}>
            <Feed />
          </div>
          
          {/* Overlay pages render on top when active */}
          {isOverlayRoute && renderOverlayPage()}
        </>
      )}
      
      {/* Incident Detail Modal Overlay - Render over any page when on incident route */}
      {isIncidentRoute && incidentMatch && (
        <IncidentDetail incidentId={incidentMatch[1]} />
      )}
      
      {/* Terms and Conditions Modal */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onAccept={() => setShowTermsModal(false)}
      />
      
      {/* Onboarding Wizard for new users */}
      <OnboardingWizard
        open={showOnboarding}
        onComplete={() => setShowOnboarding(false)}
      />
    </>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <ViewModeProvider>
          <Toaster />
          <Router />
        </ViewModeProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
