import { useState, useEffect, useMemo } from 'react';
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Store, Coffee, Wrench, Heart, Users, CheckCircle2, AlertCircle } from "lucide-react";
import { useLocation, useParams } from "wouter";

const AD_TEMPLATES = {
  'gift-supplies': {
    icon: Store,
    name: 'Gift & Supplies Store',
    description: 'Perfect for gift shops, stationery stores, party supplies, crafts',
    sampleCtas: ['Shop Now', 'Browse Gifts', 'Visit Store', 'See Collection'],
  },
  'food-cafe': {
    icon: Coffee,
    name: 'Café & Food',
    description: 'Coffee shops, restaurants, bakeries, food trucks',
    sampleCtas: ['Order Now', 'View Menu', 'Book Table', 'Try Today'],
  },
  'professional': {
    icon: Wrench,
    name: 'Professional Service',
    description: 'Dentists, mechanics, lawyers, consultants, home services',
    sampleCtas: ['Book Now', 'Get Quote', 'Call Today', 'Schedule'],
  },
  'health-beauty': {
    icon: Heart,
    name: 'Health & Beauty',
    description: 'Salons, spas, fitness, wellness, beauty supplies',
    sampleCtas: ['Book Now', 'Learn More', 'Visit Us', 'Get Started'],
  },
  'retail': {
    icon: Store,
    name: 'General Retail',
    description: 'Clothing stores, electronics, home goods, bookstores',
    sampleCtas: ['Shop Now', 'Browse Deals', 'Visit Store', 'See Offers'],
  },
  'community': {
    icon: Users,
    name: 'Community Service',
    description: 'Community groups, nonprofits, educational services',
    sampleCtas: ['Learn More', 'Join Us', 'Get Involved', 'Find Out How'],
  }
};

const QLD_SUBURBS = [
  'Brisbane', 'Gold Coast', 'Sunshine Coast', 'Toowoomba', 'Cairns', 'Townsville', 
  'Ipswich', 'Logan', 'Geelong', 'Ballarat', 'Mackay', 'Rockhampton',
  'Bundaberg', 'Hervey Bay', 'Gladstone', 'Mount Isa', 'Maryborough', 'Gympie',
  'Kingaroy', 'Charleville', 'Roma', 'Dalby', 'Chinchilla', 'Warwick',
  'Stanthorpe', 'Goondiwindi', 'Emerald', 'Longreach', 'Winton', 'Blackall'
];

