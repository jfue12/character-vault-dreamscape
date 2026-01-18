import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Image, Loader2, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

interface DMSettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  friendshipId: string;
  isRequester: boolean;
  currentBackgroundUrl: string | null;
  onBackgroundChange: (url: string | null) => void;
}

export const DMSettingsPanel = ({
  isOpen,
  onClose,
  friendshipId,
  isRequester,
  currentBackgroundUrl,
  onBackgroundChange
}: DMSettingsPanelProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/dm-bg-${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('world-images')
      .upload(fileName, file);

    if (uploadError) {
      toast({ title: 'Upload failed', description: uploadError.message, variant: 'destructive' });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('world-images').getPublicUrl(fileName);
    const bgUrl = urlData.publicUrl;

    // Update friendship with background URL
    const updateField = isRequester ? 'requester_background_url' : 'addressee_background_url';
    const { error } = await supabase
      .from('friendships')
      .update({ [updateField]: bgUrl })
      .eq('id', friendshipId);

    if (error) {
      toast({ title: 'Failed to save background', variant: 'destructive' });
    } else {
      toast({ title: 'Background updated!' });
      onBackgroundChange(bgUrl);
    }
    setUploading(false);
  };

  const handleRemoveBackground = async () => {
    const updateField = isRequester ? 'requester_background_url' : 'addressee_background_url';
    const { error } = await supabase
      .from('friendships')
      .update({ [updateField]: null })
      .eq('id', friendshipId);

    if (error) {
      toast({ title: 'Failed to remove background', variant: 'destructive' });
    } else {
      toast({ title: 'Background removed' });
      onBackgroundChange(null);
    }
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
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed top-0 right-0 h-full w-80 bg-card border-l border-border z-50 shadow-xl flex flex-col"
          >
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="font-semibold text-foreground">DM Settings</h2>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Background Image */}
              <div className="space-y-3">
                <Label>Chat Background</Label>
                
                {currentBackgroundUrl && (
                  <div className="relative rounded-lg overflow-hidden border border-border">
                    <img 
                      src={currentBackgroundUrl} 
                      alt="Background" 
                      className="w-full h-32 object-cover"
                    />
                    <button
                      onClick={handleRemoveBackground}
                      className="absolute top-2 right-2 p-1.5 bg-destructive/80 rounded-full text-white hover:bg-destructive"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}

                <label className="flex items-center justify-center gap-2 p-4 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary/50 transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  {uploading ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <>
                      <Image className="w-5 h-5 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        {currentBackgroundUrl ? 'Change background' : 'Upload background image'}
                      </span>
                    </>
                  )}
                </label>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
