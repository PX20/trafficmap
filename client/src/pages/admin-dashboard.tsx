import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Clock, Building, MapPin, DollarSign, ArrowLeft, Home, Flag, MessageSquare, AlertTriangle, Eye, Archive } from "lucide-react";
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

interface ContentReport {
  id: string;
  reporterId: string;
  entityType: string;
  entityId: string;
  reason: string;
  description: string | null;
  status: string;
  moderatorId: string | null;
  moderatorNotes: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporterName: string;
  entityInfo: {
    title?: string;
    content?: string;
    userName?: string;
  } | null;
}

interface FeedbackItem {
  id: string;
  userId: string | null;
  email: string | null;
  category: string;
  subject: string;
  message: string;
  status: string;
  adminNotes: string | null;
  createdAt: string;
  userName: string;
}

export default function AdminDashboard() {
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [rejectionReason, setRejectionReason] = useState("");
  const [selectedAdId, setSelectedAdId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("ads");
  const [reportModeratorNotes, setReportModeratorNotes] = useState("");
  const [feedbackAdminNotes, setFeedbackAdminNotes] = useState("");

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

  const { data: contentReports = [] } = useQuery<ContentReport[]>({
    queryKey: ['/api/content-reports'],
    retry: false,
    enabled: isAuthenticated && (user as any)?.role === 'admin',
  });

  const { data: feedbackList = [] } = useQuery<FeedbackItem[]>({
    queryKey: ['/api/feedback'],
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

  const updateReportMutation = useMutation({
    mutationFn: async ({ reportId, status, moderatorNotes }: { reportId: string; status: string; moderatorNotes?: string }) => {
      return apiRequest("PUT", `/api/content-reports/${reportId}`, { status, moderatorNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/content-reports'] });
      setReportModeratorNotes("");
      toast({
        title: "Report Updated",
        description: "The report status has been updated.",
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
        description: "Failed to update report. Please try again.",
        variant: "destructive",
      });
    },
  });

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ feedbackId, status, adminNotes }: { feedbackId: string; status: string; adminNotes?: string }) => {
      return apiRequest("PUT", `/api/feedback/${feedbackId}`, { status, adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/feedback'] });
      setFeedbackAdminNotes("");
      toast({
        title: "Feedback Updated",
        description: "The feedback status has been updated.",
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
        description: "Failed to update feedback. Please try again.",
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
        {/* Navigation Header */}
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => window.location.href = '/'}
            className="flex items-center gap-2"
            data-testid="button-back-to-home"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Button>
          <Button 
            variant="outline" 
            onClick={() => window.location.href = '/feed'}
            className="flex items-center gap-2"
            data-testid="button-back-to-feed"
          >
            <Home className="w-4 h-4" />
            Feed
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Admin Dashboard
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage advertisements, content reports, and feedback
          </p>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-4 flex-wrap">
            <Badge variant="outline" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              {pendingAds?.length || 0} Pending Ads
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <Flag className="w-4 h-4" />
              {contentReports.filter(r => r.status === 'pending').length} Pending Reports
            </Badge>
            <Badge variant="outline" className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              {feedbackList.filter(f => f.status === 'new').length} New Feedback
            </Badge>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="ads" className="flex items-center gap-2" data-testid="tab-ads">
              <Building className="w-4 h-4" />
              Ads
            </TabsTrigger>
            <TabsTrigger value="reports" className="flex items-center gap-2" data-testid="tab-reports">
              <Flag className="w-4 h-4" />
              Reports
            </TabsTrigger>
            <TabsTrigger value="feedback" className="flex items-center gap-2" data-testid="tab-feedback">
              <MessageSquare className="w-4 h-4" />
              Feedback
            </TabsTrigger>
          </TabsList>

          <TabsContent value="ads">
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
          </TabsContent>

          <TabsContent value="reports">
            {contentReports.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No reports yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    There are no content reports to review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {contentReports.map((report) => (
                  <Card key={report.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <AlertTriangle className="w-5 h-5 text-orange-500" />
                            Report: {report.reason.replace('_', ' ').toUpperCase()}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            Reported by {report.reporterName} on {new Date(report.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={report.status === 'pending' ? 'destructive' : report.status === 'resolved' ? 'default' : 'secondary'}
                        >
                          {report.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {report.entityInfo && (
                          <div className="p-3 bg-muted rounded-lg">
                            <p className="text-sm font-medium mb-1">Reported Content:</p>
                            {report.entityInfo.title && (
                              <p className="font-semibold">{report.entityInfo.title}</p>
                            )}
                            <p className="text-sm text-muted-foreground line-clamp-3">
                              {report.entityInfo.content}
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Posted by: {report.entityInfo.userName}
                            </p>
                          </div>
                        )}
                        
                        {report.description && (
                          <div>
                            <p className="text-sm font-medium mb-1">Reporter's Note:</p>
                            <p className="text-sm text-muted-foreground">{report.description}</p>
                          </div>
                        )}

                        {report.status === 'pending' && (
                          <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'resolved' })}
                              disabled={updateReportMutation.isPending}
                              data-testid={`button-resolve-report-${report.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Resolve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'reviewed' })}
                              disabled={updateReportMutation.isPending}
                              data-testid={`button-review-report-${report.id}`}
                            >
                              <Eye className="w-4 h-4 mr-1" />
                              Mark Reviewed
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateReportMutation.mutate({ reportId: report.id, status: 'dismissed' })}
                              disabled={updateReportMutation.isPending}
                              data-testid={`button-dismiss-report-${report.id}`}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="feedback">
            {feedbackList.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <MessageSquare className="w-16 h-16 text-blue-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                    No feedback yet
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400">
                    There is no user feedback to review.
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {feedbackList.map((item) => (
                  <Card key={item.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div>
                          <CardTitle className="flex items-center gap-2 text-base">
                            <MessageSquare className="w-5 h-5 text-blue-500" />
                            {item.subject}
                          </CardTitle>
                          <CardDescription className="mt-1">
                            {item.category.charAt(0).toUpperCase() + item.category.slice(1)} from {item.userName}
                            {item.email && ` (${item.email})`} on {new Date(item.createdAt).toLocaleDateString()}
                          </CardDescription>
                        </div>
                        <Badge 
                          variant={item.status === 'new' ? 'destructive' : item.status === 'responded' ? 'default' : 'secondary'}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm whitespace-pre-wrap">{item.message}</p>
                        </div>

                        {item.adminNotes && (
                          <div>
                            <p className="text-sm font-medium mb-1">Admin Notes:</p>
                            <p className="text-sm text-muted-foreground">{item.adminNotes}</p>
                          </div>
                        )}

                        {(item.status === 'new' || item.status === 'read') && (
                          <div className="flex items-center gap-2 pt-4 border-t flex-wrap">
                            <Button
                              size="sm"
                              onClick={() => updateFeedbackMutation.mutate({ feedbackId: item.id, status: 'responded' })}
                              disabled={updateFeedbackMutation.isPending}
                              data-testid={`button-respond-feedback-${item.id}`}
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Mark Responded
                            </Button>
                            {item.status === 'new' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateFeedbackMutation.mutate({ feedbackId: item.id, status: 'read' })}
                                disabled={updateFeedbackMutation.isPending}
                                data-testid={`button-read-feedback-${item.id}`}
                              >
                                <Eye className="w-4 h-4 mr-1" />
                                Mark Read
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => updateFeedbackMutation.mutate({ feedbackId: item.id, status: 'archived' })}
                              disabled={updateFeedbackMutation.isPending}
                              data-testid={`button-archive-feedback-${item.id}`}
                            >
                              <Archive className="w-4 h-4 mr-1" />
                              Archive
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}