import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Store, Coffee, Utensils, Wrench, Heart, Palette, Eye, Upload, Image } from 'lucide-react';
import { Link } from 'wouter';
import { ObjectUploader } from '@/components/ObjectUploader';
import { LocationAutocomplete } from '@/components/location-autocomplete';

// Template definitions for different business types
const AD_TEMPLATES = {
  'gift-supplies': {
    icon: Store,
    name: 'Gift & Supplies Store',
    description: 'Perfect for gift shops, stationery stores, party supplies, crafts',
    sampleHeadlines: [
      'Unique Gifts for Every Occasion',
      'Local Handmade Treasures',
      'Party Supplies & More'
    ],
    sampleContent: [
      'Discover locally-sourced gifts, handmade crafts, and unique finds that you won\'t find anywhere else.',
      'From birthday parties to weddings - we have all the supplies you need to make your event special.',
      'Supporting local artisans with a curated selection of one-of-a-kind gifts and supplies.'
    ],
    sampleCtas: ['Shop Now', 'Browse Gifts', 'Visit Store', 'See Collection'],
    tips: 'Highlight what makes your products unique - local, handmade, hard-to-find items work well!'
  },
  'food-cafe': {
    icon: Coffee,
    name: 'Café & Food',
    description: 'Coffee shops, restaurants, bakeries, food trucks',
    sampleHeadlines: [
      'Fresh Coffee Daily',
      'Made-to-Order Delights',
      'Local Ingredients, Big Flavors'
    ],
    sampleContent: [
      'Start your day right with our freshly roasted coffee and homemade pastries made with local ingredients.',
      'Authentic flavors, generous portions, and friendly service in the heart of your neighborhood.',
      'From quick coffee to family dinners - we\'re your local gathering place for great food.'
    ],
    sampleCtas: ['Order Now', 'View Menu', 'Book Table', 'Try Today'],
    tips: 'Focus on freshness, local ingredients, and the experience customers will have!'
  },
  'professional': {
    icon: Wrench,
    name: 'Professional Service',
    description: 'Dentists, mechanics, lawyers, consultants, home services',
    sampleHeadlines: [
      'Expert Service You Can Trust',
      'Professional Results, Local Care',
      'Same-Day Service Available'
    ],
    sampleContent: [
      'Over 15 years serving the local community with honest pricing and expert craftsmanship.',
      'Professional service with a personal touch - we treat your family like our own.',
      'Licensed, insured, and committed to getting the job done right the first time.'
    ],
    sampleCtas: ['Book Now', 'Get Quote', 'Call Today', 'Schedule'],
    tips: 'Emphasize trust, experience, and reliability. Mention credentials and guarantees!'
  },
  'health-beauty': {
    icon: Heart,
    name: 'Health & Beauty',
    description: 'Salons, spas, fitness, wellness, beauty supplies',
    sampleHeadlines: [
      'Look & Feel Your Best',
      'Relaxation & Renewal',
      'Your Wellness Journey Starts Here'
    ],
    sampleContent: [
      'Treat yourself to a rejuvenating experience with our skilled professionals and premium products.',
      'From everyday maintenance to special occasion glamour - we help you look and feel amazing.',
      'Your health and happiness are our priority. Experience the difference personalized care makes.'
    ],
    sampleCtas: ['Book Appointment', 'Try Today', 'Learn More', 'Get Started'],
    tips: 'Focus on the transformation and how customers will feel after your service!'
  }
};

const BUDGET_OPTIONS = [
  { label: '$25/day', value: '25.00', desc: 'Great for local testing' },
  { label: '$50/day', value: '50.00', desc: 'Recommended starter' },
  { label: '$75/day', value: '75.00', desc: 'High visibility' },
  { label: '$100/day', value: '100.00', desc: 'Maximum reach' }
];

