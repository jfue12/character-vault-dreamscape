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

  type PhantomAIResult =
    | { ok: true; data: any }
    | { ok: false; error: string };

  const triggerPhantomAI = useCallback(async (
    message: string,
    characterId: string,
    messageHistory: MessageContext[]
  ): Promise<PhantomAIResult | undefined> => {
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
        const msg = error.message || String(error);
        console.error('Phantom AI error:', msg);
        return { ok: false, error: msg };
      }

      console.log('Phantom AI response:', data);
      return { ok: true, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger Phantom AI';
      console.error('Failed to trigger Phantom AI:', err);
      return { ok: false, error: msg };
    }
  }, [worldId, roomId]);

  return { triggerPhantomAI };
};
