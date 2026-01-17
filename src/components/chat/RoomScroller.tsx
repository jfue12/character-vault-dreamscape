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
    <div className="flex gap-3 overflow-x-auto pb-1 scrollbar-hide px-4">
      {/* First room */}
      {rooms.slice(0, 1).map((room) => (
        <motion.button
          key={room.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => onSelect(room.id)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className={`w-14 h-14 rounded-lg overflow-hidden ${
            selectedId === room.id
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
              : ''
          }`}>
            {room.background_url ? (
              <img 
                src={room.background_url} 
                alt={room.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-600 to-red-800" />
            )}
          </div>
          <span className={`text-[10px] w-14 text-center truncate ${
            selectedId === room.id ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {room.name}
          </span>
        </motion.button>
      ))}

      {/* Create Room Button */}
      <motion.button
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={onCreateRoom}
        className="flex flex-col items-center gap-1 flex-shrink-0"
      >
        <div className="w-14 h-14 rounded-lg border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
          <Plus className="w-5 h-5 text-muted-foreground" />
        </div>
        <span className="text-[10px] text-muted-foreground">
          Create
        </span>
      </motion.button>

      {/* Remaining rooms */}
      {rooms.slice(1).map((room, index) => (
        <motion.button
          key={room.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: (index + 2) * 0.03 }}
          onClick={() => onSelect(room.id)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className={`w-14 h-14 rounded-lg overflow-hidden ${
            selectedId === room.id
              ? 'ring-2 ring-primary ring-offset-1 ring-offset-background'
              : ''
          }`}>
            {room.background_url ? (
              <img 
                src={room.background_url} 
                alt={room.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center">
                <span className="text-lg">
                  {room.is_staff_only ? '🔒' : '💬'}
                </span>
              </div>
            )}
          </div>
          <span className={`text-[10px] w-14 text-center truncate ${
            selectedId === room.id ? 'text-foreground' : 'text-muted-foreground'
          }`}>
            {room.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
};
