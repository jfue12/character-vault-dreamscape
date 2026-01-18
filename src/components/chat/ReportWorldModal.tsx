import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ReportWorldModalProps {
  isOpen: boolean;
  onClose: () => void;
  worldId: string;
  worldName: string;
}

const REPORT_REASONS = [
  'Harassment or bullying',
  'Hate speech or discrimination',
  'Inappropriate content for minors',
  'Spam or scam',
  'Impersonation',
  'Illegal activity',
  'Other'
];

export const ReportWorldModal = ({
  isOpen,
  onClose,
  worldId,
  worldName
}: ReportWorldModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedReason, setSelectedReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user || !selectedReason) return;

    setSubmitting(true);
    const { error } = await supabase.from('world_reports').insert({
      world_id: worldId,
      reporter_id: user.id,
      reason: selectedReason,
      details: details.trim() || null
    });

    if (error) {
      toast({ title: 'Failed to submit report', variant: 'destructive' });
    } else {
      toast({ title: 'Report submitted', description: 'Thank you for helping keep our community safe.' });
      onClose();
      setSelectedReason(null);
      setDetails('');
    }
    setSubmitting(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-card border border-border rounded-2xl z-50 shadow-xl overflow-hidden"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-destructive" />
                <h2 className="font-semibold text-foreground">Report World</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              <p className="text-sm text-muted-foreground">
                Report <span className="font-medium text-foreground">{worldName}</span> for violating community guidelines.
              </p>

              <div className="space-y-2">
                <Label>Reason</Label>
                <div className="grid gap-2">
                  {REPORT_REASONS.map((reason) => (
                    <button
                      key={reason}
                      onClick={() => setSelectedReason(reason)}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-sm ${
                        selectedReason === reason
                          ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]'
                          : 'border-border hover:border-muted-foreground text-foreground'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Additional details (optional)</Label>
                <Textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  placeholder="Provide any additional context..."
                  className="min-h-[80px]"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button variant="ghost" onClick={onClose} className="flex-1">
                  Cancel
                </Button>
                <Button 
                  onClick={handleSubmit} 
                  disabled={!selectedReason || submitting}
                  className="flex-1 bg-destructive hover:bg-destructive/90"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Submit Report'}
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
