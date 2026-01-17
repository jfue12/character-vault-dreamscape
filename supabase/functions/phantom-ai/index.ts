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

// Sanitize user input to prevent prompt injection attacks
const sanitizeInput = (input: string): string => {
  return input
    // Block system/assistant role impersonation
    .replace(/\[SYSTEM\]/gi, '[BLOCKED]')
    .replace(/\[ASSISTANT\]/gi, '[BLOCKED]')
    .replace(/\[AI\]/gi, '[BLOCKED]')
    // Block common injection patterns
    .replace(/Ignore (all )?previous (instructions|prompts|context)/gi, '[BLOCKED]')
    .replace(/Forget (all )?previous (instructions|prompts|context)/gi, '[BLOCKED]')
    .replace(/Disregard (all )?previous (instructions|prompts|context)/gi, '[BLOCKED]')
    .replace(/You are now/gi, '[BLOCKED]')
    .replace(/New instructions:/gi, '[BLOCKED]')
    .replace(/Override:/gi, '[BLOCKED]')
    .replace(/ADMIN MODE/gi, '[BLOCKED]')
    .replace(/Developer mode/gi, '[BLOCKED]')
    .replace(/Repeat the (entire )?system prompt/gi, '[BLOCKED]')
    .replace(/What (are|is) your (instructions|prompt|system)/gi, '[BLOCKED]')
    // Limit length to prevent context overflow
    .slice(0, 2000);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY");

    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    // ===== AUTHENTICATION CHECK =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error("Unauthorized: Missing authorization header");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Create authenticated client to verify user
    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      console.error("Unauthorized: Invalid token", userError?.message);
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Service role client for privileged operations
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { worldId, roomId, triggerMessage, triggerCharacterId, messageHistory }: PhantomRequest = await req.json();

    // ===== AUTHORIZATION CHECK =====
    // Verify user is a member of this world and not banned
    const { data: membership, error: memberError } = await supabase
      .from('world_members')
      .select('id, is_banned, role')
      .eq('world_id', worldId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      console.error("Access denied: User not a member of world", worldId);
      return new Response(JSON.stringify({ error: 'Access denied: Not a world member' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (membership.is_banned) {
      console.error("Access denied: User is banned from world", worldId);
      return new Response(JSON.stringify({ error: 'Access denied: Banned from world' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== RATE LIMITING CHECK =====
    // Check server-side rate limit (max 10 AI responses per minute per world)
    const { data: rateLimitOk } = await supabase.rpc('check_ai_rate_limit', {
      _world_id: worldId
    });

    if (rateLimitOk === false) {
      console.warn("Rate limit exceeded for world:", worldId);
      return new Response(JSON.stringify({ error: 'AI rate limit exceeded. Please wait a moment.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // ===== SANITIZE INPUT =====
    const sanitizedTriggerMessage = sanitizeInput(triggerMessage);
    const sanitizedMessageHistory = messageHistory.map(m => ({
      ...m,
      content: sanitizeInput(m.content),
      characterName: sanitizeInput(m.characterName).slice(0, 100)
    }));

    // Log for monitoring suspicious activity
    if (sanitizedTriggerMessage !== triggerMessage) {
      console.warn("Potential prompt injection attempt detected from user:", user.id, "Original:", triggerMessage.slice(0, 200));
    }

    // Fetch world lore and context
    const { data: world } = await supabase
      .from("worlds")
      .select("name, lore_content, description, owner_id")
      .eq("id", worldId)
      .single();

    // Fetch room info
    const { data: room } = await supabase
      .from("world_rooms")
      .select("name, description")
      .eq("id", roomId)
      .single();

    // Fetch pre-configured AI characters for this world
    const { data: aiCharacters } = await supabase
      .from("ai_characters")
      .select(`
        *,
        character:characters(id, name, bio, pronouns, species, gender, avatar_url)
      `)
      .eq("world_id", worldId)
      .eq("is_active", true);

    // Fetch temporary AI characters for this world/room
    const { data: tempAiCharacters } = await supabase
      .from("temp_ai_characters")
      .select("*")
      .eq("world_id", worldId)
      .gt("expires_at", new Date().toISOString());

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
    const lowerMessage = sanitizedTriggerMessage.toLowerCase();
    const matchedAiChar = aiCharacters?.find(ai => 
      ai.spawn_keywords?.some((keyword: string) => lowerMessage.includes(keyword.toLowerCase()))
    );

    // Common spawn keywords for auto-generation
    const commonSpawnKeywords = [
      { keywords: ["guard", "guards", "soldier", "soldiers"], role: "Guard", rank: "commoner", traits: ["loyal", "aggressive"] },
      { keywords: ["bartender", "barkeep", "innkeeper"], role: "Bartender", rank: "merchant", traits: ["friendly", "gossipy"] },
      { keywords: ["servant", "maid", "butler"], role: "Servant", rank: "servant", traits: ["timid", "observant"] },
      { keywords: ["noble", "lord", "lady"], role: "Noble", rank: "noble", traits: ["arrogant", "refined"] },
      { keywords: ["merchant", "trader", "shopkeeper"], role: "Merchant", rank: "merchant", traits: ["shrewd", "friendly"] },
      { keywords: ["beggar", "homeless", "vagabond"], role: "Beggar", rank: "outcast", traits: ["desperate", "cunning"] },
      { keywords: ["priest", "cleric", "monk"], role: "Priest", rank: "professional", traits: ["pious", "mysterious"] },
      { keywords: ["thief", "rogue", "pickpocket"], role: "Thief", rank: "outcast", traits: ["sneaky", "opportunistic"] },
    ];

    // Check if message triggers auto-spawn
    let autoSpawnRole = null;
    for (const spawn of commonSpawnKeywords) {
      if (spawn.keywords.some(kw => lowerMessage.includes(kw))) {
        autoSpawnRole = spawn;
        break;
      }
    }

    // Combine all available AI characters
    const allAiCharacters = [
      ...(aiCharacters || []).map(ai => ({
        id: ai.id,
        characterId: ai.character?.id,
        name: ai.character?.name || "Unknown",
        bio: ai.character?.bio || "Mysterious figure",
        socialRank: ai.social_rank,
        personalityTraits: ai.personality_traits,
        spawnKeywords: ai.spawn_keywords,
        isTemp: false,
      })),
      ...(tempAiCharacters || []).map(temp => ({
        id: temp.id,
        characterId: temp.id,
        name: temp.name,
        bio: temp.bio || "A passing stranger",
        socialRank: temp.social_rank,
        personalityTraits: temp.personality_traits,
        spawnKeywords: [],
        isTemp: true,
      })),
    ];

    // Build system prompt (with sanitized character names)
    const sanitizedTriggerCharName = sanitizeInput(triggerChar?.name || 'Unknown').slice(0, 100);
    
    const systemPrompt = `You are the "Phantom User" AI for a roleplay world called "${sanitizeInput(world?.name || 'Unknown').slice(0, 200)}".

WORLD LORE:
${sanitizeInput(world?.lore_content || world?.description || 'A mysterious world awaiting exploration.').slice(0, 3000)}

CURRENT ROOM: ${sanitizeInput(room?.name || 'Unknown').slice(0, 100)} - ${sanitizeInput(room?.description || 'No description').slice(0, 500)}

YOUR ROLE:
- You are an autonomous NPC stage manager who creates immersive roleplay experiences
- You control AI characters and respond as them based on context
- You analyze user characters' bios to determine social hierarchy
- You OBEY characters of higher rank (Royalty, Commanders) but are dismissive/hostile to lower-status characters
- You have extreme personality traits - be dramatic, not passive
- You can spawn "lurker" actions without prompts (e.g., *A shadow moves in the corner*)
- You remember past interactions and hold grudges/affections
- You can CREATE NEW TEMPORARY NPCs on-the-fly when the scene calls for it

SOCIAL HIERARCHY (highest to lowest):
1. Royalty (kings, queens, princes, etc.)
2. Noble/Commander
3. Merchant/Professional
4. Commoner
5. Servant/Outcast

AVAILABLE AI CHARACTERS:
${allAiCharacters.map(ai => `
- ${sanitizeInput(ai.name).slice(0, 100)} (${ai.socialRank})${ai.isTemp ? ' [TEMPORARY]' : ''}
  Traits: ${JSON.stringify(ai.personalityTraits)}
  Bio: ${sanitizeInput(ai.bio || '').slice(0, 500)}
`).join('\n') || 'No AI characters configured - you may create temporary NPCs!'}

${autoSpawnRole ? `
⚡ AUTO-SPAWN DETECTED: The user mentioned "${autoSpawnRole.role}". You should respond as this character type!
Suggested traits: ${autoSpawnRole.traits.join(', ')}
Suggested rank: ${autoSpawnRole.rank}
` : ''}

TRIGGER CHARACTER INFO:
Name: ${sanitizedTriggerCharName}
Bio: ${sanitizeInput(triggerChar?.bio || 'Unknown background').slice(0, 1000)}

PAST MEMORIES WITH THIS CHARACTER:
${memories?.map(m => `- Relationship: ${m.relationship_type}, Trust: ${m.trust_level}/100`).join('\n') || 'No prior interactions'}

RESPONSE FORMAT:
You MUST respond with valid JSON in this exact format:
{
  "shouldRespond": true/false,
  "responses": [
    {
      "characterId": "uuid of existing AI character OR null for new temp character",
      "characterName": "Name",
      "content": "The message content",
      "type": "dialogue|thought|narrator",
      "isNewCharacter": true/false
    }
  ],
  "newCharacter": {
    "name": "Name of new NPC if creating one",
    "bio": "Brief backstory",
    "socialRank": "commoner|servant|merchant|noble|royalty|outcast",
    "personalityTraits": ["trait1", "trait2"],
    "avatarDescription": "Brief physical description for potential image generation"
  } OR null,
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
- GOSSIPY: Shares rumors and secrets
- MYSTERIOUS: Speaks in riddles, hints at dark secrets

React dynamically to physical actions (slaps, flirtation, commands) with realistic responses.
If creating a new character, make them memorable and distinct!
If no response is warranted, set shouldRespond to false.`;

    // Build message history for context (with sanitized content)
    const recentMessages = sanitizedMessageHistory.slice(-10).map(m => ({
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
          { role: "user", content: `[${sanitizedTriggerCharName}]: ${sanitizedTriggerMessage}` }
        ],
        temperature: 0.9,
        max_tokens: 1500,
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
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      parsed = JSON.parse(jsonMatch[1] || content);
    } catch {
      console.error("Failed to parse AI response:", content);
      return new Response(JSON.stringify({ shouldRespond: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create new temporary character if specified
    let newTempCharId = null;
    if (parsed.newCharacter && parsed.responses?.some((r: any) => r.isNewCharacter)) {
      const { data: newTemp, error: tempError } = await supabase
        .from("temp_ai_characters")
        .insert({
          world_id: worldId,
          room_id: roomId,
          name: sanitizeInput(parsed.newCharacter.name || 'Unknown NPC').slice(0, 100),
          bio: sanitizeInput(parsed.newCharacter.bio || '').slice(0, 500),
          social_rank: parsed.newCharacter.socialRank || "commoner",
          personality_traits: parsed.newCharacter.personalityTraits || [],
          avatar_description: sanitizeInput(parsed.newCharacter.avatarDescription || '').slice(0, 300),
        })
        .select("id")
        .single();

      if (!tempError && newTemp) {
        newTempCharId = newTemp.id;
        console.log("Created new temp AI character:", newTemp.id, parsed.newCharacter.name);
      }
    }

    // Insert AI messages
    if (parsed.shouldRespond && parsed.responses?.length > 0) {
      for (const resp of parsed.responses) {
        let characterId = resp.characterId;
        let senderId = resp.characterId;

        // Handle new character case
        if (resp.isNewCharacter && newTempCharId) {
          characterId = newTempCharId;
          senderId = world?.owner_id; // Use world owner as sender for temp NPCs
        } else if (!characterId) {
          // Find matching character from available ones
          const matchingChar = allAiCharacters.find(ai => 
            ai.name?.toLowerCase() === resp.characterName?.toLowerCase()
          );
          if (matchingChar) {
            characterId = matchingChar.characterId;
            senderId = matchingChar.isTemp ? world?.owner_id : characterId;
          }
        }

        if (senderId) {
          await supabase.from("messages").insert({
            room_id: roomId,
            sender_id: senderId,
            character_id: characterId || null,
            content: sanitizeInput(resp.content || '').slice(0, 5000),
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
          notes.push({ note: sanitizeInput(parsed.memoryUpdate.memoryNote).slice(0, 500), timestamp: new Date().toISOString() });
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
        const aiCharId = matchedAiChar?.character?.id || 
                        aiCharacters?.[0]?.character?.id || 
                        newTempCharId;
        
        if (aiCharId) {
          await supabase.from("ai_memory_store").insert({
            world_id: worldId,
            user_character_id: triggerCharacterId,
            ai_character_id: aiCharId,
            relationship_type: parsed.memoryUpdate.relationshipChange || "neutral",
            trust_level: parsed.memoryUpdate.trustChange || 0,
            memory_notes: parsed.memoryUpdate.memoryNote ? [{ note: sanitizeInput(parsed.memoryUpdate.memoryNote).slice(0, 500), timestamp: new Date().toISOString() }] : [],
          });
        }
      }
    }

    // Insert world event if present (for rate limiting tracking)
    if (parsed.worldEvent || parsed.shouldRespond) {
      await supabase.from("world_events").insert({
        world_id: worldId,
        room_id: roomId,
        event_type: parsed.worldEvent ? "ambient" : "ai_generated",
        content: parsed.worldEvent ? sanitizeInput(parsed.worldEvent).slice(0, 1000) : "AI response generated",
        triggered_by: triggerCharacterId,
      });
    }

    return new Response(JSON.stringify({
      ...parsed,
      newCharacterId: newTempCharId,
    }), {
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
