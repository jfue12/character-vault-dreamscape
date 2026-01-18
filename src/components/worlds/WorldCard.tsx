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
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      onClick={handleClick}
      className="flex items-center gap-4 p-3 rounded-2xl bg-[#0a0a0a] border border-[#1a1a1a] hover:border-[#7C3AED]/30 transition-all cursor-pointer group"
    >
      {/* Large Square Thumbnail - Mascot Style */}
      <div className="relative flex-shrink-0">
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gradient-to-br from-[#7C3AED]/20 to-purple-900/20">
          {world.image_url ? (
            <img
              src={world.image_url}
              alt={world.name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Globe className="w-8 h-8 text-[#7C3AED]/50" />
            </div>
          )}
        </div>
        
        {/* Badges overlay */}
        {world.is_nsfw && (
          <span className="absolute -top-1 -right-1 px-1.5 py-0.5 rounded bg-red-500 text-white text-[10px] font-bold">
            18+
          </span>
        )}
        {world.is_public === false && (
          <Lock className="absolute bottom-1 right-1 w-4 h-4 text-white bg-black/50 rounded p-0.5" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Bold World Title */}
        <div className="flex items-center gap-2">
          <h4 className="font-bold text-base text-white group-hover:text-[#7C3AED] transition-colors truncate">
            {world.name}
          </h4>
          {isOwner && (
            <span className="px-2 py-0.5 rounded-full bg-[#7C3AED]/20 text-[#7C3AED] text-[10px] font-semibold shrink-0">
              Owner
            </span>
          )}
        </div>
        
        {/* Latest Message / Description - Narrative snippet, italicized */}
        {world.description && (
          <p className="text-sm text-gray-500 italic line-clamp-1 mt-0.5">
            {world.description}
          </p>
        )}

        {/* Tags */}
        {world.tags && world.tags.length > 0 && (
          <div className="flex gap-1.5 mt-2">
            {world.tags.slice(0, 3).map(tag => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-[#7C3AED]/10 text-[#7C3AED] text-[10px] font-medium"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right side: Member count or Join button */}
      <div className="flex-shrink-0 flex items-center gap-3">
        {memberCount !== undefined && (
          <div className="flex items-center gap-1 text-gray-500">
            <Users className="w-4 h-4" />
            <span className="text-sm font-medium">{memberCount}</span>
          </div>
        )}
        
        {showJoinButton && (
          <Button
            size="sm"
            onClick={handleJoin}
            disabled={isJoining}
            className="rounded-xl px-4 bg-[#7C3AED] hover:bg-[#7C3AED]/90 shadow-lg shadow-[#7C3AED]/30"
          >
            {isJoining ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <LogIn className="w-4 h-4 mr-1" />
                Join
              </>
            )}
          </Button>
        )}
      </div>
    </motion.div>
  );
};
