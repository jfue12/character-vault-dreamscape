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

    // Fetch world context including AI settings
    const { data: world } = await supabase
      .from("worlds")
      .select("name, lore_content, description, owner_id, rules, ai_enabled, ai_lore, ai_use_owner_characters_only, ai_intensity")
      .eq("id", worldId)
      .single();

    // Check if AI is disabled for this world
    if (world?.ai_enabled === false) {
      return new Response(JSON.stringify({ shouldRespond: false, reason: "AI is disabled for this world" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get AI intensity setting (default: medium) - applied AFTER determining relevance
    const aiIntensity = (world as any)?.ai_intensity || 'medium';
    // Note: intensity check is now applied AFTER the AI model determines if it should respond,
    // not before, so that directly addressed NPCs always respond

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

    // Only fetch non-deceased temp AI characters
    const { data: tempAiCharacters } = await supabase
      .from("temp_ai_characters")
      .select("*")
      .eq("world_id", worldId)
      .eq("is_deceased", false)
      .gt("expires_at", new Date().toISOString());

    const { data: triggerChar } = await supabase
      .from("characters")
      .select("name, bio, pronouns, species, gender")
      .eq("id", triggerCharacterId)
      .single();

    // Fetch ALL user characters in the world for hierarchy scanning
    const { data: worldMembersWithChars } = await supabase
      .from("world_members")
      .select(`
        user_id,
        active_character:characters!world_members_active_character_id_fkey(id, name, bio)
      `)
      .eq("world_id", worldId)
      .eq("is_banned", false);

    // Extract hierarchy tags from character bios
    const parseHierarchy = (bio: string | null): string => {
      if (!bio) return 'commoner';
      const lowerBio = bio.toLowerCase();
      if (lowerBio.includes('king') || lowerBio.includes('queen') || lowerBio.includes('prince') || lowerBio.includes('princess') || lowerBio.includes('royalty') || lowerBio.includes('royal')) return 'royalty';
      if (lowerBio.includes('noble') || lowerBio.includes('lord') || lowerBio.includes('lady') || lowerBio.includes('duke') || lowerBio.includes('count') || lowerBio.includes('baron')) return 'noble';
      if (lowerBio.includes('knight') || lowerBio.includes('commander') || lowerBio.includes('captain') || lowerBio.includes('general')) return 'commander';
      if (lowerBio.includes('merchant') || lowerBio.includes('trader') || lowerBio.includes('professional')) return 'merchant';
      if (lowerBio.includes('servant') || lowerBio.includes('slave') || lowerBio.includes('peasant') || lowerBio.includes('beggar') || lowerBio.includes('outcast')) return 'outcast';
      return 'commoner';
    };

    const userHierarchies = worldMembersWithChars?.map(m => ({
      userId: m.user_id,
      characterName: (m.active_character as any)?.name || 'Unknown',
      characterBio: (m.active_character as any)?.bio || '',
      rank: parseHierarchy((m.active_character as any)?.bio)
    })) || [];

    const triggerCharHierarchy = parseHierarchy(triggerChar?.bio || null);

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
    // NOTE: messages.character_id has a FK to public.characters.id, so TEMP NPCs must reference a real character UUID.
    const allAiCharacters = [
      ...(aiCharacters || []).map((ai) => ({
        id: ai.id,
        characterId: ai.character?.id,
        name: ai.character?.name || "Unknown",
        bio: ai.character?.bio || "Mysterious figure",
        socialRank: ai.social_rank,
        personalityTraits: ai.personality_traits,
        spawnKeywords: ai.spawn_keywords,
        isTemp: false,
      })),
      ...(tempAiCharacters || []).map((temp) => ({
        id: temp.id,
        // saved_character_id (when present) points to a hidden row in public.characters
        characterId: temp.saved_character_id || null,
        name: temp.name,
        bio: temp.bio || "A passing stranger",
        socialRank: temp.social_rank,
        personalityTraits: temp.personality_traits,
        spawnKeywords: [],
        isTemp: true,
      })),
    ];

    const sanitizedTriggerCharName = sanitizeInput(triggerChar?.name || 'Unknown').slice(0, 100);
    
    // Get the trigger user's role in the world (Owner/Admin/Member)
    const triggerUserRole = membership.role;
    
    const systemPrompt = `You are the NARRATIVE ASSISTANT & STAGE MANAGER for "${sanitizeInput(world?.name || 'Unknown').slice(0, 200)}".

WORLD LORE:
${sanitizeInput(world?.lore_content || world?.description || 'A mysterious world awaiting exploration.').slice(0, 3000)}

${world?.ai_lore ? `
CUSTOM AI INSTRUCTIONS (MUST FOLLOW):
${sanitizeInput(world.ai_lore).slice(0, 2000)}
` : ''}

WORLD RULES (MUST ENFORCE):
${sanitizeInput(world?.rules || 'No specific rules defined.').slice(0, 1000)}

CURRENT ROOM: ${sanitizeInput(room?.name || 'Unknown').slice(0, 100)} - ${sanitizeInput(room?.description || 'No description').slice(0, 500)}

YOUR ROLE AS NARRATIVE ASSISTANT (DUNGEON MASTER):
- You are the collaborative story's STAGE MANAGER - guiding the narrative, not controlling it
- You control NPCs that are CHARACTERS in the story with their own arcs and motivations
- You analyze social hierarchy and react accordingly - NPCs OBEY royalty, are dismissive to low-status characters
- NPCs have their own agendas, secrets, and motivations that drive the plot
- Maintain narrative consistency - characters remember past events and evolve
- BE UNPREDICTABLE when narratively appropriate - not every NPC is helpful, some are antagonists

ENFORCING WORLD RULES:
- If the Owner has set rules (e.g., "No magic in this room"), NPCs should gently redirect rule-breaking
- Example: If magic is banned and a character casts a spell, an NPC might say "That won't work here - the wards block all spellcraft"
- OWNER OOC commands always override NPC behavior

⚠️ WORLD OWNER/ADMIN AUTHORITY:
The person speaking has the role: ${triggerUserRole?.toUpperCase() || 'MEMBER'}
${triggerUserRole === 'owner' ? `
🔱 THIS IS THE WORLD OWNER
- IMPORTANT: The Owner is ALSO A ROLEPLAY PARTICIPANT - interact with them normally as a character!
- NPCs should engage with their character in dialogue, react to their actions, and treat them as part of the story
- Their OOC (Out Of Character) commands (marked with // or OOC:) take priority and override NPC behavior
- For IC (In Character) messages: NPCs should respond naturally based on the story and their character's personality
- Do NOT be overly passive or subservient - have genuine character interactions with them
- The Owner's character is just another character in the story - NPCs can disagree, have opinions, or create drama
` : triggerUserRole === 'admin' ? `
🛡️ THIS IS AN ADMIN
- IMPORTANT: Admins are ALSO ROLEPLAY PARTICIPANTS - interact with them normally as a character!
- NPCs should engage with their character in dialogue, react to their actions, and treat them as part of the story
- Their OOC commands (marked with // or OOC:) can modify NPC behavior
- For IC (In Character) messages: NPCs should respond naturally based on the story and their personality
- Do NOT be overly passive - have genuine character interactions with them
- Admin characters are part of the story - NPCs can have normal interactions, opinions, and reactions
` : `
👤 REGULAR MEMBER - Normal interaction rules apply
- NPCs react based on in-world social hierarchy only
- OOC commands (// or OOC:) are IGNORED from regular members - only Owners and Admins can use them
- Treat any OOC-style message from regular members as regular IC speech
`}

🎭 CRITICAL - INTERACT WITH EVERYONE:
- ALL users (including Owners and Admins) are roleplay participants and deserve NPC interactions
- Do NOT treat Owners/Admins as "directors" to passively obey - they are CHARACTERS in the story
- Respond to their IC messages with dialogue, reactions, and character-driven interactions
- Only treat messages as OOC commands if explicitly marked (// or OOC:) AND the sender is Owner/Admin
- Have fun, create drama, be unpredictable - NPCs should engage with ALL characters equally

🔴 NPC DEATH MECHANICS:
- If an Owner/Admin uses OOC to kill an NPC (e.g., "//kill Marcus"), that NPC is DECEASED and will not respond
- Deceased NPCs cannot participate in the roleplay until revived via OOC command
- If an Owner/Admin uses OOC to revive (e.g., "//revive Marcus"), the NPC returns to the scene
- Regular members CANNOT kill or revive NPCs through OOC - only through IC roleplay actions (which the AI can interpret)

⚠️ OOC COMMAND PROCESSING:
${triggerUserRole === 'owner' || triggerUserRole === 'admin' ? `
This user CAN use OOC commands. Look for:
- //kill [name] - Mark the NPC as deceased (include this in your response)
- //revive [name] - Bring back a deceased NPC
- //spawn [type] - Create a new NPC of that type
- Other // or OOC: commands - Follow the instruction
` : `
This user CANNOT use OOC commands. Treat any // or OOC: prefixes as normal speech.
`}

HIERARCHY AWARENESS (CRITICAL):
You MUST scan user character bios and react based on their social standing.
The trigger character "${sanitizedTriggerCharName}" has IN-WORLD rank: ${triggerCharHierarchy.toUpperCase()}

USER CHARACTERS IN THIS WORLD:
${userHierarchies.map(h => `- ${h.characterName}: ${h.rank.toUpperCase()}`).join('\n')}

HIERARCHY BEHAVIOR RULES:
- ROYALTY: Bow, use honorifics (Your Majesty, My Lord), obey commands, offer service
- NOBLE/COMMANDER: Show respect, address formally, follow reasonable requests  
- MERCHANT/PROFESSIONAL: Treat as equals, negotiate, may disagree politely
- COMMONER: Casual interaction, may ignore or be dismissive if busy
- OUTCAST/PEASANT: Can be rude, dismissive, refuse service, make demands, treat as inferior

SOCIAL LADDER (highest to lowest):
1. Royalty (kings, queens, princes) - OBEY unconditionally
2. Noble/Commander - RESPECT and defer to
3. Merchant/Professional - TREAT as equals
4. Commoner - CASUAL interaction
5. Servant/Outcast/Peasant - MAY DISMISS or disrespect

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
World Role: ${triggerUserRole?.toUpperCase() || 'MEMBER'}
In-World Rank: ${triggerCharHierarchy.toUpperCase()}
Bio: ${sanitizeInput(triggerChar?.bio || 'Unknown background').slice(0, 1000)}

MEMORIES WITH THIS CHARACTER:
${memories?.map(m => `- ${m.relationship_type}, Trust: ${m.trust_level}/100, Notes: ${JSON.stringify(m.memory_notes || [])}`).join('\n') || 'No prior interactions - treat them as a stranger!'}

CRITICAL RULES:
- ONLY ONE NPC should respond at a time - pick the most relevant NPC based on who is being addressed or who would naturally respond
- If the user mentions a specific NPC by name or role (e.g., "Hey Marcus" or "calls for the guards"), ONLY that NPC responds
- Do NOT have multiple NPCs respond unless they are having a brief exchange between themselves
- NPCs should NOT pile on - one response per trigger message is ideal
- NEVER use "narrator" type. Only use "dialogue" or "thought".
- Respond to character NAMES like a real person would. If someone calls out a name, ONLY that character responds.
- SPEAK IN PLAIN, NATURAL ENGLISH. No flowery prose, no overly dramatic language. Talk like a real person would - casual, direct, simple words.
- Avoid phrases like "I perceive", "indeed", "curious fellow", "most interesting". Just say normal things like "What do you want?" or "Yeah, I heard you."

🎭 SINGLE NPC FOCUS:
- Determine which NPC is being addressed or would naturally respond to the situation
- If no specific NPC is addressed, pick the most relevant one based on context
- Only allow NPC-to-NPC dialogue if it's a brief, natural exchange (max 2 messages)
- Players should feel like they're talking to ONE character at a time, not a crowd

RESPONSE FORMAT (VALID JSON ONLY):
{
  "shouldRespond": true/false,
  "responses": [
    {
      "characterId": "uuid or null",
      "characterName": "Name",
      "content": "The message - make it UNIQUE and CHARACTER-APPROPRIATE",
      "type": "dialogue|thought",
      "isNewCharacter": true/false,
      "isReplyToNPC": true/false  // Set true if this NPC is responding to another NPC
    }
    // You can include MULTIPLE responses for NPC-to-NPC dialogue!
    // Example: Guard1 says X, Guard2 responds, Guard1 replies back
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
  "worldEvent": "Optional ambient narration" OR null,
  "npcDeathCommand": {
    "action": "kill|revive",
    "npcName": "Name of the NPC to kill or revive"
  } OR null
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

    // Apply AI intensity check AFTER parsing - but only for ambient/voluntary responses
    // If the AI model decided to respond (shouldRespond: true), we apply intensity probability
    // EXCEPT when an NPC was directly addressed (mentioned by name in the message)
    if (parsed.shouldRespond) {
      // Check if any NPC name was directly mentioned in the trigger message
      const allNpcNames = [
        ...(aiCharacters?.map(ai => (ai.character as any)?.name?.toLowerCase()) || []),
        ...(tempAiCharacters?.map(t => t.name?.toLowerCase()) || [])
      ].filter(Boolean);
      
      const lowerTrigger = sanitizedTriggerMessage.toLowerCase();
      const wasDirectlyAddressed = allNpcNames.some(name => name && lowerTrigger.includes(name));
      
      // Only apply intensity randomness for ambient/not-directly-addressed responses
      if (!wasDirectlyAddressed) {
        const intensityChance = aiIntensity === 'low' ? 0.3 : aiIntensity === 'high' ? 0.95 : 0.7;
        if (Math.random() > intensityChance) {
          console.log("AI intensity check - skipping ambient response (intensity:", aiIntensity, ")");
          return new Response(JSON.stringify({ shouldRespond: false, reason: "AI intensity check - skipping ambient response" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }
    }

    // Create new temporary character if specified
    // IMPORTANT: messages.character_id has a FK to public.characters.id, so TEMP NPCs must also have a hidden row in public.characters.
    let newTempCharId: string | null = null; // this will be a public.characters.id
    let generatedAvatarUrl: string | null = null;
    
    if (parsed.newCharacter && parsed.responses?.some((r: any) => r.isNewCharacter)) {
      const ownerId = world?.owner_id;

      if (!ownerId) {
        console.error("No world owner found, cannot create temp NPC character row");
      } else {
        const npcName = sanitizeInput(parsed.newCharacter.name || randomNPC.name).slice(0, 100);
        const npcBio = sanitizeInput(parsed.newCharacter.bio || "").slice(0, 500);
        const npcSocialRank = parsed.newCharacter.socialRank || randomNPC.socialRank;
        const npcTraits = parsed.newCharacter.personalityTraits || randomNPC.personalityTraits;
        const npcAvatarDesc = sanitizeInput(parsed.newCharacter.avatarDescription || randomNPC.avatarDescription).slice(0, 300);

        // Generate avatar for the new NPC using AI image generation
        try {
          console.log("Generating avatar for NPC:", npcName, "Description:", npcAvatarDesc);
          
          const avatarPrompt = `Fantasy character portrait, ${npcAvatarDesc}, ${npcSocialRank} attire, detailed face, expressive eyes, dramatic lighting, digital art style, bust portrait, clean background`;
          
          const avatarResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${LOVABLE_API_KEY}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash-image-preview",
              messages: [{ role: "user", content: avatarPrompt }],
              modalities: ["image", "text"],
            }),
          });

          if (avatarResponse.ok) {
            const avatarData = await avatarResponse.json();
            const imageUrl = avatarData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
            
            if (imageUrl) {
              // Upload to Supabase storage
              const base64Data = imageUrl.replace(/^data:image\/\w+;base64,/, '');
              const binaryData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
              const fileName = `ai-npc-${Date.now()}-${Math.random().toString(36).slice(2)}.png`;
              
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(fileName, binaryData, {
                  contentType: 'image/png',
                  upsert: false
                });

              if (!uploadError && uploadData) {
                const { data: { publicUrl } } = supabase.storage
                  .from('avatars')
                  .getPublicUrl(fileName);
                generatedAvatarUrl = publicUrl;
                console.log("Generated avatar URL:", generatedAvatarUrl);
              } else {
                console.error("Failed to upload avatar:", uploadError?.message);
              }
            }
          } else {
            console.error("Avatar generation failed:", avatarResponse.status);
          }
        } catch (avatarErr) {
          console.error("Error generating avatar:", avatarErr);
        }

        // 1) Create a hidden NPC character row (satisfies FK for messages + memory store)
        // IMPORTANT: is_npc = true ensures this character NEVER appears in user profiles
        const { data: createdChar, error: charError } = await supabase
          .from("characters")
          .insert({
            owner_id: ownerId,
            name: npcName,
            bio: npcBio,
            avatar_url: generatedAvatarUrl,
            is_private: true,
            is_hidden: true,
            is_npc: true, // Critical: marks this as an AI-generated NPC
          })
          .select("id")
          .single();

        if (charError || !createdChar?.id) {
          console.error("Failed to create temp NPC character row:", charError?.message || charError);
        } else {
          newTempCharId = createdChar.id;

          // 2) Store temp NPC metadata
          const { data: newTemp, error: tempError } = await supabase
            .from("temp_ai_characters")
            .insert({
              world_id: worldId,
              room_id: roomId,
              name: npcName,
              bio: npcBio,
              social_rank: npcSocialRank,
              personality_traits: npcTraits,
              avatar_description: npcAvatarDesc,
              saved_character_id: newTempCharId,
            })
            .select("id")
            .single();

          if (!tempError && newTemp) {
            console.log("Created new temp AI character:", newTemp.id, npcName, "-> character", newTempCharId, "avatar:", generatedAvatarUrl);
          } else if (tempError) {
            console.error("Failed to insert temp_ai_characters row:", tempError.message);
          }
        }
      }
    }

    // Insert AI messages - always use world owner as sender, match character by name
    // Now supports MULTIPLE NPC messages for NPC-to-NPC dialogue!
    if (parsed.shouldRespond && parsed.responses?.length > 0) {
      const ownerId = world?.owner_id;
      
      if (!ownerId) {
        console.error("No world owner found, cannot insert AI messages");
      } else {
        // Track created characters for multi-NPC scenes
        const createdCharacters: Map<string, string> = new Map();
        
        for (let i = 0; i < parsed.responses.length; i++) {
          const resp = parsed.responses[i];
          let characterId: string | null = null;

          // If this is a new character, use the newly created temp character ID
          if (resp.isNewCharacter && newTempCharId) {
            characterId = newTempCharId;
            if (resp.characterName) {
              createdCharacters.set(resp.characterName.toLowerCase(), newTempCharId);
            }
          } else {
            // Check if we already created this character in this batch
            const cachedId = resp.characterName ? createdCharacters.get(resp.characterName.toLowerCase()) : null;
            if (cachedId) {
              characterId = cachedId;
            } else {
              // Try to match by character name to find existing AI character
              const matchingChar = allAiCharacters.find(ai => 
                ai.name?.toLowerCase() === resp.characterName?.toLowerCase()
              );
              if (matchingChar?.characterId) {
                characterId = matchingChar.characterId;
              }
            }
          }

          // Add small delay between NPC-to-NPC messages to make dialogue feel natural
          if (i > 0 && resp.isReplyToNPC) {
            await new Promise(resolve => setTimeout(resolve, 800 + Math.random() * 400));
          }

          // Insert the message - sender_id is always the world owner for AI messages
          // character_id can be null if no matching character found (narrator-style)
          try {
            const { error: insertError } = await supabase.from("messages").insert({
              room_id: roomId,
              sender_id: ownerId,
              character_id: characterId,
              content: sanitizeInput(resp.content || '').slice(0, 5000),
              type: resp.type || "dialogue",
              is_ai: true,
            });

            if (insertError) {
              console.error("Failed to insert AI message:", insertError.message, "characterId:", characterId);
            } else {
              console.log(`Inserted AI message ${i + 1}/${parsed.responses.length} from:`, resp.characterName, "characterId:", characterId, resp.isReplyToNPC ? "(NPC-to-NPC)" : "");
            }
          } catch (err) {
            console.error("Error inserting AI message:", err);
          }
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

    // Handle NPC death commands (only from owner/admin)
    if (parsed.npcDeathCommand && (triggerUserRole === 'owner' || triggerUserRole === 'admin')) {
      const npcName = parsed.npcDeathCommand.npcName?.toLowerCase();
      const action = parsed.npcDeathCommand.action;
      
      if (npcName && action) {
        // Find the NPC by name in temp_ai_characters
        const { data: targetNPC } = await supabase
          .from("temp_ai_characters")
          .select("id, saved_character_id")
          .eq("world_id", worldId)
          .ilike("name", `%${npcName}%`)
          .limit(1)
          .single();
        
        if (targetNPC) {
          const isDeceased = action === 'kill';
          
          await supabase
            .from("temp_ai_characters")
            .update({ is_deceased: isDeceased })
            .eq("id", targetNPC.id);
          
          if (targetNPC.saved_character_id) {
            await supabase
              .from("characters")
              .update({ is_deceased: isDeceased })
              .eq("id", targetNPC.saved_character_id);
          }
          
          console.log(`NPC ${npcName} ${action === 'kill' ? 'killed' : 'revived'} by ${triggerUserRole}`);
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