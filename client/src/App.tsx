import { Switch, Route } from "wouter";
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
import { TermsAndConditionsModal } from "@/components/terms-and-conditions-modal";

function Router() {
  const { user, isLoading } = useAuth();
  const isAuthenticated = !!user;
  const [showTermsModal, setShowTermsModal] = useState(false);

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
  return (
    <>
      <Switch>
        {/* Redirect new users to account setup */}
        {needsAccountSetup ? (
          <>
            <Route path="/account-setup" component={AccountSetup} />
            <Route component={AccountSetup} />
          </>
        ) : (
          <>
            <Route path="/" component={Feed} />
            <Route path="/map" component={Home} />
            <Route path="/feed" component={Feed} />
            <Route path="/advertise" component={CreateAd} />
            <Route path="/create-ad" component={CreateAd} />
            <Route path="/edit-ad/:id" component={EditAd} />
            <Route path="/edit-incident/:id" component={EditIncident} />
            <Route path="/business-upgrade" component={BusinessUpgrade} />
            <Route path="/business-dashboard" component={BusinessDashboard} />
            <Route path="/account-setup" component={AccountSetup} />
            <Route path="/profile" component={Profile} />
            <Route path="/users/:userId" component={UserProfile} />
            <Route path="/messages" component={Messages} />
            <Route path="/messages/:conversationId" component={Messages} />
            <Route path="/notifications" component={Notifications} />
            <Route path="/admin" component={AdminDashboard} />
            <Route path="/login" component={Login} />
            {/* <Route component={NotFound} /> */}
          </>
        )}
      </Switch>
      
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
