import { useState, useEffect } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Star, MessageSquare, Share2, Send, Trash2, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

interface ShowcaseItem {
  id: string;
  character_id: string;
  user_id: string;
  caption: string | null;
  created_at: string;
  average_rating: number;
  rating_count: number;
  comment_count: number;
  character: {
    id: string;
    name: string;
    avatar_url: string | null;
    background_url: string | null;
    bio: string | null;
    age: number | null;
    species: string | null;
    gender: string | null;
    pronouns: string | null;
  };
  profile: {
    username: string | null;
  };
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profile: {
    username: string | null;
  };
}

interface ShowcaseDetailModalProps {
  showcase: ShowcaseItem | null;
  onClose: () => void;
  onShare: () => void;
  onUpdate: () => void;
}

export const ShowcaseDetailModal = ({ showcase, onClose, onShare, onUpdate }: ShowcaseDetailModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userRating, setUserRating] = useState<number | null>(null);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loadingComments, setLoadingComments] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (showcase) {
      fetchUserRating();
      fetchComments();
    }
  }, [showcase?.id]);

  const fetchUserRating = async () => {
    if (!showcase || !user) return;

    const { data } = await supabase
      .from('oc_ratings')
      .select('rating')
      .eq('showcase_id', showcase.id)
      .eq('user_id', user.id)
      .maybeSingle();

    setUserRating(data?.rating || null);
  };

  const fetchComments = async () => {
    if (!showcase) return;
    setLoadingComments(true);

    const { data } = await supabase
      .from('oc_comments')
      .select(`
        id, content, created_at, user_id,
        profile:profiles(username)
      `)
      .eq('showcase_id', showcase.id)
      .order('created_at', { ascending: false })
      .limit(50);

    setComments(data as Comment[] || []);
    setLoadingComments(false);
  };

  const handleRate = async (rating: number) => {
    if (!showcase || !user) return;

    if (showcase.user_id === user.id) {
      toast({ title: "Can't rate your own OC", variant: 'destructive' });
      return;
    }

    const { error } = await supabase
      .from('oc_ratings')
      .upsert({
        showcase_id: showcase.id,
        user_id: user.id,
        rating
      }, { onConflict: 'showcase_id,user_id' });

    if (error) {
      toast({ title: 'Error', description: 'Failed to submit rating', variant: 'destructive' });
    } else {
      setUserRating(rating);
      onUpdate();
      toast({ title: 'Rated!', description: `You gave ${rating} stars` });
    }
  };

  const handleComment = async () => {
    if (!showcase || !user || !newComment.trim()) return;

    setSubmitting(true);

    const { error } = await supabase.from('oc_comments').insert({
      showcase_id: showcase.id,
      user_id: user.id,
      content: newComment.trim()
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
    } else {
      setNewComment('');
      fetchComments();
      onUpdate();
    }

    setSubmitting(false);
  };

  const handleDeleteComment = async (commentId: string) => {
    const { error } = await supabase
      .from('oc_comments')
      .delete()
      .eq('id', commentId);

    if (!error) {
      setComments(prev => prev.filter(c => c.id !== commentId));
      onUpdate();
    }
  };

  const handleDeleteShowcase = async () => {
    if (!showcase) return;

    const { error } = await supabase
      .from('oc_showcase')
      .delete()
      .eq('id', showcase.id);

    if (error) {
      toast({ title: 'Error', description: 'Failed to remove from showcase', variant: 'destructive' });
    } else {
      toast({ title: 'Removed', description: 'OC removed from showcase' });
      onUpdate();
      onClose();
    }
  };

  if (!showcase) return null;

  const isOwner = showcase.user_id === user?.id;
  const char = showcase.character;

  return (
    <Dialog open={!!showcase} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-hidden p-0">
        {/* Header Image */}
        <div className="relative h-48">
          {char.background_url || char.avatar_url ? (
            <img
              src={char.background_url || char.avatar_url || ''}
              alt={char.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-900/30" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/50 to-transparent" />
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 p-2 bg-black/50 rounded-full"
          >
            <X className="w-4 h-4 text-white" />
          </button>

          {/* Avatar */}
          <div className="absolute -bottom-12 left-4">
            <div className="w-24 h-24 rounded-xl overflow-hidden border-4 border-background">
              {char.avatar_url ? (
                <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/40 to-purple-900/40 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary/60">
                    {char.name[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="pt-14 px-4 pb-4 space-y-4 overflow-y-auto max-h-[calc(90vh-192px)]">
          {/* Name & Actions */}
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-xl font-bold text-foreground">{char.name}</h2>
              <p className="text-sm text-muted-foreground">by @{showcase.profile.username}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="icon" onClick={onShare}>
                <Share2 className="w-4 h-4" />
              </Button>
              {isOwner && (
                <Button variant="outline" size="icon" onClick={handleDeleteShowcase}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              )}
            </div>
          </div>

          {/* Character Info */}
          <div className="flex flex-wrap gap-2 text-xs">
            {char.age && (
              <span className="px-2 py-1 bg-muted rounded-full">{char.age} years</span>
            )}
            {char.species && (
              <span className="px-2 py-1 bg-muted rounded-full">{char.species}</span>
            )}
            {char.gender && (
              <span className="px-2 py-1 bg-muted rounded-full">{char.gender}</span>
            )}
            {char.pronouns && (
              <span className="px-2 py-1 bg-muted rounded-full">{char.pronouns}</span>
            )}
          </div>

          {/* Bio */}
          {(char.bio || showcase.caption) && (
            <p className="text-sm text-muted-foreground">
              {showcase.caption || char.bio}
            </p>
          )}

          {/* Rating Section */}
          <div className="p-3 bg-muted/50 rounded-xl">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Rate this OC</span>
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="font-semibold">
                  {showcase.average_rating > 0 ? showcase.average_rating.toFixed(1) : '-'}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({showcase.rating_count})
                </span>
              </div>
            </div>
            <div className="flex justify-center gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => handleRate(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  disabled={isOwner}
                  className={`p-1 transition-transform ${isOwner ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
                >
                  <Star
                    className={`w-8 h-8 transition-colors ${
                      star <= (hoverRating || userRating || 0)
                        ? 'text-yellow-400 fill-yellow-400'
                        : 'text-muted-foreground'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Comments Section */}
          <div className="space-y-3">
            <h3 className="font-medium flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Comments ({showcase.comment_count})
            </h3>

            {/* Comment Input */}
            <div className="flex gap-2">
              <Input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Write a comment..."
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleComment()}
              />
              <Button size="icon" onClick={handleComment} disabled={!newComment.trim() || submitting}>
                <Send className="w-4 h-4" />
              </Button>
            </div>

            {/* Comments List */}
            <div className="space-y-2 max-h-48 overflow-y-auto">
              <AnimatePresence mode="popLayout">
                {comments.map((comment) => (
                  <motion.div
                    key={comment.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="p-2 bg-muted/30 rounded-lg group"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="text-sm font-medium">@{comment.profile.username}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      {comment.user_id === user?.id && (
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-destructive"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{comment.content}</p>
                  </motion.div>
                ))}
              </AnimatePresence>
              {loadingComments && (
                <div className="text-center py-4">
                  <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              )}
              {!loadingComments && comments.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No comments yet. Be the first!
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
