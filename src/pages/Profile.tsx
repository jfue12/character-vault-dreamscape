import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { LogOut, ChevronRight } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { CharacterScroller } from '@/components/profile/CharacterScroller';
import { CharacterDetailView } from '@/components/profile/CharacterDetailView';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';
import { EditCharacterModal } from '@/components/characters/EditCharacterModal';
import { ProfileIncompleteIndicator } from '@/components/profile/ProfileIncompleteIndicator';
import { UsernameSetupModal } from '@/components/profile/UsernameSetupModal';
import { useToast } from '@/hooks/use-toast';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  background_url?: string | null;
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
  bubble_color?: string | null;
  text_color?: string | null;
}

export default function Profile() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUsernameModalOpen, setIsUsernameModalOpen] = useState(false);
  const [loadingCharacters, setLoadingCharacters] = useState(true);
  const [showSettings, setShowSettings] = useState(false);

  // Check if profile is incomplete (no username or has email-like username)
  const isProfileIncomplete = !profile?.username || profile.username.includes('@');
  

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

    // Only fetch user-created characters (exclude AI-generated NPCs)
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('owner_id', user.id)
      .eq('is_npc', false) // Exclude AI-generated NPCs
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCharacters(data);
      // Select first visible character by default
      const visibleChars = data.filter(c => !c.is_hidden);
      if (!selectedCharacterId && visibleChars.length > 0) {
        setSelectedCharacterId(visibleChars[0].id);
      } else if (!selectedCharacterId && data.length > 0) {
        setSelectedCharacterId(data[0].id);
      }
    }
    setLoadingCharacters(false);
  };

  const handleSignOut = async () => {
    toast({ title: 'Signing out...', description: 'Your data has been saved' });
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
      headerLeftIcon="none"
      headerRightIcon="more"
      onHeaderRightAction={() => setShowSettings(!showSettings)}
      showFab
      fabOnClick={() => setIsCreateModalOpen(true)}
    >
      <div className="max-w-lg mx-auto pb-12">
        {/* Profile Incomplete Indicator */}
        {isProfileIncomplete && (
          <div className="px-2 mb-4">
            <ProfileIncompleteIndicator 
              onClick={() => setIsUsernameModalOpen(true)}
              message="Set up your username to connect with others"
            />
          </div>
        )}

        {/* Settings Panel */}
        {showSettings && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-card border border-border rounded-xl p-2 mb-4 mx-2"
          >
            <button
              onClick={handleSignOut}
              className="flex items-center justify-between w-full p-3.5 rounded-lg active:bg-muted transition-colors text-destructive touch-feedback"
            >
              <div className="flex items-center gap-3">
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sign Out</span>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground" />
            </button>
          </motion.div>
        )}


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
            daysActive={profile?.created_at ? differenceInDays(new Date(), new Date(profile.created_at)) : 0}
            storiesCount={profile?.stories_count || 0}
            isOwnProfile={true}
            userId={user?.id}
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

      <UsernameSetupModal
        isOpen={isUsernameModalOpen}
        onClose={() => setIsUsernameModalOpen(false)}
        onSuccess={() => setIsUsernameModalOpen(false)}
      />
    </AppLayout>
  );
}
