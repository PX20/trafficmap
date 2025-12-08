import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HelpCircle, ArrowLeft, MessageCircle, AlertTriangle, MapPin, Bell, Users } from "lucide-react";
import { Link } from "wouter";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export default function Help() {
  const faqs = [
    {
      question: "How do I report an incident?",
      answer: "Tap the 'Create Post' button on the feed page. Fill in the details about the incident including location, category, and description. You can also add photos to help others understand the situation."
    },
    {
      question: "How do notifications work?",
      answer: "You'll receive notifications about incidents near your preferred location. You can customize which categories you want to be notified about in your profile settings."
    },
    {
      question: "Can I edit or delete my posts?",
      answer: "Yes! You can edit or delete your own posts at any time. Just tap on your post and select the edit or delete option from the menu."
    },
    {
      question: "How accurate is the location information?",
      answer: "Location data comes from multiple sources including user reports and official traffic/emergency services. While we strive for accuracy, always verify critical information through official channels."
    },
    {
      question: "Is my personal information visible to others?",
      answer: "Only your display name and profile picture are visible on your posts. Your email, exact location preferences, and other personal details remain private."
    },
    {
      question: "How do I change my notification preferences?",
      answer: "Go to your Profile page and scroll to the Notification Settings section. You can toggle notifications on/off and select which categories you want to receive alerts for."
    }
  ];

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
            <HelpCircle className="w-8 h-8 text-primary" />
            Help & Support
          </h1>
          <p className="text-muted-foreground">
            Get help using Community Connect Australia.
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Quick Guide</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <MapPin className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Set Location</h4>
                  <p className="text-xs text-muted-foreground">Update your location in Profile to see local posts</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Bell className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Notifications</h4>
                  <p className="text-xs text-muted-foreground">Enable push notifications for instant alerts</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <AlertTriangle className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Report Issues</h4>
                  <p className="text-xs text-muted-foreground">Share safety concerns with your community</p>
                </div>
              </div>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <Users className="w-5 h-5 text-primary mt-0.5" />
                <div>
                  <h4 className="font-medium text-sm">Stay Connected</h4>
                  <p className="text-xs text-muted-foreground">React and comment on community posts</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Frequently Asked Questions</CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {faqs.map((faq, index) => (
                  <AccordionItem key={index} value={`item-${index}`}>
                    <AccordionTrigger className="text-left text-sm">
                      {faq.question}
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground text-sm">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MessageCircle className="w-5 h-5 text-primary" />
                Contact Support
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-muted-foreground">
              <p>
                Can't find what you're looking for? Our support team is here to help.
              </p>
              <div className="space-y-2">
                <p>
                  <strong className="text-foreground">Email:</strong>{" "}
                  <a href="mailto:support@communityconnect.au" className="text-primary hover:underline">
                    support@communityconnect.au
                  </a>
                </p>
                <p>
                  <strong className="text-foreground">Response time:</strong> Within 24-48 hours
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/50 bg-destructive/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg text-destructive">
                <AlertTriangle className="w-5 h-5" />
                Emergency Contacts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-muted-foreground mb-3">
                For life-threatening emergencies, always call emergency services directly:
              </p>
              <div className="grid gap-2">
                <div className="flex justify-between items-center p-2 rounded bg-background">
                  <span className="font-medium">Police, Fire, Ambulance</span>
                  <a href="tel:000" className="text-primary font-bold">000</a>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-background">
                  <span className="font-medium">SES (State Emergency)</span>
                  <a href="tel:132500" className="text-primary font-bold">132 500</a>
                </div>
                <div className="flex justify-between items-center p-2 rounded bg-background">
                  <span className="font-medium">Police Assistance</span>
                  <a href="tel:131444" className="text-primary font-bold">131 444</a>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