export default function EditAd() {
  const { user, isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const params = useParams();
  const adId = params.id;

  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof AD_TEMPLATES>('gift-supplies');
  const [previewMode, setPreviewMode] = useState(false);
  const [formData, setFormData] = useState({
    businessName: '',
    title: '',
    content: '',
    websiteUrl: '',
    address: '',
    suburb: '',
    cta: '',
    targetSuburbs: [] as string[],
    dailyBudget: '50.00',
    totalBudget: '1000.00',
    logoUrl: '',
    backgroundUrl: ''
  });

  // Fetch existing ad data
  const { data: existingAd, isLoading: adLoading, error: adError } = useQuery({
    queryKey: [`/api/ads/${adId}`],
    enabled: !!adId && isAuthenticated,
  });

  // Pre-fill form with existing ad data
  useEffect(() => {
    if (existingAd) {
      setFormData({
        businessName: existingAd.businessName || '',
        title: existingAd.title || '',
        content: existingAd.content || '',
        websiteUrl: existingAd.websiteUrl || '',
        address: existingAd.address || '',
        suburb: existingAd.suburb || '',
        cta: existingAd.cta || 'Learn More',
        targetSuburbs: existingAd.targetSuburbs || [],
        dailyBudget: existingAd.dailyBudget || '50.00',
        totalBudget: existingAd.totalBudget || '1000.00',
        logoUrl: existingAd.imageUrl || '',
        backgroundUrl: existingAd.backgroundUrl || ''
      });
    }
  }, [existingAd]);

  const template = AD_TEMPLATES[selectedTemplate];

  const updateAdMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!formData.businessName.trim()) {
        throw new Error('Business name is required');
      }
      if (!formData.title.trim()) {
        throw new Error('Headline is required');
      }
      if (!formData.content.trim()) {
        throw new Error('Description is required');
      }
      if (!formData.suburb.trim()) {
        throw new Error('Suburb is required');
      }
      if (!formData.cta.trim()) {
        throw new Error('Call-to-action button text is required');
      }

      const adData = {
        ...formData,
        status: 'pending', // Reset to pending for re-approval
        template: selectedTemplate
      };
      
      console.log('Updating ad data:', adData);
      return apiRequest('PUT', `/api/ads/${adId}`, adData);
    },
    onSuccess: () => {
      toast({
        title: "Ad Updated & Resubmitted!",
        description: "Your updated ad will be reviewed for approval again.",
      });
      
      // Redirect to business dashboard after showing success message
      setTimeout(() => {
        setLocation('/business-dashboard');
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Update Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const AdPreview = () => (
    <Card className="mb-4 border-l-4 border-l-blue-500 bg-gradient-to-r from-blue-50 to-white overflow-hidden">
      {/* Background Image */}
      {formData.backgroundUrl && (
        <div 
          className="h-32 bg-cover bg-center relative"
          style={{ backgroundImage: `url(${formData.backgroundUrl})` }}
        >
          <div className="absolute inset-0 bg-black bg-opacity-20"></div>
        </div>
      )}
      
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <Badge variant="outline" className="bg-blue-100 text-blue-800 border-blue-300">
            <span className="text-xs font-medium">Sponsored</span>
          </Badge>
          <div className="flex items-center text-sm text-gray-600">
            <template.icon className="w-3 h-3 mr-1" />
            {formData.suburb || 'Your Suburb'}
          </div>
        </div>

        <div className="space-y-3">
          {/* Business Name with Logo */}
          <div className="flex items-center gap-3">
            {formData.logoUrl && (
              <img 
                src={formData.logoUrl} 
                alt="Business Logo" 
                className="w-8 h-8 rounded object-cover"
              />
            )}
            <h3 className="font-semibold text-gray-900">
              {formData.businessName || 'Your Business Name'}
            </h3>
          </div>
          
          <h4 className="font-medium text-gray-800">
            {formData.title || 'Your Headline Here'}
          </h4>
          
          <p className="text-gray-700 text-sm leading-relaxed">
            {formData.content || 'Your compelling business description will appear here...'}
          </p>
          
          <div className="flex items-center justify-between pt-2">
            <div className="text-xs text-gray-600">
              {formData.address || 'Your Address'}
            </div>
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              {formData.cta || 'Learn More'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-gray-600 mb-6">Please log in to edit your ad.</p>
      </div>
    );
  }

  if (user?.accountType !== 'business') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Business Account Required</h1>
        <p className="text-gray-600 mb-6">This feature is only available for business accounts.</p>
      </div>
    );
  }

  if (adLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <div className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full mx-auto mb-4"></div>
        <p className="text-gray-600">Loading ad data...</p>
      </div>
    );
  }

  if (adError || !existingAd) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-4">Ad Not Found</h1>
        <p className="text-gray-600 mb-6">The ad you're trying to edit doesn't exist or you don't have permission to edit it.</p>
        <Button onClick={() => setLocation('/business-dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
      </div>
    );
  }

  if (previewMode) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setPreviewMode(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Preview Your Updated Ad</h1>
            <p className="text-gray-600">See how your ad will appear to users</p>
          </div>
        </div>

        {/* Show rejection reason reminder */}
        {existingAd.rejectionReason && (
          <Card className="mb-6 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-orange-800 mb-1">Previous Rejection Reason</h3>
                  <p className="text-sm text-orange-700">{existingAd.rejectionReason}</p>
                  <p className="text-xs text-orange-600 mt-2">Please ensure you've addressed this feedback before resubmitting.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <AdPreview />

        <div className="flex gap-4 mt-6">
          <Button 
            onClick={() => updateAdMutation.mutate()}
            disabled={updateAdMutation.isPending}
            className="flex-1"
            data-testid="button-submit-updated-ad"
          >
            {updateAdMutation.isPending ? 'Updating...' : 'Update & Resubmit for Review'}
          </Button>
          <Button variant="outline" onClick={() => setPreviewMode(false)}>
            Edit More
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-8">
        <Button variant="ghost" onClick={() => setLocation('/business-dashboard')}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Button>
        <div>
          <h1 className="text-3xl font-bold">Edit Your Ad</h1>
          <p className="text-gray-600">Update your ad and resubmit for approval</p>
        </div>
      </div>

      {/* Show rejection reason */}
      {existingAd.rejectionReason && (
        <Card className="mb-6 border-red-200 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <h3 className="font-medium text-red-800 mb-1">Rejection Reason</h3>
                <p className="text-sm text-red-700">{existingAd.rejectionReason}</p>
                <p className="text-xs text-red-600 mt-2">Please address this feedback in your updated ad.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Business Information */}
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Basic details about your business</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  value={formData.businessName}
                  onChange={(e) => setFormData({...formData, businessName: e.target.value})}
                  placeholder="Your Business Name"
                  data-testid="input-business-name"
                />
              </div>

              <div>
                <Label htmlFor="address">Business Address</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  placeholder="123 Main St, City"
                  data-testid="input-address"
                />
              </div>

              <div>
                <Label htmlFor="websiteUrl">Website URL</Label>
                <Input
                  id="websiteUrl"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData({...formData, websiteUrl: e.target.value})}
                  placeholder="https://yourwebsite.com"
                  data-testid="input-website"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ad Content */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Content</CardTitle>
              <CardDescription>Create compelling ad copy</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Headline *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  placeholder="Catchy headline for your ad"
                  data-testid="input-title"
                />
              </div>

              <div>
                <Label htmlFor="content">Description *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData({...formData, content: e.target.value})}
                  placeholder="Describe what makes your business special..."
                  rows={4}
                  data-testid="textarea-content"
                />
              </div>

              <div>
                <Label htmlFor="cta">Call-to-Action Button Text *</Label>
                <Select value={formData.cta} onValueChange={(value) => setFormData({...formData, cta: value})}>
                  <SelectTrigger data-testid="select-cta">
                    <SelectValue placeholder="Choose button text" />
                  </SelectTrigger>
                  <SelectContent>
                    {template.sampleCtas.map((cta) => (
                      <SelectItem key={cta} value={cta}>{cta}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Targeting */}
          <Card>
            <CardHeader>
              <CardTitle>Targeting</CardTitle>
              <CardDescription>Choose where your ad will be shown</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="suburb">Primary Suburb *</Label>
                <Select value={formData.suburb} onValueChange={(value) => setFormData({...formData, suburb: value})}>
                  <SelectTrigger data-testid="select-suburb">
                    <SelectValue placeholder="Choose your primary suburb" />
                  </SelectTrigger>
                  <SelectContent>
                    {QLD_SUBURBS.map((suburb) => (
                      <SelectItem key={suburb} value={suburb}>{suburb}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="dailyBudget">Daily Budget</Label>
                <Select value={formData.dailyBudget} onValueChange={(value) => setFormData({...formData, dailyBudget: value})}>
                  <SelectTrigger data-testid="select-budget">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="25.00">$25/day</SelectItem>
                    <SelectItem value="50.00">$50/day</SelectItem>
                    <SelectItem value="100.00">$100/day</SelectItem>
                    <SelectItem value="200.00">$200/day</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right Column - Preview */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Preview</CardTitle>
              <CardDescription>See how your updated ad will look</CardDescription>
            </CardHeader>
            <CardContent>
              <AdPreview />
              
              <Button 
                onClick={() => setPreviewMode(true)}
                className="w-full"
                data-testid="button-preview-and-submit"
              >
                Preview & Update Ad
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}