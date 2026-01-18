import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Sparkles, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface UsernameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const UsernameSetupModal = ({ isOpen, onClose, onSuccess }: UsernameSetupModalProps) => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateUsername = (value: string): string | null => {
    if (value.length < 3) return 'Username must be at least 3 characters';
    if (value.length > 20) return 'Username must be 20 characters or less';
    if (!/^[a-zA-Z0-9_]+$/.test(value)) return 'Only letters, numbers, and underscores allowed';
    if (value.includes('@')) return 'Username cannot contain @';
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    const validationError = validateUsername(username);
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);

    // Check if username is already taken
    const { data: existing } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', username.toLowerCase())
      .neq('id', user.id)
      .maybeSingle();

    if (existing) {
      setError('This username is already taken');
      setLoading(false);
      return;
    }

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ username: username.toLowerCase() })
      .eq('id', user.id);

    if (updateError) {
      setError('Failed to update username. Please try again.');
      setLoading(false);
      return;
    }

    await refreshProfile();
    toast({ title: 'Username set!', description: 'Your profile is now complete.' });
    onSuccess();
    setLoading(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/90 backdrop-blur-md z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="w-full max-w-md bg-card border border-border rounded-2xl overflow-hidden shadow-2xl">
              {/* Header */}
              <div className="relative bg-gradient-to-br from-primary/20 to-purple-900/20 p-6 text-center">
                <div className="w-16 h-16 mx-auto bg-primary/20 rounded-full flex items-center justify-center mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold text-foreground">Welcome to the Story!</h2>
                <p className="text-muted-foreground mt-2">
                  Choose a username to begin your adventure
                </p>
                <button
                  onClick={onClose}
                  className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Form */}
              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground mb-2 block">
                    Your Username
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">@</span>
                    <Input
                      value={username}
                      onChange={(e) => {
                        setUsername(e.target.value.replace(/\s/g, ''));
                        setError(null);
                      }}
                      placeholder="your_username"
                      className="pl-8"
                      maxLength={20}
                      autoFocus
                    />
                  </div>
                  {error && (
                    <p className="text-destructive text-sm mt-2">{error}</p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    3-20 characters. Letters, numbers, and underscores only.
                  </p>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !username.trim()}
                  className="w-full bg-gradient-to-r from-primary to-purple-600 hover:from-primary/90 hover:to-purple-600/90"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <User className="w-4 h-4 mr-2" />
                      Set Username
                    </>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  You can always change this later in your profile settings
                </p>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
