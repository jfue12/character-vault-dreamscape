import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Plus, Minus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface CreateCharacterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export const CreateCharacterModal = ({ open, onOpenChange, onSuccess }: CreateCharacterModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    age: '',
    gender: '',
    species: '',
    pronouns: '',
  });
  
  const [likes, setLikes] = useState<string[]>(['']);
  const [dislikes, setDislikes] = useState<string[]>(['']);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const addItem = (type: 'likes' | 'dislikes') => {
    if (type === 'likes') {
      setLikes([...likes, '']);
    } else {
      setDislikes([...dislikes, '']);
    }
  };

  const removeItem = (type: 'likes' | 'dislikes', index: number) => {
    if (type === 'likes') {
      setLikes(likes.filter((_, i) => i !== index));
    } else {
      setDislikes(dislikes.filter((_, i) => i !== index));
    }
  };

  const updateItem = (type: 'likes' | 'dislikes', index: number, value: string) => {
    if (type === 'likes') {
      const newLikes = [...likes];
      newLikes[index] = value;
      setLikes(newLikes);
    } else {
      const newDislikes = [...dislikes];
      newDislikes[index] = value;
      setDislikes(newDislikes);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);

    try {
      let avatarUrl = null;

      if (avatarFile) {
        const fileExt = avatarFile.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError, data: uploadData } = await supabase.storage
          .from('avatars')
          .upload(fileName, avatarFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(fileName);
        
        avatarUrl = publicUrl;
      }

      const { error } = await supabase.from('characters').insert({
        owner_id: user.id,
        name: formData.name,
        age: formData.age ? parseInt(formData.age) : null,
        gender: formData.gender || null,
        species: formData.species || null,
        pronouns: formData.pronouns || null,
        avatar_url: avatarUrl,
        likes: likes.filter(Boolean),
        dislikes: dislikes.filter(Boolean),
        is_hidden: false,
      });

      if (error) throw error;

      toast({
        title: 'Character created!',
        description: `${formData.name} has been added to your collection.`,
      });

      // Reset form
      setFormData({ name: '', age: '', gender: '', species: '', pronouns: '' });
      setLikes(['']);
      setDislikes(['']);
      setAvatarFile(null);
      setAvatarPreview(null);
      
      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to create character',
        variant: 'destructive',
      });
    }

    setIsLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-glass-border max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-xl text-foreground">Create New OC</DialogTitle>
          <DialogDescription>Add a new character to your collection.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <label className="cursor-pointer group">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-purple/20 to-neon-pink/20 border-2 border-dashed border-primary/50 flex items-center justify-center overflow-hidden group-hover:border-primary transition-colors">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Preview" className="w-full h-full object-cover" />
                ) : (
                  <Upload className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                )}
              </div>
              <p className="text-xs text-muted-foreground text-center mt-2">Upload avatar</p>
            </label>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Name *</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Character name"
              className="bg-input border-border"
            />
          </div>

          {/* Basic Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age" className="text-foreground">Age</Label>
              <Input
                id="age"
                type="number"
                value={formData.age}
                onChange={(e) => setFormData({ ...formData, age: e.target.value })}
                placeholder="Age"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gender" className="text-foreground">Gender</Label>
              <Input
                id="gender"
                value={formData.gender}
                onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                placeholder="Gender"
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="species" className="text-foreground">Species</Label>
              <Input
                id="species"
                value={formData.species}
                onChange={(e) => setFormData({ ...formData, species: e.target.value })}
                placeholder="Human, Elf, etc."
                className="bg-input border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pronouns" className="text-foreground">Pronouns</Label>
              <Input
                id="pronouns"
                value={formData.pronouns}
                onChange={(e) => setFormData({ ...formData, pronouns: e.target.value })}
                placeholder="They/them"
                className="bg-input border-border"
              />
            </div>
          </div>

          {/* Likes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Likes</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => addItem('likes')}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {likes.map((like, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={like}
                  onChange={(e) => updateItem('likes', index, e.target.value)}
                  placeholder="Something they like"
                  className="bg-input border-border"
                />
                {likes.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem('likes', index)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          {/* Dislikes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">Dislikes</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => addItem('dislikes')}>
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            {dislikes.map((dislike, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  value={dislike}
                  onChange={(e) => updateItem('dislikes', index, e.target.value)}
                  placeholder="Something they dislike"
                  className="bg-input border-border"
                />
                {dislikes.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" onClick={() => removeItem('dislikes', index)}>
                    <Minus className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="submit"
            disabled={isLoading || !formData.name}
            className="w-full bg-gradient-to-r from-neon-purple via-neon-pink to-neon-blue text-primary-foreground font-semibold neon-border"
          >
            {isLoading ? 'Creating...' : 'Create Character'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};
