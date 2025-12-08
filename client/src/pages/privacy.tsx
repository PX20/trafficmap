import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, ArrowLeft, Lock, Eye, Database, Trash2 } from "lucide-react";
import { Link } from "wouter";

export default function Privacy() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-4 pt-6 pb-6">
        <div className="mb-6">
          <Link href="/feed">
            <Button variant="ghost" size="sm" className="gap-2" data-testid="button-back">
              <ArrowLeft className="w-4 h-4" />
              Back to Feed
            </Button>
          </Link>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Privacy
          </h1>
          <p className="text-muted-foreground">
            How we protect your data and privacy.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Lock className="w-5 h-5 text-primary" />
                Your Data is Secure
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                We use industry-standard encryption to protect your personal information. 
                Your account data is stored securely and never shared with third parties 
                without your explicit consent.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Eye className="w-5 h-5 text-primary" />
                What We Collect
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <ul className="list-disc list-inside space-y-2">
                <li>Basic profile information (name, email)</li>
                <li>Your preferred location for local updates</li>
                <li>Posts and comments you create</li>
                <li>Your notification preferences</li>
              </ul>
              <p className="pt-2">
                We only collect information necessary to provide you with relevant 
                community safety updates.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="w-5 h-5 text-primary" />
                Location Privacy
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Your exact location is never shared publicly. When you post an incident, 
                you control how specific the location information is. We use your 
                preferred location settings only to show you relevant nearby incidents.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Trash2 className="w-5 h-5 text-primary" />
                Data Deletion
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                You can delete your account and all associated data at any time. 
                Contact our support team to request complete data deletion.
              </p>
            </CardContent>
          </Card>

          <div className="pt-4 text-center text-sm text-muted-foreground">
            <p>Last updated: December 2024</p>
            <p className="mt-2">
              Questions about privacy? Contact us at{" "}
              <a href="mailto:privacy@communityconnect.au" className="text-primary hover:underline">
                privacy@communityconnect.au
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
