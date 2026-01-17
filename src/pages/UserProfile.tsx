import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, MoreHorizontal, Share2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { differenceInDays } from 'date-fns';

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

interface UserProfileData {
  id: string;
  username: string | null;
  bio: string | null;
  followers_count: number | null;
  following_count: number | null;
  stories_count: number | null;
  created_at: string;
}

export default function UserProfile() {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [selectedCharacter, setSelectedCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    if (userId) {
      fetchUserProfile();
      fetchUserCharacters();
      checkFollowStatus();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    if (!userId) return;
    
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfile(data);
    }
  };

  const fetchUserCharacters = async () => {
    if (!userId) return;

    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_hidden', false)
      .order('created_at', { ascending: false });

    if (!error && data) {
      setCharacters(data);
      if (data.length > 0) {
        setSelectedCharacter(data[0]);
      }
    }
    setLoading(false);
  };

  const checkFollowStatus = async () => {
    if (!user || !userId) return;

    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', user.id)
      .eq('following_id', userId)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!user || !userId) return;

    if (isFollowing) {
      await supabase
        .from('follows')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', userId);
      setIsFollowing(false);
    } else {
      await supabase
        .from('follows')
        .insert({ follower_id: user.id, following_id: userId });
      setIsFollowing(true);
    }
    
    // Refresh profile to get updated counts
    fetchUserProfile();
  };

  const handleMessage = () => {
    // TODO: Navigate to DM with user
    console.log('Message user:', userId);
  };

  // Zodiac data
  const zodiacData: Record<string, { emoji: string; color: string }> = {
    'aries': { emoji: '♈', color: 'text-red-500' },
    'taurus': { emoji: '♉', color: 'text-green-500' },
    'gemini': { emoji: '♊', color: 'text-pink-400' },
    'cancer': { emoji: '♋', color: 'text-blue-300' },
    'leo': { emoji: '♌', color: 'text-orange-500' },
    'virgo': { emoji: '♍', color: 'text-emerald-500' },
    'libra': { emoji: '♎', color: 'text-pink-400' },
    'scorpio': { emoji: '♏', color: 'text-red-600' },
    'sagittarius': { emoji: '♐', color: 'text-purple-500' },
    'capricorn': { emoji: '♑', color: 'text-gray-400' },
    'aquarius': { emoji: '♒', color: 'text-cyan-400' },
    'pisces': { emoji: '♓', color: 'text-indigo-400' }
  };
  
  const zodiacOrder = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];

  const getZodiac = (character: Character) => {
    const identityTags = character.identity_tags as Record<string, string> | null | undefined;
    const zodiacKey = identityTags?.zodiac?.toLowerCase() || zodiacOrder[new Date(character.created_at).getMonth()];
    return zodiacData[zodiacKey] || { emoji: '♊', color: 'text-pink-400' };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  const daysActive = selectedCharacter 
    ? differenceInDays(new Date(), new Date(selectedCharacter.created_at))
    : 0;

  const zodiac = selectedCharacter ? getZodiac(selectedCharacter) : { emoji: '♊', color: 'text-pink-400' };

  return (
    <div className="min-h-screen bg-background pb-24">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 h-14">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ChevronLeft className="w-6 h-6 text-foreground" />
          </button>
          <h1 className="font-semibold text-foreground">
            @{profile.username || 'unknown'}
          </h1>
          <button className="p-2 -mr-2">
            <MoreHorizontal className="w-6 h-6 text-foreground" />
          </button>
        </div>
      </header>

      <div className="px-4 py-4 space-y-4">
        {/* Character Scroller - Minimal for external view */}
        {characters.length > 0 && (
          <div className="flex gap-3 overflow-x-auto scrollbar-hide -mx-4 px-4 pb-2">
            {characters.map((character) => (
              <div key={character.id} className="flex flex-col items-center gap-1 flex-shrink-0">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setSelectedCharacter(character)}
                  className={`w-16 h-16 rounded-full overflow-hidden transition-all ${
                    selectedCharacter?.id === character.id 
                      ? 'ring-[3px] ring-primary ring-offset-2 ring-offset-background' 
                      : 'border-2 border-border'
                  }`}
                >
                  {character.avatar_url ? (
                    <img 
                      src={character.avatar_url} 
                      alt={character.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-secondary flex items-center justify-center">
                      <span className="text-lg font-bold text-muted-foreground">
                        {character.name[0]?.toUpperCase()}
                      </span>
                    </div>
                  )}
                </motion.button>
                <span className={`text-xs w-16 text-center truncate ${
                  selectedCharacter?.id === character.id ? 'text-primary font-medium' : 'text-muted-foreground'
                }`}>
                  {character.name.split(' ')[0]} 💫
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Selected Character View */}
        {selectedCharacter && (
          <motion.div
            key={selectedCharacter.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Large Avatar */}
            <div className="relative mx-auto w-72 aspect-[3/4] rounded-2xl overflow-hidden bg-card">
              {selectedCharacter.avatar_url ? (
                <img 
                  src={selectedCharacter.avatar_url} 
                  alt={selectedCharacter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
                  <span className="text-7xl font-display font-bold text-primary/50">
                    {selectedCharacter.name[0]?.toUpperCase()}
                  </span>
                </div>
              )}
            </div>

            {/* Character Name with emoji */}
            <h2 className="text-xl font-semibold text-center text-foreground">
              {selectedCharacter.name} 💫
            </h2>

            {/* Stats Row */}
            <div className="flex justify-center gap-8">
              <div className="text-center">
                <span className="font-bold text-foreground">{profile.followers_count || 0}</span>
                <p className="text-xs text-muted-foreground">Followers</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-foreground">{profile.following_count || 0}</span>
                <p className="text-xs text-muted-foreground">Following</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-foreground">{daysActive}</span>
                <p className="text-xs text-muted-foreground">Days</p>
              </div>
              <div className="text-center">
                <span className="font-bold text-foreground">{profile.stories_count || 0}</span>
                <p className="text-xs text-muted-foreground">Stories</p>
              </div>
            </div>

            {/* Identity Row */}
            <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground">
              {selectedCharacter.pronouns && (
                <span>{selectedCharacter.pronouns}</span>
              )}
              <span className={zodiac.color}>{zodiac.emoji}</span>
              {selectedCharacter.age && (
                <span>{selectedCharacter.age}</span>
              )}
              {selectedCharacter.gender && (
                <span>🐱</span>
              )}
            </div>

            {/* Bio */}
            {selectedCharacter.bio && (
              <p className="text-center text-muted-foreground px-4 text-sm leading-relaxed">
                {selectedCharacter.bio}
              </p>
            )}
          </motion.div>
        )}
      </div>

      {/* Fixed Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-xl border-t border-border p-4 flex gap-3">
        <Button 
          variant="outline"
          onClick={handleFollow}
          className="flex-1 border-primary text-primary hover:bg-primary/10 rounded-lg h-12 font-semibold"
        >
          {isFollowing ? 'Following' : 'Follow'}
        </Button>
        <Button 
          variant="outline"
          onClick={handleMessage}
          className="flex-1 border-primary text-primary hover:bg-primary/10 rounded-lg h-12 font-semibold"
        >
          Message
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="border-primary text-primary hover:bg-primary/10 rounded-lg h-12 w-12"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
