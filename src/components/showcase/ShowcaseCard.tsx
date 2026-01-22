import { Star, MessageSquare, Share2, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface ShowcaseCardProps {
  item: {
    id: string;
    character: {
      name: string;
      avatar_url: string | null;
      background_url: string | null;
    };
    profile: {
      username: string | null;
    };
    average_rating: number;
    rating_count: number;
    comment_count: number;
  };
  onClick: () => void;
  onShare: () => void;
  isOwner: boolean;
}

export const ShowcaseCard = ({ item, onClick, onShare, isOwner }: ShowcaseCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="relative rounded-xl overflow-hidden bg-card border border-border cursor-pointer group"
    >
      {/* Background/Avatar Image */}
      <div className="aspect-[3/4] relative">
        {item.character.avatar_url ? (
          <img
            src={item.character.avatar_url}
            alt={item.character.name}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/30 to-purple-900/30 flex items-center justify-center">
            <span className="text-4xl font-bold text-primary/60">
              {item.character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Rating Badge */}
        <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/60 backdrop-blur-sm rounded-full px-2 py-1">
          <Star className="w-3 h-3 text-yellow-400 fill-yellow-400" />
          <span className="text-xs font-medium text-white">
            {item.average_rating > 0 ? item.average_rating.toFixed(1) : '-'}
          </span>
        </div>

        {/* Share Button (on hover) */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            onShare();
          }}
          className="absolute top-2 left-2 p-1.5 bg-black/60 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Share2 className="w-3 h-3 text-white" />
        </button>
        
        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <h3 className="font-semibold text-white text-sm truncate">
            {item.character.name}
          </h3>
          <p className="text-xs text-white/70 truncate">
            by @{item.profile.username || 'anonymous'}
          </p>
          
          {/* Stats */}
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center gap-1 text-white/60">
              <Star className="w-3 h-3" />
              <span className="text-xs">{item.rating_count}</span>
            </div>
            <div className="flex items-center gap-1 text-white/60">
              <MessageSquare className="w-3 h-3" />
              <span className="text-xs">{item.comment_count}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
