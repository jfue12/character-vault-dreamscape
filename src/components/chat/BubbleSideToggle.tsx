import { useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BubbleSideToggleProps {
  worldId: string;
  userId: string;
  currentSide: 'auto' | 'left' | 'right';
  onSideChange: (side: 'auto' | 'left' | 'right') => void;
}

export const BubbleSideToggle = ({
  worldId,
  userId,
  currentSide,
  onSideChange
}: BubbleSideToggleProps) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const handleSideChange = async (side: 'auto' | 'left' | 'right') => {
    setSaving(true);
    
    const { error } = await supabase
      .from('world_members')
      .update({ bubble_side: side })
      .eq('world_id', worldId)
      .eq('user_id', userId);

    if (error) {
      toast({ title: 'Failed to update', variant: 'destructive' });
    } else {
      onSideChange(side);
      toast({ title: `Bubble alignment set to ${side}` });
    }
    setSaving(false);
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-foreground">Chat Bubble Position</label>
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSideChange('auto')}
          disabled={saving}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
            currentSide === 'auto'
              ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]'
              : 'border-border hover:border-muted-foreground text-muted-foreground'
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          <span className="text-xs">Auto</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSideChange('left')}
          disabled={saving}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
            currentSide === 'left'
              ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]'
              : 'border-border hover:border-muted-foreground text-muted-foreground'
          }`}
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-xs">Left</span>
        </motion.button>
        
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => handleSideChange('right')}
          disabled={saving}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border transition-colors ${
            currentSide === 'right'
              ? 'border-[#7C3AED] bg-[#7C3AED]/10 text-[#7C3AED]'
              : 'border-border hover:border-muted-foreground text-muted-foreground'
          }`}
        >
          <ArrowRight className="w-4 h-4" />
          <span className="text-xs">Right</span>
        </motion.button>
      </div>
      <p className="text-xs text-muted-foreground">
        Override where your messages appear in the chat (admin/owner only)
      </p>
    </div>
  );
};
