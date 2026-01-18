import { motion, AnimatePresence } from 'framer-motion';
import { User, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';

interface Character {
  id: string;
  name: string;
  avatar_url: string | null;
}

interface CompactPersonaSwitcherProps {
  characters: Character[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  baseProfileName?: string;
}

export const CompactPersonaSwitcher = ({ 
  characters, 
  selectedId, 
  onSelect, 
  baseProfileName = 'You'
}: CompactPersonaSwitcherProps) => {
  const [expanded, setExpanded] = useState(false);
  const selectedCharacter = characters.find(c => c.id === selectedId);

  return (
    <div className="flex justify-center py-2">
      <AnimatePresence mode="wait">
        {!expanded ? (
          <motion.button
            key="collapsed"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            onClick={() => setExpanded(true)}
            className="flex items-center gap-2 px-3 py-2 bg-card/90 backdrop-blur-xl border border-border rounded-full shadow-lg"
          >
            <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center">
              {selectedId === null ? (
                <User className="w-4 h-4 text-foreground" />
              ) : selectedCharacter?.avatar_url ? (
                <img 
                  src={selectedCharacter.avatar_url} 
                  alt={selectedCharacter.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs font-bold">{selectedCharacter?.name?.[0] || '?'}</span>
              )}
            </div>
            <RefreshCw className="w-4 h-4 text-[#7C3AED]" />
          </motion.button>
        ) : (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 10 }}
            className="bg-card/95 backdrop-blur-xl border border-border rounded-2xl p-3 shadow-xl max-w-[90vw]"
          >
            <div className="flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-medium text-muted-foreground">Switch Character</span>
              <button 
                onClick={() => setExpanded(false)}
                className="p-1 hover:bg-muted rounded-full"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {/* Base profile */}
              <motion.button
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  onSelect(null);
                  setExpanded(false);
                }}
                className="flex flex-col items-center gap-1.5 min-w-[56px]"
              >
                <div className={`w-12 h-12 rounded-full overflow-hidden transition-all flex items-center justify-center ${
                  selectedId === null
                    ? 'ring-2 ring-[#7C3AED] bg-[#7C3AED]/30'
                    : 'opacity-70 bg-muted hover:opacity-100'
                }`}>
                  <User className="w-6 h-6 text-foreground" />
                </div>
                <span className={`text-[10px] font-medium max-w-[56px] truncate ${
                  selectedId === null ? 'text-[#7C3AED]' : 'text-muted-foreground'
                }`}>
                  {baseProfileName}
                </span>
              </motion.button>
              
              {/* Characters */}
              {characters.map((character) => (
                <motion.button
                  key={character.id}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => {
                    onSelect(character.id);
                    setExpanded(false);
                  }}
                  className="flex flex-col items-center gap-1.5 min-w-[56px]"
                >
                  <div className={`w-12 h-12 rounded-full overflow-hidden transition-all ${
                    selectedId === character.id
                      ? 'ring-2 ring-[#7C3AED]'
                      : 'opacity-70 hover:opacity-100'
                  }`}>
                    {character.avatar_url ? (
                      <img 
                        src={character.avatar_url} 
                        alt={character.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#7C3AED]/60 to-purple-900/60 flex items-center justify-center">
                        <span className="text-sm font-bold text-white">{character.name[0]}</span>
                      </div>
                    )}
                  </div>
                  <span className={`text-[10px] font-medium max-w-[56px] truncate ${
                    selectedId === character.id ? 'text-[#7C3AED]' : 'text-muted-foreground'
                  }`}>
                    {character.name}
                  </span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
