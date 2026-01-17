import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Globe, Lock, AlertTriangle, Users } from 'lucide-react';

interface World {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  tags: string[];
  is_public: boolean;
  is_nsfw: boolean;
  owner_id: string;
}

interface WorldCardProps {
  world: World;
  index: number;
  currentUserId?: string;
}

export const WorldCard = ({ world, index, currentUserId }: WorldCardProps) => {
  const navigate = useNavigate();
  const isOwner = currentUserId === world.owner_id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      onClick={() => navigate(`/worlds/${world.id}`)}
      className="glass-card overflow-hidden cursor-pointer group hover:neon-border transition-all"
    >
      {/* Cover Image */}
      <div className="h-40 bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 relative overflow-hidden">
        {world.image_url ? (
          <img
            src={world.image_url}
            alt={world.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Globe className="w-16 h-16 text-primary/30" />
          </div>
        )}
        
        {/* Badges */}
        <div className="absolute top-2 left-2 flex gap-2">
          {world.is_nsfw && (
            <span className="px-2 py-1 rounded-full bg-destructive/80 backdrop-blur text-destructive-foreground text-xs flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" />
              18+
            </span>
          )}
          {!world.is_public && (
            <span className="px-2 py-1 rounded-full bg-background/80 backdrop-blur text-foreground text-xs flex items-center gap-1">
              <Lock className="w-3 h-3" />
              Private
            </span>
          )}
          {isOwner && (
            <span className="px-2 py-1 rounded-full bg-primary/80 backdrop-blur text-primary-foreground text-xs">
              Owner
            </span>
          )}
        </div>
      </div>

      {/* Info */}
      <div className="p-4 space-y-2">
        <h4 className="font-display font-bold text-foreground group-hover:text-primary transition-colors">
          {world.name}
        </h4>
        
        {world.description && (
          <p className="text-muted-foreground text-sm line-clamp-2">
            {world.description}
          </p>
        )}

        {/* Tags */}
        {world.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-2">
            {world.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs"
              >
                {tag}
              </span>
            ))}
            {world.tags.length > 3 && (
              <span className="px-2 py-0.5 rounded-full bg-secondary text-secondary-foreground text-xs">
                +{world.tags.length - 3}
              </span>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
};
