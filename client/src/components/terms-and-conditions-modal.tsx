import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Shield, FileText } from "lucide-react";

interface TermsAndConditionsModalProps {
  isOpen: boolean;
  onAccept: () => void;
}

export function TermsAndConditionsModal({ isOpen, onAccept }: TermsAndConditionsModalProps) {
  const [hasReadTerms, setHasReadTerms] = useState(false);
  const [hasAcceptedTerms, setHasAcceptedTerms] = useState(false);
  const { toast } = useToast();

  const acceptTermsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/user/accept-terms");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Terms accepted",
        description: "Welcome to QLD Safety Monitor! You can now use all features.",
      });
      onAccept();
    },
    onError: (error: any) => {
      console.error("Terms acceptance error:", error);
      toast({
        title: "Error accepting terms",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleAccept = () => {
    if (!hasReadTerms || !hasAcceptedTerms) {
      toast({
        title: "Please complete all requirements",
        description: "You must read the terms and check the agreement box to continue",
        variant: "destructive",
      });
      return;
    }

    acceptTermsMutation.mutate();
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent 
        className="w-[95vw] max-w-2xl h-[90vh] max-h-[90vh] flex flex-col p-0 bg-gradient-to-br from-white via-gray-50 to-white border-0 shadow-2xl" 
        data-testid="modal-terms-conditions"
        aria-describedby="terms-description"
      >
        <DialogHeader className="p-6 pb-4 flex-shrink-0 bg-gradient-to-r from-blue-50 to-purple-50 border-b border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <FileText className="w-6 h-6 text-white" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold text-gray-900">Terms and Conditions</DialogTitle>
              <p className="text-sm text-gray-600 mt-1">Please read and accept our terms to continue</p>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 p-6 overflow-hidden flex flex-col min-h-0 max-h-full">
          <div id="terms-description" className="sr-only">
            Terms and Conditions document that must be read and accepted to use QLD Safety Monitor
          </div>
          <ScrollArea className="flex-1 pr-4 h-0 min-h-[200px] max-h-[60vh] md:max-h-[50vh]" onScrollCapture={() => setHasReadTerms(true)}>
            <div className="space-y-6 text-sm text-gray-700 leading-relaxed">
              <section>
                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-600" />
                  Welcome to QLD Safety Monitor
                </h3>
                <p>
                  By using QLD Safety Monitor, you agree to these terms and conditions. This platform helps Queensland residents stay informed about safety incidents, traffic events, and community safety updates.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">1. Acceptance of Terms</h4>
                <p>
                  By accessing or using QLD Safety Monitor, you acknowledge that you have read, understood, and agree to be bound by these terms and conditions.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">2. User Responsibilities</h4>
                <ul className="space-y-2 ml-4">
                  <li>• Provide accurate and truthful information when reporting incidents</li>
                  <li>• Respect other community members and maintain civil discourse</li>
                  <li>• Do not share false, misleading, or harmful information</li>
                  <li>• Use the platform only for legitimate safety and community purposes</li>
                  <li>• Report content that violates community guidelines</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">3. Content Guidelines</h4>
                <p>
                  All user-generated content must be appropriate and relevant to community safety. Prohibited content includes:
                </p>
                <ul className="space-y-2 ml-4 mt-2">
                  <li>• Spam, harassment, or abusive language</li>
                  <li>• False emergency reports or hoax incidents</li>
                  <li>• Personal attacks or discriminatory content</li>
                  <li>• Content that violates privacy or safety of others</li>
                  <li>• Commercial advertisements or promotional material</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">4. Privacy and Data</h4>
                <p>
                  We respect your privacy and handle your data in accordance with our privacy policy. By using this service:
                </p>
                <ul className="space-y-2 ml-4 mt-2">
                  <li>• Your profile information may be visible to other community members</li>
                  <li>• Incident reports you submit become part of the public safety record</li>
                  <li>• We may share anonymized data with relevant authorities for public safety</li>
                  <li>• Location data is used only for incident reporting and safety features</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">5. Emergency Situations</h4>
                <p>
                  <strong>Important:</strong> QLD Safety Monitor is not a replacement for emergency services. For immediate emergencies:
                </p>
                <ul className="space-y-2 ml-4 mt-2">
                  <li>• Call 000 for police, fire, or ambulance</li>
                  <li>• Use official emergency channels for urgent situations</li>
                  <li>• This platform is for community awareness and non-urgent safety information</li>
                </ul>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">6. Account Termination</h4>
                <p>
                  We reserve the right to suspend or terminate accounts that violate these terms or engage in harmful behavior. Users who repeatedly violate community guidelines may be permanently banned.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">7. Disclaimer</h4>
                <p>
                  QLD Safety Monitor provides information "as is" without warranties. We are not responsible for the accuracy of user-submitted content or any actions taken based on information from this platform.
                </p>
              </section>

              <section>
                <h4 className="font-semibold text-gray-900 mb-2">8. Changes to Terms</h4>
                <p>
                  These terms may be updated periodically. Continued use of the platform constitutes acceptance of any changes. Users will be notified of significant changes.
                </p>
              </section>

              <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-800 font-medium">
                  By accepting these terms, you confirm that you are at least 13 years old and have the legal capacity to enter into this agreement.
                </p>
              </div>
            </div>
          </ScrollArea>

          <div className="mt-6 pt-4 border-t border-gray-200 space-y-4 flex-shrink-0">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="read-terms"
                checked={hasReadTerms}
                onCheckedChange={(checked) => setHasReadTerms(checked === true)}
                data-testid="checkbox-read-terms"
              />
              <label htmlFor="read-terms" className="text-sm text-gray-700">
                I have read the entire Terms and Conditions document
              </label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="accept-terms"
                checked={hasAcceptedTerms}
                onCheckedChange={(checked) => setHasAcceptedTerms(checked === true)}
                data-testid="checkbox-accept-terms"
              />
              <label htmlFor="accept-terms" className="text-sm text-gray-700">
                I agree to the Terms and Conditions and will follow the community guidelines
              </label>
            </div>
          </div>
        </div>

        <DialogFooter className="p-6 pt-4 bg-gray-50 border-t border-gray-200 flex-shrink-0">
          <Button
            onClick={handleAccept}
            disabled={!hasReadTerms || !hasAcceptedTerms || acceptTermsMutation.isPending}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3"
            data-testid="button-accept-terms"
          >
            {acceptTermsMutation.isPending ? "Accepting..." : "Accept Terms and Continue"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}