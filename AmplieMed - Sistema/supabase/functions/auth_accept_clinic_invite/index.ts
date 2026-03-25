import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

interface AcceptInviteRequest {
  token: string;
  email: string;
  password: string;
  name?: string;
  crm?: string;
  specialty?: string;
}

interface AcceptInviteResponse {
  user: {
    id: string;
    email: string;
  };
  clinic: {
    id: string;
    name: string;
  };
  professional?: {
    id: string;
    name?: string;
    role: string;
  };
  message: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: AcceptInviteRequest = await req.json();

    // Validate required fields
    if (!data.token || !data.email || !data.password) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["token", "email", "password"],
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate password strength
    if (data.password.length < 8) {
      return new Response(
        JSON.stringify({ error: "Password must be at least 8 characters" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!/[A-Z]/.test(data.password) || !/[0-9]/.test(data.password)) {
      return new Response(
        JSON.stringify({
          error: "Password must contain uppercase letters and numbers",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Validate invite token
    const { data: inviteData, error: inviteError } = await supabase
      .from("clinic_invite_tokens")
      .select("*, clinic_id(*)")
      .eq("token", data.token)
      .eq("invited_email", data.email)
      .is("used_at", null)
      .gt("expires_at", new Date().toISOString())
      .single();

    if (inviteError || !inviteData) {
      return new Response(
        JSON.stringify({
          error: "Invalid, expired, or already used invite token",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const clinicId = inviteData.clinic_id;
    const invitedRole = inviteData.role || "doctor";

    // Get clinic details
    const { data: clinic, error: clinicError } = await supabase
      .from("clinics")
      .select("id, name")
      .eq("id", clinicId)
      .single();

    if (clinicError || !clinic) {
      return new Response(
        JSON.stringify({ error: "Clinic not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Check if email already exists
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const userExists = existingUser?.users.some((u) => u.email === data.email);

    let userId: string;

    if (!userExists) {
      // Create new auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
      });

      if (authError || !authData.user) {
        console.error("Auth error:", authError);
        return new Response(
          JSON.stringify({ error: "Failed to create user account" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = authData.user.id;
    } else {
      // Find existing user
      const { data: existingUserData, error: findError } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", data.email)
        .single();

      if (findError) {
        return new Response(
          JSON.stringify({ error: "Email already registered with different account" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      userId = existingUserData.id;
    }

    // 3. Create professional record if needed (for doctors)
    let professional = null;
    if (invitedRole === "doctor" && !existingUser) {
      const { data: profData, error: profError } = await supabase
        .from("professionals")
        .insert({
          owner_id: userId,
          user_id: userId,
          clinic_id: clinicId,
          name: data.name || data.email.split("@")[0],
          crm: data.crm || "",
          specialty: data.specialty || "General",
          email: data.email,
          role: "doctor",
          status: "active",
        })
        .select()
        .single();

      if (profError) {
        console.error("Professional creation error:", profError);
        return new Response(
          JSON.stringify({ error: "Failed to create professional record" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      professional = profData;
    }

    // 4. Create clinic_memberships record
    const { error: membershipError } = await supabase
      .from("clinic_memberships")
      .insert({
        clinic_id: clinicId,
        user_id: userId,
        role: invitedRole,
        active: true,
      });

    if (membershipError) {
      console.error("Membership creation error:", membershipError);
      return new Response(
        JSON.stringify({ error: "Failed to add user to clinic" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Mark invite as used
    const { error: markUsedError } = await supabase
      .from("clinic_invite_tokens")
      .update({
        used_at: new Date().toISOString(),
        used_by: userId,
      })
      .eq("id", inviteData.id);

    if (markUsedError) {
      console.error("Error marking invite as used:", markUsedError);
      // Continue anyway - the important part is done
    }

    // 6. Log audit entry
    await supabase.from("audit_log").insert({
      owner_id: userId,
      clinic_id: clinicId,
      user_name: data.email,
      user_role: invitedRole,
      action: "professional_joined",
      module: "authentication",
      description: `Profissional se juntou à clínica: ${clinic.name}`,
      status: "success",
      metadata: {
        role: invitedRole,
        from_invite_token: inviteData.id,
      },
    });

    const response: AcceptInviteResponse = {
      user: {
        id: userId,
        email: data.email,
      },
      clinic: {
        id: clinic.id,
        name: clinic.name,
      },
      professional: professional
        ? {
          id: professional.id,
          name: professional.name,
          role: invitedRole,
        }
        : undefined,
      message: `Welcome to ${clinic.name}! Your account has been created successfully.`,
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
