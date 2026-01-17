import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { WorldCard } from '@/components/worlds/WorldCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Search, Plus, Globe, Filter } from 'lucide-react';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  is_public: boolean;
  is_nsfw: boolean;
  owner_id: string;
  created_at: string;
}

const POPULAR_TAGS = ['Fantasy', 'Sci-Fi', 'Romance', 'Horror', 'Slice of Life', 'Action', 'Mystery'];

export default function Worlds() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loadingWorlds, setLoadingWorlds] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchWorlds();
    }
  }, [user, profile]);

  const fetchWorlds = async () => {
    setLoadingWorlds(true);
    
    let query = supabase
      .from('worlds')
      .select('*')
      .eq('is_public', true)
      .order('created_at', { ascending: false });

    // Filter NSFW content for minors
    if (profile?.is_minor) {
      query = query.eq('is_nsfw', false);
    }

    const { data, error } = await query;

    if (!error && data) {
      setWorlds(data);
    }
    setLoadingWorlds(false);
  };

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag)
        ? prev.filter(t => t !== tag)
        : [...prev, tag]
    );
  };

  const filteredWorlds = worlds.filter(world => {
    const matchesSearch = world.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      world.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesTags = selectedTags.length === 0 ||
      selectedTags.some(tag => world.tags.map(t => t.toLowerCase()).includes(tag.toLowerCase()));

    return matchesSearch && matchesTags;
  });

  if (loading) {
    return (
      <AppLayout title="Worlds">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Worlds">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search & Create */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex gap-3"
        >
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search worlds..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-input border-border"
            />
          </div>
          <Button
            onClick={() => navigate('/worlds/create')}
            className="bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground neon-border"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create
          </Button>
        </motion.div>

        {/* Tag Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-wrap gap-2"
        >
          <div className="flex items-center gap-2 text-muted-foreground mr-2">
            <Filter className="w-4 h-4" />
            <span className="text-sm">Tags:</span>
          </div>
          {POPULAR_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1 rounded-full text-sm transition-all ${
                selectedTags.includes(tag)
                  ? 'bg-primary text-primary-foreground neon-border'
                  : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
              }`}
            >
              {tag}
            </button>
          ))}
        </motion.div>

        {/* NSFW Notice for non-minors */}
        {!profile?.is_minor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-xs text-muted-foreground text-center"
          >
            NSFW worlds are visible. You can filter them using tags.
          </motion.div>
        )}

        {/* Worlds Grid */}
        {loadingWorlds ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredWorlds.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="glass-card p-8 text-center"
          >
            <Globe className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h4 className="text-lg font-semibold text-foreground mb-2">No worlds found</h4>
            <p className="text-muted-foreground mb-4">
              {searchQuery || selectedTags.length > 0
                ? 'Try adjusting your search or filters'
                : 'Be the first to create a world!'}
            </p>
            <Button
              onClick={() => navigate('/worlds/create')}
              className="bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create World
            </Button>
          </motion.div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {filteredWorlds.map((world, index) => (
              <WorldCard
                key={world.id}
                world={world}
                index={index}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
