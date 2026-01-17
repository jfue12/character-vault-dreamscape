import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { supabase } from '@/integrations/supabase/client';
import { StoryCard } from '@/components/stories/StoryCard';
import { CreateStoryModal } from '@/components/stories/CreateStoryModal';
import { StoryDetailModal } from '@/components/stories/StoryDetailModal';
import { BookOpen, Plus } from 'lucide-react';

interface Story {
  id: string;
  title: string;
  cover_url: string | null;
  author_id: string;
  tags: string[];
  view_count: number;
  is_nsfw: boolean;
  created_at: string;
  author?: {
    username: string | null;
    avatar_url: string | null;
  };
}

export default function Plots() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchStories();
    }
  }, [user]);

  const fetchStories = async () => {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(50);

    if (!error && data) {
      // Fetch author info for each story
      const storiesWithAuthors = await Promise.all(
        data.map(async (story) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('username, active_character_id')
            .eq('id', story.author_id)
            .single();

          let avatarUrl = null;
          if (profile?.active_character_id) {
            const { data: char } = await supabase
              .from('characters')
              .select('avatar_url')
              .eq('id', profile.active_character_id)
              .single();
            if (char) avatarUrl = char.avatar_url;
          }

          return {
            ...story,
            tags: story.tags || [],
            author: {
              username: profile?.username || null,
              avatar_url: avatarUrl
            }
          };
        })
      );

      setStories(storiesWithAuthors);
    }
    setLoading(false);
  };

  return (
    <AppLayout title="Stories" showFab>
      <div className="max-w-2xl mx-auto">
        {/* Create Button */}
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowCreateModal(true)}
          className="w-full mb-6 py-4 border-2 border-dashed border-border rounded-xl flex items-center justify-center gap-2 text-muted-foreground hover:border-primary hover:text-primary transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>Create a Story</span>
        </motion.button>

        {/* Stories Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : stories.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">No stories yet</p>
            <p className="text-sm text-muted-foreground mt-1">Be the first to publish!</p>
          </motion.div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stories.map((story) => (
              <StoryCard
                key={story.id}
                id={story.id}
                title={story.title}
                coverUrl={story.cover_url}
                authorName={story.author?.username || 'Unknown'}
                authorAvatar={story.author?.avatar_url || null}
                tags={story.tags}
                viewCount={story.view_count || 0}
                isNsfw={story.is_nsfw}
                createdAt={story.created_at}
                onClick={() => setSelectedStoryId(story.id)}
              />
            ))}
          </div>
        )}
      </div>

      <CreateStoryModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchStories}
      />

      <StoryDetailModal
        storyId={selectedStoryId}
        isOpen={!!selectedStoryId}
        onClose={() => setSelectedStoryId(null)}
      />
    </AppLayout>
  );
}
