import { motion } from 'framer-motion';
import { Edit, Layers, Users, Calendar, BookOpen, Image, MessageCircle, Scroll, MessageSquare } from 'lucide-react';
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
  const zodiacSigns = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const identityTags = character.identity_tags as Record<string, string> | null | undefined;
  const zodiac = identityTags?.zodiac || zodiacSigns[new Date(character.created_at).getMonth()];

  const subNavItems = [
    { icon: Image, label: 'Gallery' },
    { icon: MessageCircle, label: 'RP' },
    { icon: Scroll, label: 'Stories' },
    { icon: MessageSquare, label: 'Comments' },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Large Avatar - Rounded Square */}
      <div className="relative mx-auto w-56 h-56 rounded-3xl overflow-hidden border-2 border-primary/50 neon-border">
        {character.avatar_url ? (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-neon-pink/20 flex items-center justify-center">
            <span className="text-7xl font-display font-bold text-primary/50">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Character Name */}
      <h2 className="text-2xl font-display font-bold text-center text-foreground">
        {character.name}
      </h2>

      {/* Action Buttons - Outline Style */}
      {isOwnProfile ? (
        <div className="flex gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={onArrange}
            className="flex items-center gap-2 border-primary/50 hover:border-primary hover:bg-primary/10"
          >
            <Layers className="w-4 h-4" />
            Arrange Character
          </Button>
          <Button 
            variant="outline"
            onClick={onEdit}
            className="flex items-center gap-2 border-primary/50 hover:border-primary hover:bg-primary/10"
          >
            <Edit className="w-4 h-4" />
            Edit Character
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={onMessage}
            className="border-primary/50 hover:border-primary hover:bg-primary/10"
          >
            Message
          </Button>
          <Button 
            onClick={onFollow}
            className="bg-primary hover:bg-primary/90"
          >
            Follow
          </Button>
        </div>
      )}

      {/* Stats Bar */}
      <div className="flex justify-center gap-6 py-4 px-4 bg-card/50 rounded-2xl border border-border">
        <div className="text-center">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-primary">{followersCount}</span>
            <span className="text-xs text-muted-foreground">Followers</span>
          </div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-primary">{followingCount}</span>
            <span className="text-xs text-muted-foreground">Following</span>
          </div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-primary">{daysActive}</span>
            <span className="text-xs text-muted-foreground">Days</span>
          </div>
        </div>
        <div className="w-px bg-border" />
        <div className="text-center">
          <div className="flex flex-col items-center">
            <span className="font-bold text-lg text-primary">{storiesCount}</span>
            <span className="text-xs text-muted-foreground">Stories</span>
          </div>
        </div>
      </div>

      {/* Identity Line with Icons */}
      <div className="flex items-center justify-center gap-3 text-sm flex-wrap py-2">
        {character.pronouns && (
          <span className="px-3 py-1 rounded-full bg-secondary text-foreground">
            {character.pronouns}
          </span>
        )}
        <span className="px-3 py-1 rounded-full bg-primary/20 text-primary">
          {zodiac}
        </span>
        {character.age && (
          <span className="px-3 py-1 rounded-full bg-secondary text-foreground">
            {character.age}y/o
          </span>
        )}
        {character.gender && (
          <span className="px-3 py-1 rounded-full bg-secondary text-foreground">
            {character.gender}
          </span>
        )}
      </div>

      {/* Sub-Nav Icons */}
      <div className="flex justify-center gap-6 py-3 border-t border-b border-border">
        {subNavItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-primary transition-colors"
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs">{label}</span>
          </button>
        ))}
      </div>

      {/* Bio */}
      {character.bio && (
        <p className="text-center text-muted-foreground px-4 text-sm">
          {character.bio}
        </p>
      )}

      {/* Likes & Dislikes */}
      <div className="space-y-4 px-4">
        {character.likes && character.likes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wider">Likes</h4>
            <div className="flex flex-wrap gap-2">
              {character.likes.map((like, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs border border-primary/20">
                  {like}
                </span>
              ))}
            </div>
          </div>
        )}
        {character.dislikes && character.dislikes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wider">Dislikes</h4>
            <div className="flex flex-wrap gap-2">
              {character.dislikes.map((dislike, i) => (
                <span key={i} className="px-3 py-1.5 rounded-full bg-destructive/10 text-destructive text-xs border border-destructive/20">
                  {dislike}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
