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

  // Get zodiac from identity_tags or generate from creation date
  const zodiacData: Record<string, { emoji: string; color: string }> = {
    'aries': { emoji: '♈', color: 'text-red-500' },
    'taurus': { emoji: '♉', color: 'text-green-500' },
    'gemini': { emoji: '♊', color: 'text-yellow-500' },
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
  const identityTags = character.identity_tags as Record<string, string> | null | undefined;
  const zodiacKey = identityTags?.zodiac?.toLowerCase() || zodiacOrder[new Date(character.created_at).getMonth()];
  const zodiac = zodiacData[zodiacKey] || { emoji: '♌', color: 'text-primary' };

  // Gender flag emoji mapping
  const genderEmoji: Record<string, string> = {
    'male': '🚹',
    'female': '🚺',
    'non-binary': '🏳️‍🌈',
    'other': '⚧️'
  };
  const genderIcon = genderEmoji[character.gender?.toLowerCase() || ''] || '';

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
      className="space-y-4"
    >
      {/* Large Avatar - Rounded Square */}
      <div className="relative mx-auto w-72 aspect-[3/4] rounded-2xl overflow-hidden bg-card">
        {character.avatar_url ? (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-secondary flex items-center justify-center">
            <span className="text-7xl font-display font-bold text-primary/50">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Action Buttons Row */}
      <div className="flex gap-3 justify-center items-center">
        {isOwnProfile ? (
          <>
            <Button 
              variant="outline" 
              onClick={onArrange}
              className="border-primary/50 text-primary hover:border-primary hover:bg-primary/10 rounded-full px-5"
            >
              Arrange Character
            </Button>
            <Button 
              variant="outline"
              onClick={onEdit}
              className="border-primary/50 text-primary hover:border-primary hover:bg-primary/10 rounded-full px-5"
            >
              Edit Character
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-primary/50 text-primary hover:border-primary hover:bg-primary/10 rounded-full w-10 h-10"
            >
              <Share2 className="w-4 h-4" />
            </Button>
          </>
        ) : (
          <>
            <Button 
              variant="outline" 
              onClick={onMessage}
              className="border-primary/50 text-primary hover:border-primary hover:bg-primary/10 rounded-full px-6"
            >
              Message
            </Button>
            <Button 
              onClick={onFollow}
              className="bg-primary hover:bg-primary/90 rounded-full px-6"
            >
              Follow
            </Button>
          </>
        )}
      </div>

      {/* Character Name */}
      <h2 className="text-xl font-semibold text-center text-foreground">
        {character.name}
      </h2>

      {/* Stats Bar - Inline */}
      <div className="flex justify-center gap-8">
        <div className="text-center">
          <span className="font-bold text-foreground">{followersCount}</span>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-foreground">{followingCount}</span>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-foreground">{daysActive}</span>
          <p className="text-xs text-muted-foreground">Days</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-foreground">{storiesCount}</span>
          <p className="text-xs text-muted-foreground">Stories</p>
        </div>
      </div>

      {/* Identity Line - Inline with icons */}
      <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
        {character.pronouns && (
          <span>{character.pronouns}</span>
        )}
        <span className={zodiac.color}>{zodiac.emoji}</span>
        {character.age && (
          <span>{character.age}</span>
        )}
        {character.gender && (
          <>
            {genderIcon && <span>{genderIcon}</span>}
            <span>{character.gender}</span>
          </>
        )}
      </div>

      {/* Bio - Centered paragraph */}
      {character.bio && (
        <p className="text-center text-muted-foreground px-4 text-sm leading-relaxed">
          {character.bio}
        </p>
      )}

      {/* Sub-Nav Icons - Bottom */}
      <div className="flex justify-around py-4 border-t border-border mt-4">
        {subNavItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="text-muted-foreground hover:text-primary transition-colors p-2"
            title={label}
          >
            <Icon className="w-6 h-6" />
          </button>
        ))}
        {/* Current character avatar as last icon */}
        <button className="w-8 h-8 rounded-full overflow-hidden ring-2 ring-primary">
          {character.avatar_url ? (
            <img 
              src={character.avatar_url} 
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-secondary flex items-center justify-center">
              <span className="text-xs font-bold text-muted-foreground">
                {character.name[0]?.toUpperCase()}
              </span>
            </div>
          )}
        </button>
      </div>
    </motion.div>
  );
};
