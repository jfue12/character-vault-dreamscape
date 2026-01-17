import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useState } from 'react';
import { Heart, X, MessageCircle } from 'lucide-react';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
  pronouns: string | null;
  bio: string | null;
  identity_tags?: {
    sexuality?: string;
    rp_style?: string;
  } | null;
  owner_id: string;
  profiles?: {
    username: string | null;
  } | null;
}

interface DiscoveryCardProps {
  character: Character;
  onSwipeLeft: () => void;
  onSwipeRight: (character: Character) => void;
  isTop: boolean;
}

export const DiscoveryCard = ({ character, onSwipeLeft, onSwipeRight, isTop }: DiscoveryCardProps) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-200, 200], [-20, 20]);
  const opacity = useTransform(x, [-200, 0, 200], [0.5, 1, 0.5]);
  
  const likeOpacity = useTransform(x, [0, 100], [0, 1]);
  const nopeOpacity = useTransform(x, [-100, 0], [1, 0]);

  const handleDragEnd = (event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (info.offset.x > 100) {
      onSwipeRight(character);
    } else if (info.offset.x < -100) {
      onSwipeLeft();
    }
  };

  const identityTags = character.identity_tags as { sexuality?: string; rp_style?: string } | null;
  const identityLine = [
    character.pronouns,
    identityTags?.sexuality,
    identityTags?.rp_style,
  ].filter(Boolean).join(' | ');

  return (
    <motion.div
      className="absolute w-full h-full"
      style={{ x, rotate, opacity }}
      drag={isTop ? 'x' : false}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.8}
      onDragEnd={handleDragEnd}
      initial={!isTop ? { scale: 0.95, y: 10 } : false}
      animate={isTop ? { scale: 1, y: 0 } : { scale: 0.95, y: 10 }}
    >
      <div className="relative w-full h-full rounded-3xl overflow-hidden glass-card">
        {/* Background Image */}
        {character.avatar_url ? (
          <img 
            src={character.avatar_url} 
            alt={character.name}
            className="absolute inset-0 w-full h-full object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-purple-900/50 flex items-center justify-center">
            <span className="text-8xl font-display font-bold text-primary/60">
              {character.name[0]?.toUpperCase()}
            </span>
          </div>
        )}
        
        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />

        {/* Like/Nope Indicators */}
        <motion.div
          className="absolute top-10 right-10 px-6 py-2 border-4 border-green-500 rounded-lg"
          style={{ opacity: likeOpacity, rotate: -20 }}
        >
          <span className="text-3xl font-bold text-green-500">LIKE</span>
        </motion.div>
        <motion.div
          className="absolute top-10 left-10 px-6 py-2 border-4 border-red-500 rounded-lg"
          style={{ opacity: nopeOpacity, rotate: 20 }}
        >
          <span className="text-3xl font-bold text-red-500">NOPE</span>
        </motion.div>

        {/* Character Info */}
        <div className="absolute bottom-0 left-0 right-0 p-6 space-y-2">
          <h2 className="text-3xl font-display font-bold text-white">
            {character.name}
          </h2>
          <p className="text-sm text-white/70">
            @{character.profiles?.username || 'anonymous'}
          </p>
          
          {identityLine && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-primary font-medium">
                {identityLine}
              </span>
            </div>
          )}
          
          {character.bio && (
            <p className="text-sm text-white/80 line-clamp-3">
              {character.bio}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
