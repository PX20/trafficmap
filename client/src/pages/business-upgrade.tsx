import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Building, Star, TrendingUp, Users } from "lucide-react";
import { Link } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LocationAutocomplete } from "@/components/location-autocomplete";

const businessCategories = [
  "Restaurant & Food",
  "Retail & Shopping", 
  "Health & Fitness",
  "Beauty & Wellness",
  "Professional Services",
  "Home & Garden",
  "Education & Training",
  "Entertainment & Events",
  "Automotive",
  "Technology",
  "Other"
];

export default function BusinessUpgrade() {
  const { user, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState({
    businessName: "",
    businessDescription: "",
    businessWebsite: "",
    businessPhone: "",
    businessAddress: "",
    businessCategory: ""
  });

  const upgradeToBusinessMutation = useMutation({
    mutationFn: async () => {
      // Validate required fields
      if (!formData.businessName.trim()) {
        throw new Error('Business name is required');
      }
      if (!formData.businessCategory) {
        throw new Error('Business category is required');
      }

      return apiRequest('POST', '/api/users/upgrade-to-business', formData);
    },
    onSuccess: () => {
      toast({
        title: "Business Account Created!",
        description: "Welcome to Community Connect Australia Business. You can now create advertisements.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/business-dashboard');
    },
    onError: (error) => {
      toast({
        title: "Upgrade Failed",
        description: error.message || "There was an error upgrading your account.",
        variant: "destructive",
      });
    },
  });

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Authentication Required</h1>
        <p className="text-gray-600 mb-6">Please log in to upgrade to a business account.</p>
        <Link href="/auth">
          <Button>Log In</Button>
        </Link>
      </div>
    );
  }

  if (user?.accountType === 'business') {
    return (
      <div className="container mx-auto px-4 py-8 max-w-2xl text-center">
        <h1 className="text-2xl font-bold mb-4">Already a Business Account</h1>
        <p className="text-gray-600 mb-6">Your account is already set up for business use.</p>
        <Link href="/business-dashboard">
          <Button>Go to Business Dashboard</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/">
          <Button variant="ghost" data-testid="button-back">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Feed
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Upgrade to Business Account</h1>
          <p className="text-gray-600">Join thousands of local businesses reaching Australian customers</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Benefits Section */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-blue-600" />
                Reach Local Customers
              </CardTitle>
              <CardDescription>
                Get your business noticed by residents in your local area with targeted advertising
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-green-600" />
                Community Trust
              </CardTitle>
              <CardDescription>
                Build trust with verified business profiles and customer reviews in the safety community
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="w-5 h-5 text-purple-600" />
                Performance Analytics
              </CardTitle>
              <CardDescription>
                Track your campaign performance with detailed analytics and customer insights
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Building className="w-5 h-5 text-orange-600" />
                Professional Features
              </CardTitle>
              <CardDescription>
                Access business-only features including ad creation, campaign management, and customer analytics
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Upgrade Form */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
            <CardDescription>
              Tell us about your business to complete your upgrade
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="businessName">Business Name *</Label>
              <Input
                id="businessName"
                value={formData.businessName}
                onChange={(e) => updateFormData('businessName', e.target.value)}
                placeholder="Your Business Name"
                data-testid="input-business-name"
              />
            </div>

            <div>
              <Label htmlFor="businessCategory">Business Category *</Label>
              <Select value={formData.businessCategory} onValueChange={(value) => updateFormData('businessCategory', value)}>
                <SelectTrigger data-testid="select-business-category">
                  <SelectValue placeholder="Select your business category" />
                </SelectTrigger>
                <SelectContent>
                  {businessCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="businessDescription">Business Description</Label>
              <Textarea
                id="businessDescription"
                value={formData.businessDescription}
                onChange={(e) => updateFormData('businessDescription', e.target.value)}
                placeholder="Brief description of your business..."
                rows={3}
                data-testid="textarea-business-description"
              />
            </div>

            <div>
              <Label htmlFor="businessWebsite">Website URL</Label>
              <Input
                id="businessWebsite"
                value={formData.businessWebsite}
                onChange={(e) => updateFormData('businessWebsite', e.target.value)}
                placeholder="https://yourwebsite.com"
                data-testid="input-business-website"
              />
            </div>

            <div>
              <Label htmlFor="businessPhone">Phone Number</Label>
              <Input
                id="businessPhone"
                value={formData.businessPhone}
                onChange={(e) => updateFormData('businessPhone', e.target.value)}
                placeholder="(07) 1234 5678"
                data-testid="input-business-phone"
              />
            </div>

            <div>
              <Label htmlFor="businessAddress">Business Address</Label>
              <LocationAutocomplete
                value={formData.businessAddress}
                onChange={(location) => updateFormData('businessAddress', location)}
                placeholder="Enter your business address..."
                data-testid="input-business-address"
              />
            </div>

            <Button 
              onClick={() => upgradeToBusinessMutation.mutate()}
              disabled={upgradeToBusinessMutation.isPending || !formData.businessName || !formData.businessCategory}
              className="w-full mt-6"
              data-testid="button-upgrade-business"
            >
              {upgradeToBusinessMutation.isPending ? 'Creating Business Account...' : 'Upgrade to Business Account'}
            </Button>

            <p className="text-sm text-gray-600 text-center">
              Upgrading is free and gives you access to business features immediately
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}