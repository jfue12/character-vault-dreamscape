import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { UserPlus, UserMinus, Clock, Ban, Crown, Shield } from 'lucide-react';

interface SystemMessageProps {
  type: 'join' | 'leave' | 'timeout' | 'ban' | 'unban' | 'promote' | 'demote';
  username: string;
  timestamp: string;
  duration?: string;
}

export const SystemMessage = ({ type, username, timestamp, duration }: SystemMessageProps) => {
  const formattedTime = format(new Date(timestamp), 'h:mm a');

  const getMessageContent = () => {
    switch (type) {
      case 'join':
        return { icon: UserPlus, text: `${username} joined the room`, color: 'text-green-400' };
      case 'leave':
        return { icon: UserMinus, text: `${username} left the room`, color: 'text-muted-foreground' };
      case 'timeout':
        return { icon: Clock, text: `${username} was timed out for ${duration}`, color: 'text-yellow-400' };
      case 'ban':
        return { icon: Ban, text: `${username} was banned`, color: 'text-red-400' };
      case 'unban':
        return { icon: Ban, text: `${username} was unbanned`, color: 'text-green-400' };
      case 'promote':
        return { icon: Crown, text: `${username} was promoted`, color: 'text-primary' };
      case 'demote':
        return { icon: Shield, text: `${username} was demoted`, color: 'text-muted-foreground' };
      default:
        return { icon: UserPlus, text: username, color: 'text-muted-foreground' };
    }
  };

  const { icon: Icon, text, color } = getMessageContent();

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex items-center justify-center gap-2 py-2"
    >
      <div className={`flex items-center gap-2 px-3 py-1 rounded-full bg-secondary/30 ${color}`}>
        <Icon className="w-3 h-3" />
        <span className="text-xs">{text}</span>
        <span className="text-[10px] opacity-60">{formattedTime}</span>
      </div>
    </motion.div>
  );
};