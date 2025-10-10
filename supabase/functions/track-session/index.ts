import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Get IP address from request
    const ip = req.headers.get("x-forwarded-for") || 
               req.headers.get("x-real-ip") || 
               "unknown";
    
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Get geolocation data from IP (using ipapi.co free API)
    let geoData = { city: null, region: null, country: null };
    
    if (ip !== "unknown") {
      try {
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`);
        if (geoResponse.ok) {
          const geo = await geoResponse.json();
          geoData = {
            city: geo.city || null,
            region: geo.region || null,
            country: geo.country_name || null,
          };
        }
      } catch (error) {
        console.error("Geolocation lookup failed:", error);
      }
    }

    // Insert session record
    const { error: insertError } = await supabaseClient
      .from("user_sessions")
      .insert({
        user_id: user.id,
        ip_address: ip,
        user_agent: userAgent,
        city: geoData.city,
        region: geoData.region,
        country: geoData.country,
      });

    if (insertError) {
      throw insertError;
    }

    return new Response(
      JSON.stringify({ success: true, ip, ...geoData }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
