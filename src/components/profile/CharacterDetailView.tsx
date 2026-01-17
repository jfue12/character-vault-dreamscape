import { motion } from 'framer-motion';
import { Share2, Image, Gamepad2, BookOpen, MessageSquare } from 'lucide-react';
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

interface CharacterDetailViewProps {
  character: Character;
  followersCount: number;
  followingCount: number;
  storiesCount?: number;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onArrange?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
}

export const CharacterDetailView = ({
  character,
  followersCount,
  followingCount,
  storiesCount = 0,
  isOwnProfile = true,
  onEdit,
  onArrange,
  onFollow,
  onMessage
}: CharacterDetailViewProps) => {
  const daysActive = differenceInDays(new Date(), new Date(character.created_at));

  // Zodiac mapping
  const zodiacData: Record<string, { emoji: string }> = {
    'aries': { emoji: '♈' },
    'taurus': { emoji: '♉' },
    'gemini': { emoji: '♊' },
    'cancer': { emoji: '♋' },
    'leo': { emoji: '♌' },
    'virgo': { emoji: '♍' },
    'libra': { emoji: '♎' },
    'scorpio': { emoji: '♏' },
    'sagittarius': { emoji: '♐' },
    'capricorn': { emoji: '♑' },
    'aquarius': { emoji: '♒' },
    'pisces': { emoji: '♓' }
  };
  
  const zodiacOrder = ['aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces'];
  const identityTags = character.identity_tags as Record<string, string> | null | undefined;
  const zodiacKey = identityTags?.zodiac?.toLowerCase() || zodiacOrder[new Date(character.created_at).getMonth()];
  const zodiac = zodiacData[zodiacKey] || { emoji: '♌' };

  // Gender emoji
  const genderEmoji: Record<string, string> = {
    'male': '🚹',
    'female': '🚺',
    'non-binary': '⚧️',
  };

  const subNavItems = [
    { icon: Image, label: 'Gallery' },
    { icon: Gamepad2, label: 'RP' },
    { icon: BookOpen, label: 'Stories' },
    { icon: MessageSquare, label: 'Comments' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Large Avatar - Rounded Square */}
      <div className="relative mx-auto w-64 aspect-[3/4] rounded-2xl overflow-hidden">
        {character.avatar_url ? (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-900/30 flex items-center justify-center">
            <span className="text-7xl font-display font-bold text-primary/60">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      {isOwnProfile && (
        <div className="flex gap-2 justify-center items-center px-4">
          <Button 
            variant="outline" 
            onClick={onArrange}
            className="flex-1 border-primary text-primary hover:bg-primary/10 rounded-lg h-10"
          >
            Arrange Character
          </Button>
          <Button 
            variant="outline"
            onClick={onEdit}
            className="flex-1 border-primary text-primary hover:bg-primary/10 rounded-lg h-10"
          >
            Edit Character
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="border-primary text-primary hover:bg-primary/10 rounded-lg h-10 w-10"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* Character Name */}
      <h2 className="text-xl font-semibold text-center text-foreground">
        {character.name}
      </h2>

      {/* Stats Row */}
      <div className="flex justify-center gap-10">
        <div className="text-center">
          <span className="font-bold text-lg text-foreground">{followersCount}</span>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-lg text-foreground">{followingCount}</span>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-lg text-foreground">{daysActive}</span>
          <p className="text-xs text-muted-foreground">Days</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-lg text-foreground">{storiesCount}</span>
          <p className="text-xs text-muted-foreground">Stories</p>
        </div>
      </div>

      {/* Identity Row */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {character.pronouns && (
          <span>{character.pronouns}</span>
        )}
        <span className="text-primary">{zodiac.emoji}</span>
        {character.age && (
          <span>{character.age}</span>
        )}
        {character.gender && (
          <>
            <span>{genderEmoji[character.gender.toLowerCase()] || ''}</span>
            <span>{character.gender}</span>
          </>
        )}
      </div>

      {/* Bio */}
      {character.bio && (
        <p className="text-center text-muted-foreground px-6 text-sm leading-relaxed">
          {character.bio}
        </p>
      )}

      {/* Sub-Nav Icons */}
      <div className="flex justify-around items-center py-3 border-t border-border">
        {subNavItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="text-muted-foreground hover:text-primary transition-colors p-2"
            title={label}
          >
            <Icon className="w-6 h-6" />
          </button>
        ))}
        {/* Current character avatar */}
        <button className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-primary">
          {character.avatar_url ? (
            <img 
              src={character.avatar_url} 
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary to-purple-800 flex items-center justify-center">
              <span className="text-[10px] font-bold text-white">
                {character.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};
