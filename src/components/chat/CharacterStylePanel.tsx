import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, Check, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CharacterStylePanelProps {
  characterId: string | null;
  currentBubbleColor?: string | null;
  currentTextColor?: string | null;
  currentBubbleSide?: string | null;
  isStaff?: boolean; // Owner or Admin
  onStyleUpdated?: () => void;
  worldId?: string; // For world_members bubble_side
}

const BUBBLE_COLORS = [
  { name: 'Purple', value: '#7C3AED' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Indigo', value: '#6366F1' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Sky', value: '#0EA5E9' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Teal', value: '#14B8A6' },
  { name: 'Green', value: '#10B981' },
  { name: 'Lime', value: '#84CC16' },
  { name: 'Yellow', value: '#EAB308' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Pink', value: '#EC4899' },
  { name: 'Fuchsia', value: '#D946EF' },
  { name: 'Dark', value: '#1a1a1a' },
  { name: 'Slate', value: '#475569' },
  { name: 'Zinc', value: '#71717A' },
  { name: 'Stone', value: '#78716C' },
];

const TEXT_COLORS = [
  { name: 'White', value: '#FFFFFF' },
  { name: 'Light Gray', value: '#E5E7EB' },
  { name: 'Gray', value: '#9CA3AF' },
  { name: 'Purple', value: '#C4B5FD' },
  { name: 'Blue', value: '#93C5FD' },
  { name: 'Cyan', value: '#67E8F9' },
  { name: 'Green', value: '#6EE7B7' },
  { name: 'Lime', value: '#BEF264' },
  { name: 'Yellow', value: '#FDE047' },
  { name: 'Amber', value: '#FCD34D' },
  { name: 'Orange', value: '#FDBA74' },
  { name: 'Pink', value: '#F9A8D4' },
  { name: 'Rose', value: '#FDA4AF' },
  { name: 'Red', value: '#FCA5A5' },
  { name: 'Black', value: '#000000' },
];

const BUBBLE_SIDES = [
  { name: 'Auto', value: 'auto' },
  { name: 'Left', value: 'left' },
  { name: 'Right', value: 'right' },
];

export const CharacterStylePanel = ({
  characterId,
  currentBubbleColor,
  currentTextColor,
  currentBubbleSide,
  isStaff = false,
  onStyleUpdated,
  worldId,
}: CharacterStylePanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bubbleColor, setBubbleColor] = useState(currentBubbleColor || '#7C3AED');
  const [textColor, setTextColor] = useState(currentTextColor || '#FFFFFF');
  const [bubbleSide, setBubbleSide] = useState(currentBubbleSide || 'auto');
  const [isSaving, setIsSaving] = useState(false);
  const [showBubbleColorPicker, setShowBubbleColorPicker] = useState(false);
  const [showTextColorPicker, setShowTextColorPicker] = useState(false);
  const bubbleColorInputRef = useRef<HTMLInputElement>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);

  // Sync local state with props when panel opens or props change
  useEffect(() => {
    if (isOpen) {
      setBubbleColor(currentBubbleColor || '#7C3AED');
      setTextColor(currentTextColor || '#FFFFFF');
      setBubbleSide(currentBubbleSide || 'auto');
    }
  }, [isOpen, currentBubbleColor, currentTextColor, currentBubbleSide]);

  // Fetch fresh data when panel opens
  useEffect(() => {
    const fetchCurrentStyles = async () => {
      if (!isOpen || !characterId) return;
      
      const { data } = await supabase
        .from('characters')
        .select('bubble_color, text_color')
        .eq('id', characterId)
        .maybeSingle();
      
      if (data) {
        setBubbleColor(data.bubble_color || '#7C3AED');
        setTextColor(data.text_color || '#FFFFFF');
      }
    };
    
    fetchCurrentStyles();
  }, [isOpen, characterId]);

  const handleSave = async () => {
    if (!characterId) {
      toast.error('No character selected');
      return;
    }

    setIsSaving(true);

    try {
      // Update character colors
      const { error: charError } = await supabase
        .from('characters')
        .update({
          bubble_color: bubbleColor,
          text_color: textColor,
        })
        .eq('id', characterId);

      if (charError) throw charError;

      // If staff and worldId, also update bubble_side in world_members
      if (isStaff && worldId) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { error: memberError } = await supabase
            .from('world_members')
            .update({ bubble_side: bubbleSide })
            .eq('world_id', worldId)
            .eq('user_id', user.id);

          if (memberError) throw memberError;
        }
      }

      toast.success('Style saved!');
      setIsOpen(false);
      onStyleUpdated?.();
    } catch (error) {
      console.error('Failed to save style:', error);
      toast.error('Failed to save style');
    }

    setIsSaving(false);
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="p-2.5 text-gray-500 hover:text-[#7C3AED] rounded-xl hover:bg-[#1a1a1a] transition-colors"
      >
        <Paintbrush className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            {/* Panel */}
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full mb-2 left-0 bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl p-4 z-50 min-w-[280px] shadow-xl shadow-black/50"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Character Style</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-[#1a1a1a] rounded-lg transition-colors"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
              </div>

              {!characterId ? (
                <p className="text-xs text-gray-500 text-center py-4">
                  Select a character to customize their style
                </p>
              ) : (
                <div className="space-y-4">
                  {/* Bubble Color */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Bubble Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {BUBBLE_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setBubbleColor(color.value)}
                          className={`w-6 h-6 rounded-md transition-all ${
                            bubbleColor === color.value 
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-[#0a0a0a] scale-110' 
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      {/* Custom Color Picker */}
                      <input
                        ref={bubbleColorInputRef}
                        type="color"
                        value={bubbleColor}
                        onChange={(e) => setBubbleColor(e.target.value)}
                        className="sr-only"
                      />
                      <button
                        onClick={() => bubbleColorInputRef.current?.click()}
                        className="w-6 h-6 rounded-md border-2 border-dashed border-gray-500 flex items-center justify-center hover:border-[#7C3AED] transition-colors"
                        title="Custom Color"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                    {/* Show current custom color if not in presets */}
                    {!BUBBLE_COLORS.some(c => c.value === bubbleColor) && (
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-6 h-6 rounded-md ring-2 ring-white ring-offset-1 ring-offset-[#0a0a0a]"
                          style={{ backgroundColor: bubbleColor }}
                        />
                        <span className="text-xs text-gray-400">Custom: {bubbleColor}</span>
                      </div>
                    )}
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Text Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEXT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setTextColor(color.value)}
                          className={`w-6 h-6 rounded-md transition-all border border-[#2a2a2a] ${
                            textColor === color.value 
                              ? 'ring-2 ring-[#7C3AED] ring-offset-1 ring-offset-[#0a0a0a] scale-110' 
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      {/* Custom Color Picker */}
                      <input
                        ref={textColorInputRef}
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="sr-only"
                      />
                      <button
                        onClick={() => textColorInputRef.current?.click()}
                        className="w-6 h-6 rounded-md border-2 border-dashed border-gray-500 flex items-center justify-center hover:border-[#7C3AED] transition-colors"
                        title="Custom Color"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                    {/* Show current custom color if not in presets */}
                    {!TEXT_COLORS.some(c => c.value === textColor) && (
                      <div className="flex items-center gap-2 mt-2">
                        <div
                          className="w-6 h-6 rounded-md ring-2 ring-[#7C3AED] ring-offset-1 ring-offset-[#0a0a0a] border border-[#2a2a2a]"
                          style={{ backgroundColor: textColor }}
                        />
                        <span className="text-xs text-gray-400">Custom: {textColor}</span>
                      </div>
                    )}
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Preview</label>
                    <div
                      className="px-4 py-2 rounded-xl text-sm"
                      style={{ backgroundColor: bubbleColor, color: textColor }}
                    >
                      This is how your messages will look!
                    </div>
                  </div>

                  {/* Bubble Side (Staff Only) */}
                  {isStaff && worldId && (
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">
                        Bubble Side <span className="text-[#7C3AED]">(Staff)</span>
                      </label>
                      <div className="flex gap-2">
                        {BUBBLE_SIDES.map((side) => (
                          <button
                            key={side.value}
                            onClick={() => setBubbleSide(side.value)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              bubbleSide === side.value
                                ? 'bg-[#7C3AED] text-white'
                                : 'bg-[#1a1a1a] text-gray-400 hover:text-white'
                            }`}
                          >
                            {side.name}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Save Button */}
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="w-full py-2.5 rounded-xl bg-[#7C3AED] text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-[#6D28D9] transition-colors"
                  >
                    <Check className="w-4 h-4" />
                    {isSaving ? 'Saving...' : 'Save Style'}
                  </button>
                </div>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
