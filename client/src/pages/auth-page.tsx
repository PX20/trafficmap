import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Users, AlertTriangle, MapPin, User, Building } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

// Form schemas
const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.pick({
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  homeSuburb: true,
  accountType: true,
  businessName: true,
  businessCategory: true,
  businessDescription: true,
  businessWebsite: true,
  businessPhone: true,
  businessAddress: true,
}).extend({
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(1, "Please confirm your password"),
  homeSuburb: z.string().min(1, "Home suburb is required"),
  accountType: z.enum(['regular', 'business']).default('regular'),
  businessName: z.string().optional(),
  businessCategory: z.string().optional(),
  businessDescription: z.string().optional(),
  businessWebsite: z.string().optional(),
  businessPhone: z.string().optional(),
  businessAddress: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
}).refine((data) => {
  if (data.accountType === 'business') {
    return data.businessName && data.businessName.trim().length > 0;
  }
  return true;
}, {
  message: "Business name is required for business accounts",
  path: ["businessName"],
}).refine((data) => {
  if (data.accountType === 'business') {
    return data.businessCategory && data.businessCategory.length > 0;
  }
  return true;
}, {
  message: "Business category is required for business accounts",
  path: ["businessCategory"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type RegisterFormData = z.infer<typeof registerSchema>;

export default function AuthPage() {
  const { user, isLoading, loginMutation, registerMutation } = useAuth();
  const [activeTab, setActiveTab] = useState("login");

  // Redirect if already logged in
  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  // Login form
  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      homeSuburb: "",
      accountType: 'regular',
      businessName: "",
      businessCategory: "",
      businessDescription: "",
      businessWebsite: "",
      businessPhone: "",
      businessAddress: "",
    },
  });

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

  const onLoginSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onRegisterSubmit = (data: RegisterFormData) => {
    const { confirmPassword, ...userData } = data;
    registerMutation.mutate(userData);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-center">
        {/* Hero Section */}
        <div className="space-y-6 text-center lg:text-left">
          <div className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">
              QLD Community Connect
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Stay informed and connected with your Queensland community
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 mt-8">
            <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Shield className="h-8 w-8 text-blue-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Local Updates</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Stay informed about your area</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <AlertTriangle className="h-8 w-8 text-orange-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Road Conditions</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Current traffic updates</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Community Sharing</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Neighbor updates and tips</p>
              </div>
            </div>
            <div className="flex items-center space-x-3 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-sm">
              <MapPin className="h-8 w-8 text-purple-600" />
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">Location Based</h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">Suburb-level filtering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms */}
        <div className="w-full max-w-md mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
              <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <Card>
                <CardHeader>
                  <CardTitle>Sign In</CardTitle>
                  <CardDescription>
                    Sign in to your account to stay connected with your community
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        data-testid="input-login-email"
                        type="email"
                        {...loginForm.register("email")}
                        placeholder="Enter your email"
                      />
                      {loginForm.formState.errors.email && (
                        <p className="text-sm text-red-600" data-testid="error-login-email">
                          {loginForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="login-password">Password</Label>
                      <Input
                        id="login-password"
                        data-testid="input-login-password"
                        type="password"
                        {...loginForm.register("password")}
                        placeholder="Enter your password"
                      />
                      {loginForm.formState.errors.password && (
                        <p className="text-sm text-red-600" data-testid="error-login-password">
                          {loginForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={loginMutation.isPending}
                      data-testid="button-login"
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="register">
              <Card>
                <CardHeader>
                  <CardTitle>Create Account</CardTitle>
                  <CardDescription>
                    Join the QLD Community Connect to share updates and stay informed
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                    {/* Account Type Selection */}
                    <div className="space-y-3">
                      <Label>Account Type</Label>
                      <RadioGroup 
                        value={registerForm.watch("accountType")} 
                        onValueChange={(value: 'regular' | 'business') => registerForm.setValue("accountType", value)}
                      >
                        <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="regular" id="personal" />
                          <Label htmlFor="personal" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <User className="w-5 h-5 text-blue-600" />
                              <div>
                                <div className="font-medium">Personal Account</div>
                                <div className="text-sm text-gray-600">For individuals staying informed about local safety</div>
                              </div>
                            </div>
                          </Label>
                        </div>

                        <div className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                          <RadioGroupItem value="business" id="business" />
                          <Label htmlFor="business" className="flex-1 cursor-pointer">
                            <div className="flex items-center gap-3">
                              <Building className="w-5 h-5 text-green-600" />
                              <div>
                                <div className="font-medium">Business Account</div>
                                <div className="text-sm text-gray-600">For businesses wanting to advertise to local customers</div>
                              </div>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="register-firstName">First Name</Label>
                        <Input
                          id="register-firstName"
                          data-testid="input-register-firstName"
                          {...registerForm.register("firstName")}
                          placeholder="First name"
                        />
                        {registerForm.formState.errors.firstName && (
                          <p className="text-sm text-red-600" data-testid="error-register-firstName">
                            {registerForm.formState.errors.firstName.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-lastName">Last Name</Label>
                        <Input
                          id="register-lastName"
                          data-testid="input-register-lastName"
                          {...registerForm.register("lastName")}
                          placeholder="Last name"
                        />
                        {registerForm.formState.errors.lastName && (
                          <p className="text-sm text-red-600" data-testid="error-register-lastName">
                            {registerForm.formState.errors.lastName.message}
                          </p>
                        )}
                      </div>
                    </div>


                    <div className="space-y-2">
                      <Label htmlFor="register-email">Email</Label>
                      <Input
                        id="register-email"
                        data-testid="input-register-email"
                        type="email"
                        {...registerForm.register("email")}
                        placeholder="Enter your email"
                      />
                      {registerForm.formState.errors.email && (
                        <p className="text-sm text-red-600" data-testid="error-register-email">
                          {registerForm.formState.errors.email.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-homeSuburb">Home Suburb</Label>
                      <LocationAutocomplete
                        value={registerForm.watch("homeSuburb")}
                        onChange={(location) => registerForm.setValue("homeSuburb", location)}
                        placeholder="Start typing your suburb, city, or postcode..."
                        data-testid="input-register-homeSuburb"
                      />
                      {registerForm.formState.errors.homeSuburb && (
                        <p className="text-sm text-red-600" data-testid="error-register-homeSuburb">
                          {registerForm.formState.errors.homeSuburb.message}
                        </p>
                      )}
                    </div>

                    {/* Business Details - Only show for business accounts */}
                    {registerForm.watch("accountType") === 'business' && (
                      <div className="space-y-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-medium text-green-800 flex items-center gap-2">
                          <Building className="w-4 h-4" />
                          Business Information
                        </h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="register-businessName">Business Name *</Label>
                            <Input
                              id="register-businessName"
                              data-testid="input-register-businessName"
                              {...registerForm.register("businessName")}
                              placeholder="Your Business Name"
                            />
                            {registerForm.formState.errors.businessName && (
                              <p className="text-sm text-red-600" data-testid="error-register-businessName">
                                {registerForm.formState.errors.businessName.message}
                              </p>
                            )}
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="register-businessCategory">Business Category *</Label>
                            <Select value={registerForm.watch("businessCategory")} onValueChange={(value) => registerForm.setValue("businessCategory", value)}>
                              <SelectTrigger data-testid="select-register-businessCategory">
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
                            {registerForm.formState.errors.businessCategory && (
                              <p className="text-sm text-red-600" data-testid="error-register-businessCategory">
                                {registerForm.formState.errors.businessCategory.message}
                              </p>
                            )}
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="register-businessDescription">Business Description</Label>
                            <Textarea
                              id="register-businessDescription"
                              data-testid="textarea-register-businessDescription"
                              {...registerForm.register("businessDescription")}
                              placeholder="Brief description of your business..."
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="register-businessWebsite">Website URL</Label>
                            <Input
                              id="register-businessWebsite"
                              data-testid="input-register-businessWebsite"
                              {...registerForm.register("businessWebsite")}
                              placeholder="https://yourwebsite.com"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="register-businessPhone">Phone Number</Label>
                            <Input
                              id="register-businessPhone"
                              data-testid="input-register-businessPhone"
                              {...registerForm.register("businessPhone")}
                              placeholder="(07) 1234 5678"
                            />
                          </div>

                          <div className="md:col-span-2 space-y-2">
                            <Label htmlFor="register-businessAddress">Business Address</Label>
                            <LocationAutocomplete
                              value={registerForm.watch("businessAddress")}
                              onChange={(location) => registerForm.setValue("businessAddress", location)}
                              placeholder="Enter your business address..."
                              data-testid="input-register-businessAddress"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <Label htmlFor="register-password">Password</Label>
                      <Input
                        id="register-password"
                        data-testid="input-register-password"
                        type="password"
                        {...registerForm.register("password")}
                        placeholder="Create a password"
                      />
                      {registerForm.formState.errors.password && (
                        <p className="text-sm text-red-600" data-testid="error-register-password">
                          {registerForm.formState.errors.password.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="register-confirmPassword">Confirm Password</Label>
                      <Input
                        id="register-confirmPassword"
                        data-testid="input-register-confirmPassword"
                        type="password"
                        {...registerForm.register("confirmPassword")}
                        placeholder="Confirm your password"
                      />
                      {registerForm.formState.errors.confirmPassword && (
                        <p className="text-sm text-red-600" data-testid="error-register-confirmPassword">
                          {registerForm.formState.errors.confirmPassword.message}
                        </p>
                      )}
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                      disabled={registerMutation.isPending}
                      data-testid="button-register"
                    >
                      {registerMutation.isPending ? "Creating account..." : "Create Account"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}