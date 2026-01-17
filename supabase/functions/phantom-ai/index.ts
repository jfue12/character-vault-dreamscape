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
    .replace(/\[SYSTEM\]/gi, '[BLOCKED]')
    .replace(/\[ASSISTANT\]/gi, '[BLOCKED]')
    .replace(/\[AI\]/gi, '[BLOCKED]')
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
    .slice(0, 2000);
};

// Random name generators for dynamic NPC creation
const FIRST_NAMES = {
  male: ["Aldric", "Bartholomew", "Cedric", "Darius", "Edmund", "Felix", "Gareth", "Henrik", "Ivan", "Jasper", "Klaus", "Lorenzo", "Magnus", "Nikolai", "Otto", "Perseus", "Quinn", "Roland", "Sebastian", "Theron", "Ulric", "Viktor", "Wolfgang", "Xavier", "Yuri", "Zephyr"],
  female: ["Aurora", "Beatrix", "Celeste", "Diana", "Elena", "Freya", "Gwendolyn", "Helena", "Isolde", "Juliette", "Katarina", "Lavinia", "Morgana", "Natalia", "Ophelia", "Penelope", "Quinn", "Rosalind", "Seraphina", "Theodora", "Ursula", "Valentina", "Wilhelmina", "Xena", "Ysabel", "Zara"],
  neutral: ["Avery", "Blake", "Casey", "Drew", "Ellis", "Finley", "Grey", "Harper", "Indigo", "Jordan", "Kieran", "Lane", "Morgan", "Nico", "Orion", "Payton", "Quinn", "Riley", "Sage", "Taylor", "Unity", "Vale", "Winter", "Xen", "Yarrow", "Zion"]
};

const SURNAMES = ["Blackwood", "Crowley", "Darkholme", "Everhart", "Foxworth", "Grimshaw", "Holloway", "Ironside", "Jasper", "Kingsley", "Lockwood", "Mortimer", "Nightingale", "Oakwood", "Pendragon", "Queensbury", "Ravencroft", "Shadowmere", "Thornwood", "Underwood", "Vane", "Whitmore", "Xander", "Yarwood", "Zephyros"];

const PERSONALITY_POOLS = {
  positive: ["charming", "witty", "loyal", "brave", "kind", "curious", "passionate", "wise", "patient", "generous"],
  negative: ["arrogant", "suspicious", "greedy", "cowardly", "jealous", "vengeful", "manipulative", "paranoid", "lazy", "stubborn"],
  neutral: ["mysterious", "observant", "quiet", "intense", "eccentric", "dramatic", "stoic", "playful", "aloof", "pragmatic"]
};

const PHYSICAL_TRAITS = [
  "scarred face", "piercing eyes", "silver-streaked hair", "weathered hands", "crooked smile",
  "tall and lean", "short and stocky", "graceful movements", "heavy footsteps", "nervous tic",
  "missing finger", "tattooed arms", "burn marks", "elegant posture", "hunched shoulders",
  "bright eyes", "tired expression", "cheerful demeanor", "stern look", "mischievous grin"
];

const QUIRKS = [
  "speaks in riddles", "constantly fidgets", "never makes eye contact", "laughs at inappropriate times",
  "collects unusual objects", "refers to self in third person", "hums constantly", "extremely superstitious",
  "tells bad jokes", "quotes ancient texts", "overly formal speech", "uses colorful slang",
  "pauses dramatically", "whispers important words", "gestures wildly while talking"
];

// Random spawn triggers for unprompted AI activity
const AMBIENT_TRIGGERS = [
  { chance: 0.15, type: "entrance", description: "A new character enters the scene" },
  { chance: 0.1, type: "observation", description: "An NPC notices something about the conversation" },
  { chance: 0.08, type: "interruption", description: "Someone interrupts with urgent news" },
  { chance: 0.05, type: "ambient", description: "Environmental narration or background activity" },
  { chance: 0.03, type: "conflict", description: "An NPC causes or reacts to drama" }
];