export default function CreateAd() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [selectedTemplate, setSelectedTemplate] = useState<keyof typeof AD_TEMPLATES>('gift-supplies');
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

  // Map business categories to ad templates
  const getTemplateFromCategory = (category: string): keyof typeof AD_TEMPLATES => {
    const categoryMapping: Record<string, keyof typeof AD_TEMPLATES> = {
      'Restaurant & Food': 'food-cafe',
      'Food & Beverage': 'food-cafe',
      'Cafe': 'food-cafe',
      'Restaurant': 'food-cafe',
      'Gift & Supplies': 'gift-supplies',
      'Retail': 'gift-supplies',
      'Gift Shop': 'gift-supplies',
      'Health & Beauty': 'health-beauty',
      'Beauty': 'health-beauty',
      'Fitness': 'health-beauty',
      'Wellness': 'health-beauty',
      'Professional Service': 'professional',
      'Legal': 'professional',
      'Automotive': 'professional',
      'Home Services': 'professional'
    };
    
    return categoryMapping[category] || 'gift-supplies';
  };

  // Auto-populate business information from user account
  useEffect(() => {
    if (user && user.accountType === 'business') {
      // Auto-select template based on business category
      if (user.businessCategory) {
        const template = getTemplateFromCategory(user.businessCategory);
        setSelectedTemplate(template);
      }
      
      setFormData(prev => ({
        ...prev,
        businessName: user.businessName || '',
        websiteUrl: user.businessWebsite || '',
        address: user.businessAddress || '',
        suburb: user.homeSuburb || '', // Use home suburb as default
      }));
    }
  }, [user]);

  const [previewMode, setPreviewMode] = useState(false);

  const template = AD_TEMPLATES[selectedTemplate];

  // Image upload helpers
  const handleLogoUpload = async () => {
    try {
      console.log('Requesting logo upload URL...');
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('Parsed logo upload response:', data);
      
      if (!data.uploadURL) {
        throw new Error('No upload URL received');
      }
      
      return {
        method: 'PUT' as const,
        url: data.uploadURL
      };
    } catch (error) {
      console.error('Logo upload error:', error);
      toast({
        title: "Upload Error",
        description: "Failed to get upload URL for logo. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const handleBackgroundUpload = async () => {
    try {
      console.log('Requesting background upload URL...');
      const response = await fetch('/api/objects/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include'
      });
      
      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const responseText = await response.text();
      console.log('Raw response text:', responseText);
      
      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }
      
      console.log('Parsed background upload response:', data);
      
      if (!data.uploadURL) {
        throw new Error('No upload URL received');
      }
      
      return {
        method: 'PUT' as const,
        url: data.uploadURL
      };
    } catch (error) {
      console.error('Background upload error:', error);
      toast({
        title: "Upload Error", 
        description: "Failed to get upload URL for background. Please try again.",
        variant: "destructive",
      });
      throw error;
    }
  };

  const onLogoComplete = async (result: any) => {
    if (result.successful && result.successful[0]) {
      const uploadedUrl = result.successful[0].uploadURL;
      console.log('Logo upload completed, URL:', uploadedUrl);
      
      try {
        // Process the uploaded image and get a proper viewing URL
        const response = await fetch('/api/objects/process-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            uploadURL: uploadedUrl,
            type: 'logo'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, logoUrl: data.viewURL }));
          toast({
            title: "Logo uploaded successfully!",
            description: "Your business logo is now ready for your ad.",
          });
        } else {
          throw new Error('Failed to process upload');
        }
      } catch (error) {
        console.error('Error processing logo upload:', error);
        // Fallback: just use the upload URL for now
        setFormData(prev => ({ ...prev, logoUrl: uploadedUrl }));
        toast({
          title: "Logo uploaded!",
          description: "Upload completed, processing...",
        });
      }
    }
  };

  const onBackgroundComplete = async (result: any) => {
    if (result.successful && result.successful[0]) {
      const uploadedUrl = result.successful[0].uploadURL;
      console.log('Background upload completed, URL:', uploadedUrl);
      
      try {
        // Process the uploaded image and get a proper viewing URL
        const response = await fetch('/api/objects/process-upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({
            uploadURL: uploadedUrl,
            type: 'background'
          })
        });
        
        if (response.ok) {
          const data = await response.json();
          setFormData(prev => ({ ...prev, backgroundUrl: data.viewURL }));
          toast({
            title: "Background image uploaded successfully!",
            description: "Your ad background is now ready.",
          });
        } else {
          throw new Error('Failed to process upload');
        }
      } catch (error) {
        console.error('Error processing background upload:', error);
        // Fallback: just use the upload URL for now
        setFormData(prev => ({ ...prev, backgroundUrl: uploadedUrl }));
        toast({
          title: "Background uploaded!",
          description: "Upload completed, processing...",
        });
      }
    }
  };

  // Form submission
  const createAdMutation = useMutation({
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
        status: 'pending', // Require approval
        template: selectedTemplate
      };
      
      console.log('Submitting ad data:', adData);
      return apiRequest('POST', '/api/ads/create', adData);
    },
    onSuccess: () => {
      toast({
        title: "Ad Submitted Successfully!",
        description: "Your ad is being reviewed and will be live within 24 hours.",
      });
      
      // Redirect to feed after showing success message
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  // Preview component
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

  if (previewMode) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setPreviewMode(false)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Editor
          </Button>
          <h1 className="text-2xl font-bold">Ad Preview</h1>
        </div>

        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-3">How your ad will appear in the feed:</h2>
            <AdPreview />
          </div>

          <Card>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4">Ad Performance Estimate</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-gray-600">Daily Budget</div>
                  <div className="font-semibold">${formData.dailyBudget}</div>
                </div>
                <div>
                  <div className="text-gray-600">Estimated Daily Views</div>
                  <div className="font-semibold">{Math.round(parseFloat(formData.dailyBudget) * 2.5)}</div>
                </div>
                <div>
                  <div className="text-gray-600">Target Area</div>
                  <div className="font-semibold">{formData.suburb || 'Not set'}</div>
                </div>
                <div>
                  <div className="text-gray-600">Expected Clicks</div>
                  <div className="font-semibold">{Math.round(parseFloat(formData.dailyBudget) * 0.15)}/day</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex gap-4">
            <Button 
              onClick={() => createAdMutation.mutate()}
              disabled={createAdMutation.isPending || !formData.businessName || !formData.title || !formData.content || !formData.suburb || !formData.cta}
              className="flex-1"
              data-testid="button-submit-ad"
            >
              {createAdMutation.isPending ? 'Submitting...' : 'Submit Ad for Review'}
            </Button>
            <Button variant="outline" onClick={() => setPreviewMode(false)}>
              Edit More
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Create Your Ad</h1>
          <p className="text-gray-600">Reach local customers in your area</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Form Side */}
        <div className="space-y-6">
          {/* Template Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Choose Your Business Type
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(AD_TEMPLATES).map(([key, template]) => {
                const Icon = template.icon;
                return (
                  <button
                    key={key}
                    onClick={() => setSelectedTemplate(key as keyof typeof AD_TEMPLATES)}
                    className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                      selectedTemplate === key 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`template-${key}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-5 h-5 mt-1 text-blue-600" />
                      <div>
                        <div className="font-semibold">{template.name}</div>
                        <div className="text-sm text-gray-600">{template.description}</div>
                      </div>
                    </div>
                  </button>
                );
              })}
            </CardContent>
          </Card>

          {/* Business Details */}
          <Card>
            <CardHeader>
              <CardTitle>Business Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="businessName">Business Name *</Label>
                  <Input
                    id="businessName"
                    value={formData.businessName}
                    onChange={(e) => setFormData(prev => ({ ...prev, businessName: e.target.value }))}
                    placeholder="Your Business Name"
                    data-testid="input-business-name"
                  />
                </div>
                <div>
                  <Label htmlFor="suburb">Suburb *</Label>
                  <LocationAutocomplete
                    value={formData.suburb}
                    onChange={(location) => setFormData(prev => ({ ...prev, suburb: location }))}
                    placeholder="e.g., Caloundra, Maroochydore..."
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Business Address</Label>
                <LocationAutocomplete
                  value={formData.address}
                  onChange={(location) => setFormData(prev => ({ ...prev, address: location }))}
                  placeholder="123 Main Street, Suburb..."
                />
              </div>

              <div>
                <Label htmlFor="website">Website URL</Label>
                <Input
                  id="website"
                  value={formData.websiteUrl}
                  onChange={(e) => setFormData(prev => ({ ...prev, websiteUrl: e.target.value }))}
                  placeholder="https://yourbusiness.com.au"
                  data-testid="input-website"
                />
              </div>
            </CardContent>
          </Card>

          {/* Ad Content */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Content</CardTitle>
              <p className="text-sm text-blue-600 font-medium">{template.tips}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">Headline *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Compelling headline that grabs attention"
                  maxLength={60}
                  data-testid="input-headline"
                />
              </div>

              <div>
                <Label htmlFor="content">Description *</Label>
                <Textarea
                  id="content"
                  value={formData.content}
                  onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                  placeholder="Describe your business and what makes it special"
                  maxLength={200}
                  rows={4}
                  data-testid="input-content"
                />
              </div>

              <div>
                <Label htmlFor="cta">Call-to-Action Button *</Label>
                <Input
                  id="cta"
                  value={formData.cta}
                  onChange={(e) => setFormData(prev => ({ ...prev, cta: e.target.value }))}
                  placeholder="e.g., Shop Now"
                  maxLength={15}
                  data-testid="input-cta"
                />
              </div>

              {/* Image Uploads */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Business Logo</Label>
                  <div className="space-y-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880} // 5MB
                      onGetUploadParameters={handleLogoUpload}
                      onComplete={onLogoComplete}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <Upload className="w-4 h-4" />
                        {formData.logoUrl ? 'Change Logo' : 'Upload Logo'}
                      </div>
                    </ObjectUploader>
                    {formData.logoUrl && (
                      <div className="text-xs text-green-600">✓ Logo uploaded</div>
                    )}
                  </div>
                </div>

                <div>
                  <Label>Background Image</Label>
                  <div className="space-y-2">
                    <ObjectUploader
                      maxNumberOfFiles={1}
                      maxFileSize={5242880} // 5MB
                      onGetUploadParameters={handleBackgroundUpload}
                      onComplete={onBackgroundComplete}
                      buttonClassName="w-full"
                    >
                      <div className="flex items-center gap-2 justify-center">
                        <Image className="w-4 h-4" />
                        {formData.backgroundUrl ? 'Change Background' : 'Upload Background'}
                      </div>
                    </ObjectUploader>
                    {formData.backgroundUrl && (
                      <div className="text-xs text-green-600">✓ Background uploaded</div>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget */}
          <Card>
            <CardHeader>
              <CardTitle>Budget & Targeting</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="budget">Daily Budget</Label>
                <Select value={formData.dailyBudget} onValueChange={(value) => setFormData(prev => ({ ...prev, dailyBudget: value }))}>
                  <SelectTrigger data-testid="select-budget">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BUDGET_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        <div>
                          <div>{option.label}</div>
                          <div className="text-xs text-gray-500">{option.desc}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Side */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Eye className="w-5 h-5" />
                Live Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <AdPreview />
              <Button 
                onClick={() => setPreviewMode(true)}
                className="w-full mt-4"
                disabled={!formData.businessName || !formData.title || !formData.content || !formData.cta}
                data-testid="button-preview"
              >
                Full Preview & Submit
              </Button>
            </CardContent>
          </Card>

          {/* Help */}
          <Card>
            <CardHeader>
              <CardTitle>Ad Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <strong>Headlines:</strong> Keep under 60 characters. Focus on your unique value.
              </div>
              <div>
                <strong>Description:</strong> Explain benefits, not just features. What will customers gain?
              </div>
              <div>
                <strong>Call-to-Action:</strong> Use action words. "Shop Now" works better than "Click Here".
              </div>
              <div>
                <strong>Local Appeal:</strong> Mention your suburb or "local" to connect with community.
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}