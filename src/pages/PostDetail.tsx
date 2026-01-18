import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, Heart, Send } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: {
    id: string;
    username: string;
  };
  character: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  isLiked?: boolean;
}

interface Comment {
  id: string;
  content: string;
  created_at: string;
  author: {
    id: string;
    username: string;
  };
  character: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
}

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

export default function PostDetail() {
  const { postId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [post, setPost] = useState<Post | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (postId) {
      fetchPost();
      fetchComments();
    }
    if (user) {
      fetchUserCharacters();
    }
  }, [postId, user]);

  const fetchPost = async () => {
    if (!postId) return;

    const { data: postData, error } = await supabase
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error || !postData) {
      toast({ title: 'Post not found', variant: 'destructive' });
      navigate('/feed');
      return;
    }

    const [authorResult, characterResult, likeResult] = await Promise.all([
      supabase.from('profiles').select('id, username').eq('id', postData.author_id).single(),
      postData.character_id 
        ? supabase.from('characters').select('id, name, avatar_url').eq('id', postData.character_id).single()
        : Promise.resolve({ data: null }),
      user 
        ? supabase.from('post_likes').select('id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    setPost({
      id: postData.id,
      content: postData.content,
      image_url: postData.image_url,
      likes_count: postData.likes_count,
      comments_count: postData.comments_count,
      created_at: postData.created_at,
      author: authorResult.data || { id: postData.author_id, username: 'Unknown' },
      character: characterResult.data,
      isLiked: !!likeResult.data
    });

    setLoading(false);
  };

  const fetchComments = async () => {
    if (!postId) return;

    const { data, error } = await supabase
      .from('post_comments')
      .select('*')
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (!error && data) {
      const authorIds = [...new Set(data.map(c => c.author_id))];
      const characterIds = [...new Set(data.filter(c => c.character_id).map(c => c.character_id as string))];

      const [authorsResult, charactersResult] = await Promise.all([
        supabase.from('profiles').select('id, username').in('id', authorIds),
        characterIds.length > 0 
          ? supabase.from('characters').select('id, name, avatar_url').in('id', characterIds)
          : Promise.resolve({ data: [] })
      ]);

      const authorMap = Object.fromEntries((authorsResult.data || []).map(a => [a.id, a]));
      const characterMap = Object.fromEntries((charactersResult.data || []).map(c => [c.id, c]));

      const enrichedComments: Comment[] = data.map(comment => ({
        id: comment.id,
        content: comment.content,
        created_at: comment.created_at,
        author: authorMap[comment.author_id] || { id: comment.author_id, username: 'Unknown' },
        character: comment.character_id ? characterMap[comment.character_id] || null : null
      }));

      setComments(enrichedComments);
    }
  };

  const fetchUserCharacters = async () => {
    if (!user) return;

    const { data } = await supabase
      .from('characters')
      .select('id, name, avatar_url')
      .eq('owner_id', user.id)
      .eq('is_hidden', false);

    if (data) {
      setCharacters(data);
      if (data.length > 0) {
        setSelectedCharacterId(data[0].id);
      }
    }
  };

  const handleLike = async () => {
    if (!user || !post) {
      toast({ title: 'Sign in required', variant: 'destructive' });
      return;
    }

    if (post.isLiked) {
      await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', user.id);
      setPost(prev => prev ? { ...prev, isLiked: false, likes_count: prev.likes_count - 1 } : null);
    } else {
      await supabase.from('post_likes').insert({ post_id: post.id, user_id: user.id });
      setPost(prev => prev ? { ...prev, isLiked: true, likes_count: prev.likes_count + 1 } : null);
    }
  };

  const handleSubmitComment = async () => {
    if (!user || !postId || !newComment.trim()) return;

    setSubmitting(true);

    const { error } = await supabase
      .from('post_comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        character_id: selectedCharacterId || null,
        content: newComment.trim()
      });

    if (error) {
      toast({ title: 'Error', description: 'Failed to post comment', variant: 'destructive' });
    } else {
      setNewComment('');
      fetchComments();
      setPost(prev => prev ? { ...prev, comments_count: prev.comments_count + 1 } : null);
    }

    setSubmitting(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!post) return null;

  const displayName = post.character?.name || post.author.username || 'Unknown';
  const avatar = post.character?.avatar_url;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background border-b border-border">
        <div className="flex items-center px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="font-semibold text-foreground ml-2">Post</h1>
        </div>
      </header>

      <main className="flex-1 pb-24">
        {/* Post */}
        <article className="p-4 border-b border-border">
          <div className="flex items-start gap-3">
            <button 
              onClick={() => navigate(`/user/${post.author.id}`)}
              className="w-12 h-12 rounded-full overflow-hidden border border-border"
            >
              {avatar ? (
                <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/20 flex items-center justify-center text-lg font-medium text-primary">
                  {displayName[0]?.toUpperCase()}
                </div>
              )}
            </button>

            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">{displayName}</span>
                <span className="text-muted-foreground text-sm">@{post.author.username}</span>
              </div>

              <p className="text-foreground mt-2 whitespace-pre-wrap">{post.content}</p>

              {post.image_url && (
                <div className="mt-3 rounded-xl overflow-hidden border border-border">
                  <img src={post.image_url} alt="Post" className="w-full" />
                </div>
              )}

              <div className="text-muted-foreground text-sm mt-3">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </div>

              <div className="flex items-center gap-6 mt-4 pt-4 border-t border-border">
                <button onClick={handleLike} className="flex items-center gap-2 text-muted-foreground hover:text-red-500">
                  <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-red-500 text-red-500' : ''}`} />
                  <span>{post.likes_count}</span>
                </button>
                <span className="text-muted-foreground">{post.comments_count} comments</span>
              </div>
            </div>
          </div>
        </article>

        {/* Comments */}
        <div className="divide-y divide-border">
          <AnimatePresence>
            {comments.map((comment) => {
              const cDisplayName = comment.character?.name || comment.author.username;
              const cAvatar = comment.character?.avatar_url;

              return (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4"
                >
                  <div className="flex items-start gap-3">
                    <button 
                      onClick={() => navigate(`/user/${comment.author.id}`)}
                      className="w-8 h-8 rounded-full overflow-hidden border border-border"
                    >
                      {cAvatar ? (
                        <img src={cAvatar} alt={cDisplayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs font-medium text-primary">
                          {cDisplayName?.[0]?.toUpperCase()}
                        </div>
                      )}
                    </button>

                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-foreground text-sm">{cDisplayName}</span>
                        <span className="text-muted-foreground text-xs">
                          {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-foreground text-sm mt-1">{comment.content}</p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {comments.length === 0 && (
            <div className="py-12 text-center text-muted-foreground">
              No comments yet. Be the first!
            </div>
          )}
        </div>
      </main>

      {/* Comment Input */}
      {user && (
        <div className="fixed bottom-0 left-0 right-0 bg-background border-t border-border p-4 safe-area-inset-bottom">
          <div className="max-w-lg mx-auto">
            {/* Character selector */}
            {characters.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto pb-2">
                {characters.map(char => (
                  <button
                    key={char.id}
                    onClick={() => setSelectedCharacterId(char.id)}
                    className={`flex-shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 transition-all ${
                      selectedCharacterId === char.id ? 'border-primary' : 'border-transparent'
                    }`}
                  >
                    {char.avatar_url ? (
                      <img src={char.avatar_url} alt={char.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-primary/20 flex items-center justify-center text-xs text-primary">
                        {char.name[0]}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}

            <div className="flex gap-2">
              <Input
                placeholder="Write a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSubmitComment()}
                className="flex-1"
              />
              <Button
                onClick={handleSubmitComment}
                disabled={!newComment.trim() || submitting}
                size="icon"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
