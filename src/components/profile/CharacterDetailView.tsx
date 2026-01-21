import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Image, Gamepad2, BookOpen, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CharacterRelationships } from './CharacterRelationships';
import { CharacterGallery } from './CharacterGallery';
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
  const [activeTab, setActiveTab] = useState<'info' | 'gallery' | 'rp' | 'stories' | 'comments'>('info');

  const subNavItems = [
    { icon: Image, label: 'Gallery', key: 'gallery' as const },
    { icon: Gamepad2, label: 'RP', key: 'rp' as const },
    { icon: BookOpen, label: 'Stories', key: 'stories' as const },
    { icon: MessageSquare, label: 'Comments', key: 'comments' as const }
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4 px-4"
    >
      {/* 1. Large Portrait - Mascot Style (square with rounded corners) */}
      <div className="relative mx-auto w-72 aspect-square rounded-[16px] overflow-hidden border border-border">
        {character.avatar_url ? (
          <img src={character.avatar_url} alt={character.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-card to-background flex items-center justify-center">
            <span className="text-8xl font-display font-bold text-primary/40">
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
            className="px-6 border-primary text-primary hover:bg-primary/10 rounded-lg h-10 font-medium text-sm bg-transparent"
          >
            Set Active
          </Button>
          <Button
            variant="outline"
            onClick={onEdit}
            className="px-6 border-primary text-primary hover:bg-primary/10 rounded-lg h-10 font-medium text-sm bg-transparent"
          >
            Edit Character
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="border-primary text-primary hover:bg-primary/10 rounded-lg h-10 w-10 bg-transparent"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 justify-center items-center">
          <Button
            onClick={onFollow}
            className="px-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg h-10 font-medium"
          >
            Follow
          </Button>
          <Button
            variant="outline"
            onClick={onMessage}
            className="px-8 border-primary text-primary hover:bg-primary/10 rounded-lg h-10 font-medium bg-transparent"
          >
            Message
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={onShare}
            className="border-primary text-primary hover:bg-primary/10 rounded-lg h-10 w-10 bg-transparent"
          >
            <Share2 className="w-4 h-4" />
          </Button>
        </div>
      )}

      {/* 3. Character Name - Centered */}
      <h2 className="text-xl font-semibold text-center text-foreground mt-2">
        {character.name}
      </h2>

      {/* 4. Stats Row - Inline, no boxes (Mascot style) */}
      <div className="flex justify-center items-center gap-8">
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

      {/* 5. Character Age - Standalone number centered */}
      {character.age && (
        <div className="text-center">
          <span className="text-lg font-medium text-foreground">{character.age}</span>
        </div>
      )}

      {/* 6. Bio - Narrative text, centered */}
      {character.bio && (
        <p className="text-center text-muted-foreground text-sm leading-relaxed px-2">
          {character.bio}
        </p>
      )}

      {/* Relationships Section */}
      <div className="mt-4">
        <CharacterRelationships characterId={character.id} isOwner={isOwnProfile} />
      </div>

      {/* Sub-Nav Icons */}
      <div className="flex justify-center gap-6 pt-4 border-t border-border">
        {subNavItems.map((item) => (
          <button
            key={item.key}
            onClick={() => setActiveTab(item.key)}
            className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${
              activeTab === item.key
                ? 'text-primary bg-primary/10'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-xs">{item.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'gallery' && (
        <CharacterGallery characterId={character.id} isOwner={isOwnProfile} />
      )}

      {activeTab === 'rp' && (
        <div className="py-8 text-center text-muted-foreground">
          <Gamepad2 className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">RP history coming soon</p>
        </div>
      )}

      {activeTab === 'stories' && (
        <div className="py-8 text-center text-muted-foreground">
          <BookOpen className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Stories coming soon</p>
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="py-8 text-center text-muted-foreground">
          <MessageSquare className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Comments coming soon</p>
        </div>
      )}
    </motion.div>
  );
};