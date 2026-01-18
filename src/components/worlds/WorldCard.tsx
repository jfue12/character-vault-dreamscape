import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Lock, AlertTriangle, Users, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  tags: string[] | null;
  is_public?: boolean;
  is_nsfw: boolean;
  owner_id: string;
}

interface WorldCardProps {
  world: World;
  index?: number;
  currentUserId?: string;
  showJoinButton?: boolean;
  isJoining?: boolean;
  onJoin?: () => void;
  onClick?: () => void;
  memberCount?: number;
}

export const WorldCard = ({ 
  world, 
  index = 0, 
  currentUserId, 
  showJoinButton = false,
  isJoining = false,
  onJoin,
  onClick,
  memberCount
}: WorldCardProps) => {
  const navigate = useNavigate();
  const isOwner = currentUserId === world.owner_id;

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      navigate(`/worlds/${world.id}`);
    }
  };

  const handleJoin = (e: React.MouseEvent) => {
    e.stopPropagation();
    onJoin?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className="glass-card overflow-hidden group transition-all cursor-pointer hover:border-primary/50"
    >
      {/* Cover Image */}
      <div className="h-36 bg-gradient-to-br from-primary/20 via-purple-900/20 to-primary/10 relative overflow-hidden">
        {world.image_url ? (
          <img
            src={world.image_url}
            alt={world.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/10 to-purple-900/20">
            <Globe className="w-14 h-14 text-primary/40" />
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
        
        {/* Badges */}
        <div className="absolute top-3 left-3 flex gap-2">
          {world.is_nsfw && (
            <span className="px-2.5 py-1 rounded-full bg-destructive/90 backdrop-blur-md text-destructive-foreground text-xs font-medium flex items-center gap-1 shadow-lg">
              <AlertTriangle className="w-3 h-3" />
              18+
            </span>
          )}
          {world.is_public === false && (
            <span className="px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-md text-foreground text-xs font-medium flex items-center gap-1 shadow-lg">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
          {isOwner && (
            <span className="px-2.5 py-1 rounded-full bg-primary/90 backdrop-blur-md text-primary-foreground text-xs font-medium shadow-lg">
              Owner
            </span>
          )}
        </div>

        {/* Member count badge */}
        {memberCount !== undefined && (
          <div className="absolute top-3 right-3 px-2.5 py-1 rounded-full bg-card/90 backdrop-blur-md text-foreground text-xs font-medium flex items-center gap-1.5 shadow-lg">
            <Users className="w-3.5 h-3.5 text-primary" />
            <span>{memberCount}</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 space-y-2.5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h4 className="font-display font-bold text-lg text-foreground group-hover:text-primary transition-colors truncate">
              {world.name}
            </h4>
          </div>
          
          {showJoinButton && (
            <Button
              size="sm"
              onClick={handleJoin}
              disabled={isJoining}
              className="shrink-0 rounded-full px-4 shadow-lg"
            >
              {isJoining ? (
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <LogIn className="w-4 h-4 mr-1.5" />
                  Join
                </>
              )}
            </Button>
          )}
        </div>
        
        {world.description && (
          <p className="text-muted-foreground text-sm line-clamp-2 leading-relaxed">
            {world.description}
          </p>
        )}

        {/* Tags */}
        {world.tags && world.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {world.tags.slice(0, 4).map(tag => (
              <span
                key={tag}
                className="px-2.5 py-1 rounded-full bg-primary/15 text-primary text-xs font-medium"
              >
                #{tag}
              </span>
            ))}
            {world.tags.length > 4 && (
              <span className="px-2.5 py-1 rounded-full bg-secondary text-muted-foreground text-xs font-medium">
                +{world.tags.length - 4}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
