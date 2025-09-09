import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, Eye, MousePointer, TrendingUp, DollarSign, Calendar, Settings, PauseCircle, PlayCircle } from "lucide-react";

interface AdCampaign {
  id: string;
  businessName: string;
  title: string;
  content: string;
  status: 'active' | 'paused' | 'pending' | 'rejected';
  dailyBudget: string;
  totalBudget: string;
  suburb: string;
  targetSuburbs: string[];
  imageUrl?: string;
  websiteUrl?: string;
  createdAt: string;
}

interface CampaignAnalytics {
  campaignId: string;
  views: number;
  clicks: number;
  spend: number;
  ctr: number; // Click-through rate
  cpm: number; // Cost per mille
}

export default function BusinessDashboard() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  // Fetch user's ad campaigns
  const { data: campaigns = [], isLoading: campaignsLoading } = useQuery<AdCampaign[]>({
    queryKey: ['/api/ads/my-campaigns'],
    enabled: isAuthenticated && user?.accountType === 'business',
  });

  // Fetch campaign analytics
  const { data: analytics = [], isLoading: analyticsLoading } = useQuery<CampaignAnalytics[]>({
    queryKey: ['/api/ads/analytics'],
    enabled: isAuthenticated && user?.accountType === 'business',
  });

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-gray-600 mb-6">Please log in to access your business dashboard.</p>
        <Link href="/auth">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  if (user?.accountType !== 'business') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Business Account Required</h1>
        <p className="text-gray-600 mb-6">This dashboard is only available for business accounts.</p>
        <Link href="/business-upgrade">
          <Button>Upgrade to Business Account</Button>
        </Link>
      </div>
    );
  }

  // Calculate totals from analytics
  const totalViews = analytics.reduce((sum: number, item: CampaignAnalytics) => sum + item.views, 0);
  const totalClicks = analytics.reduce((sum: number, item: CampaignAnalytics) => sum + item.clicks, 0);
  const totalSpend = analytics.reduce((sum: number, item: CampaignAnalytics) => sum + item.spend, 0);
  const averageCTR = analytics.length > 0 ? analytics.reduce((sum: number, item: CampaignAnalytics) => sum + item.ctr, 0) / analytics.length : 0;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-blue-100 text-blue-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCampaignAnalytics = (campaignId: string) => {
    return analytics.find((item: CampaignAnalytics) => item.campaignId === campaignId);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" data-testid="button-back">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Feed
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Business Dashboard</h1>
            <p className="text-gray-600">
              Welcome back, {user.businessName || user.firstName}
            </p>
          </div>
        </div>
        <Link href="/create-ad">
          <Button data-testid="button-create-new-ad">
            <Plus className="w-4 h-4 mr-2" />
            Create New Ad
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Eye className="w-4 h-4 text-blue-600" />
                  Total Views
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViews.toLocaleString()}</div>
                <p className="text-xs text-gray-600">All campaigns</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <MousePointer className="w-4 h-4 text-green-600" />
                  Total Clicks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalClicks.toLocaleString()}</div>
                <p className="text-xs text-gray-600">All campaigns</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Click Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{averageCTR.toFixed(2)}%</div>
                <p className="text-xs text-gray-600">Average CTR</p>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-orange-600" />
                  Total Spend
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">${totalSpend.toFixed(2)}</div>
                <p className="text-xs text-gray-600">All campaigns</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Campaigns */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Campaigns</CardTitle>
              <CardDescription>Your latest advertising campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading campaigns...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No campaigns yet</p>
                  <Link href="/create-ad">
                    <Button>Create Your First Ad</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {campaigns.slice(0, 3).map((campaign: AdCampaign) => {
                    const campaignAnalytics = getCampaignAnalytics(campaign.id);
                    return (
                      <div key={campaign.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold">{campaign.title}</h3>
                            <Badge className={getStatusColor(campaign.status)}>
                              {campaign.status}
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{campaign.content}</p>
                          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Budget: ${campaign.dailyBudget}/day</span>
                            <span>Target: {campaign.suburb}</span>
                            {campaignAnalytics && (
                              <>
                                <span>Views: {campaignAnalytics.views}</span>
                                <span>Clicks: {campaignAnalytics.clicks}</span>
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            <Settings className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>All Campaigns</CardTitle>
              <CardDescription>Manage your advertising campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              {campaignsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
                  <p className="text-gray-600">Loading campaigns...</p>
                </div>
              ) : campaigns.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">No campaigns yet</p>
                  <Link href="/create-ad">
                    <Button>Create Your First Ad</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {campaigns.map((campaign: AdCampaign) => {
                    const campaignAnalytics = getCampaignAnalytics(campaign.id);
                    return (
                      <div key={campaign.id} className="border rounded-lg p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h3 className="text-lg font-semibold">{campaign.title}</h3>
                              <Badge className={getStatusColor(campaign.status)}>
                                {campaign.status}
                              </Badge>
                            </div>
                            <p className="text-gray-600 mb-3">{campaign.content}</p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500">Daily Budget:</span>
                                <div className="font-semibold">${campaign.dailyBudget}</div>
                              </div>
                              <div>
                                <span className="text-gray-500">Target Area:</span>
                                <div className="font-semibold">{campaign.suburb}</div>
                              </div>
                              {campaignAnalytics && (
                                <>
                                  <div>
                                    <span className="text-gray-500">Views:</span>
                                    <div className="font-semibold">{campaignAnalytics.views}</div>
                                  </div>
                                  <div>
                                    <span className="text-gray-500">Clicks:</span>
                                    <div className="font-semibold">{campaignAnalytics.clicks}</div>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2 ml-4">
                            {campaign.status === 'active' ? (
                              <Button variant="outline" size="sm" data-testid={`button-pause-${campaign.id}`}>
                                <PauseCircle className="w-4 h-4 mr-1" />
                                Pause
                              </Button>
                            ) : campaign.status === 'paused' ? (
                              <Button variant="outline" size="sm" data-testid={`button-resume-${campaign.id}`}>
                                <PlayCircle className="w-4 h-4 mr-1" />
                                Resume
                              </Button>
                            ) : null}
                            <Button variant="outline" size="sm" data-testid={`button-edit-${campaign.id}`}>
                              <Settings className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Analytics</CardTitle>
              <CardDescription>Detailed performance metrics for your campaigns</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">Detailed analytics coming soon...</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Settings</CardTitle>
              <CardDescription>Manage your business account settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Business Information</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Business Name:</span>
                    <div className="font-semibold">{user.businessName || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Category:</span>
                    <div className="font-semibold">{user.businessCategory || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Website:</span>
                    <div className="font-semibold">{user.businessWebsite || 'Not set'}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Phone:</span>
                    <div className="font-semibold">{user.businessPhone || 'Not set'}</div>
                  </div>
                </div>
              </div>
              <Button variant="outline" data-testid="button-edit-business-info">
                Edit Business Information
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}