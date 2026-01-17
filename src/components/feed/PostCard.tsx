import { useState } from 'react';
import { Heart, MessageCircle, MoreHorizontal } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface Post {
  id: string;
  content: string;
  image_url: string | null;
  likes_count: number;
  comments_count: number;
  created_at: string;
  author: {
    id: string;
    username: string;
  };
  character: {
    id: string;
    name: string;
    avatar_url: string | null;
  } | null;
  isLiked?: boolean;
}

interface PostCardProps {
  post: Post;
  onLike: (postId: string) => void;
}

export const PostCard = ({ post, onLike }: PostCardProps) => {
  const navigate = useNavigate();
  const [isLiking, setIsLiking] = useState(false);

  const handleLike = async () => {
    if (isLiking) return;
    setIsLiking(true);
    await onLike(post.id);
    setIsLiking(false);
  };

  const displayName = post.character?.name || post.author.username || 'Unknown';
  const avatar = post.character?.avatar_url;

  return (
    <article className="p-4 hover:bg-muted/30 transition-colors">
      {/* Header */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <button 
          onClick={() => navigate(`/user/${post.author.id}`)}
          className="w-10 h-10 rounded-full overflow-hidden border border-border flex-shrink-0"
        >
          {avatar ? (
            <img src={avatar} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-primary/20 flex items-center justify-center text-sm font-medium text-primary">
              {displayName[0]?.toUpperCase()}
            </div>
          )}
        </button>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Name and time */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <button 
                onClick={() => navigate(`/user/${post.author.id}`)}
                className="font-semibold text-foreground hover:underline truncate"
              >
                {displayName}
              </button>
              <span className="text-muted-foreground text-sm">
                @{post.author.username}
              </span>
              <span className="text-muted-foreground text-sm">·</span>
              <span className="text-muted-foreground text-sm flex-shrink-0">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            <button className="p-1 hover:bg-muted rounded-full">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Post content */}
          <p className="text-foreground mt-1 whitespace-pre-wrap break-words">
            {post.content}
          </p>

          {/* Image */}
          {post.image_url && (
            <div className="mt-3 rounded-xl overflow-hidden border border-border">
              <img 
                src={post.image_url} 
                alt="Post image"
                className="w-full h-auto max-h-96 object-cover"
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-6 mt-3">
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={isLiking}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-red-500 transition-colors group"
            >
              <motion.div
                whileTap={{ scale: 0.8 }}
                className={`p-2 -m-2 rounded-full group-hover:bg-red-500/10 ${post.isLiked ? 'text-red-500' : ''}`}
              >
                <Heart className={`w-5 h-5 ${post.isLiked ? 'fill-current' : ''}`} />
              </motion.div>
              <span className={`text-sm ${post.isLiked ? 'text-red-500' : ''}`}>
                {post.likes_count}
              </span>
            </button>

            {/* Comments */}
            <button
              onClick={() => navigate(`/post/${post.id}`)}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors group"
            >
              <div className="p-2 -m-2 rounded-full group-hover:bg-primary/10">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-sm">{post.comments_count}</span>
            </button>
          </div>
        </div>
      </div>
    </article>
  );
};
