import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, RefreshCw } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { DiscoveryCard } from '@/components/discovery/DiscoveryCard';
import { FriendRequestModal } from '@/components/discovery/FriendRequestModal';
import { Button } from '@/components/ui/button';

interface DiscoverableCharacter {
  id: string;
  name: string;
  avatar_url: string | null;
  pronouns: string | null;
  bio: string | null;
  identity_tags: unknown;
  owner_id: string;
  profiles: {
    username: string | null;
  } | null;
}

export default function Index() {
  const { user, profile, loading } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<DiscoverableCharacter[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadingCards, setLoadingCards] = useState(true);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<DiscoverableCharacter | null>(null);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDiscoverableCharacters();
    }
  }, [user, profile]);

  const fetchDiscoverableCharacters = async () => {
    if (!user) return;

    // Get existing friendships to exclude
    const { data: friendships } = await supabase
      .from('friendships')
      .select('requester_id, addressee_id')
      .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);

    const excludedUserIds = new Set<string>([user.id]);
    friendships?.forEach(f => {
      excludedUserIds.add(f.requester_id);
      excludedUserIds.add(f.addressee_id);
    });

    // Fetch characters from other users
    let query = supabase
      .from('characters')
      .select(`
        id,
        name,
        avatar_url,
        pronouns,
        bio,
        identity_tags,
        owner_id,
        profiles!characters_owner_id_fkey(username)
      `)
      .eq('is_hidden', false)
      .eq('is_private', false)
      .order('created_at', { ascending: false })
      .limit(50);

    const { data, error } = await query;

    if (!error && data) {
      // Filter out characters owned by excluded users
      const filteredCharacters = data.filter(
        char => !excludedUserIds.has(char.owner_id)
      );
      
      // Shuffle for variety
      const shuffled = filteredCharacters.sort(() => Math.random() - 0.5);
      setCharacters(shuffled);
    }
    setLoadingCards(false);
  };

  const handleSwipeLeft = () => {
    setCurrentIndex(prev => prev + 1);
  };

  const handleSwipeRight = (character: DiscoverableCharacter) => {
    setSelectedCharacter(character);
    setShowRequestModal(true);
  };

  const handleRequestSent = () => {
    setCurrentIndex(prev => prev + 1);
    setSelectedCharacter(null);
  };

  const handleRefresh = () => {
    setCurrentIndex(0);
    setLoadingCards(true);
    fetchDiscoverableCharacters();
  };

  if (loading) {
    return (
      <AppLayout showFab showActiveOC>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  const visibleCards = characters.slice(currentIndex, currentIndex + 2);
  const hasMoreCards = currentIndex < characters.length;

  return (
    <AppLayout 
      headerLeftIcon="none"
      headerRightIcon="notifications"
      showFab
      showActiveOC
    >
      <div className="max-w-lg mx-auto">
        {loadingCards ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !hasMoreCards ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-muted-foreground mb-4">No more profiles to discover</p>
            <Button
              onClick={handleRefresh}
              variant="secondary"
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh
            </Button>
          </motion.div>
        ) : (
          <>
            {/* Card Stack */}
            <div className="relative h-[500px] w-full">
              <AnimatePresence>
                {visibleCards.map((character, index) => (
                  <DiscoveryCard
                    key={character.id}
                    character={character}
                    onSwipeLeft={handleSwipeLeft}
                    onSwipeRight={handleSwipeRight}
                    isTop={index === 0}
                  />
                ))}
              </AnimatePresence>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center gap-8 mt-6">
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleSwipeLeft}
                className="w-16 h-16 rounded-full bg-secondary flex items-center justify-center border-2 border-red-500/30 hover:border-red-500 transition-colors"
              >
                <X className="w-8 h-8 text-red-500" />
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => visibleCards[0] && handleSwipeRight(visibleCards[0])}
                className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-pink-500 flex items-center justify-center shadow-lg neon-glow"
              >
                <Heart className="w-10 h-10 text-white" />
              </motion.button>
            </div>
          </>
        )}
      </div>

      <FriendRequestModal
        open={showRequestModal}
        onOpenChange={setShowRequestModal}
        targetCharacter={selectedCharacter}
        onSuccess={handleRequestSent}
      />
    </AppLayout>
  );
}