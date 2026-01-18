import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface NsfwWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export const NsfwWarningModal = ({ isOpen, onClose, onConfirm }: NsfwWarningModalProps) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/70 z-50"
            onClick={onClose}
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-sm bg-card border border-destructive/50 rounded-2xl z-50 shadow-xl overflow-hidden"
          >
            <div className="p-6 text-center space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-destructive/20 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-destructive" />
              </div>
              
              <h2 className="text-xl font-bold text-foreground">
                ⚠️ This Action Cannot Be Undone
              </h2>
              
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  Enabling NSFW/18+ content is <span className="font-bold text-destructive">permanent</span> and cannot be reversed.
                </p>
                <p>
                  Once enabled, this setting will remain on your account forever.
                </p>
                <p className="font-medium text-foreground">
                  Are you absolutely sure you want to continue?
                </p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button 
                  variant="ghost" 
                  onClick={onClose} 
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  onClick={onConfirm}
                  className="flex-1 bg-destructive hover:bg-destructive/90 text-white"
                >
                  I Understand, Enable
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
