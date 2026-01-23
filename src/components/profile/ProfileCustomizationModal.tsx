import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Link, Twitter, Instagram, Globe, Palette } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface SocialLinks {
  twitter?: string;
  instagram?: string;
  website?: string;
}

interface ProfileCustomizationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentBio?: string | null;
  currentBannerUrl?: string | null;
  currentAccentColor?: string | null;
  currentSocialLinks?: SocialLinks | null;
}

const ACCENT_COLORS = [
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Rose', value: '#F43F5E' },
];

export const ProfileCustomizationModal = ({
  isOpen,
  onClose,
  onSuccess,
  currentBio,
  currentBannerUrl,
  currentAccentColor,
  currentSocialLinks,
}: ProfileCustomizationModalProps) => {
  const { user, refreshProfile } = useAuth();
  const { toast } = useToast();
  const [bio, setBio] = useState(currentBio || '');
  const [bannerPreview, setBannerPreview] = useState<string | null>(currentBannerUrl || null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [accentColor, setAccentColor] = useState(currentAccentColor || '#7C3AED');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(currentSocialLinks || {});
  const [saving, setSaving] = useState(false);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Sync state with props when modal opens
  useEffect(() => {
    if (isOpen) {
      setBio(currentBio || '');
      setBannerPreview(currentBannerUrl || null);
      setBannerFile(null);
      setAccentColor(currentAccentColor || '#7C3AED');
      setSocialLinks(currentSocialLinks || {});
    }
  }, [isOpen, currentBio, currentBannerUrl, currentAccentColor, currentSocialLinks]);

  const handleBannerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBannerFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBannerPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);

    try {
      let bannerUrl = currentBannerUrl;

      // Upload banner if changed
      if (bannerFile) {
        const fileExt = bannerFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-banner.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, bannerFile);
        
        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          bannerUrl = publicUrl;
        }
      }

      // Update profile
      const { error } = await supabase
        .from('profiles')
        .update({
          bio: bio || null,
          banner_url: bannerUrl,
          accent_color: accentColor,
          social_links: socialLinks as any,
        })
        .eq('id', user.id);

      if (error) throw error;

      // Refresh the profile data in context
      await refreshProfile();
      
      toast({ title: 'Profile updated!' });
      onSuccess();
      onClose();
    } catch (error: any) {
      toast({ title: 'Failed to update profile', description: error.message, variant: 'destructive' });
    } finally {
      setSaving(false);
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
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-x-4 top-[10%] bottom-[10%] md:inset-x-auto md:left-1/2 md:-translate-x-1/2 md:w-full md:max-w-lg z-50 bg-card border border-border rounded-xl overflow-hidden flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold text-foreground">Customize Profile</h2>
              <button onClick={onClose} className="p-1 hover:bg-muted rounded-full">
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6">
              {/* Banner */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Upload className="w-4 h-4" />
                  Profile Banner
                </Label>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleBannerChange}
                  className="hidden"
                />
                <div 
                  onClick={() => bannerInputRef.current?.click()}
                  className="relative h-32 rounded-lg overflow-hidden cursor-pointer border-2 border-dashed border-border hover:border-primary transition-colors"
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="Banner" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex items-center justify-center h-full text-muted-foreground">
                      <span className="text-sm">Click to upload banner</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Accent Color */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Palette className="w-4 h-4" />
                  Accent Color
                </Label>
                <div className="flex flex-wrap gap-2">
                  {ACCENT_COLORS.map((color) => (
                    <button
                      key={color.value}
                      onClick={() => setAccentColor(color.value)}
                      className={`w-8 h-8 rounded-full transition-transform ${
                        accentColor === color.value ? 'ring-2 ring-offset-2 ring-offset-background ring-foreground scale-110' : ''
                      }`}
                      style={{ backgroundColor: color.value }}
                      title={color.name}
                    />
                  ))}
                </div>
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="Tell others about yourself..."
                  className="min-h-[100px]"
                  maxLength={500}
                />
                <p className="text-xs text-muted-foreground text-right">{bio.length}/500</p>
              </div>

              {/* Social Links */}
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <Link className="w-4 h-4" />
                  Social Links
                </Label>
                
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Twitter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={socialLinks.twitter || ''}
                      onChange={(e) => setSocialLinks({ ...socialLinks, twitter: e.target.value })}
                      placeholder="Twitter username"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Instagram className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={socialLinks.instagram || ''}
                      onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                      placeholder="Instagram username"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <Globe className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={socialLinks.website || ''}
                      onChange={(e) => setSocialLinks({ ...socialLinks, website: e.target.value })}
                      placeholder="Website URL"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={onClose}>
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
