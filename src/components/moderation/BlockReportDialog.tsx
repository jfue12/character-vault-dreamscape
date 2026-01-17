import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Shield, Flag, AlertTriangle } from 'lucide-react';

interface BlockReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetUserId: string;
  targetUsername: string;
  mode: 'block' | 'report';
  onComplete?: () => void;
}

const reportReasons = [
  { value: 'harassment', label: 'Harassment or bullying' },
  { value: 'spam', label: 'Spam or scam' },
  { value: 'inappropriate', label: 'Inappropriate content' },
  { value: 'impersonation', label: 'Impersonation' },
  { value: 'underage', label: 'Suspected underage user' },
  { value: 'other', label: 'Other' },
];

export const BlockReportDialog = ({
  open,
  onOpenChange,
  targetUserId,
  targetUsername,
  mode,
  onComplete,
}: BlockReportDialogProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedReason, setSelectedReason] = useState('');
  const [details, setDetails] = useState('');

  const handleBlock = async () => {
    if (!user) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_blocks')
        .insert({
          blocker_id: user.id,
          blocked_id: targetUserId,
        });

      if (error) {
        if (error.code === '23505') {
          toast({
            title: 'Already blocked',
            description: 'You have already blocked this user',
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: 'User blocked',
          description: `${targetUsername} has been blocked. They won't be able to contact you.`,
        });
        onComplete?.();
        onOpenChange(false);
      }
    } catch (error) {
      toast({
        title: 'Block failed',
        description: 'Failed to block user. Please try again.',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  const handleReport = async () => {
    if (!user || !selectedReason) return;
    setLoading(true);

    try {
      const { error } = await supabase
        .from('user_reports')
        .insert({
          reporter_id: user.id,
          reported_user_id: targetUserId,
          reason: selectedReason,
          details: details || null,
        });

      if (error) throw error;

      toast({
        title: 'Report submitted',
        description: 'Thank you for reporting. We will review this user.',
      });
      
      setSelectedReason('');
      setDetails('');
      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: 'Report failed',
        description: 'Failed to submit report. Please try again.',
        variant: 'destructive',
      });
    }

    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-card max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {mode === 'block' ? (
              <>
                <Shield className="w-5 h-5 text-destructive" />
                Block {targetUsername}
              </>
            ) : (
              <>
                <Flag className="w-5 h-5 text-warning" />
                Report {targetUsername}
              </>
            )}
          </DialogTitle>
          <DialogDescription>
            {mode === 'block'
              ? 'Blocking this user will prevent them from messaging you or seeing your profile.'
              : 'Please select a reason for reporting this user.'}
          </DialogDescription>
        </DialogHeader>

        {mode === 'block' ? (
          <div className="space-y-4">
            <div className="p-4 bg-destructive/10 rounded-lg flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-destructive">This action will:</p>
                <ul className="text-muted-foreground mt-1 space-y-1">
                  <li>• Hide your profile from this user</li>
                  <li>• Prevent them from messaging you</li>
                  <li>• Remove any pending friend requests</li>
                </ul>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleBlock}
                disabled={loading}
                className="flex-1"
              >
                {loading ? 'Blocking...' : 'Block User'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <RadioGroup value={selectedReason} onValueChange={setSelectedReason}>
              {reportReasons.map((reason) => (
                <div key={reason.value} className="flex items-center space-x-2">
                  <RadioGroupItem value={reason.value} id={reason.value} />
                  <Label htmlFor={reason.value} className="text-sm cursor-pointer">
                    {reason.label}
                  </Label>
                </div>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="details">Additional details (optional)</Label>
              <Textarea
                id="details"
                placeholder="Provide any additional context..."
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="bg-input resize-none"
                rows={3}
              />
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleReport}
                disabled={loading || !selectedReason}
                className="flex-1"
              >
                {loading ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};