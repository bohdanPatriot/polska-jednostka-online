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

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      console.error("Auth error:", authError);
      throw new Error("Not authenticated");
    }

    console.log("User authenticated:", user.id);

    // Get IP address from request
    const ip = req.headers.get("x-forwarded-for") || 
               req.headers.get("x-real-ip") || 
               "unknown";
    
    const userAgent = req.headers.get("user-agent") || "unknown";

    // Get geolocation data from IP with fallback
    let geoData = { city: null, region: null, country: null };
    
    if (ip !== "unknown") {
      try {
        // Primary geolocation service: ipapi.co
        const geoResponse = await fetch(`https://ipapi.co/${ip}/json/`, {
          signal: AbortSignal.timeout(3000), // 3 second timeout
        });
        
        if (geoResponse.ok) {
          const geo = await geoResponse.json();
          geoData = {
            city: geo.city || null,
            region: geo.region || null,
            country: geo.country_name || null,
          };
        } else {
          throw new Error("Primary geolocation service failed");
        }
      } catch (error) {
        console.error("Primary geolocation lookup failed:", error);
        
        // SECURITY: Fallback to ip-api.com (free, no API key needed)
        try {
          const fallbackResponse = await fetch(`http://ip-api.com/json/${ip}`, {
            signal: AbortSignal.timeout(3000),
          });
          
          if (fallbackResponse.ok) {
            const geo = await fallbackResponse.json();
            if (geo.status === "success") {
              geoData = {
                city: geo.city || null,
                region: geo.regionName || null,
                country: geo.country || null,
              };
              console.log("Using fallback geolocation service");
            }
          }
        } catch (fallbackError) {
          console.error("Fallback geolocation also failed:", fallbackError);
          // Continue without geolocation data (graceful degradation)
        }
      }
    }

    // Insert session record using service role to bypass RLS
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { error: insertError } = await serviceClient
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
      console.error("Insert error:", insertError);
      throw insertError;
    }

    console.log("Session tracked successfully for user:", user.id);

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
