import { useState, useEffect } from 'react';
import { X, Image, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated: () => void;
}

export const CreatePostModal = ({ isOpen, onClose, onPostCreated }: CreatePostModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      fetchCharacters();
    }
  }, [user, isOpen]);

  const fetchCharacters = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('characters')
      .select('id, name, avatar_url')
      .eq('owner_id', user.id)
      .eq('is_hidden', false);
    
    if (data) {
      setCharacters(data);
      if (data.length > 0 && !selectedCharacterId) {
        setSelectedCharacterId(data[0].id);
      }
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from('post-images')
      .upload(fileName, file);

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
    setImageUrl(urlData.publicUrl);
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setIsPosting(true);

    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      character_id: selectedCharacterId,
      content: content.trim(),
      image_url: imageUrl
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
      setIsPosting(false);
      return;
    }

    toast({ title: 'Posted!', description: 'Your post is live' });
    setContent('');
    setImageUrl(null);
    setIsPosting(false);
    onPostCreated();
  };

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-0 left-0 right-0 bg-card border-t border-border rounded-t-2xl z-50 max-h-[80vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button onClick={onClose} className="text-muted-foreground">
                Cancel
              </button>
              <h2 className="font-semibold text-foreground">New Post</h2>
              <button
                onClick={handleSubmit}
                disabled={!content.trim() || isPosting}
                className="px-4 py-1.5 bg-primary text-primary-foreground rounded-full text-sm font-medium disabled:opacity-50"
              >
                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </button>
            </div>

            {/* Character Selector */}
            {characters.length > 0 && (
              <div className="p-3 border-b border-border overflow-x-auto">
                <div className="flex gap-2">
                  {characters.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacterId(char.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full border transition-colors ${
                        selectedCharacterId === char.id
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border text-muted-foreground hover:border-muted-foreground'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-full overflow-hidden">
                        {char.avatar_url ? (
                          <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-[10px]">
                            {char.name[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-sm whitespace-nowrap">{char.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content */}
            <div className="p-4">
              <div className="flex gap-3">
                {/* Avatar */}
                <div className="w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0">
                  {selectedCharacter?.avatar_url ? (
                    <img src={selectedCharacter.avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
                      {(selectedCharacter?.name || 'U')[0]}
                    </div>
                  )}
                </div>

                {/* Text input */}
                <div className="flex-1">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's happening?"
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[100px]"
                    maxLength={500}
                  />

                  {/* Image preview */}
                  {imageUrl && (
                    <div className="relative mt-3 rounded-xl overflow-hidden border border-border">
                      <img src={imageUrl} alt="Upload" className="w-full h-auto max-h-48 object-cover" />
                      <button
                        onClick={() => setImageUrl(null)}
                        className="absolute top-2 right-2 p-1 bg-black/50 rounded-full"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-4 border-t border-border">
              <div className="flex items-center gap-2">
                <label className="p-2 hover:bg-muted rounded-full cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                    disabled={isUploading}
                  />
                  {isUploading ? (
                    <Loader2 className="w-5 h-5 text-primary animate-spin" />
                  ) : (
                    <Image className="w-5 h-5 text-primary" />
                  )}
                </label>
              </div>
              <span className="text-xs text-muted-foreground">
                {content.length}/500
              </span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
