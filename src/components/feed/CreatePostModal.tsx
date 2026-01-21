import { useState, useEffect } from 'react';
import { X, Image, Video, Loader2, Globe, Users, Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';

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
  const { user, profile } = useAuth();
  const { toast } = useToast();
  const [content, setContent] = useState('');
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [mediaUrl, setMediaUrl] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPosting, setIsPosting] = useState(false);

  useEffect(() => {
    if (user && isOpen) {
      fetchCharacters();
    }
  }, [user, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setContent('');
      setMediaUrl(null);
      setMediaType(null);
    }
  }, [isOpen]);

  const fetchCharacters = async () => {
    if (!user) return;
    // Only fetch user-created characters (exclude AI-generated NPCs)
    const { data } = await supabase
      .from('characters')
      .select('id, name, avatar_url')
      .eq('owner_id', user.id)
      .eq('is_hidden', false)
      .eq('is_npc', false); // Exclude AI-generated NPCs
    
    if (data) {
      setCharacters(data);
      if (data.length > 0 && !selectedCharacterId) {
        setSelectedCharacterId(data[0].id);
      }
    }
  };

  const handleMediaUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    // Validate file size (50MB for videos, 10MB for images)
    const maxSize = type === 'video' ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({ 
        title: 'File too large', 
        description: `Maximum size is ${type === 'video' ? '50MB' : '10MB'}`, 
        variant: 'destructive' 
      });
      return;
    }

    setIsUploading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/${Date.now()}.${fileExt}`;

    const { error } = await supabase.storage
      .from('post-images')
      .upload(fileName, file);

    if (error) {
      toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
      setIsUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(fileName);
    setMediaUrl(urlData.publicUrl);
    setMediaType(type);
    setIsUploading(false);
  };

  const handleSubmit = async () => {
    if (!user || !content.trim()) return;

    setIsPosting(true);

    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      character_id: selectedCharacterId,
      content: content.trim(),
      image_url: mediaUrl
    });

    if (error) {
      console.error('Post creation error:', error);
      toast({ title: 'Error', description: 'Failed to create post', variant: 'destructive' });
      setIsPosting(false);
      return;
    }

    toast({ title: 'Posted!', description: 'Your post is now live' });
    setContent('');
    setMediaUrl(null);
    setMediaType(null);
    setIsPosting(false);
    onPostCreated();
  };

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);
  const displayName = selectedCharacter?.name || profile?.username || 'You';
  const displayAvatar = selectedCharacter?.avatar_url;

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-card border border-border rounded-2xl z-50 flex flex-col max-h-[90vh] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border">
              <button 
                onClick={onClose} 
                className="p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-5 h-5 text-muted-foreground" />
              </button>
              <h2 className="font-semibold text-foreground text-lg">Create Post</h2>
              <Button
                onClick={handleSubmit}
                disabled={!content.trim() || isPosting}
                size="sm"
                className="px-6 rounded-full"
              >
                {isPosting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Post'}
              </Button>
            </div>

            {/* Character Selection Header */}
            <div className="flex items-center gap-3 p-4 border-b border-border">
              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-primary flex-shrink-0">
                {displayAvatar ? (
                  <img src={displayAvatar} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-primary/20 flex items-center justify-center text-lg font-medium text-primary">
                    {displayName[0]?.toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-foreground">{displayName}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Globe className="w-3 h-3" />
                  <span>Public</span>
                </div>
              </div>
            </div>

            {/* Character Selector Pills */}
            {characters.length > 0 && (
              <div className="p-3 border-b border-border overflow-x-auto">
                <p className="text-xs text-muted-foreground mb-2">Post as:</p>
                <div className="flex gap-2 flex-wrap">
                  {characters.map((char) => (
                    <button
                      key={char.id}
                      onClick={() => setSelectedCharacterId(char.id)}
                      className={`flex items-center gap-2 px-3 py-2 rounded-full border transition-all ${
                        selectedCharacterId === char.id
                          ? 'border-primary bg-primary/10 text-primary ring-2 ring-primary/20'
                          : 'border-border text-muted-foreground hover:border-muted-foreground hover:bg-muted/50'
                      }`}
                    >
                      <div className="w-6 h-6 rounded-full overflow-hidden">
                        {char.avatar_url ? (
                          <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-medium">
                            {char.name[0]}
                          </div>
                        )}
                      </div>
                      <span className="text-sm font-medium whitespace-nowrap">{char.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-4">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={`What's on ${displayName}'s mind?`}
                className="w-full bg-transparent text-foreground placeholder:text-muted-foreground resize-none outline-none min-h-[120px] text-lg"
                maxLength={1000}
                autoFocus
              />

              {/* Media preview */}
              {mediaUrl && (
                <div className="relative mt-3 rounded-xl overflow-hidden border border-border bg-muted">
                  {mediaType === 'video' ? (
                    <video 
                      src={mediaUrl} 
                      controls 
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  ) : (
                    <img 
                      src={mediaUrl} 
                      alt="Upload" 
                      className="w-full h-auto max-h-64 object-contain"
                    />
                  )}
                  <button
                    onClick={() => {
                      setMediaUrl(null);
                      setMediaType(null);
                    }}
                    className="absolute top-2 right-2 p-2 bg-black/60 hover:bg-black/80 rounded-full transition-colors"
                  >
                    <X className="w-4 h-4 text-white" />
                  </button>
                </div>
              )}
            </div>

            {/* Actions Footer */}
            <div className="border-t border-border p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <span className="text-sm text-muted-foreground mr-2">Add to post:</span>
                  
                  {/* Image Upload */}
                  <label className="p-2.5 hover:bg-muted rounded-full cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => handleMediaUpload(e, 'image')}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading && mediaType === 'image' ? (
                      <Loader2 className="w-5 h-5 text-green-500 animate-spin" />
                    ) : (
                      <Image className="w-5 h-5 text-green-500" />
                    )}
                  </label>

                  {/* Video Upload */}
                  <label className="p-2.5 hover:bg-muted rounded-full cursor-pointer transition-colors">
                    <input
                      type="file"
                      accept="video/*"
                      onChange={(e) => handleMediaUpload(e, 'video')}
                      className="hidden"
                      disabled={isUploading}
                    />
                    {isUploading && mediaType === 'video' ? (
                      <Loader2 className="w-5 h-5 text-red-500 animate-spin" />
                    ) : (
                      <Video className="w-5 h-5 text-red-500" />
                    )}
                  </label>
                </div>

                <span className="text-xs text-muted-foreground">
                  {content.length}/1000
                </span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
