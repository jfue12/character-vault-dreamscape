import { motion } from 'framer-motion';
import { Edit, Layers, Users, Calendar } from 'lucide-react';
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
}

interface CharacterDetailViewProps {
  character: Character;
  followersCount: number;
  followingCount: number;
  isOwnProfile?: boolean;
  onEdit?: () => void;
  onArrange?: () => void;
}

export const CharacterDetailView = ({
  character,
  followersCount,
  followingCount,
  isOwnProfile = true,
  onEdit,
  onArrange
}: CharacterDetailViewProps) => {
  const daysActive = differenceInDays(new Date(), new Date(character.created_at));

  // Generate a zodiac based on creation date (just for fun)
  const zodiacSigns = ['♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓'];
  const zodiac = zodiacSigns[new Date(character.created_at).getMonth()];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Large Avatar */}
      <div className="relative mx-auto w-48 h-48 rounded-3xl overflow-hidden border-2 border-border">
        {character.avatar_url ? (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-neon-pink/20 flex items-center justify-center">
            <span className="text-6xl font-display font-bold text-primary/50">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
      </div>

      {/* Character Name */}
      <h2 className="text-2xl font-display font-bold text-center text-foreground">
        {character.name}
      </h2>

      {/* Action Buttons */}
      {isOwnProfile ? (
        <div className="flex gap-3 justify-center">
          <Button 
            variant="outline" 
            onClick={onArrange}
            className="flex items-center gap-2"
          >
            <Layers className="w-4 h-4" />
            Arrange
          </Button>
          <Button 
            onClick={onEdit}
            className="flex items-center gap-2"
          >
            <Edit className="w-4 h-4" />
            Edit Character
          </Button>
        </div>
      ) : (
        <div className="flex gap-3 justify-center">
          <Button variant="outline">
            Message
          </Button>
          <Button>
            Follow
          </Button>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex justify-center gap-8 py-4">
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center text-primary">
            <Users className="w-4 h-4" />
            <span className="font-bold">{followersCount}</span>
          </div>
          <span className="text-xs text-muted-foreground">Followers</span>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center text-primary">
            <Users className="w-4 h-4" />
            <span className="font-bold">{followingCount}</span>
          </div>
          <span className="text-xs text-muted-foreground">Following</span>
        </div>
        <div className="text-center">
          <div className="flex items-center gap-1 justify-center text-primary">
            <Calendar className="w-4 h-4" />
            <span className="font-bold">{daysActive}</span>
          </div>
          <span className="text-xs text-muted-foreground">Days</span>
        </div>
      </div>

      {/* Identity Line */}
      <div className="flex items-center justify-center gap-3 text-sm text-muted-foreground flex-wrap">
        {character.pronouns && (
          <>
            <span>{character.pronouns}</span>
            <span className="text-border">|</span>
          </>
        )}
        <span>{zodiac}</span>
        {character.age && (
          <>
            <span className="text-border">|</span>
            <span>{character.age}y/o</span>
          </>
        )}
        {character.gender && (
          <>
            <span className="text-border">|</span>
            <span>{character.gender}</span>
          </>
        )}
        {character.species && (
          <>
            <span className="text-border">|</span>
            <span>{character.species}</span>
          </>
        )}
      </div>

      {/* Bio */}
      {character.bio && (
        <p className="text-center text-muted-foreground px-4">
          {character.bio}
        </p>
      )}

      {/* Likes & Dislikes */}
      <div className="space-y-3 px-4">
        {character.likes && character.likes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-primary mb-2">LIKES</h4>
            <div className="flex flex-wrap gap-2">
              {character.likes.map((like, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                  {like}
                </span>
              ))}
            </div>
          </div>
        )}
        {character.dislikes && character.dislikes.length > 0 && (
          <div>
            <h4 className="text-xs font-semibold text-destructive mb-2">DISLIKES</h4>
            <div className="flex flex-wrap gap-2">
              {character.dislikes.map((dislike, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-destructive/10 text-destructive text-xs">
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
