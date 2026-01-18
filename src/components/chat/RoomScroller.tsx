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
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide px-3">
      {/* First room - General */}
      {rooms.slice(0, 1).map((room) => (
        <motion.button
          key={room.id}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={() => onSelect(room.id)}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className={`w-16 h-16 rounded-xl overflow-hidden transition-all ${
            selectedId === room.id
              ? 'ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-[#000]'
              : 'opacity-80 hover:opacity-100'
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
          <span className={`text-[11px] w-16 text-center truncate font-medium ${
            selectedId === room.id ? 'text-[#7C3AED]' : 'text-gray-400'
          }`}>
            {room.name}
          </span>
        </motion.button>
      ))}

      {/* Create Room Button - Only show if owner */}
      {onCreateRoom && (
        <motion.button
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          onClick={onCreateRoom}
          className="flex flex-col items-center gap-1 flex-shrink-0"
        >
          <div className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-600 flex items-center justify-center hover:border-[#7C3AED] transition-colors">
            <Plus className="w-6 h-6 text-gray-500" />
          </div>
          <span className="text-[11px] text-gray-500 font-medium">
            Create
          </span>
        </motion.button>
      )}

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
          <div className={`w-16 h-16 rounded-xl overflow-hidden transition-all ${
            selectedId === room.id
              ? 'ring-2 ring-[#7C3AED] ring-offset-2 ring-offset-[#000]'
              : 'opacity-80 hover:opacity-100'
          }`}>
            {room.background_url ? (
              <img 
                src={room.background_url} 
                alt={room.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center">
                <span className="text-lg">
                  {room.is_staff_only ? '🔒' : '💬'}
                </span>
              </div>
            )}
          </div>
          <span className={`text-[11px] w-16 text-center truncate font-medium ${
            selectedId === room.id ? 'text-[#7C3AED]' : 'text-gray-400'
          }`}>
            {room.name}
          </span>
        </motion.button>
      ))}
    </div>
  );
};
