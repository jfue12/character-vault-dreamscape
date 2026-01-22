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
  const triggerCountRef = useRef<number>(0);
  const cooldownMs = 8000; // 8 second cooldown between AI triggers (increased from 3s)
  const maxTriggersPerSession = 10; // Max triggers before extended cooldown
  const [isAIThinking, setIsAIThinking] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<AIThinkingPhase>(null);
  const [isOnCooldown, setIsOnCooldown] = useState(false);

  type PhantomAIResult =
    | { ok: true; data: any }
    | { ok: false; error: string };

  const triggerPhantomAI = useCallback(async (
    message: string,
    characterId: string,
    messageHistory: MessageContext[]
  ): Promise<PhantomAIResult | undefined> => {
    const now = Date.now();
    
    // Check session-based rate limit
    if (triggerCountRef.current >= maxTriggersPerSession) {
      const extendedCooldown = 60000; // 1 minute extended cooldown
      if (now - lastTriggerRef.current < extendedCooldown) {
        console.log('Extended cooldown active - too many AI triggers this session');
        return { ok: false, error: 'You have triggered the AI too many times. Please wait a minute.' };
      }
      // Reset counter after extended cooldown
      triggerCountRef.current = 0;
    }
    
    // Check standard cooldown
    if (now - lastTriggerRef.current < cooldownMs) {
      return; // Still in cooldown
    }
    
    lastTriggerRef.current = now;
    triggerCountRef.current += 1;

    try {
      console.log('Triggering Phantom AI for world:', worldId, 'room:', roomId);
      
      // Start thinking animation
      setIsAIThinking(true);
      setThinkingPhase('analyzing');

      // Simulate reading phase (dynamic based on message length)
      const readDelay = Math.min(800 + message.length * 10, 2000);
      await new Promise(r => setTimeout(r, readDelay));
      
      setThinkingPhase('generating');

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
        setIsAIThinking(false);
        setThinkingPhase(null);
        return { ok: false, error: msg };
      }

      // If AI is responding, show responding phase
      if (data?.shouldRespond) {
        setThinkingPhase('responding');
        // Dynamic delay based on response length
        const responseDelay = Math.min(500 + (data.responses?.[0]?.content?.length || 0) * 5, 1500);
        await new Promise(r => setTimeout(r, responseDelay));
      }

      console.log('Phantom AI response:', data);
      setIsAIThinking(false);
      setThinkingPhase(null);
      return { ok: true, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to trigger Phantom AI';
      console.error('Failed to trigger Phantom AI:', err);
      setIsAIThinking(false);
      setThinkingPhase(null);
      return { ok: false, error: msg };
    }
  }, [worldId, roomId]);

  return { triggerPhantomAI, isAIThinking, thinkingPhase, isOnCooldown, triggerCount: triggerCountRef.current };
};
