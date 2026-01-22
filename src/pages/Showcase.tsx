import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, Share2, Plus, Sparkles } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { ShowcaseCard } from '@/components/showcase/ShowcaseCard';
import { AddToShowcaseModal } from '@/components/showcase/AddToShowcaseModal';
import { ShowcaseDetailModal } from '@/components/showcase/ShowcaseDetailModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

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

export default function Showcase() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [showcaseItems, setShowcaseItems] = useState<ShowcaseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedShowcase, setSelectedShowcase] = useState<ShowcaseItem | null>(null);
  const [sortBy, setSortBy] = useState<'latest' | 'top-rated'>('latest');

  useEffect(() => {
    fetchShowcaseItems();

    // Subscribe to realtime updates
    const channel = supabase
      .channel('showcase-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'oc_showcase' }, () => {
        fetchShowcaseItems();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sortBy]);

  const fetchShowcaseItems = async () => {
    setLoading(true);
    
    const orderColumn = sortBy === 'top-rated' ? 'average_rating' : 'created_at';
    
    const { data, error } = await supabase
      .from('oc_showcase')
      .select(`
        *,
        character:characters(id, name, avatar_url, background_url, bio, age, species, gender, pronouns),
        profile:profiles(username)
      `)
      .order(orderColumn, { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error fetching showcase:', error);
    } else {
      setShowcaseItems(data as ShowcaseItem[] || []);
    }
    
    setLoading(false);
  };

  const handleShareToFeed = async (item: ShowcaseItem) => {
    if (!user) return;

    const { error } = await supabase.from('posts').insert({
      author_id: user.id,
      character_id: item.character_id,
      content: `Check out my OC: ${item.character.name}!\n\n${item.character.bio || ''}`,
      background_url: item.character.background_url,
      image_url: item.character.avatar_url
    });

    if (error) {
      toast({ title: 'Error', description: 'Failed to share to feed', variant: 'destructive' });
    } else {
      toast({ title: 'Shared!', description: 'Your OC has been shared to the feed' });
    }
  };

  return (
    <AppLayout 
      title="OC Showcase"
      headerLeftIcon="none"
      headerRightIcon="notifications"
    >
      <div className="max-w-lg mx-auto">
        {/* Header with Add Button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Featured OCs</h2>
          </div>
          <Button
            onClick={() => setShowAddModal(true)}
            size="sm"
            className="gap-1"
          >
            <Plus className="w-4 h-4" />
            Showcase OC
          </Button>
        </div>

        {/* Sort Toggle */}
        <div className="flex gap-2 mb-4 p-1 bg-card rounded-xl border border-border">
          <button
            onClick={() => setSortBy('latest')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${
              sortBy === 'latest'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Latest
          </button>
          <button
            onClick={() => setSortBy('top-rated')}
            className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1 ${
              sortBy === 'top-rated'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Star className="w-4 h-4" />
            Top Rated
          </button>
        </div>

        {/* Showcase Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : showcaseItems.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <Sparkles className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-muted-foreground mb-4">
              No OCs showcased yet. Be the first!
            </p>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Your OC
            </Button>
          </motion.div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <AnimatePresence mode="popLayout">
              {showcaseItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <ShowcaseCard
                    item={item}
                    onClick={() => setSelectedShowcase(item)}
                    onShare={() => handleShareToFeed(item)}
                    isOwner={item.user_id === user?.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {/* Add to Showcase Modal */}
      <AddToShowcaseModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onSuccess={fetchShowcaseItems}
      />

      {/* Showcase Detail Modal */}
      <ShowcaseDetailModal
        showcase={selectedShowcase}
        onClose={() => setSelectedShowcase(null)}
        onShare={() => selectedShowcase && handleShareToFeed(selectedShowcase)}
        onUpdate={fetchShowcaseItems}
      />
    </AppLayout>
  );
}
