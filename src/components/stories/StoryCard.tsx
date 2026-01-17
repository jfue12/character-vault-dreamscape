import { motion } from 'framer-motion';
import { Eye, Heart, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface StoryCardProps {
  id: string;
  title: string;
  coverUrl: string | null;
  authorName: string;
  authorAvatar: string | null;
  tags: string[];
  viewCount: number;
  isNsfw: boolean;
  createdAt: string;
  onClick: () => void;
}

export const StoryCard = ({
  title,
  coverUrl,
  authorName,
  authorAvatar,
  tags,
  viewCount,
  isNsfw,
  createdAt,
  onClick
}: StoryCardProps) => {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className="bg-card border border-border rounded-xl overflow-hidden cursor-pointer group"
    >
      {/* Cover Image */}
      <div className="aspect-[16/9] relative overflow-hidden bg-secondary">
        {coverUrl ? (
          <img 
            src={coverUrl} 
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-900/20 flex items-center justify-center">
            <span className="text-4xl">📖</span>
          </div>
        )}
        
        {/* NSFW Badge */}
        {isNsfw && (
          <div className="absolute top-2 left-2 px-2 py-0.5 bg-destructive text-destructive-foreground text-xs font-bold rounded">
            18+
          </div>
        )}
        
        {/* View Count */}
        <div className="absolute bottom-2 right-2 px-2 py-0.5 bg-background/80 backdrop-blur-sm rounded-full flex items-center gap-1 text-xs">
          <Eye className="w-3 h-3" />
          {viewCount}
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        <h3 className="font-semibold text-foreground line-clamp-1 group-hover:text-primary transition-colors">
          {title}
        </h3>
        
        {/* Author */}
        <div className="flex items-center gap-2 mt-2">
          <div className="w-6 h-6 rounded-full overflow-hidden bg-secondary">
            {authorAvatar ? (
              <img src={authorAvatar} alt={authorName} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs font-bold">
                {authorName[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-sm text-muted-foreground">{authorName}</span>
        </div>

        {/* Tags */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-3">
            {tags.slice(0, 3).map(tag => (
              <span 
                key={tag}
                className="px-2 py-0.5 bg-secondary text-xs text-muted-foreground rounded-full"
              >
                #{tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="px-2 py-0.5 text-xs text-muted-foreground">
                +{tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Date */}
        <div className="flex items-center gap-1 mt-3 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {format(new Date(createdAt), 'MMM d, yyyy')}
        </div>
      </div>
    </motion.div>
  );
};
