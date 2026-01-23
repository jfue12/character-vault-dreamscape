import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Paintbrush, Check, X, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CharacterStylePanelProps {
  characterId: string | null;
  currentBubbleColor?: string | null;
  currentTextColor?: string | null;
  currentNameColor?: string | null;
  currentBubbleSide?: string | null;
  isStaff?: boolean;
  onStyleUpdated?: () => void;
  worldId?: string;
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

const NAME_COLORS = [
  { name: 'Purple', value: '#A78BFA' },
  { name: 'Violet', value: '#C4B5FD' },
  { name: 'Indigo', value: '#818CF8' },
  { name: 'Blue', value: '#60A5FA' },
  { name: 'Cyan', value: '#22D3EE' },
  { name: 'Teal', value: '#2DD4BF' },
  { name: 'Green', value: '#34D399' },
  { name: 'Lime', value: '#A3E635' },
  { name: 'Yellow', value: '#FACC15' },
  { name: 'Amber', value: '#FBBF24' },
  { name: 'Orange', value: '#FB923C' },
  { name: 'Red', value: '#F87171' },
  { name: 'Rose', value: '#FB7185' },
  { name: 'Pink', value: '#F472B6' },
  { name: 'White', value: '#FFFFFF' },
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
  currentNameColor,
  currentBubbleSide,
  isStaff = false,
  onStyleUpdated,
  worldId,
}: CharacterStylePanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [bubbleColor, setBubbleColor] = useState(currentBubbleColor || '#7C3AED');
  const [textColor, setTextColor] = useState(currentTextColor || '#FFFFFF');
  const [nameColor, setNameColor] = useState(currentNameColor || '#A78BFA');
  const [bubbleSide, setBubbleSide] = useState(currentBubbleSide || 'auto');
  const [isSaving, setIsSaving] = useState(false);
  const bubbleColorInputRef = useRef<HTMLInputElement>(null);
  const textColorInputRef = useRef<HTMLInputElement>(null);
  const nameColorInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setBubbleColor(currentBubbleColor || '#7C3AED');
      setTextColor(currentTextColor || '#FFFFFF');
      setNameColor(currentNameColor || '#A78BFA');
      setBubbleSide(currentBubbleSide || 'auto');
    }
  }, [isOpen, currentBubbleColor, currentTextColor, currentNameColor, currentBubbleSide]);

  useEffect(() => {
    const fetchCurrentStyles = async () => {
      if (!isOpen || !characterId) return;
      
      const { data } = await supabase
        .from('characters')
        .select('bubble_color, text_color, name_color')
        .eq('id', characterId)
        .maybeSingle();
      
      if (data) {
        setBubbleColor(data.bubble_color || '#7C3AED');
        setTextColor(data.text_color || '#FFFFFF');
        setNameColor((data as any).name_color || '#A78BFA');
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
      const { error: charError } = await supabase
        .from('characters')
        .update({
          bubble_color: bubbleColor,
          text_color: textColor,
          name_color: nameColor,
        } as any)
        .eq('id', characterId);

      if (charError) throw charError;

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
        className="p-2.5 text-gray-500 hover:text-primary rounded-xl hover:bg-muted transition-colors"
      >
        <Paintbrush className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={() => setIsOpen(false)}
            />

            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-full mb-2 left-0 bg-black border border-white/10 rounded-xl p-4 z-50 min-w-[300px] max-h-[70vh] overflow-y-auto shadow-xl shadow-black/50"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-white">Character Style</h3>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-muted rounded-lg transition-colors"
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
                              ? 'ring-2 ring-white ring-offset-1 ring-offset-black scale-110' 
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <input
                        ref={bubbleColorInputRef}
                        type="color"
                        value={bubbleColor}
                        onChange={(e) => setBubbleColor(e.target.value)}
                        className="sr-only"
                      />
                      <button
                        onClick={() => bubbleColorInputRef.current?.click()}
                        className="w-6 h-6 rounded-md border-2 border-dashed border-gray-500 flex items-center justify-center hover:border-primary transition-colors"
                        title="Custom Color"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Name Color */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Name Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {NAME_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setNameColor(color.value)}
                          className={`w-6 h-6 rounded-md transition-all border border-white/10 ${
                            nameColor === color.value 
                              ? 'ring-2 ring-primary ring-offset-1 ring-offset-black scale-110' 
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <input
                        ref={nameColorInputRef}
                        type="color"
                        value={nameColor}
                        onChange={(e) => setNameColor(e.target.value)}
                        className="sr-only"
                      />
                      <button
                        onClick={() => nameColorInputRef.current?.click()}
                        className="w-6 h-6 rounded-md border-2 border-dashed border-gray-500 flex items-center justify-center hover:border-primary transition-colors"
                        title="Custom Color"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Text Color */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Text Color</label>
                    <div className="flex flex-wrap gap-1.5">
                      {TEXT_COLORS.map((color) => (
                        <button
                          key={color.value}
                          onClick={() => setTextColor(color.value)}
                          className={`w-6 h-6 rounded-md transition-all border border-white/10 ${
                            textColor === color.value 
                              ? 'ring-2 ring-primary ring-offset-1 ring-offset-black scale-110' 
                              : 'hover:scale-110'
                          }`}
                          style={{ backgroundColor: color.value }}
                          title={color.name}
                        />
                      ))}
                      <input
                        ref={textColorInputRef}
                        type="color"
                        value={textColor}
                        onChange={(e) => setTextColor(e.target.value)}
                        className="sr-only"
                      />
                      <button
                        onClick={() => textColorInputRef.current?.click()}
                        className="w-6 h-6 rounded-md border-2 border-dashed border-gray-500 flex items-center justify-center hover:border-primary transition-colors"
                        title="Custom Color"
                      >
                        <Plus className="w-3 h-3 text-gray-500" />
                      </button>
                    </div>
                  </div>

                  {/* Preview */}
                  <div>
                    <label className="text-xs text-gray-400 mb-2 block">Preview</label>
                    <div className="bg-black/50 rounded-xl p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-semibold" style={{ color: nameColor }}>
                          Character Name
                        </span>
                        <span className="text-xs text-gray-400">12:00 PM</span>
                      </div>
                      <div
                        className="px-4 py-2 rounded-xl text-sm inline-block"
                        style={{ backgroundColor: bubbleColor, color: textColor }}
                      >
                        This is how your messages will look!
                      </div>
                    </div>
                  </div>

                  {/* Bubble Side (Staff Only) */}
                  {isStaff && worldId && (
                    <div>
                      <label className="text-xs text-gray-400 mb-2 block">
                        Bubble Side <span className="text-primary">(Staff)</span>
                      </label>
                      <div className="flex gap-2">
                        {BUBBLE_SIDES.map((side) => (
                          <button
                            key={side.value}
                            onClick={() => setBubbleSide(side.value)}
                            className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                              bubbleSide === side.value
                                ? 'bg-primary text-white'
                                : 'bg-muted text-gray-400 hover:text-white'
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
                    className="w-full py-2.5 rounded-xl bg-primary text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50 hover:bg-primary/90 transition-colors"
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
