import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";
import { v4 as uuidv4 } from "https://deno.land/std@0.208.0/uuid/mod.ts";

interface InviteRequest {
  clinicId: string;
  email: string;
  role?: "doctor" | "receptionist" | "financial" | "viewer";
  metadata?: Record<string, any>;
}

interface InviteResponse {
  token: string;
  inviteLink: string;
  expiresAt: string;
  invitedEmail: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: InviteRequest = await req.json();

    // Validate required fields
    if (!data.clinicId || !data.email) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["clinicId", "email"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.email)) {
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Get authorization header to verify the requester is admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get current user from auth
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user is admin of this clinic
    const { data: membership, error: membershipError } = await supabase
      .from("clinic_memberships")
      .select("*")
      .eq("clinic_id", data.clinicId)
      .eq("user_id", user.id)
      .eq("role", "admin")
      .eq("active", true)
      .single();

    if (membershipError || !membership) {
      return new Response(
        JSON.stringify({ error: "You are not authorized to invite members to this clinic" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if clinic exists
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("id", data.clinicId)
      .single();

    if (clinicError || !clinic) {
      return new Response(
        JSON.stringify({ error: "Clinic not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if email is already a member of this clinic
    const { data: existingMember } = await supabase
      .from("clinic_memberships")
      .select("*")
      .eq("clinic_id", data.clinicId)
      .eq("user_id", user.id)
      .in("active", [true, false])
      .single();

    if (existingMember) {
      return new Response(
        JSON.stringify({ error: "Email is already a member of this clinic" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if there's an existing unexpired invite for this email
    const { data: existingInvite } = await supabase
      .from("clinic_invite_tokens")
      .select("*")
      .eq("clinic_id", data.clinicId)
      .eq("invited_email", data.email)
      .gt("expires_at", new Date().toISOString())
      .is("used_at", null)
      .single();

    if (existingInvite) {
      return new Response(
        JSON.stringify({
          error: "Active invite already exists for this email",
          existingToken: existingInvite.token,
        }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate unique token (48-char hex string)
    const rawToken = crypto.getRandomValues(new Uint8Array(24));
    const token = Array.from(rawToken)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Create the invite token (expires in 48 hours)
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: inviteData, error: inviteError } = await supabase
      .from("clinic_invite_tokens")
      .insert({
        clinic_id: data.clinicId,
        token: token,
        invited_email: data.email,
        role: data.role || "doctor",
        created_by: user.id,
        expires_at: expiresAt,
        metadata: data.metadata || {},
      })
      .select()
      .single();

    if (inviteError || !inviteData) {
      console.error("Invite creation error:", inviteError);
      return new Response(
        JSON.stringify({ error: "Failed to create invite token" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log audit entry
    await supabase.from("audit_log").insert({
      owner_id: user.id,
      clinic_id: data.clinicId,
      user_name: user.email,
      user_role: "admin",
      action: "professional_invited",
      module: "clinic_management",
      description: `Profissional convidado: ${data.email} (Role: ${data.role || "doctor"})`,
      status: "success",
      metadata: {
        invited_email: data.email,
        role: data.role || "doctor",
      },
    });

    // Build invite link (frontend will use this)
    const inviteLink = `${Deno.env.get("FRONTEND_URL") || "http://localhost:5173"}/accept-invite?token=${token}&email=${encodeURIComponent(data.email)}`;

    const response: InviteResponse = {
      token: token,
      inviteLink: inviteLink,
      expiresAt: expiresAt,
      invitedEmail: data.email,
    };

    return new Response(JSON.stringify(response), {
      status: 201,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
