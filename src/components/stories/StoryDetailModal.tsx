import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Eye, Clock, User, Share2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface Story {
  id: string;
  title: string;
  content: string;
  cover_url: string | null;
  author_id: string;
  tags: string[];
  view_count: number;
  is_nsfw: boolean;
  created_at: string;
}

interface Author {
  username: string | null;
  avatar_url: string | null;
}

interface StoryDetailModalProps {
  storyId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const StoryDetailModal = ({ storyId, isOpen, onClose }: StoryDetailModalProps) => {
  const [story, setStory] = useState<Story | null>(null);
  const [author, setAuthor] = useState<Author | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (storyId && isOpen) {
      fetchStory();
    }
  }, [storyId, isOpen]);

  const fetchStory = async () => {
    if (!storyId) return;

    setLoading(true);

    // Fetch story
    const { data: storyData, error } = await supabase
      .from('stories')
      .select('*')
      .eq('id', storyId)
      .single();

    if (error || !storyData) {
      setLoading(false);
      return;
    }

    setStory({
      ...storyData,
      tags: storyData.tags || []
    });

    // Increment view count
    await supabase
      .from('stories')
      .update({ view_count: (storyData.view_count || 0) + 1 })
      .eq('id', storyId);

    // Fetch author
    const { data: profile } = await supabase
      .from('profiles')
      .select('username, active_character_id')
      .eq('id', storyData.author_id)
      .single();

    if (profile) {
      let avatarUrl = null;
      if (profile.active_character_id) {
        const { data: char } = await supabase
          .from('characters')
          .select('avatar_url')
          .eq('id', profile.active_character_id)
          .single();
        if (char) avatarUrl = char.avatar_url;
      }
      setAuthor({ username: profile.username, avatar_url: avatarUrl });
    }

    setLoading(false);
  };

  // Parse content with roleplay formatting
  const parseContent = (text: string) => {
    // Split by paragraphs
    const paragraphs = text.split('\n\n');
    
    return paragraphs.map((para, i) => {
      // Parse asterisks for action text
      const parts = para.split(/(\*[^*]+\*)/g);
      const parsed = parts.map((part, j) => {
        if (part.startsWith('*') && part.endsWith('*')) {
          return (
            <span key={j} className="italic text-muted-foreground">
              {part.slice(1, -1)}
            </span>
          );
        }
        // Parse parentheses for thoughts
        const thoughtParts = part.split(/(\([^)]+\))/g);
        return thoughtParts.map((tp, k) => {
          if (tp.startsWith('(') && tp.endsWith(')')) {
            return (
              <span key={`${j}-${k}`} className="italic text-primary/80">
                {tp}
              </span>
            );
          }
          return tp;
        });
      });

      return (
        <p key={i} className="mb-4 leading-relaxed">
          {parsed}
        </p>
      );
    });
  };

  const handleShare = async () => {
    if (story) {
      await navigator.clipboard.writeText(window.location.href);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/95 backdrop-blur-xl z-50 overflow-y-auto"
        >
          {loading ? (
            <div className="min-h-screen flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : story ? (
            <div className="min-h-screen">
              {/* Cover Image */}
              {story.cover_url && (
                <div className="relative h-64 sm:h-80 overflow-hidden">
                  <img 
                    src={story.cover_url} 
                    alt={story.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="fixed top-4 right-4 p-2 bg-background/80 backdrop-blur-sm rounded-full z-10 hover:bg-secondary transition-colors"
              >
                <X className="w-6 h-6 text-foreground" />
              </button>

              {/* Content */}
              <div className="max-w-2xl mx-auto px-4 pb-12 -mt-16 relative z-10">
                {/* NSFW Badge */}
                {story.is_nsfw && (
                  <div className="inline-block px-3 py-1 bg-destructive text-destructive-foreground text-xs font-bold rounded mb-4">
                    18+ NSFW Content
                  </div>
                )}

                {/* Title */}
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-4">
                  {story.title}
                </h1>

                {/* Author & Meta */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-secondary">
                      {author?.avatar_url ? (
                        <img src={author.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <span className="text-sm text-foreground">
                      @{author?.username || 'unknown'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Eye className="w-4 h-4" />
                    {story.view_count} views
                  </div>

                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Clock className="w-4 h-4" />
                    {format(new Date(story.created_at), 'MMM d, yyyy')}
                  </div>

                  <button
                    onClick={handleShare}
                    className="flex items-center gap-1 text-sm text-muted-foreground hover:text-primary transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                    Share
                  </button>
                </div>

                {/* Tags */}
                {story.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-8">
                    {story.tags.map(tag => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-secondary text-sm text-muted-foreground rounded-full"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Story Content */}
                <div className="text-foreground">
                  {parseContent(story.content)}
                </div>
              </div>
            </div>
          ) : (
            <div className="min-h-screen flex items-center justify-center">
              <p className="text-muted-foreground">Story not found</p>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
};
