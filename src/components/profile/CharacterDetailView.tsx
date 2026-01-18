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
      {/* 1. Large Portrait with 20px rounded corners - Mascot Style */}
      <div className="relative mx-auto w-64 aspect-[3/4] rounded-[20px] overflow-hidden bg-[#0a0a0a] border border-[#1a1a1a]">
        {character.avatar_url ? (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/30 to-purple-900/30 flex items-center justify-center">
            <span className="text-7xl font-display font-bold text-[#7C3AED]/60">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* 2. Action Buttons Row - Horizontal Flex */}
      {isOwnProfile ? (
        <div className="flex gap-2 justify-center items-center px-4">
          <Button 
            variant="outline" 
            onClick={onArrange}
            className="flex-1 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-xl h-11 font-semibold"
          >
            <Layers className="w-4 h-4 mr-2" />
            Arrange
          </Button>
          <Button 
            variant="outline"
            onClick={onEdit}
            className="flex-1 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-xl h-11 font-semibold"
          >
            Edit Character
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-xl h-11 w-11"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-2 justify-center items-center px-4">
          <Button 
            onClick={onFollow}
            className="flex-1 bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white rounded-xl h-11 font-semibold"
          >
            Follow
          </Button>
          <Button 
            variant="outline"
            onClick={onMessage}
            className="flex-1 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-xl h-11 font-semibold"
          >
            Message
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-xl h-11 w-11"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 3. Character Name */}
      <h2 className="text-2xl font-bold text-center text-white">
        {character.name}
      </h2>

      {/* 4. User Stats Grid - 4 columns (from USER profile) */}
      <div className="grid grid-cols-4 gap-2 px-4">
        <div className="text-center py-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
          <span className="font-bold text-xl text-white">{followersCount}</span>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Followers</p>
        </div>
        <div className="text-center py-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
          <span className="font-bold text-xl text-white">{followingCount}</span>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Following</p>
        </div>
        <div className="text-center py-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
          <span className="font-bold text-xl text-white">{daysActive}</span>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Days</p>
        </div>
        <div className="text-center py-3 rounded-xl bg-[#0a0a0a] border border-[#1a1a1a]">
          <span className="font-bold text-xl text-white">{storiesCount}</span>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Stories</p>
        </div>
      </div>

      {/* 5. Character Age - Large Standalone Number (from CHARACTER data) */}
      {character.age && (
        <div className="flex justify-center">
          <div className="text-center">
            <span className="text-5xl font-bold text-[#7C3AED]">{character.age}</span>
            <p className="text-xs text-gray-500 uppercase tracking-wide mt-1">Years Old</p>
          </div>
        </div>
      )}

      {/* Identity Row: Pronouns | Sexuality | RP Style */}
      {identityParts.length > 0 && (
        <div className="flex items-center justify-center">
          <span className="text-sm text-[#7C3AED] font-medium">
            {identityParts.join(' | ')}
          </span>
        </div>
      )}

      {/* 6. Bio - Narrative text only (from CHARACTER data) */}
      {character.bio && (
        <p className="text-center text-gray-400 px-6 text-sm leading-relaxed italic">
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
