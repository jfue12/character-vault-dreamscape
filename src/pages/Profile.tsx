import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { CharacterCard } from '@/components/characters/CharacterCard';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';
import { Hash } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  age: number | null;
  gender: string | null;
  species: string | null;
  pronouns: string | null;
  likes: string[];
  dislikes: string[];
  is_hidden: boolean;
}

export default function Profile() {
  const { user, profile, signOut, loading } = useAuth();
  const navigate = useNavigate();
  const [characters, setCharacters] = useState<Character[]>([]);
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
    }
    setLoadingCharacters(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

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
      title="Profile"
      headerLeftIcon="avatar"
      headerRightIcon="menu"
      onHeaderRightAction={handleSignOut}
      showFab
      fabOnClick={() => setIsCreateModalOpen(true)}
    >
      <div className="max-w-lg mx-auto">
        {/* Plots Section */}
        <div className="mb-6">
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={() => navigate('/plots')}
            className="flex flex-col items-center"
          >
            <div className="w-16 h-16 dashed-circle flex items-center justify-center mb-2">
              <Hash className="w-8 h-8 text-primary" />
            </div>
            <span className="text-sm text-primary">Plots</span>
          </motion.button>
        </div>

        {/* Characters Grid */}
        {loadingCharacters ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : characters.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="py-20 text-center"
          >
            <p className="text-muted-foreground">No characters yet</p>
          </motion.div>
        ) : (
          <div className="grid gap-4 grid-cols-2">
            {characters.map((character, index) => (
              <CharacterCard
                key={character.id}
                character={character}
                index={index}
                onUpdate={fetchCharacters}
              />
            ))}
          </div>
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
