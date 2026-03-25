import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import { corsHeaders } from "../_shared/cors.ts";

interface ClinicSignupData {
  clinicName: string;
  cnpj?: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  specialty?: string;
  address?: {
    street: string;
    number: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
    complement?: string;
  };
  acceptTerms: boolean;
  lgpdConsent: boolean;
}

interface ClinicSignupResult {
  clinic: {
    id: string;
    name: string;
    cnpj?: string;
    email: string;
    phone: string;
    createdAt: string;
  };
  admin: {
    id: string;
    email: string;
    name?: string;
  };
  inviteLink?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const data: ClinicSignupData = await req.json();

    // Validate required fields
    if (!data.clinicName || !data.email || !data.phone || !data.password) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields",
          required: ["clinicName", "email", "phone", "password"],
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

    // Validate CNPJ if provided (basic format check)
    if (data.cnpj && !/^\d{14}$/.test(data.cnpj.replace(/\D/g, ""))) {
      return new Response(
        JSON.stringify({ error: "Invalid CNPJ format" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Validate LGPD consent
    if (!data.lgpdConsent) {
      return new Response(
        JSON.stringify({ error: "LGPD consent is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // 1. Check if CNPJ already exists
    if (data.cnpj) {
      const { data: existingClinic } = await supabase
        .from("clinics")
        .select("id")
        .eq("cnpj", data.cnpj)
        .single();

      if (existingClinic) {
        return new Response(
          JSON.stringify({ error: "CNPJ already registered" }),
          { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // 2. Check if email already exists in auth
    const { data: existingUser } = await supabase.auth.admin.listUsers();
    const emailExists = existingUser?.users.some((u) => u.email === data.email);
    if (emailExists) {
      return new Response(
        JSON.stringify({ error: "Email already registered" }),
        { status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true, // Auto-confirm to allow immediate login
    });

    if (authError || !authData.user) {
      console.error("Auth error:", authError);
      return new Response(
        JSON.stringify({ error: "Failed to create user account", details: authError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = authData.user.id;

    // 4. Create clinic record
    const { data: clinicData, error: clinicError } = await supabase
      .from("clinics")
      .insert({
        name: data.clinicName,
        cnpj: data.cnpj || null,
        email: data.email,
        phone: data.phone,
        address_street: data.address?.street || null,
        address_number: data.address?.number || null,
        address_neighborhood: data.address?.neighborhood || null,
        address_city: data.address?.city || null,
        address_state: data.address?.state || null,
        address_zip: data.address?.zipCode || null,
        address_complement: data.address?.complement || null,
        owner_id: userId,
        status: "active",
      })
      .select()
      .single();

    if (clinicError || !clinicData) {
      console.error("Clinic creation error:", clinicError);
      // Rollback: delete auth user
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create clinic record" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 5. Create clinic_memberships record (admin role)
    const { error: membershipError } = await supabase
      .from("clinic_memberships")
      .insert({
        clinic_id: clinicData.id,
        user_id: userId,
        role: "admin",
        active: true,
      });

    if (membershipError) {
      console.error("Membership creation error:", membershipError);
      // Rollback: delete clinic and auth user
      await supabase.from("clinics").delete().eq("id", clinicData.id);
      await supabase.auth.admin.deleteUser(userId);
      return new Response(
        JSON.stringify({ error: "Failed to create clinic membership" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 6. Log audit entry
    await supabase.from("audit_log").insert({
      owner_id: userId,
      clinic_id: clinicData.id,
      user_name: data.email,
      user_role: "admin",
      action: "clinic_registered",
      module: "authentication",
      description: `Clínica registrada: ${data.clinicName}`,
      status: "success",
      metadata: {
        cnpj: data.cnpj || null,
        specialty: data.specialty || null,
      },
    });

    const response: ClinicSignupResult = {
      clinic: {
        id: clinicData.id,
        name: clinicData.name,
        cnpj: clinicData.cnpj || undefined,
        email: clinicData.email,
        phone: clinicData.phone,
        createdAt: clinicData.created_at,
      },
      admin: {
        id: userId,
        email: data.email,
      },
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