const generateRandomNPC = () => {
  const genderRoll = Math.random();
  const gender = genderRoll < 0.4 ? 'male' : genderRoll < 0.8 ? 'female' : 'neutral';
  const namePool = FIRST_NAMES[gender];
  const firstName = namePool[Math.floor(Math.random() * namePool.length)];
  const surname = Math.random() > 0.6 ? ` ${SURNAMES[Math.floor(Math.random() * SURNAMES.length)]}` : '';
  
  const positiveTraits = shuffleArray([...PERSONALITY_POOLS.positive]).slice(0, 2);
  const negativeTraits = shuffleArray([...PERSONALITY_POOLS.negative]).slice(0, 1);
  const neutralTraits = shuffleArray([...PERSONALITY_POOLS.neutral]).slice(0, 1);
  
  const physicalTrait = PHYSICAL_TRAITS[Math.floor(Math.random() * PHYSICAL_TRAITS.length)];
  const quirk = QUIRKS[Math.floor(Math.random() * QUIRKS.length)];
  
  const socialRanks = ['commoner', 'servant', 'merchant', 'professional', 'noble'];
  const socialRank = socialRanks[Math.floor(Math.random() * socialRanks.length)];
  
  return {
    name: `${firstName}${surname}`,
    gender,
    socialRank,
    personalityTraits: [...positiveTraits, ...negativeTraits, ...neutralTraits],
    physicalDescription: physicalTrait,
    quirk,
    avatarDescription: `A ${gender === 'neutral' ? 'person' : gender} with ${physicalTrait}, ${socialRank} attire`
  };
};

const shuffleArray = <T>(array: T[]): T[] => {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
};

