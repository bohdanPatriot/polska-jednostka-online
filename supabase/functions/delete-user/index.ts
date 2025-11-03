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
      throw new Error("Not authenticated");
    }

    // Check if user is admin
    const { data: roles } = await supabaseClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);

    const isAdmin = roles?.some(r => r.role === "admin");
    if (!isAdmin) {
      throw new Error("Unauthorized - admin access required");
    }

    const { userId } = await req.json();
    if (!userId) {
      throw new Error("User ID is required");
    }

    // Use service role client to bypass RLS
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Log the deletion action before deleting
    await serviceClient.rpc("log_admin_action", {
      p_admin_id: user.id,
      p_action_type: "delete_user",
      p_target_type: "user",
      p_target_id: userId,
      p_reason: "Admin-initiated user deletion"
    });

    // Delete user's data in correct order (respecting foreign keys)
    
    // 1. Delete reports (both as reporter and target)
    await serviceClient.from("reports").delete().eq("reporter_id", userId);
    await serviceClient.from("reports").delete().eq("target_id", userId);
    
    // 2. Delete notifications
    await serviceClient.from("notifications").delete().eq("user_id", userId);
    
    // 3. Delete sessions
    await serviceClient.from("user_sessions").delete().eq("user_id", userId);
    
    // 4. Delete poll votes
    await serviceClient.from("poll_votes").delete().eq("user_id", userId);
    
    // 5. Delete event participations
    await serviceClient.from("event_participants").delete().eq("user_id", userId);
    
    // 6. Delete direct messages (both sent and received)
    await serviceClient.from("direct_messages").delete().eq("sender_id", userId);
    await serviceClient.from("direct_messages").delete().eq("recipient_id", userId);
    
    // 7. Delete blog posts
    await serviceClient.from("user_blog_posts").delete().eq("user_id", userId);
    
    // 8. Delete badges
    await serviceClient.from("user_badges").delete().eq("user_id", userId);
    
    // 9. Delete post reactions
    await serviceClient.from("post_reactions").delete().eq("user_id", userId);
    
    // 10. Delete posts (will cascade to post_attachments)
    await serviceClient.from("forum_posts").delete().eq("author_id", userId);

    // 11. Delete threads (will cascade to polls)
    await serviceClient.from("forum_threads").delete().eq("author_id", userId);
    
    // 12. Delete user roles
    await serviceClient.from("user_roles").delete().eq("user_id", userId);

    // 13. Finally delete profile
    const { error: profileError } = await serviceClient
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      throw profileError;
    }

    console.log("User deleted successfully:", userId);

    return new Response(
      JSON.stringify({ success: true, userId }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Delete user error:", errorMessage);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
