import { useRef, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SpamConfig {
  maxMessagesPerMinute: number;
  maxDuplicates: number;
  minMessageInterval: number; // milliseconds
}

const DEFAULT_CONFIG: SpamConfig = {
  maxMessagesPerMinute: 15,
  maxDuplicates: 3,
  minMessageInterval: 500,
};

export const useSpamDetection = (worldId: string, userId: string, config: Partial<SpamConfig> = {}) => {
  const { toast } = useToast();
  const messagesRef = useRef<{ content: string; timestamp: number }[]>([]);
  const lastMessageTimeRef = useRef<number>(0);
  const warningsRef = useRef<number>(0);

  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const checkForSpam = useCallback((content: string): { isSpam: boolean; reason?: string } => {
    const now = Date.now();
    
    // Check minimum interval between messages
    if (now - lastMessageTimeRef.current < finalConfig.minMessageInterval) {
      return { isSpam: true, reason: 'Sending messages too quickly' };
    }

    // Clean up old messages (older than 1 minute)
    messagesRef.current = messagesRef.current.filter(
      m => now - m.timestamp < 60000
    );

    // Check message rate
    if (messagesRef.current.length >= finalConfig.maxMessagesPerMinute) {
      return { isSpam: true, reason: 'Too many messages in a short time' };
    }

    // Check for duplicate content
    const duplicateCount = messagesRef.current.filter(
      m => m.content.toLowerCase() === content.toLowerCase()
    ).length;

    if (duplicateCount >= finalConfig.maxDuplicates) {
      return { isSpam: true, reason: 'Sending duplicate messages' };
    }

    // Check for gibberish/random characters (basic detection)
    const gibberishPattern = /^[a-zA-Z]{20,}$|(.)\1{5,}/;
    if (gibberishPattern.test(content.replace(/\s/g, ''))) {
      return { isSpam: true, reason: 'Suspicious message pattern detected' };
    }

    return { isSpam: false };
  }, [finalConfig]);

  const recordMessage = useCallback((content: string) => {
    const now = Date.now();
    messagesRef.current.push({ content, timestamp: now });
    lastMessageTimeRef.current = now;
  }, []);

  const handleSpamDetected = useCallback(async (reason: string) => {
    warningsRef.current += 1;

    if (warningsRef.current >= 3) {
      // Auto-timeout after 3 warnings
      const timeoutDuration = warningsRef.current >= 5 ? '1h' : '5m';
      const expiresAt = new Date();
      
      if (timeoutDuration === '1h') {
        expiresAt.setHours(expiresAt.getHours() + 1);
      } else {
        expiresAt.setMinutes(expiresAt.getMinutes() + 5);
      }

      // Create timeout
      await supabase.from('timeouts').insert({
        user_id: userId,
        world_id: worldId,
        expires_at: expiresAt.toISOString(),
        reason: `Auto-timeout: ${reason}`,
      });

      // Log to audit
      await supabase.from('audit_logs').insert({
        world_id: worldId,
        action: 'auto_timeout',
        target_user_id: userId,
        details: { 
          reason, 
          duration: timeoutDuration,
          warning_count: warningsRef.current 
        }
      });

      // Create notification
      await supabase.from('notifications').insert({
        user_id: userId,
        type: 'moderation',
        title: 'You have been timed out',
        body: `Reason: ${reason}. Duration: ${timeoutDuration}`,
        data: { world_id: worldId, duration: timeoutDuration }
      });

      toast({
        title: 'Timed out for spam',
        description: `Duration: ${timeoutDuration}`,
        variant: 'destructive'
      });

      return true; // User was timed out
    } else {
      toast({
        title: 'Warning: Spam detected',
        description: `${reason}. Warning ${warningsRef.current}/3`,
        variant: 'destructive'
      });

      return false; // Just a warning
    }
  }, [worldId, userId, toast]);

  // Spam protection disabled - always allow messages
  const validateMessage = useCallback(async (content: string): Promise<boolean> => {
    return true;
  }, []);

  const resetWarnings = useCallback(() => {
    warningsRef.current = 0;
    messagesRef.current = [];
  }, []);

  return {
    validateMessage,
    resetWarnings,
    currentWarnings: warningsRef.current
  };
};
