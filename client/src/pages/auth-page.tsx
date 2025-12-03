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
import { Shield, MessageCircle, MapPin, User, Building, Bell, Heart } from "lucide-react";
import { insertUserSchema } from "@shared/schema";
import { Redirect } from "wouter";
import { LocationAutocomplete } from "@/components/location-autocomplete";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const loginSchema = z.object({
  email: z.string().email("Valid email is required"),
  password: z.string().min(1, "Password is required"),
});

const registerSchema = insertUserSchema.pick({
  password: true,
  email: true,
  firstName: true,
  lastName: true,
  preferredLocation: true,
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
  preferredLocation: z.string().min(1, "Home suburb is required"),
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

  if (!isLoading && user) {
    return <Redirect to="/" />;
  }

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const registerForm = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
      email: "",
      firstName: "",
      lastName: "",
      preferredLocation: "",
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
    <div className="min-h-screen bg-background dark:bg-background">
      <div className="flex flex-col lg:flex-row min-h-screen">
        {/* Hero Section - Left Side */}
        <div className="lg:w-1/2 bg-gradient-to-br from-primary/10 via-primary/5 to-background dark:from-primary/20 dark:via-primary/10 dark:to-background p-8 lg:p-16 flex flex-col justify-center">
          <div className="max-w-lg mx-auto lg:mx-0">
            <div className="mb-8">
              <h1 className="text-3xl lg:text-4xl font-bold text-foreground mb-3">
                Community Connect
              </h1>
              <p className="text-lg text-muted-foreground">
                Your local community network for safety updates, lost & found, and neighbourhood news across Australia.
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <Bell className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Real-time Alerts</h3>
                  <p className="text-sm text-muted-foreground">Get notified about incidents and updates in your area</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <MessageCircle className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Community Posts</h3>
                  <p className="text-sm text-muted-foreground">Share and discover local updates from neighbours</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <Heart className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Lost & Found</h3>
                  <p className="text-sm text-muted-foreground">Help reunite pets and belongings with their owners</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-lg bg-card border">
                <div className="p-2 rounded-full bg-primary/10">
                  <MapPin className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-foreground">Local Focus</h3>
                  <p className="text-sm text-muted-foreground">See what matters most in your suburb and nearby areas</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Auth Forms - Right Side */}
        <div className="lg:w-1/2 p-8 lg:p-16 flex items-center justify-center bg-background">
          <div className="w-full max-w-md">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login" data-testid="tab-login">Sign In</TabsTrigger>
                <TabsTrigger value="register" data-testid="tab-register">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                  <CardHeader className="px-0 lg:px-6">
                    <CardTitle className="text-2xl">Welcome back</CardTitle>
                    <CardDescription>
                      Sign in to stay connected with your community
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 lg:px-6">
                    <form onSubmit={loginForm.handleSubmit(onLoginSubmit)} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="login-email">Email</Label>
                        <Input
                          id="login-email"
                          data-testid="input-login-email"
                          type="email"
                          {...loginForm.register("email")}
                          placeholder="you@example.com"
                        />
                        {loginForm.formState.errors.email && (
                          <p className="text-sm text-destructive" data-testid="error-login-email">
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
                          placeholder="Your password"
                        />
                        {loginForm.formState.errors.password && (
                          <p className="text-sm text-destructive" data-testid="error-login-password">
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
                <Card className="border-0 shadow-none lg:border lg:shadow-sm">
                  <CardHeader className="px-0 lg:px-6">
                    <CardTitle className="text-2xl">Join your community</CardTitle>
                    <CardDescription>
                      Create an account to share updates and stay informed
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="px-0 lg:px-6">
                    <form onSubmit={registerForm.handleSubmit(onRegisterSubmit)} className="space-y-4">
                      <div className="space-y-3">
                        <Label>Account Type</Label>
                        <RadioGroup 
                          value={registerForm.watch("accountType")} 
                          onValueChange={(value: 'regular' | 'business') => registerForm.setValue("accountType", value)}
                          className="grid grid-cols-2 gap-3"
                        >
                          <div className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${registerForm.watch("accountType") === 'regular' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                            <RadioGroupItem value="regular" id="personal" className="sr-only" />
                            <Label htmlFor="personal" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                              <User className="w-4 h-4" />
                              Personal
                            </Label>
                          </div>

                          <div className={`flex items-center justify-center gap-2 p-3 border rounded-lg cursor-pointer transition-colors ${registerForm.watch("accountType") === 'business' ? 'border-primary bg-primary/5' : 'hover:bg-muted'}`}>
                            <RadioGroupItem value="business" id="business" className="sr-only" />
                            <Label htmlFor="business" className="flex items-center gap-2 cursor-pointer text-sm font-medium">
                              <Building className="w-4 h-4" />
                              Business
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="register-firstName">First Name</Label>
                          <Input
                            id="register-firstName"
                            data-testid="input-register-firstName"
                            {...registerForm.register("firstName")}
                            placeholder="First name"
                          />
                          {registerForm.formState.errors.firstName && (
                            <p className="text-sm text-destructive" data-testid="error-register-firstName">
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
                            <p className="text-sm text-destructive" data-testid="error-register-lastName">
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
                          placeholder="you@example.com"
                        />
                        {registerForm.formState.errors.email && (
                          <p className="text-sm text-destructive" data-testid="error-register-email">
                            {registerForm.formState.errors.email.message}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="register-preferredLocation">Your Suburb</Label>
                        <LocationAutocomplete
                          value={registerForm.watch("preferredLocation") || ""}
                          onChange={(location) => registerForm.setValue("preferredLocation", location)}
                          placeholder="Start typing your suburb..."
                          data-testid="input-register-preferredLocation"
                        />
                        {registerForm.formState.errors.preferredLocation && (
                          <p className="text-sm text-destructive" data-testid="error-register-preferredLocation">
                            {registerForm.formState.errors.preferredLocation.message}
                          </p>
                        )}
                      </div>

                      {registerForm.watch("accountType") === 'business' && (
                        <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                          <h3 className="font-medium text-sm flex items-center gap-2">
                            <Building className="w-4 h-4" />
                            Business Details
                          </h3>

                          <div className="grid grid-cols-1 gap-3">
                            <div className="space-y-2">
                              <Label htmlFor="register-businessName">Business Name</Label>
                              <Input
                                id="register-businessName"
                                data-testid="input-register-businessName"
                                {...registerForm.register("businessName")}
                                placeholder="Your Business Name"
                              />
                              {registerForm.formState.errors.businessName && (
                                <p className="text-sm text-destructive" data-testid="error-register-businessName">
                                  {registerForm.formState.errors.businessName.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-businessCategory">Category</Label>
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
                                <p className="text-sm text-destructive" data-testid="error-register-businessCategory">
                                  {registerForm.formState.errors.businessCategory.message}
                                </p>
                              )}
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-businessDescription">Description</Label>
                              <Textarea
                                id="register-businessDescription"
                                data-testid="textarea-register-businessDescription"
                                {...registerForm.register("businessDescription")}
                                placeholder="Brief description..."
                                rows={2}
                              />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="register-businessWebsite">Website</Label>
                                <Input
                                  id="register-businessWebsite"
                                  data-testid="input-register-businessWebsite"
                                  {...registerForm.register("businessWebsite")}
                                  placeholder="https://..."
                                />
                              </div>

                              <div className="space-y-2">
                                <Label htmlFor="register-businessPhone">Phone</Label>
                                <Input
                                  id="register-businessPhone"
                                  data-testid="input-register-businessPhone"
                                  {...registerForm.register("businessPhone")}
                                  placeholder="04XX XXX XXX"
                                />
                              </div>
                            </div>

                            <div className="space-y-2">
                              <Label htmlFor="register-businessAddress">Address</Label>
                              <LocationAutocomplete
                                value={registerForm.watch("businessAddress") || ""}
                                onChange={(location) => registerForm.setValue("businessAddress", location)}
                                placeholder="Business address..."
                                data-testid="input-register-businessAddress"
                              />
                            </div>
                          </div>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-2">
                          <Label htmlFor="register-password">Password</Label>
                          <Input
                            id="register-password"
                            data-testid="input-register-password"
                            type="password"
                            {...registerForm.register("password")}
                            placeholder="Create password"
                          />
                          {registerForm.formState.errors.password && (
                            <p className="text-sm text-destructive" data-testid="error-register-password">
                              {registerForm.formState.errors.password.message}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="register-confirmPassword">Confirm</Label>
                          <Input
                            id="register-confirmPassword"
                            data-testid="input-register-confirmPassword"
                            type="password"
                            {...registerForm.register("confirmPassword")}
                            placeholder="Confirm password"
                          />
                          {registerForm.formState.errors.confirmPassword && (
                            <p className="text-sm text-destructive" data-testid="error-register-confirmPassword">
                              {registerForm.formState.errors.confirmPassword.message}
                            </p>
                          )}
                        </div>
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
    </div>
  );
}
