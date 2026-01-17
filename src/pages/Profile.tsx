import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { CharacterScroller } from '@/components/profile/CharacterScroller';
import { CharacterDetailView } from '@/components/profile/CharacterDetailView';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';
import { EditCharacterModal } from '@/components/characters/EditCharacterModal';
import { useToast } from '@/hooks/use-toast';

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
  identity_tags?: unknown;
}

export default function Profile() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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

  const handleShare = async () => {
    if (selectedCharacter) {
      const url = `${window.location.origin}/user/${user?.id}`;
      await navigator.clipboard.writeText(url);
      toast({ title: 'Profile link copied!' });
    }
  };

  const handleSetActiveCharacter = async () => {
    if (!user || !selectedCharacterId) return;
    
    await supabase
      .from('profiles')
      .update({ active_character_id: selectedCharacterId })
      .eq('id', user.id);
    
    toast({ title: 'Active character updated!' });
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
      title={profile?.username ? `@${profile.username}` : 'Profile'}
      headerLeftIcon="add-friend"
      headerRightIcon="more"
      onHeaderLeftAction={() => navigate('/messages')}
      onHeaderRightAction={handleSignOut}
      showFab
      fabOnClick={() => setIsCreateModalOpen(true)}
    >
      <div className="max-w-lg mx-auto pb-8">
        {/* Character Scroller */}
        <div className="mb-4">
          <CharacterScroller
            characters={characters}
            selectedId={selectedCharacterId}
            onSelect={setSelectedCharacterId}
            onAddNew={() => setIsCreateModalOpen(true)}
          />
        </div>

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
            storiesCount={profile?.stories_count || 0}
            isOwnProfile={true}
            onEdit={() => setIsEditModalOpen(true)}
            onArrange={handleSetActiveCharacter}
            onShare={handleShare}
          />
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <div className="w-20 h-20 rounded-full dashed-circle flex items-center justify-center mx-auto mb-4">
              <span className="text-3xl text-primary">+</span>
            </div>
            <p className="text-muted-foreground mb-4">No characters yet</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="text-primary hover:underline font-medium"
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

      {selectedCharacter && (
        <EditCharacterModal
          open={isEditModalOpen}
          onOpenChange={setIsEditModalOpen}
          character={selectedCharacter}
          onSuccess={() => {
            fetchCharacters();
            setIsEditModalOpen(false);
          }}
          onDelete={() => {
            fetchCharacters();
            setSelectedCharacterId(null);
          }}
        />
      )}
    </AppLayout>
  );
}
