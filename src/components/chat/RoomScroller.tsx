import { motion } from 'framer-motion';
import { Plus } from 'lucide-react';

interface Room {
  id: string;
  name: string;
  background_url: string | null;
  is_staff_only: boolean;
}

interface RoomScrollerProps {
  rooms: Room[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreateRoom?: () => void;
}

export const RoomScroller = ({ rooms, selectedId, onSelect, onCreateRoom }: RoomScrollerProps) => {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide px-4">
      {rooms.map((room, index) => (
        <motion.button
          key={room.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.03 }}
          onClick={() => onSelect(room.id)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className={`w-14 h-14 rounded-lg overflow-hidden transition-all ${
            selectedId === room.id
              ? 'ring-2 ring-primary ring-offset-2 ring-offset-background'
              : 'border border-border'
          }`}>
            {room.background_url ? (
              <img 
                src={room.background_url} 
                alt={room.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-secondary flex items-center justify-center">
                <span className="text-lg">
                  {room.is_staff_only ? '🔒' : '💬'}
                </span>
              </div>
            )}
          </div>
          <span className={`text-xs w-14 text-center truncate ${
            selectedId === room.id ? 'text-foreground font-medium' : 'text-muted-foreground'
          }`}>
            {room.name}
          </span>
        </motion.button>
      ))}

      {/* Create Room Button */}
      {onCreateRoom && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onCreateRoom}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="w-14 h-14 rounded-lg border-2 border-dashed border-border flex items-center justify-center hover:border-primary/50 transition-colors">
            <Plus className="w-5 h-5 text-muted-foreground" />
          </div>
          <span className="text-xs text-muted-foreground w-14 text-center">
            Create
          </span>
        </motion.button>
      )}
    </div>
  );
};
