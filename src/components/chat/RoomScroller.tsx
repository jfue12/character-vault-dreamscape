import { motion } from 'framer-motion';

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
}

export const RoomScroller = ({ rooms, selectedId, onSelect }: RoomScrollerProps) => {
  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-4">
      {rooms.map((room, index) => (
        <motion.button
          key={room.id}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          onClick={() => onSelect(room.id)}
          className={`flex-shrink-0 px-4 py-2 rounded-full transition-all ${
            selectedId === room.id
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
          }`}
        >
          <span className="text-sm font-medium whitespace-nowrap">
            {room.is_staff_only && '🔒 '}{room.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
};