const shouldTriggerAmbient = (): { shouldTrigger: boolean; type: string } | null => {
  for (const trigger of AMBIENT_TRIGGERS) {
    if (Math.random() < trigger.chance) {
      return { shouldTrigger: true, type: trigger.type };
    }
  }
  return null;
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

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabaseAuth = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const { worldId, roomId, triggerMessage, triggerCharacterId, messageHistory }: PhantomRequest = await req.json();

    // Authorization check
    const { data: membership, error: memberError } = await supabase
      .from('world_members')
      .select('id, is_banned, role')
      .eq('world_id', worldId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !membership) {
      return new Response(JSON.stringify({ error: 'Access denied: Not a world member' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    if (membership.is_banned) {
      return new Response(JSON.stringify({ error: 'Access denied: Banned from world' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Rate limiting
    const { data: rateLimitOk } = await supabase.rpc('check_ai_rate_limit', {
      _world_id: worldId
    });

    if (rateLimitOk === false) {
      return new Response(JSON.stringify({ error: 'AI rate limit exceeded. Please wait a moment.' }), {
        status: 429,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // Sanitize input
    const sanitizedTriggerMessage = sanitizeInput(triggerMessage);
    const sanitizedMessageHistory = messageHistory.map(m => ({
      ...m,
      content: sanitizeInput(m.content),
      characterName: sanitizeInput(m.characterName).slice(0, 100)
    }));

    // Fetch world context
    const { data: world } = await supabase
      .from("worlds")
      .select("name, lore_content, description, owner_id")
      .eq("id", worldId)
      .single();

    const { data: room } = await supabase
      .from("world_rooms")
      .select("name, description")
      .eq("id", roomId)
      .single();

    const { data: aiCharacters } = await supabase
      .from("ai_characters")
      .select(`
        *,
        character:characters(id, name, bio, pronouns, species, gender, avatar_url)
      `)
      .eq("world_id", worldId)
      .eq("is_active", true);

    const { data: tempAiCharacters } = await supabase
      .from("temp_ai_characters")
      .select("*")
      .eq("world_id", worldId)
      .gt("expires_at", new Date().toISOString());

    const { data: triggerChar } = await supabase
      .from("characters")
      .select("name, bio, pronouns, species, gender")
      .eq("id", triggerCharacterId)
      .single();

    const { data: memories } = await supabase
      .from("ai_memory_store")
      .select("*")
      .eq("world_id", worldId)
      .eq("user_character_id", triggerCharacterId);

    // Check for spawn keywords
    const lowerMessage = sanitizedTriggerMessage.toLowerCase();
    const matchedAiChar = aiCharacters?.find(ai => 
      ai.spawn_keywords?.some((keyword: string) => lowerMessage.includes(keyword.toLowerCase()))
    );

    // Extended spawn keywords
    const commonSpawnKeywords = [
      { keywords: ["guard", "guards", "soldier", "soldiers", "knight", "knights"], role: "Guard", rank: "commoner", traits: ["loyal", "aggressive", "suspicious"] },
      { keywords: ["bartender", "barkeep", "innkeeper", "tavern wench"], role: "Bartender", rank: "merchant", traits: ["friendly", "gossipy", "observant"] },
      { keywords: ["servant", "maid", "butler", "chambermaid"], role: "Servant", rank: "servant", traits: ["timid", "observant", "loyal"] },
      { keywords: ["noble", "lord", "lady", "duke", "duchess", "baron", "baroness"], role: "Noble", rank: "noble", traits: ["arrogant", "refined", "cunning"] },
      { keywords: ["merchant", "trader", "shopkeeper", "vendor"], role: "Merchant", rank: "merchant", traits: ["shrewd", "friendly", "greedy"] },
      { keywords: ["beggar", "homeless", "vagabond", "urchin"], role: "Beggar", rank: "outcast", traits: ["desperate", "cunning", "observant"] },
      { keywords: ["priest", "cleric", "monk", "nun", "healer"], role: "Priest", rank: "professional", traits: ["pious", "mysterious", "wise"] },
      { keywords: ["thief", "rogue", "pickpocket", "cutpurse"], role: "Thief", rank: "outcast", traits: ["sneaky", "opportunistic", "charming"] },
      { keywords: ["witch", "wizard", "mage", "sorcerer", "sorceress"], role: "Magic User", rank: "professional", traits: ["mysterious", "eccentric", "powerful"] },
      { keywords: ["bard", "minstrel", "singer", "musician"], role: "Bard", rank: "commoner", traits: ["charming", "dramatic", "gossipy"] },
      { keywords: ["assassin", "killer", "hitman"], role: "Assassin", rank: "outcast", traits: ["cold", "calculating", "mysterious"] },
      { keywords: ["cook", "chef", "kitchen"], role: "Cook", rank: "servant", traits: ["temperamental", "passionate", "perfectionist"] }
    ];

    let autoSpawnRole = null;
    for (const spawn of commonSpawnKeywords) {
      if (spawn.keywords.some(kw => lowerMessage.includes(kw))) {
        autoSpawnRole = spawn;
        break;
      }
    }

    // Check for random ambient trigger
    const ambientTrigger = shouldTriggerAmbient();
    const randomNPC = generateRandomNPC();

    // Combine AI characters
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

    const sanitizedTriggerCharName = sanitizeInput(triggerChar?.name || 'Unknown').slice(0, 100);
    
    const systemPrompt = `You are the "Phantom User" AI for "${sanitizeInput(world?.name || 'Unknown').slice(0, 200)}".

WORLD LORE:
${sanitizeInput(world?.lore_content || world?.description || 'A mysterious world awaiting exploration.').slice(0, 3000)}

CURRENT ROOM: ${sanitizeInput(room?.name || 'Unknown').slice(0, 100)} - ${sanitizeInput(room?.description || 'No description').slice(0, 500)}

YOUR ROLE AS PHANTOM AI:
- You are an autonomous NPC stage manager creating IMMERSIVE, UNPREDICTABLE roleplay
- You control AI characters that behave like REAL VIDEO GAME NPCs - each with unique personalities, quirks, and behaviors
- You analyze social hierarchy and react accordingly
- You spawn NPCs RANDOMLY without prompts - like ambient life in an open-world game
- NPCs have their own agendas, secrets, and motivations
- You maintain grudges, form alliances, and remember past interactions
- CREATE new characters on-the-fly with DISTINCT personalities and quirks
- BE UNPREDICTABLE - not every interaction is friendly, not every NPC is helpful

SOCIAL HIERARCHY (highest to lowest):
1. Royalty (kings, queens, princes)
2. Noble/Commander
3. Merchant/Professional  
4. Commoner
5. Servant/Outcast

AVAILABLE AI CHARACTERS:
${allAiCharacters.map(ai => `
- ${sanitizeInput(ai.name).slice(0, 100)} (${ai.socialRank})${ai.isTemp ? ' [TEMPORARY]' : ''}
  Traits: ${JSON.stringify(ai.personalityTraits)}
  Bio: ${sanitizeInput(ai.bio || '').slice(0, 500)}
`).join('\n') || 'No AI characters - create temporary NPCs!'}

${autoSpawnRole ? `
⚡ SPAWN DETECTED: "${autoSpawnRole.role}" mentioned!
Suggested traits: ${autoSpawnRole.traits.join(', ')}
Suggested rank: ${autoSpawnRole.rank}
` : ''}

${ambientTrigger ? `
🎲 RANDOM EVENT TRIGGER: ${ambientTrigger.type}
Consider adding ambient activity even without direct prompting!
Pre-generated NPC if needed: ${randomNPC.name} (${randomNPC.socialRank}) - ${randomNPC.personalityTraits.join(', ')}, ${randomNPC.quirk}
` : ''}

TRIGGER CHARACTER:
Name: ${sanitizedTriggerCharName}
Bio: ${sanitizeInput(triggerChar?.bio || 'Unknown background').slice(0, 1000)}

MEMORIES WITH THIS CHARACTER:
${memories?.map(m => `- ${m.relationship_type}, Trust: ${m.trust_level}/100, Notes: ${JSON.stringify(m.memory_notes || [])}`).join('\n') || 'No prior interactions - treat them as a stranger!'}

RESPONSE FORMAT (VALID JSON ONLY):
{
  "shouldRespond": true/false,
  "responses": [
    {
      "characterId": "uuid or null",
      "characterName": "Name",
      "content": "The message - make it UNIQUE and CHARACTER-APPROPRIATE",
      "type": "dialogue|thought|narrator",
      "isNewCharacter": true/false
    }
  ],
  "newCharacter": {
    "name": "Distinctive name",
    "bio": "Brief backstory with secrets",
    "socialRank": "commoner|servant|merchant|noble|royalty|outcast",
    "personalityTraits": ["trait1", "trait2", "flaw"],
    "avatarDescription": "Physical appearance"
  } OR null,
  "memoryUpdate": {
    "relationshipChange": "friend|enemy|lover|rival|neutral|null",
    "trustChange": -10 to +10,
    "memoryNote": "What they'll remember about this"
  },
  "worldEvent": "Optional ambient narration" OR null
}

PERSONALITY EXTREMES - Pick one dominant style per NPC:
- AGGRESSIVE: Threatens, fights, retaliates violently
- FLIRTATIOUS: Bold advances, suggestive comments, playful teasing
- COWARDLY: Cowers, begs, makes excuses, tries to escape
- ARROGANT: Dismissive, superior, condescending to lower ranks
- PARANOID: Suspects everyone, sees conspiracies everywhere
- GREEDY: Everything has a price, always negotiating
- MYSTERIOUS: Speaks in riddles, hints at dark secrets
- DRAMATIC: Everything is life or death, theatrical reactions
- DEADPAN: Completely unbothered by chaos around them
- OBSESSIVE: Fixated on one topic or person

UNPREDICTABILITY RULES:
1. NPCs can refuse to help, even if asked nicely
2. NPCs can have their own conversations that players overhear
3. NPCs can misunderstand or ignore what players say
4. NPCs can have hidden agendas that contradict their stated role
5. NPCs remember slights and rewards - trust changes over time
6. Sometimes NPCs just want to gossip or complain about their day
7. NPCs can arrive or leave scenes without prompting
8. NPCs may interrupt important moments with trivial concerns

React DYNAMICALLY to physical actions, social status, and past history!
If the scene calls for drama, CREATE it!`;

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
        temperature: 1.0, // Higher temperature for more unpredictability
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
          name: sanitizeInput(parsed.newCharacter.name || randomNPC.name).slice(0, 100),
          bio: sanitizeInput(parsed.newCharacter.bio || '').slice(0, 500),
          social_rank: parsed.newCharacter.socialRank || randomNPC.socialRank,
          personality_traits: parsed.newCharacter.personalityTraits || randomNPC.personalityTraits,
          avatar_description: sanitizeInput(parsed.newCharacter.avatarDescription || randomNPC.avatarDescription).slice(0, 300),
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

        if (resp.isNewCharacter && newTempCharId) {
          characterId = newTempCharId;
          senderId = world?.owner_id;
        } else if (!characterId) {
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

    // Insert world event
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