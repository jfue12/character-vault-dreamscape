import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Plus } from 'lucide-react';

const SUGGESTED_TAGS = ['Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Slice of Life', 'Action', 'Mystery', 'Adventure'];

export default function CreateWorld() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    rules: '',
    is_public: true,
    is_nsfw: false,
  });

  const [tags, setTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const toggleTag = (tag: string) => {
    setTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const addCustomTag = () => {
    if (customTag.trim() && !tags.includes(customTag.trim())) {
      setTags([...tags, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !formData.name.trim()) return;

    setIsSubmitting(true);

    try {
      let imageUrl = null;

      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}-cover.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('world-images')
          .upload(fileName, imageFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('world-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      // Create the world
      const { data: world, error: worldError } = await supabase
        .from('worlds')
        .insert({
          owner_id: user.id,
          name: formData.name,
          description: formData.description || null,
          rules: formData.rules || null,
          image_url: imageUrl,
          tags,
          is_public: formData.is_public,
          is_nsfw: formData.is_nsfw,
        })
        .select()
        .single();

      if (worldError) throw worldError;

      // Add owner as a member
      await supabase.from('world_members').insert({
        world_id: world.id,
        user_id: user.id,
        role: 'owner',
      });

      // Create a default "Main Hall" room
      await supabase.from('world_rooms').insert({
        world_id: world.id,
        name: 'Main Hall',
        description: 'The main gathering area',
        sort_order: 0,
      });

      toast({
        title: 'World created!',
        description: `${formData.name} is now live.`,
      });

      navigate(`/worlds/${world.id}`);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create world',
        variant: 'destructive',
      });
    }

    setIsSubmitting(false);
  };

  return (
    <AppLayout title="Create World" showNav={false}>
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <h2 className="font-display text-2xl font-bold text-foreground mb-6">
            Create a New World
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Cover Image */}
            <div className="space-y-2">
              <Label className="text-foreground">Cover Image</Label>
              <label className="cursor-pointer block">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                />
                <div className="h-40 rounded-xl bg-gradient-to-br from-neon-purple/10 to-neon-blue/10 border-2 border-dashed border-primary/30 flex items-center justify-center overflow-hidden hover:border-primary transition-colors">
                  {imagePreview ? (
                    <div className="relative w-full h-full">
                      <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setImageFile(null);
                          setImagePreview(null);
                        }}
                        className="absolute top-2 right-2 p-1 rounded-full bg-background/80 hover:bg-background"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">Click to upload cover image</p>
                    </div>
                  )}
                </div>
              </label>
            </div>

            {/* Name */}
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground">World Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter world name"
                className="bg-input border-border"
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description" className="text-foreground">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe your world..."
                className="bg-input border-border min-h-[100px]"
              />
            </div>

            {/* Tags */}
            <div className="space-y-2">
              <Label className="text-foreground">Tags</Label>
              <div className="flex flex-wrap gap-2 mb-2">
                {SUGGESTED_TAGS.map(tag => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`px-3 py-1 rounded-full text-sm transition-all ${
                      tags.includes(tag)
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                    }`}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Input
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  placeholder="Add custom tag"
                  className="bg-input border-border"
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomTag())}
                />
                <Button type="button" variant="secondary" onClick={addCustomTag}>
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              {tags.filter(t => !SUGGESTED_TAGS.includes(t)).length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {tags.filter(t => !SUGGESTED_TAGS.includes(t)).map(tag => (
                    <span
                      key={tag}
                      className="px-3 py-1 rounded-full bg-accent text-accent-foreground text-sm flex items-center gap-1"
                    >
                      {tag}
                      <button type="button" onClick={() => toggleTag(tag)}>
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Rules */}
            <div className="space-y-2">
              <Label htmlFor="rules" className="text-foreground">World Rules</Label>
              <Textarea
                id="rules"
                value={formData.rules}
                onChange={(e) => setFormData({ ...formData, rules: e.target.value })}
                placeholder="Set the rules for your world..."
                className="bg-input border-border min-h-[80px]"
              />
            </div>

            {/* Toggles */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-foreground">Public World</Label>
                  <p className="text-sm text-muted-foreground">Anyone can discover and join</p>
                </div>
                <Switch
                  checked={formData.is_public}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_public: checked })}
                />
              </div>

              {!profile?.is_minor && (
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-foreground">NSFW Content</Label>
                    <p className="text-sm text-muted-foreground">Contains adult themes (18+ only)</p>
                  </div>
                  <Switch
                    checked={formData.is_nsfw}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_nsfw: checked })}
                  />
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/worlds')}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || !formData.name.trim()}
                className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground neon-border"
              >
                {isSubmitting ? 'Creating...' : 'Create World'}
              </Button>
            </div>
          </form>
        </motion.div>
      </div>
    </AppLayout>
  );
}
