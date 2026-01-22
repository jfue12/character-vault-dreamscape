import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, Trash2 } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  background_url?: string | null;
  age: number | null;
  gender: string | null;
  species: string | null;
  pronouns: string | null;
  bio: string | null;
  likes: string[] | null;
  dislikes: string[] | null;
  is_hidden: boolean;
  is_private?: boolean;
  identity_tags?: {
    sexuality?: string;
    rp_style?: string;
    zodiac?: string;
  } | null;
}

interface EditCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  character: Character;
  onSuccess?: () => void;
  onDelete?: () => void;
}

export const EditCharacterModal = ({
  open,
  onOpenChange,
  character,
  onSuccess,
  onDelete
}: EditCharacterModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    bio: '',
    pronouns: '',
    age: '',
    gender: '',
    species: '',
    sexuality: '',
    rp_style: '',
    likes: '',
    dislikes: '',
    is_hidden: false,
    is_private: false,
    bubble_color: '',
    text_color: '',
    bubble_alignment: 'auto',
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [backgroundFile, setBackgroundFile] = useState<File | null>(null);
  const [backgroundPreview, setBackgroundPreview] = useState<string | null>(null);

  useEffect(() => {
    if (character) {
      const identityTags = character.identity_tags as { sexuality?: string; rp_style?: string } | null;
      const charAny = character as any;
      setFormData({
        name: character.name || '',
        bio: character.bio || '',
        pronouns: character.pronouns || '',
        age: character.age?.toString() || '',
        gender: character.gender || '',
        species: character.species || '',
        sexuality: identityTags?.sexuality || '',
        rp_style: identityTags?.rp_style || '',
        likes: character.likes?.join(', ') || '',
        dislikes: character.dislikes?.join(', ') || '',
        is_hidden: character.is_hidden || false,
        is_private: character.is_private || false,
        bubble_color: charAny.bubble_color || '',
        text_color: charAny.text_color || '',
        bubble_alignment: charAny.bubble_alignment || 'auto',
      });
      setAvatarPreview(character.avatar_url);
      setBackgroundPreview(charAny.background_url || null);
    }
  }, [character]);

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setAvatarPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setBackgroundFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setBackgroundPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !character) return;

    setLoading(true);

    try {
      let avatarUrl = character.avatar_url;
      let backgroundUrl = (character as any).background_url;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${character.id}-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          avatarUrl = publicUrl;
        }
      }

      if (backgroundFile) {
        const fileExt = backgroundFile.name.split('.').pop();
        const fileName = `${user.id}/${character.id}-bg-${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(fileName, backgroundFile, { upsert: true });

        if (!uploadError) {
          const { data: { publicUrl } } = supabase.storage
            .from('avatars')
            .getPublicUrl(fileName);
          backgroundUrl = publicUrl;
        }
      }

      const { error } = await supabase
        .from('characters')
        .update({
          name: formData.name,
          bio: formData.bio || null,
          pronouns: formData.pronouns || null,
          age: formData.age ? parseInt(formData.age) : null,
          gender: formData.gender || null,
          species: formData.species || null,
          avatar_url: avatarUrl,
          background_url: backgroundUrl,
          likes: formData.likes ? formData.likes.split(',').map(s => s.trim()).filter(Boolean) : [],
          dislikes: formData.dislikes ? formData.dislikes.split(',').map(s => s.trim()).filter(Boolean) : [],
          is_hidden: formData.is_hidden,
          is_private: formData.is_private,
          bubble_color: formData.bubble_color || null,
          text_color: formData.text_color || null,
          bubble_alignment: formData.bubble_alignment || 'auto',
          identity_tags: {
            sexuality: formData.sexuality || null,
            rp_style: formData.rp_style || null,
          }
        })
        .eq('id', character.id);

      if (error) throw error;

      toast({ title: 'Character updated!' });
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Failed to update character', description: error.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }

    setDeleting(true);
    try {
      const { error } = await supabase
        .from('characters')
        .delete()
        .eq('id', character.id);

      if (error) throw error;

      toast({ title: 'Character deleted' });
      onDelete?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({ title: 'Failed to delete character', description: error.message, variant: 'destructive' });
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-glass-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">
            Edit Character
          </DialogTitle>
          <DialogDescription>Customize your character's details and appearance.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Background Image Upload */}
          <div className="space-y-2">
            <Label>Background Image</Label>
            <label className="cursor-pointer group block">
              <input type="file" accept="image/*" onChange={handleBackgroundChange} className="hidden" />
              <div className="w-full h-28 rounded-xl bg-secondary border-2 border-dashed border-border group-hover:border-primary transition-colors overflow-hidden">
                {backgroundPreview ? (
                  <img src={backgroundPreview} alt="Background" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center">
                    <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                    <span className="text-xs text-muted-foreground mt-1">Upload background</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Avatar Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer group">
              <input type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
              <div className="w-24 h-24 rounded-full bg-secondary border-2 border-dashed border-border group-hover:border-primary transition-colors overflow-hidden">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Upload className="w-8 h-8 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                )}
              </div>
            </label>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Name *</Label>
            <Input
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Character name"
              required
            />
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label>Bio</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="Tell us about your character..."
              rows={3}
            />
          </div>

          {/* Identity Row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Pronouns</Label>
              <Input
                value={formData.pronouns}
                onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                placeholder="she/her"
              />
            </div>
            <div className="space-y-2">
              <Label>Age</Label>
              <Input
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="21"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Gender</Label>
              <Input
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                placeholder="Female"
              />
            </div>
            <div className="space-y-2">
              <Label>Species</Label>
              <Input
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                placeholder="Human"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>Sexuality</Label>
              <Input
                value={formData.sexuality}
                onChange={(e) => setFormData({ ...formData, sexuality: e.target.value })}
                placeholder="Bisexual"
              />
            </div>
            <div className="space-y-2">
              <Label>RP Style</Label>
              <Select value={formData.rp_style} onValueChange={(v) => setFormData({ ...formData, rp_style: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="literate">Literate</SelectItem>
                  <SelectItem value="semi-lit">Semi-Lit</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Likes & Dislikes */}
          <div className="space-y-2">
            <Label>Likes (comma-separated)</Label>
            <Input
              value={formData.likes}
              onChange={(e) => setFormData({ ...formData, likes: e.target.value })}
              placeholder="Music, Art, Coffee"
            />
          </div>

          <div className="space-y-2">
            <Label>Dislikes (comma-separated)</Label>
            <Input
              value={formData.dislikes}
              onChange={(e) => setFormData({ ...formData, dislikes: e.target.value })}
              placeholder="Loud noises, Mornings"
            />
          </div>

          {/* Chat Customization */}
          <div className="space-y-3 pt-2 border-t border-border">
            <Label className="text-sm font-medium">Chat Appearance</Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Bubble Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.bubble_color || '#6366f1'}
                    onChange={(e) => setFormData({ ...formData, bubble_color: e.target.value })}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.bubble_color}
                    onChange={(e) => setFormData({ ...formData, bubble_color: e.target.value })}
                    placeholder="#6366f1"
                    className="flex-1"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={formData.text_color || '#ffffff'}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    className="w-10 h-10 p-1 cursor-pointer"
                  />
                  <Input
                    value={formData.text_color}
                    onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                    placeholder="#ffffff"
                    className="flex-1"
                  />
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Bubble Alignment</Label>
              <Select 
                value={formData.bubble_alignment} 
                onValueChange={(v) => setFormData({ ...formData, bubble_alignment: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select alignment..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="auto">Auto (right for own messages)</SelectItem>
                  <SelectItem value="left">Always Left</SelectItem>
                  <SelectItem value="right">Always Right</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {(formData.bubble_color || formData.text_color) && (
              <div className="p-3 rounded-lg" style={{ 
                backgroundColor: formData.bubble_color || '#6366f1',
                color: formData.text_color || '#ffffff'
              }}>
                <p className="text-sm">Preview: This is how your messages will look!</p>
              </div>
            )}
          </div>

          {/* Privacy Settings */}
          <div className="space-y-3 pt-2 border-t border-border">
            <div className="flex items-center justify-between">
              <div>
                <Label>Hidden</Label>
                <p className="text-xs text-muted-foreground">Hide from your profile</p>
              </div>
              <Switch
                checked={formData.is_hidden}
                onCheckedChange={(checked) => setFormData({ ...formData, is_hidden: checked })}
              />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Private</Label>
                <p className="text-xs text-muted-foreground">Only you can see this character</p>
              </div>
              <Switch
                checked={formData.is_private}
                onCheckedChange={(checked) => setFormData({ ...formData, is_private: checked })}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4">
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={loading || deleting}
              className="gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {confirmDelete ? 'Confirm Delete' : 'Delete'}
            </Button>
            <Button
              type="submit"
              disabled={loading || !formData.name}
              className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
