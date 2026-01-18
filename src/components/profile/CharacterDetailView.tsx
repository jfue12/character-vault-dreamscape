import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Image, Gamepad2, BookOpen, MessageSquare } from 'lucide-react';
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
      className="space-y-4 px-4"
    >
      {/* 1. Large Portrait - Mascot Style (square with rounded corners) */}
      <div className="relative mx-auto w-72 aspect-square rounded-[16px] overflow-hidden border border-[#2a2a2a]">
        {character.avatar_url ? (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
            <span className="text-8xl font-display font-bold text-[#7C3AED]/40">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* 2. Action Buttons Row - Exact Mascot Layout */}
      {isOwnProfile ? (
        <div className="flex gap-3 justify-center items-center">
          <Button 
            variant="outline" 
            onClick={onArrange}
            className="px-6 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg h-10 font-medium text-sm bg-transparent"
          >
            Arrange Character
          </Button>
          <Button 
            variant="outline"
            onClick={onEdit}
            className="px-6 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg h-10 font-medium text-sm bg-transparent"
          >
            Edit Character
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg h-10 w-10 bg-transparent"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 justify-center items-center">
          <Button 
            onClick={onFollow}
            className="px-8 bg-[#7C3AED] hover:bg-[#7C3AED]/90 text-white rounded-lg h-10 font-medium"
          >
            Follow
          </Button>
          <Button 
            variant="outline"
            onClick={onMessage}
            className="px-8 border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg h-10 font-medium bg-transparent"
          >
            Message
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="border-[#7C3AED] text-[#7C3AED] hover:bg-[#7C3AED]/10 rounded-lg h-10 w-10 bg-transparent"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 3. Character Name - Centered */}
      <h2 className="text-xl font-semibold text-center text-white mt-2">
        {character.name}
      </h2>

      {/* 4. Stats Row - Inline, no boxes (Mascot style) */}
      <div className="flex justify-center items-center gap-8">
        <div className="text-center">
          <span className="font-bold text-lg text-white">{followersCount}</span>
          <p className="text-xs text-gray-500">Followers</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-lg text-white">{followingCount}</span>
          <p className="text-xs text-gray-500">Following</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-lg text-white">{daysActive}</span>
          <p className="text-xs text-gray-500">Days</p>
        </div>
        <div className="text-center">
          <span className="font-bold text-lg text-white">{storiesCount}</span>
          <p className="text-xs text-gray-500">Stories</p>
        </div>
      </div>

      {/* 5. Character Age - Standalone number centered */}
      {character.age && (
        <div className="text-center">
          <span className="text-lg font-medium text-white">{character.age}</span>
        </div>
      )}

      {/* 6. Bio - Narrative text, centered */}
      {character.bio && (
        <p className="text-center text-gray-400 text-sm leading-relaxed px-2">
          {character.bio}
        </p>
      )}

      {/* Relationships Section */}
      <div className="mt-4">
        <CharacterRelationships 
          characterId={character.id} 
          isOwner={isOwnProfile} 
        />
      </div>

      {/* Sub-Nav Icons */}
      <div className="flex justify-around items-center py-3 border-t border-[#1a1a1a] mt-4">
        {subNavItems.map(({ icon: Icon, label }) => (
          <button
            key={label}
            onClick={() => {
              setActiveTab(label);
              toast({ title: `${label} coming soon!` });
            }}
            className={`transition-colors p-2 ${activeTab === label ? 'text-[#7C3AED]' : 'text-gray-600 hover:text-[#7C3AED]'}`}
            title={label}
          >
            <Icon className="w-6 h-6" />
          </button>
        ))}
        {/* Current character avatar */}
        <button className="w-7 h-7 rounded-full overflow-hidden ring-2 ring-[#7C3AED]">
          {character.avatar_url ? (
            <img 
              src={character.avatar_url} 
              alt={character.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#7C3AED] to-purple-900 flex items-center justify-center">
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
