import { useCallback, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface MessageContext {
  content: string;
  characterName: string;
  characterId: string;
  type: string;
}

export type AIThinkingPhase = 'analyzing' | 'generating' | 'responding' | null;

export const usePhantomAI = (worldId: string, roomId: string) => {
  const lastTriggerRef = useRef<number>(0);
  const cooldownMs = 3000; // 3 second cooldown between AI triggers
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<AIThinkingPhase>(null);

  type PhantomAIResult =
    | { ok: true; data: any }
    | { ok: false; error: string };

  const triggerPhantomAI = useCallback(
    async (
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

        setIsAIThinking(true);
        setThinkingPhase('analyzing');

        // --- NEW: Fetch room lore before calling AI ---
        const { data: roomData, error: loreError } = await supabase
          .from('world_rooms')
          .select('room_lore')
          .eq('id', roomId)
          .single();

        const roomLore = roomData?.room_lore || null;

        if (loreError) {
          console.warn('Could not load room lore:', loreError);
        }

        // Simulate reading phase (dynamic based on message length)
        const readDelay = Math.min(800 + message.length * 10, 2000);
        await new Promise((r) => setTimeout(r, readDelay));

        setThinkingPhase('generating');

        const { data, error } = await supabase.functions.invoke('phantom-ai', {
          body: {
            worldId,
            roomId,
            roomLore,                 // ✅ <--- KEY ADDITION
            triggerMessage: message,
            triggerCharacterId: characterId,
            messageHistory,
          },
        });

        if (error) {
          const msg = error.message || String(error);
          console.error('Phantom AI error:', msg);
          setIsAIThinking(false);
          setThinkingPhase(null);
          return { ok: false, error: msg };
        }

        // If AI is responding, show responding phase
        if (data?.shouldRespond) {
          setThinkingPhase('responding');
          const responseDelay = Math.min(
            500 + (data.responses?.[0]?.content?.length || 0) * 5,
            1500
          );
          await new Promise((r) => setTimeout(r, responseDelay));
        }

        console.log('Phantom AI response:', data);
        setIsAIThinking(false);
        setThinkingPhase(null);
        return { ok: true, data };
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : 'Failed to trigger Phantom AI';
        console.error('Failed to trigger Phantom AI:', err);
        setIsAIThinking(false);
        setThinkingPhase(null);
        return { ok: false, error: msg };
      }
    },
    [worldId, roomId]
  );

  return { triggerPhantomAI, isAIThinking, thinkingPhase };
};

