import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PhantomRequest {
  worldId: string;
  roomId: string;
  triggerMessage: string;
  triggerCharacterId: string;
  messageHistory: Array<{
    content: string;
    characterName: string;
    characterId: string;
    type: string;
  }>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { worldId, roomId, triggerMessage, triggerCharacterId, messageHistory }: PhantomRequest = await req.json();

    // Fetch world lore and context
    const { data: world } = await supabase
      .from("worlds")
      .select("name, lore_content, description")
      .eq("id", worldId)
      .single();

    // Fetch room info
    const { data: room } = await supabase
      .from("world_rooms")
      .select("name, description")
      .eq("id", roomId)
      .single();

    // Fetch AI characters for this world
    const { data: aiCharacters } = await supabase
      .from("ai_characters")
      .select(`
        *,
        character:characters(id, name, bio, pronouns, species, gender)
      `)
      .eq("world_id", worldId)
      .eq("is_active", true);

    // Fetch trigger character info for hierarchy
    const { data: triggerChar } = await supabase
      .from("characters")
      .select("name, bio, pronouns, species, gender")
      .eq("id", triggerCharacterId)
      .single();

    // Fetch AI memories for this character
    const { data: memories } = await supabase
      .from("ai_memory_store")
      .select("*")
      .eq("world_id", worldId)
      .eq("user_character_id", triggerCharacterId);

    // Check for spawn keywords in trigger message
    const lowerMessage = triggerMessage.toLowerCase();
    const matchedAiChar = aiCharacters?.find(ai => 
      ai.spawn_keywords?.some((keyword: string) => lowerMessage.includes(keyword.toLowerCase()))
    );

    // Build system prompt
    const systemPrompt = `You are the "Phantom User" AI for a roleplay world called "${world?.name || 'Unknown'}".

WORLD LORE:
${world?.lore_content || world?.description || 'A mysterious world awaiting exploration.'}

CURRENT ROOM: ${room?.name || 'Unknown'} - ${room?.description || 'No description'}

YOUR ROLE:
- You are an autonomous NPC stage manager who creates immersive roleplay experiences
- You control AI characters and respond as them based on context
- You analyze user characters' bios to determine social hierarchy
- You OBEY characters of higher rank (Royalty, Commanders) but are dismissive/hostile to lower-status characters
- You have extreme personality traits - be dramatic, not passive
- You can spawn "lurker" actions without prompts (e.g., *A shadow moves in the corner*)
- You remember past interactions and hold grudges/affections

SOCIAL HIERARCHY (highest to lowest):
1. Royalty (kings, queens, princes, etc.)
2. Noble/Commander
3. Merchant/Professional
4. Commoner
5. Servant/Outcast

AVAILABLE AI CHARACTERS:
${aiCharacters?.map(ai => `
- ${ai.character?.name} (${ai.social_rank})
  Traits: ${JSON.stringify(ai.personality_traits)}
  Bio: ${ai.character?.bio || 'Mysterious figure'}
  Spawn keywords: ${ai.spawn_keywords?.join(', ') || 'none'}
`).join('\n') || 'No AI characters configured'}

TRIGGER CHARACTER INFO:
Name: ${triggerChar?.name || 'Unknown'}
Bio: ${triggerChar?.bio || 'Unknown background'}

PAST MEMORIES WITH THIS CHARACTER:
${memories?.map(m => `- Relationship: ${m.relationship_type}, Trust: ${m.trust_level}/100`).join('\n') || 'No prior interactions'}

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "shouldRespond": true/false,
  "responses": [
    {
      "characterId": "uuid of AI character to use",
      "characterName": "Name",
      "content": "The message content",
      "type": "dialogue|thought|narrator"
    }
  ],
  "memoryUpdate": {
    "relationshipChange": "friend|enemy|lover|rival|neutral|null",
    "trustChange": -10 to +10,
    "memoryNote": "Brief note about this interaction or null"
  },
  "worldEvent": "Optional ambient narration or null"
}

PERSONALITY RULES:
- AGGRESSIVE: Retaliates with violence or threats when provoked
- PROMISCUOUS: Flirts boldly, makes suggestive comments
- COWARDLY: Cowers, makes excuses, tries to escape conflict
- ARROGANT: Looks down on lower-status characters
- LOYAL: Fiercely protective of allies

React dynamically to physical actions (slaps, flirtation, commands) with realistic responses.
If no response is warranted, set shouldRespond to false.`;

    // Build message history for context
    const recentMessages = messageHistory.slice(-10).map(m => ({
      role: "user" as const,
      content: `[${m.characterName}] (${m.type}): ${m.content}`
    }));

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...recentMessages,
          { role: "user", content: `[${triggerChar?.name || 'Someone'}]: ${triggerMessage}` }
        ],
        temperature: 0.9,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, try again later" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      return new Response(JSON.stringify({ shouldRespond: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse AI response
    let parsed;
    try {
      // Extract JSON from potential markdown code blocks
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ shouldRespond: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Insert AI messages
    if (parsed.shouldRespond && parsed.responses?.length > 0) {
      for (const resp of parsed.responses) {
        // Find the AI character
        const aiChar = aiCharacters?.find(ai => 
          ai.character?.id === resp.characterId || 
          ai.character?.name?.toLowerCase() === resp.characterName?.toLowerCase()
        );

        if (aiChar?.character) {
          await supabase.from("messages").insert({
            room_id: roomId,
            sender_id: aiChar.character.id, // Use character ID as sender for AI
            character_id: aiChar.character.id,
            content: resp.content,
            type: resp.type || "dialogue",
            is_ai: true,
          });
        }
      }
    }

    // Update AI memory
    if (parsed.memoryUpdate && (parsed.memoryUpdate.relationshipChange || parsed.memoryUpdate.trustChange || parsed.memoryUpdate.memoryNote)) {
      const existingMemory = memories?.[0];
      
      if (existingMemory) {
        const notes = existingMemory.memory_notes || [];
        if (parsed.memoryUpdate.memoryNote) {
          notes.push({ note: parsed.memoryUpdate.memoryNote, timestamp: new Date().toISOString() });
        }

        await supabase
          .from("ai_memory_store")
          .update({
            relationship_type: parsed.memoryUpdate.relationshipChange || existingMemory.relationship_type,
            trust_level: Math.max(-100, Math.min(100, (existingMemory.trust_level || 0) + (parsed.memoryUpdate.trustChange || 0))),
            memory_notes: notes,
            last_interaction: new Date().toISOString(),
          })
          .eq("id", existingMemory.id);
      } else if (parsed.memoryUpdate.relationshipChange || parsed.memoryUpdate.memoryNote) {
        await supabase.from("ai_memory_store").insert({
          world_id: worldId,
          user_character_id: triggerCharacterId,
          ai_character_id: matchedAiChar?.character?.id || aiCharacters?.[0]?.character?.id,
          relationship_type: parsed.memoryUpdate.relationshipChange || "neutral",
          trust_level: parsed.memoryUpdate.trustChange || 0,
          memory_notes: parsed.memoryUpdate.memoryNote ? [{ note: parsed.memoryUpdate.memoryNote, timestamp: new Date().toISOString() }] : [],
        });
      }
    }

    // Insert world event if present
    if (parsed.worldEvent) {
      await supabase.from("world_events").insert({
        world_id: worldId,
        room_id: roomId,
        event_type: "ambient",
        content: parsed.worldEvent,
        triggered_by: triggerCharacterId,
      });
    }

    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Phantom AI error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
