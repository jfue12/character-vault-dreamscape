import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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

    const { selfieBase64, idBase64, userId } = await req.json();

    if (!selfieBase64 || !idBase64 || !userId) {
      return new Response(
        JSON.stringify({ verified: false, reason: "Missing required data" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Starting age verification for user:", userId);

    // Use AI to analyze the selfie and ID
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: `You are an age verification system. Your task is to:
1. Compare the selfie photo with the ID photo to verify they show the same person
2. Extract the date of birth from the ID document
3. Calculate if the person is 18 years or older based on today's date

IMPORTANT RULES:
- Look for common ID elements: name, photo, date of birth
- The DOB might be in various formats (MM/DD/YYYY, DD/MM/YYYY, YYYY-MM-DD, etc.)
- Be strict about face matching - the selfie must clearly match the ID photo
- If the ID is blurry, obscured, or the DOB cannot be read, reject the verification
- If the faces don't match, reject the verification
- Today's date is ${new Date().toISOString().split('T')[0]}

Respond with ONLY valid JSON in this exact format:
{
  "facesMatch": true/false,
  "dobFound": true/false,
  "dateOfBirth": "YYYY-MM-DD" or null,
  "calculatedAge": number or null,
  "isOver18": true/false,
  "confidence": "high"|"medium"|"low",
  "reason": "Brief explanation of the decision"
}`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Please analyze these two images. The first is a selfie, the second is an ID document. Verify if they show the same person and if the person is 18+."
              },
              {
                type: "image_url",
                image_url: { url: selfieBase64 }
              },
              {
                type: "image_url",
                image_url: { url: idBase64 }
              }
            ]
          }
        ],
        temperature: 0.1,
        max_tokens: 500,
      }),
    });

    if (!response.ok) {
      console.error("AI gateway error:", response.status);
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ verified: false, reason: "Service busy. Please try again in a moment." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error("AI verification service unavailable");
    }

    const aiResponse = await response.json();
    const content = aiResponse.choices?.[0]?.message?.content;

    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ verified: false, reason: "Verification service error" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse the AI response
    let result;
    try {
      const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, content];
      result = JSON.parse(jsonMatch[1] || content);
    } catch (parseError) {
      console.error("Failed to parse AI response:", content);
      return new Response(
        JSON.stringify({ verified: false, reason: "Could not process verification result" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Verification result:", result);

    // Determine final verification status
    const verified = result.facesMatch && 
                    result.dobFound && 
                    result.isOver18 && 
                    result.confidence !== "low";

    if (verified) {
      // Update the user's verification status in the database
      const expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Verification valid for 1 year

      await supabase.from("age_verifications").upsert({
        user_id: userId,
        verification_status: "verified",
        verified_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
      });

      // Update the user's profile to mark them as not a minor
      await supabase
        .from("profiles")
        .update({ is_minor: false })
        .eq("id", userId);
    }

    // IMPORTANT: We do NOT store the images - they are processed in memory only
    // This is critical for user privacy

    return new Response(
      JSON.stringify({
        verified,
        reason: result.reason,
        confidence: result.confidence,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Age verification error:", error);
    return new Response(
      JSON.stringify({ 
        verified: false, 
        reason: error instanceof Error ? error.message : "Verification failed" 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});