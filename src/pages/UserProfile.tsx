import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ChevronLeft, Share2, Flag } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal } from 'lucide-react';
import { differenceInDays } from 'date-fns';
import { CharacterDetailView } from '@/components/profile/CharacterDetailView';

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
  const { toast } = useToast();
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

    // Only fetch user-created characters (exclude AI-generated NPCs)
    const { data, error } = await supabase
      .from('characters')
      .select('*')
      .eq('owner_id', userId)
      .eq('is_hidden', false)
      .eq('is_npc', false) // Exclude AI-generated NPCs
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
      
      // Get current user's profile for notification
      const { data: myProfile } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', user.id)
        .single();
      
      // Create notification for the followed user via RPC
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_type: 'follow',
        p_title: 'New Follower',
        p_body: `${myProfile?.username || 'Someone'} started following you!`,
        p_data: { follower_id: user.id }
      });
    }
    
    // Refresh profile to get updated counts
    fetchUserProfile();
  };

  const handleMessage = async () => {
    if (!user || !userId) return;

    // Check if friendship already exists
    const { data: existingFriendship } = await supabase
      .from('friendships')
      .select('id, status')
      .or(`and(requester_id.eq.${user.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${user.id})`)
      .maybeSingle();

    if (existingFriendship) {
      if (existingFriendship.status === 'accepted') {
        navigate(`/dm/${existingFriendship.id}`);
      } else if (existingFriendship.status === 'pending') {
        toast({ title: 'Friend request pending', description: 'Wait for them to accept your request' });
      } else {
        toast({ title: 'Unable to message', description: 'This connection was previously declined' });
      }
    } else {
      // Navigate to discovery to send a friend request
      toast({ 
        title: 'Send a friend request first', 
        description: 'Use the Discovery tab to find and connect with users' 
      });
    }
  };

  const handleShare = async () => {
    const url = `${window.location.origin}/user/${userId}`;
    await navigator.clipboard.writeText(url);
    toast({ title: 'Profile link copied!' });
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

  // Days active from USER profile (account creation), not character
  const daysActive = profile?.created_at 
    ? differenceInDays(new Date(), new Date(profile.created_at))
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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 -mr-2">
                <MoreHorizontal className="w-6 h-6 text-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleShare} className="gap-2">
                <Share2 className="w-4 h-4" /> Share Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast({ title: 'Report submitted' })} className="gap-2 text-destructive">
                <Flag className="w-4 h-4" /> Report User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        {/* Selected Character View - Using CharacterDetailView with modals */}
        {selectedCharacter && (
          <CharacterDetailView
            character={selectedCharacter}
            followersCount={profile.followers_count || 0}
            followingCount={profile.following_count || 0}
            daysActive={daysActive}
            storiesCount={profile.stories_count || 0}
            isOwnProfile={false}
            userId={userId}
            onFollow={handleFollow}
            onMessage={handleMessage}
            onShare={handleShare}
          />
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
          onClick={handleShare}
          className="border-primary text-primary hover:bg-primary/10 rounded-lg h-12 w-12"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </div>
    </div>
  );
}
