import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Building, MapPin, DollarSign } from "lucide-react";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AdCampaign {
  id: string;
  businessName: string;
  title: string;
  content: string;
  imageUrl: string | null;
  websiteUrl: string | null;
  address: string | null;
  suburb: string;
  cta: string;
  targetSuburbs: string[];
  dailyBudget: string | null;
  totalBudget: string | null;
  status: string;
  rejectionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);

  // Only run access checks when component actually mounts (user is on /admin page)
  useEffect(() => {
    if (authLoading) return; // Wait for auth to load
    
    if (!isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
    
    if (user && (user as any).role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page.",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/";
      }, 1000);
      return;
    }
  }, []); // Only run once on mount - this component should only mount when user visits /admin

  const { data: pendingAds, isLoading, error } = useQuery<AdCampaign[]>({
    queryKey: ['/api/admin/ads/pending'],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const approveMutation = useMutation({
    mutationFn: async (adId: string) => {
      return apiRequest("PUT", `/api/admin/ads/${adId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads/pending'] });
      toast({
        title: "Ad Approved",
        description: "The advertisement has been approved and is now live.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve advertisement. Please try again.",
        variant: "destructive",
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async ({ adId, reason }: { adId: string; reason: string }) => {
      return apiRequest("PUT", `/api/admin/ads/${adId}/reject`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/ads/pending'] });
      setRejectionReason("");
      setSelectedAdId(null);
      toast({
        title: "Ad Rejected",
        description: "The advertisement has been rejected.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reject advertisement. Please try again.",
        variant: "destructive",
      });
    },
  });

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!isAuthenticated || (user as any)?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Access Denied</h1>
          <p className="text-gray-600 dark:text-gray-400">Admin privileges required</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error Loading Admin Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">Please try refreshing the page</p>
        </div>
      </div>
    );
  }

  const handleApprove = (adId: string) => {
    approveMutation.mutate(adId);
  };

  const handleReject = (adId: string, reason: string) => {
    if (!reason.trim()) {
      toast({
        title: "Rejection Reason Required",
        description: "Please provide a reason for rejecting this ad.",
        variant: "destructive",
      });
      return;
    }
    rejectMutation.mutate({ adId, reason });
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Review and approve pending advertisements
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {pendingAds?.length || 0} Pending Ads
            </Badge>
          </div>
        </div>

        {!pendingAds || pendingAds.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                All caught up!
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                There are no pending advertisements to review.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {pendingAds.map((ad: AdCampaign) => (
              <Card key={ad.id} className="overflow-hidden">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        {ad.businessName}
                      </CardTitle>
                      <CardDescription className="text-lg font-medium mt-1">
                        {ad.title}
                      </CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {new Date(ad.createdAt).toLocaleDateString()}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    {/* Ad Preview */}
                    <div>
                      <h4 className="font-semibold mb-3">Ad Preview</h4>
                      <div className="border rounded-lg p-4 bg-white dark:bg-gray-800">
                        {ad.imageUrl && (
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className="w-full h-48 object-cover rounded-lg mb-4"
                          />
                        )}
                        <h5 className="font-bold text-lg mb-2">{ad.title}</h5>
                        <p className="text-gray-600 dark:text-gray-400 mb-3">
                          {ad.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-500">by {ad.businessName}</span>
                          <Button size="sm" variant="outline">
                            {ad.cta}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Ad Details */}
                    <div>
                      <h4 className="font-semibold mb-3">Ad Details</h4>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-gray-500" />
                          <span className="text-sm">
                            {ad.address ? `${ad.address}, ` : ""}{ad.suburb}
                          </span>
                        </div>
                        
                        {ad.websiteUrl && (
                          <div className="text-sm">
                            <strong>Website:</strong>{" "}
                            <a 
                              href={ad.websiteUrl} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-blue-600 hover:underline"
                            >
                              {ad.websiteUrl}
                            </a>
                          </div>
                        )}

                        {ad.targetSuburbs && ad.targetSuburbs.length > 0 && (
                          <div className="text-sm">
                            <strong>Target Areas:</strong>{" "}
                            {ad.targetSuburbs.join(", ")}
                          </div>
                        )}

                        <div className="flex items-center gap-4 text-sm">
                          {ad.dailyBudget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>Daily: ${ad.dailyBudget}</span>
                            </div>
                          )}
                          {ad.totalBudget && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4" />
                              <span>Total: ${ad.totalBudget}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mt-6">
                        <Button
                          onClick={() => handleApprove(ad.id)}
                          disabled={approveMutation.isPending}
                          className="flex items-center gap-2"
                          data-testid={`button-approve-${ad.id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                          {approveMutation.isPending ? "Approving..." : "Approve"}
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              variant="destructive"
                              className="flex items-center gap-2"
                              onClick={() => setSelectedAdId(ad.id)}
                              data-testid={`button-reject-${ad.id}`}
                            >
                              <XCircle className="w-4 h-4" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject Advertisement</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                Please provide a reason for rejecting this advertisement:
                              </p>
                              <Textarea
                                placeholder="Reason for rejection..."
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                data-testid="textarea-rejection-reason"
                              />
                              <div className="flex gap-3">
                                <Button
                                  onClick={() => handleReject(ad.id, rejectionReason)}
                                  disabled={rejectMutation.isPending}
                                  variant="destructive"
                                  data-testid="button-confirm-reject"
                                >
                                  {rejectMutation.isPending ? "Rejecting..." : "Confirm Rejection"}
                                </Button>
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setRejectionReason("");
                                    setSelectedAdId(null);
                                  }}
                                >
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}