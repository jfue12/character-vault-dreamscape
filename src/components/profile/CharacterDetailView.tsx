import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Image, Gamepad2, BookOpen, MessageSquare, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CharacterRelationships } from './CharacterRelationships';
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
  identity_tags?: {
    sexuality?: string;
    rp_style?: string;
    zodiac?: string;
  } | null;
}

interface CharacterDetailViewProps {
  character: Character;
  // User profile stats
  followersCount: number;
  followingCount: number;
  daysActive: number;
  storiesCount?: number;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onArrange?: () => void;
  onFollow?: () => void;
  onMessage?: () => void;
  onShare?: () => void;
}

export const CharacterDetailView = ({
  character,
  followersCount,
  followingCount,
  daysActive,
  storiesCount = 0,
  isOwnProfile = true,
  onEdit,
  onArrange,
  onFollow,
  onMessage,
  onShare
}: CharacterDetailViewProps) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>('Gallery');

  const identityTags = character.identity_tags as { sexuality?: string; rp_style?: string; zodiac?: string } | null;
  
  // Build identity line: Pronouns | Sexuality | RP Style
  const identityParts = [
    character.pronouns,
    identityTags?.sexuality,
    identityTags?.rp_style,
  ].filter(Boolean);

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
      {/* 1. Large Rounded Portrait */}
      <div className="relative mx-auto w-56 h-56 rounded-full overflow-hidden ring-4 ring-primary/30">
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

      {/* 2. Action Buttons Row */}
      {isOwnProfile ? (
        <div className="flex gap-2 justify-center items-center px-4">
          <Button 
            variant="outline" 
            onClick={onArrange}
            className="flex-1 border-primary text-primary hover:bg-primary/10 rounded-lg h-10 gap-2"
          >
            <Layers className="w-4 h-4" />
            Arrange
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
            onClick={onShare}
            className="border-primary text-primary hover:bg-primary/10 rounded-lg h-10 w-10"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 justify-center items-center px-4">
          <Button 
            onClick={onFollow}
            className="flex-1 bg-gradient-to-r from-neon-purple to-neon-pink text-primary-foreground rounded-lg h-10"
          >
            Follow
          </Button>
          <Button 
            variant="outline"
            onClick={onMessage}
            className="flex-1 border-primary text-primary hover:bg-primary/10 rounded-lg h-10"
          >
            Message
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="border-primary text-primary hover:bg-primary/10 rounded-lg h-10 w-10"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 3. Character Name (from CHARACTER data) */}
      <h2 className="text-2xl font-bold text-center text-foreground">
        {character.name}
      </h2>

      {/* 4. User Stats Row (4-column, from USER profile) */}
      <div className="grid grid-cols-4 gap-2 px-4">
        <div className="text-center">
          <span className="font-bold text-xl text-foreground">{followersCount}</span>
          <p className="text-xs text-muted-foreground">Followers</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-xl text-foreground">{followingCount}</span>
          <p className="text-xs text-muted-foreground">Following</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-xl text-foreground">{daysActive}</span>
          <p className="text-xs text-muted-foreground">Days</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-xl text-foreground">{storiesCount}</span>
          <p className="text-xs text-muted-foreground">Stories</p>
        </div>
      </div>

      {/* 5. Character Age (prominent display, from CHARACTER data) */}
      {character.age && (
        <div className="flex justify-center">
          <div className="px-6 py-2 rounded-full bg-primary/10 border border-primary/30">
            <span className="text-2xl font-bold text-primary">{character.age}</span>
            <span className="text-sm text-muted-foreground ml-2">years old</span>
          </div>
        </div>
      )}

      {/* Identity Row: Pronouns | Sexuality | RP Style */}
      {identityParts.length > 0 && (
        <div className="flex items-center justify-center">
          <span className="text-sm text-primary font-medium">
            {identityParts.join(' | ')}
          </span>
        </div>
      )}

      {/* 6. Bio (from CHARACTER data) */}
      {character.bio && (
        <p className="text-center text-muted-foreground px-6 text-sm leading-relaxed">
          {character.bio}
        </p>
      )}

      {/* Likes & Dislikes */}
      <div className="px-4 space-y-3">
        {character.likes && character.likes.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Likes</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {character.likes.map((like, i) => (
                <span key={i} className="px-2 py-1 rounded-full bg-green-500/10 text-green-400 text-xs">
                  {like}
                </span>
              ))}
            </div>
          </div>
        )}
        {character.dislikes && character.dislikes.length > 0 && (
          <div>
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Dislikes</span>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {character.dislikes.map((dislike, i) => (
                <span key={i} className="px-2 py-1 rounded-full bg-red-500/10 text-red-400 text-xs">
                  {dislike}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Relationships Section */}
      <div className="px-4">
        <CharacterRelationships 
          characterId={character.id} 
          isOwner={isOwnProfile} 
        />
      </div>

      {/* Sub-Nav Icons */}
      <div className="flex justify-around items-center py-3 border-t border-border">
        {subNavItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => {
              setActiveTab(label);
              toast({ title: `${label} coming soon!` });
            }}
            className={`transition-colors p-2 ${activeTab === label ? 'text-primary' : 'text-muted-foreground hover:text-primary'}`}
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
