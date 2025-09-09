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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Building, User, CheckCircle, ArrowRight } from "lucide-react";
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

export default function AccountSetup() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [accountType, setAccountType] = useState<'personal' | 'business'>('personal');
  const [businessData, setBusinessData] = useState({
    businessName: "",
    businessDescription: "",
    businessWebsite: "",
    businessPhone: "",
    businessAddress: "",
    businessCategory: ""
  });

  const setupAccountMutation = useMutation({
    mutationFn: async () => {
      if (accountType === 'personal') {
        // For personal accounts, just mark setup as complete
        return apiRequest('POST', '/api/users/complete-setup', { accountType: 'regular' });
      } else {
        // For business accounts, validate and submit business data
        if (!businessData.businessName.trim()) {
          throw new Error('Business name is required');
        }
        if (!businessData.businessCategory) {
          throw new Error('Business category is required');
        }

        return apiRequest('POST', '/api/users/complete-setup', {
          accountType: 'business',
          ...businessData
        });
      }
    },
    onSuccess: () => {
      toast({
        title: "Account Setup Complete!",
        description: accountType === 'business' 
          ? "Welcome to QLD Safety Monitor Business. You can now create advertisements."
          : "Welcome to QLD Safety Monitor! Your account is ready to use.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user'] });
      setLocation('/');
    },
    onError: (error) => {
      toast({
        title: "Setup Failed",
        description: error.message || "There was an error setting up your account.",
        variant: "destructive",
      });
    },
  });

  const updateBusinessData = (field: string, value: string) => {
    setBusinessData(prev => ({ ...prev, [field]: value }));
  };

  const isFormValid = () => {
    if (accountType === 'personal') return true;
    return businessData.businessName.trim() && businessData.businessCategory;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Complete Your Account Setup</h1>
          <p className="text-gray-600">
            Welcome {user?.firstName || user?.email}! Let's set up your account.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Choose Your Account Type</CardTitle>
            <CardDescription>
              Select the type of account that best fits your needs
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Account Type Selection */}
            <RadioGroup value={accountType} onValueChange={(value: 'personal' | 'business') => setAccountType(value)}>
              <div className="space-y-4">
                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="personal" id="personal" />
                  <Label htmlFor="personal" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <User className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="font-semibold">Personal Account</div>
                        <div className="text-sm text-gray-600">
                          For individuals who want to stay informed about local safety and community events
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>

                <div className="flex items-center space-x-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <RadioGroupItem value="business" id="business" />
                  <Label htmlFor="business" className="flex-1 cursor-pointer">
                    <div className="flex items-center gap-3">
                      <Building className="w-6 h-6 text-green-600" />
                      <div>
                        <div className="font-semibold">Business Account</div>
                        <div className="text-sm text-gray-600">
                          For businesses who want to advertise to local Queensland customers
                        </div>
                      </div>
                    </div>
                  </Label>
                </div>
              </div>
            </RadioGroup>

            {/* Business Account Details */}
            {accountType === 'business' && (
              <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h3 className="font-semibold text-green-800 flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Business Information
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="businessName">Business Name *</Label>
                    <Input
                      id="businessName"
                      value={businessData.businessName}
                      onChange={(e) => updateBusinessData('businessName', e.target.value)}
                      placeholder="Your Business Name"
                      data-testid="input-business-name"
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessCategory">Business Category *</Label>
                    <Select value={businessData.businessCategory} onValueChange={(value) => updateBusinessData('businessCategory', value)}>
                      <SelectTrigger data-testid="select-business-category">
                        <SelectValue placeholder="Select category" />
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

                  <div className="md:col-span-2">
                    <Label htmlFor="businessDescription">Business Description</Label>
                    <Textarea
                      id="businessDescription"
                      value={businessData.businessDescription}
                      onChange={(e) => updateBusinessData('businessDescription', e.target.value)}
                      placeholder="Brief description of your business..."
                      rows={3}
                      data-testid="textarea-business-description"
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessWebsite">Website URL</Label>
                    <Input
                      id="businessWebsite"
                      value={businessData.businessWebsite}
                      onChange={(e) => updateBusinessData('businessWebsite', e.target.value)}
                      placeholder="https://yourwebsite.com"
                      data-testid="input-business-website"
                    />
                  </div>

                  <div>
                    <Label htmlFor="businessPhone">Phone Number</Label>
                    <Input
                      id="businessPhone"
                      value={businessData.businessPhone}
                      onChange={(e) => updateBusinessData('businessPhone', e.target.value)}
                      placeholder="(07) 1234 5678"
                      data-testid="input-business-phone"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <Label htmlFor="businessAddress">Business Address</Label>
                    <LocationAutocomplete
                      value={businessData.businessAddress}
                      onChange={(location) => updateBusinessData('businessAddress', location)}
                      placeholder="Enter your business address..."
                      data-testid="input-business-address"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Benefits Summary */}
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                What you'll get:
              </h3>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Access to real-time safety information for Queensland</li>
                <li>• Community incident reporting and discussion</li>
                <li>• Local traffic and emergency updates</li>
                {accountType === 'business' && (
                  <>
                    <li>• Create targeted advertisements for local customers</li>
                    <li>• Business analytics and campaign management</li>
                    <li>• Verified business profile in the community</li>
                  </>
                )}
              </ul>
            </div>

            <Button 
              onClick={() => setupAccountMutation.mutate()}
              disabled={setupAccountMutation.isPending || !isFormValid()}
              className="w-full"
              data-testid="button-complete-setup"
            >
              {setupAccountMutation.isPending ? (
                'Setting up your account...'
              ) : (
                <>
                  Complete Setup
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-xs text-gray-500 text-center">
              You can change your account type later in your profile settings
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}