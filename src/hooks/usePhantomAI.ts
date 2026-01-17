import { useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MessageContext {
  content: string;
  characterName: string;
  characterId: string;
  type: string;
}

export const usePhantomAI = (worldId: string, roomId: string) => {
  const lastTriggerRef = useRef<number>(0);
  const cooldownMs = 3000; // 3 second cooldown between AI triggers

  const triggerPhantomAI = useCallback(async (
    message: string,
    characterId: string,
    messageHistory: MessageContext[]
  ) => {
    const now = Date.now();
    if (now - lastTriggerRef.current < cooldownMs) {
      return; // Still in cooldown
    }
    lastTriggerRef.current = now;

    try {
      console.log('Triggering Phantom AI for world:', worldId, 'room:', roomId);
      
      const { data, error } = await supabase.functions.invoke('phantom-ai', {
        body: {
          worldId,
          roomId,
          triggerMessage: message,
          triggerCharacterId: characterId,
          messageHistory,
        },
      });

      if (error) {
        console.error('Phantom AI error:', error.message || error);
      } else {
        console.log('Phantom AI response:', data);
      }

      return data;
    } catch (err) {
      console.error('Failed to trigger Phantom AI:', err);
    }
  }, [worldId, roomId]);

  return { triggerPhantomAI };
};
