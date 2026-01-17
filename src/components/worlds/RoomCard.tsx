import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { DoorOpen, Lock } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  description: string | null;
  background_url: string | null;
  is_staff_only: boolean;
}

interface RoomCardProps {
  room: Room;
  index: number;
  worldId: string;
}

export const RoomCard = ({ room, index, worldId }: RoomCardProps) => {
  const navigate = useNavigate();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={() => navigate(`/worlds/${worldId}/rooms/${room.id}`)}
      className="glass-card p-4 cursor-pointer group hover:neon-border transition-all"
    >
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-neon-purple/20 to-neon-blue/20 flex items-center justify-center overflow-hidden flex-shrink-0">
          {room.background_url ? (
            <img src={room.background_url} alt={room.name} className="w-full h-full object-cover" />
          ) : (
            <DoorOpen className="w-6 h-6 text-primary/50" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="font-display font-semibold text-foreground truncate group-hover:text-primary transition-colors">
              {room.name}
            </h4>
            {room.is_staff_only && (
              <Lock className="w-4 h-4 text-accent flex-shrink-0" />
            )}
          </div>
          {room.description && (
            <p className="text-sm text-muted-foreground truncate">
              {room.description}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
};
