import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AppLayout } from '@/components/layout/AppLayout';
import { Button } from '@/components/ui/button';
import { CharacterCard } from '@/components/characters/CharacterCard';
import { CreateCharacterModal } from '@/components/characters/CreateCharacterModal';
import { LogOut, Plus, User, Sparkles } from 'lucide-react';

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
    <AppLayout title="Profile">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-neon-purple to-neon-pink flex items-center justify-center neon-border">
              <User className="w-8 h-8 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-foreground">
                {profile?.username || 'User'}
              </h2>
              <p className="text-muted-foreground text-sm">
                {profile?.bio || 'No bio yet'}
              </p>
              {profile?.is_minor && (
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                  Minor Account
                </span>
              )}
            </div>
            <Button variant="ghost" size="icon" onClick={handleSignOut}>
              <LogOut className="w-5 h-5 text-muted-foreground" />
            </Button>
          </div>
        </motion.div>

        {/* Character Vault Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary neon-glow" />
              <h3 className="font-display text-lg font-semibold text-foreground">Character Vault</h3>
            </div>
            <Button
              onClick={() => setIsCreateModalOpen(true)}
              className="bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground neon-border"
            >
              <Plus className="w-4 h-4 mr-2" />
              New OC
            </Button>
          </div>

          {loadingCharacters ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : characters.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="glass-card p-8 text-center"
            >
              <Sparkles className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h4 className="text-lg font-semibold text-foreground mb-2">No characters yet</h4>
              <p className="text-muted-foreground mb-4">Create your first OC to get started!</p>
              <Button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Character
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
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
        </motion.div>
      </div>

      <CreateCharacterModal
        open={isCreateModalOpen}
        onOpenChange={setIsCreateModalOpen}
        onSuccess={fetchCharacters}
      />
    </AppLayout>
  );
}
