import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { CharacterScroller } from '@/components/profile/CharacterScroller';
import { CharacterDetailView } from '@/components/profile/CharacterDetailView';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  species: string | null;
  pronouns: string | null;
  bio: string | null;
  likes: string[] | null;
  dislikes: string[] | null;
  is_hidden: boolean;
  created_at: string;
}

export default function Profile() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loadingCharacters, setLoadingCharacters] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      navigate('/auth');
    }
  }, [user, loading, navigate]);

  useEffect(() => {
    if (user) {
      fetchCharacters();
    }
  }, [user]);

  const fetchCharacters = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCharacters(data);
      // Auto-select first character if none selected
      if (!selectedCharacterId && data.length > 0) {
        setSelectedCharacterId(data[0].id);
      }
    }
    setLoadingCharacters(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  if (loading) {
    return (
      <AppLayout title="Profile">
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout 
      title={profile?.username || 'Profile'}
      headerLeftIcon="add-friend"
      headerRightIcon="notifications"
      onHeaderRightAction={handleSignOut}
      showFab
      fabOnClick={() => setIsCreateModalOpen(true)}
    >
      <div className="max-w-lg mx-auto space-y-6">
        {/* Character Scroller */}
        <CharacterScroller
          characters={characters}
          selectedId={selectedCharacterId}
          onSelect={setSelectedCharacterId}
          onAddNew={() => setIsCreateModalOpen(true)}
        />

        {/* Character Detail View */}
        {loadingCharacters ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : selectedCharacter ? (
          <CharacterDetailView
            character={selectedCharacter}
            followersCount={profile?.followers_count || 0}
            followingCount={profile?.following_count || 0}
            isOwnProfile={true}
            onEdit={() => {/* TODO: Open edit modal */}}
            onArrange={() => {/* TODO: Open arrange modal */}}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-muted-foreground mb-4">No characters yet</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-primary hover:underline"
            >
              Create your first character
            </button>
          </motion.div>
        )}
      </div>

      <CreateCharacterModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchCharacters}
      />
    </AppLayout>
  );
}
