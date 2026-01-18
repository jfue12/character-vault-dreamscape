import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Bot, Crown, Sparkles, User } from 'lucide-react';

interface AICharacterDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  character: {
    name: string;
    bio?: string | null;
    personality_traits?: string[] | null;
    social_rank?: string | null;
    avatar_url?: string | null;
    avatar_description?: string | null;
  } | null;
}

export const AICharacterDetailModal = ({ isOpen, onClose, character }: AICharacterDetailModalProps) => {
  if (!character) return null;

  const getRankIcon = (rank: string | null | undefined) => {
    switch (rank?.toLowerCase()) {
      case 'royalty':
      case 'noble':
        return <Crown className="w-4 h-4 text-amber-400" />;
      case 'commoner':
        return <User className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Sparkles className="w-4 h-4 text-purple-400" />;
    }
  };

  const getRankColor = (rank: string | null | undefined) => {
    switch (rank?.toLowerCase()) {
      case 'royalty':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/30';
      case 'noble':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
      case 'commoner':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Bot className="w-5 h-5 text-blue-400" />
            AI Character
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Avatar & Name */}
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl overflow-hidden border-2 border-primary/30 bg-gradient-to-br from-primary/20 to-purple-900/30 flex items-center justify-center">
              {character.avatar_url ? (
                <img 
                  src={character.avatar_url} 
                  alt={character.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl font-bold text-primary">
                  {character.name[0]?.toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-semibold text-foreground">{character.name}</h3>
              {character.social_rank && (
                <Badge 
                  variant="outline" 
                  className={`mt-1 ${getRankColor(character.social_rank)}`}
                >
                  {getRankIcon(character.social_rank)}
                  <span className="ml-1 capitalize">{character.social_rank}</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Bio */}
          {character.bio && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground">Biography</h4>
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3">
                {character.bio}
              </p>
            </div>
          )}

          {/* Avatar Description (for AI-generated characters without images) */}
          {character.avatar_description && !character.avatar_url && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground">Appearance</h4>
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg p-3 italic">
                {character.avatar_description}
              </p>
            </div>
          )}

          {/* Personality Traits */}
          {character.personality_traits && character.personality_traits.length > 0 && (
            <div className="space-y-1.5">
              <h4 className="text-sm font-medium text-muted-foreground">Personality Traits</h4>
              <div className="flex flex-wrap gap-1.5">
                {character.personality_traits.map((trait, index) => (
                  <Badge 
                    key={index} 
                    variant="secondary"
                    className="bg-primary/10 text-primary border-primary/20"
                  >
                    {trait}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* No details available */}
          {!character.bio && !character.avatar_description && (!character.personality_traits || character.personality_traits.length === 0) && (
            <p className="text-sm text-muted-foreground italic text-center py-4">
              This mysterious character hasn't revealed much about themselves yet...
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
