import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { AppLayout } from '@/components/layout/AppLayout';
import { PostCard } from '@/components/feed/PostCard';
import { CreatePostModal } from '@/components/feed/CreatePostModal';
import { Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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

export default function Feed() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    fetchPosts();
    
    // Subscribe to new posts
    const channel = supabase
      .channel('feed-posts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'posts' },
        (payload) => {
          fetchSinglePost(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const fetchPosts = async () => {
    const { data: postsData, error } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        image_url,
        likes_count,
        comments_count,
        created_at,
        author_id,
        character_id
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching posts:', error);
      setLoading(false);
      return;
    }

    if (!postsData) {
      setLoading(false);
      return;
    }

    // Fetch authors and characters
    const authorIds = [...new Set(postsData.map(p => p.author_id))];
    const characterIds = [...new Set(postsData.filter(p => p.character_id).map(p => p.character_id as string))];

    const [authorsResult, charactersResult, likesResult] = await Promise.all([
      supabase.from('profiles').select('id, username').in('id', authorIds),
      characterIds.length > 0 
        ? supabase.from('characters').select('id, name, avatar_url').in('id', characterIds)
        : Promise.resolve({ data: [] }),
      user 
        ? supabase.from('post_likes').select('post_id').eq('user_id', user.id)
        : Promise.resolve({ data: [] })
    ]);

    const authorMap = Object.fromEntries((authorsResult.data || []).map(a => [a.id, a]));
    const characterMap = Object.fromEntries((charactersResult.data || []).map(c => [c.id, c]));
    const likedPostIds = new Set((likesResult.data || []).map(l => l.post_id));

    const enrichedPosts: Post[] = postsData.map(post => ({
      id: post.id,
      content: post.content,
      image_url: post.image_url,
      likes_count: post.likes_count,
      comments_count: post.comments_count,
      created_at: post.created_at,
      author: authorMap[post.author_id] || { id: post.author_id, username: 'Unknown' },
      character: post.character_id ? characterMap[post.character_id] || null : null,
      isLiked: likedPostIds.has(post.id)
    }));

    setPosts(enrichedPosts);
    setLoading(false);
  };

  const fetchSinglePost = async (postId: string) => {
    const { data: postData } = await supabase
      .from('posts')
      .select(`
        id,
        content,
        image_url,
        likes_count,
        comments_count,
        created_at,
        author_id,
        character_id
      `)
      .eq('id', postId)
      .single();

    if (!postData) return;

    const [authorResult, characterResult] = await Promise.all([
      supabase.from('profiles').select('id, username').eq('id', postData.author_id).single(),
      postData.character_id 
        ? supabase.from('characters').select('id, name, avatar_url').eq('id', postData.character_id).single()
        : Promise.resolve({ data: null })
    ]);

    const newPost: Post = {
      id: postData.id,
      content: postData.content,
      image_url: postData.image_url,
      likes_count: postData.likes_count,
      comments_count: postData.comments_count,
      created_at: postData.created_at,
      author: authorResult.data || { id: postData.author_id, username: 'Unknown' },
      character: characterResult.data,
      isLiked: false
    };

    setPosts(prev => [newPost, ...prev]);
  };

  const handleLike = async (postId: string) => {
    if (!user) {
      toast({ title: 'Sign in required', description: 'Please sign in to like posts', variant: 'destructive' });
      return;
    }

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    if (post.isLiked) {
      // Unlike
      await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', user.id);
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, isLiked: false, likes_count: p.likes_count - 1 } : p
      ));
    } else {
      // Like
      await supabase.from('post_likes').insert({ post_id: postId, user_id: user.id });
      setPosts(prev => prev.map(p => 
        p.id === postId ? { ...p, isLiked: true, likes_count: p.likes_count + 1 } : p
      ));
    }
  };

  const handleDelete = async (postId: string) => {
    if (!user) return;
    
    const { error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .eq('author_id', user.id);
    
    if (error) {
      toast({ title: 'Failed to delete post', variant: 'destructive' });
    } else {
      setPosts(prev => prev.filter(p => p.id !== postId));
      toast({ title: 'Post deleted' });
    }
  };

  const handlePostCreated = () => {
    setShowCreateModal(false);
    fetchPosts();
  };

  return (
    <AppLayout 
      title="Feed" 
      headerLeftIcon="none"
      headerRightIcon="notifications"
      showFab
      fabOnClick={user ? () => setShowCreateModal(true) : undefined}
    >
      <div className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : posts.length === 0 ? (
          <div className="text-center py-20 px-4">
            <p className="text-muted-foreground">No posts yet. Be the first to share!</p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            <AnimatePresence>
              {posts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <PostCard
                    post={post}
                    onLike={handleLike}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Create Post Modal */}
        <CreatePostModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onPostCreated={handlePostCreated}
        />
      </div>
    </AppLayout>
  );
}
