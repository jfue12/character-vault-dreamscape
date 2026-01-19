import { supabase } from "@/integrations/supabase/client";

export const usePhantomAI = (roomId: string) => {
  const generateResponse = async (userMessage: string) => {
    // 1. Fetch Room Lore (Description)
    const { data: room, error } = await supabase
      .from("world_rooms")
      .select("description, name")
      .eq("id", roomId)
      .single();

    if (error) {
      console.error("Error fetching room lore:", error);
    }

    const roomLore = room?.description || "A mysterious place in the character vault.";

    // 2. Logic to send to AI (Injecting Lore)
    const systemPrompt = `You are the narrator of ${room?.name}. 
    The current setting lore is: ${roomLore}. 
    Respond to the user in a way that matches this environment.`;

    console.log("AI System Prompt with Lore:", systemPrompt);

    // Here you would call your Edge Function or AI API with systemPrompt
    // return aiResponse;
  };

  return { generateResponse };
};
