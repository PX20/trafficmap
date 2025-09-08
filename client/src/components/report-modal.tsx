import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AlertTriangle, Flag } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  entityType: 'incident' | 'comment';
  entityId: string;
  entityTitle?: string;
}

const REPORT_REASONS = [
  {
    value: 'spam',
    label: 'Spam or Repetitive Content',
    description: 'This content appears to be spam or unnecessarily repetitive'
  },
  {
    value: 'inappropriate',
    label: 'Inappropriate Content',
    description: 'Content contains inappropriate language or material'
  },
  {
    value: 'harassment',
    label: 'Harassment or Bullying',
    description: 'This content targets or harasses individuals or groups'
  },
  {
    value: 'false_information',
    label: 'False or Misleading Information',
    description: 'Content appears to contain false or misleading information'
  },
  {
    value: 'other',
    label: 'Other',
    description: 'Something else that violates community guidelines'
  }
];

export function ReportModal({ isOpen, onClose, entityType, entityId, entityTitle }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const reportMutation = useMutation({
    mutationFn: async (data: { entityType: string; entityId: string; reason: string; description?: string }) => {
      return await apiRequest('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    },
    onSuccess: () => {
      toast({
        title: "Report submitted",
        description: "Thank you for helping keep our community safe. We'll review your report.",
      });
      queryClient.invalidateQueries({ queryKey: ['/api/reports'] });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: "Failed to submit report",
        description: "Please try again later.",
        variant: "destructive",
      });
      console.error("Report submission error:", error);
    },
  });

  const handleSubmit = () => {
    if (!selectedReason) {
      toast({
        title: "Please select a reason",
        description: "You must select a reason for reporting this content.",
        variant: "destructive",
      });
      return;
    }

    reportMutation.mutate({
      entityType,
      entityId,
      reason: selectedReason,
      description: description.trim() || undefined,
    });
  };

  const handleClose = () => {
    setSelectedReason('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-report">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-orange-500" />
            Report {entityType === 'incident' ? 'Post' : 'Comment'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {entityTitle && (
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">Reporting:</p>
              <p className="font-medium text-gray-900 line-clamp-2">{entityTitle}</p>
            </div>
          )}

          <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Help us keep the community safe</p>
              <p className="text-amber-700">Reports are reviewed by our moderation team and help maintain community standards.</p>
            </div>
          </div>

          <div className="space-y-3">
            <Label className="text-base font-medium">Why are you reporting this content?</Label>
            <RadioGroup 
              value={selectedReason} 
              onValueChange={setSelectedReason}
              className="space-y-3"
            >
              {REPORT_REASONS.map((reason) => (
                <div key={reason.value} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors">
                  <RadioGroupItem 
                    value={reason.value} 
                    id={reason.value}
                    className="mt-1"
                    data-testid={`radio-reason-${reason.value}`}
                  />
                  <div className="flex-1">
                    <Label htmlFor={reason.value} className="font-medium cursor-pointer">
                      {reason.label}
                    </Label>
                    <p className="text-sm text-gray-600 mt-1">{reason.description}</p>
                  </div>
                </div>
              ))}
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Additional details (optional)</Label>
            <Textarea
              id="description"
              placeholder="Please provide any additional context that might help our moderation team..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[80px]"
              maxLength={500}
              data-testid="textarea-report-description"
            />
            <p className="text-xs text-gray-500">{description.length}/500 characters</p>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              data-testid="button-cancel-report"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={!selectedReason || reportMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-submit-report"
            >
              {reportMutation.isPending ? 'Submitting...' : 'Submit Report'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}