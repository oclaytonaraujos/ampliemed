import { Hono } from "npm:hono";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import { createClient } from "jsr:@supabase/supabase-js@2.49.8";
import * as kv from "./kv_store.tsx";

const app = new Hono();

// ─── Supabase client (service role for admin operations) ─────────────────────
const supabaseAdmin = () =>
  createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use("*", logger(console.log));
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// ─── Storage bucket setup (idempotent) ───────────────────────────────────────

// ── Bucket registry: all buckets managed by this service ─────────────────────
const BUCKETS = {
  avatars:   { name: "make-d4766610-avatars",    public: true  },
  media:     { name: "make-d4766610-media",      public: true  },
  documents: { name: "make-d4766610-documents",  public: false },
  chat:      { name: "make-d4766610-chat",       public: false },
} as const;

type BucketType = keyof typeof BUCKETS;

// Keep legacy name for backwards compat (no-op if already migrated)
const LEGACY_BUCKET = "make-d4766610-medical-files";

async function ensureBuckets() {
  try {
    const supabase = supabaseAdmin();
    const { data: existing } = await supabase.storage.listBuckets();
    const existingNames = new Set(existing?.map((b: any) => b.name) ?? []);

    for (const [, cfg] of Object.entries(BUCKETS)) {
      if (!existingNames.has(cfg.name)) {
        const { error } = await supabase.storage.createBucket(cfg.name, {
          public: cfg.public,
        });
        if (error) console.log(`Bucket create error (${cfg.name}): ${error.message}`);
        else console.log(`Bucket created: ${cfg.name} (public=${cfg.public})`);
      }
    }

    // Ensure legacy bucket exists for any old references
    if (!existingNames.has(LEGACY_BUCKET)) {
      await supabase.storage.createBucket(LEGACY_BUCKET, { public: false });
    }
  } catch (err) {
    console.log(`Error ensuring buckets: ${err}`);
  }
}

// Run bucket setup on startup
ensureBuckets();

// ─── Auth helper: verify user from access token ─────────────────────────────
async function verifyUser(
  authHeader: string | undefined,
): Promise<{ id: string; email: string } | null> {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1];
  if (!token) return null;
  try {
    const supabase = supabaseAdmin();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return { id: user.id, email: user.email || "" };
  } catch {
    return null;
  }
}

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/make-server-d4766610/health", (c) => {
  return c.json({ status: "ok", timestamp: new Date().toISOString() });
});

// GET /storage/health — Check bucket existence and accessibility
app.get("/make-server-d4766610/storage/health", async (c) => {
  try {
    const supabase = supabaseAdmin();
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      return c.json({ ok: false, error: error.message }, 500);
    }
    const existingNames = new Set(buckets?.map((b: any) => b.name) ?? []);
    const status: Record<string, boolean> = {};
    for (const [key, cfg] of Object.entries(BUCKETS)) {
      status[key] = existingNames.has(cfg.name);
    }
    const allReady = Object.values(status).every(Boolean);
    return c.json({ ok: allReady, buckets: status, timestamp: new Date().toISOString() });
  } catch (err) {
    return c.json({ ok: false, error: `${err}` }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// 🗑️ ADMIN: DELETE ALL USERS (temporary cleanup endpoint)
// ═════════════════════════════════════════════════════════════════════════════

app.post("/make-server-d4766610/admin/delete-all-users", async (c) => {
  try {
    const supabase = supabaseAdmin();

    console.log("🗑️ [Admin] Starting to delete all users...");

    // 1. List all users
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers();
    if (listError) {
      console.error("❌ [Admin] Error listing users:", listError);
      return c.json({ error: `Failed to list users: ${listError.message}` }, 500);
    }

    const users = usersData?.users || [];
    console.log(`📋 [Admin] Found ${users.length} users to delete`);

    if (users.length === 0) {
      return c.json({ message: "No users to delete", deleted: 0 });
    }

    const userIds = users.map((u: any) => u.id);

    // ════════════════════════════════════════════════════════════════════════════
    // 2. DELETE FROM ALL TABLES THAT REFERENCE auth.users
    // ═════════════════════════════════════════════════════════════════════════════
    
    console.log("🗑️ [Admin] Deleting from all related tables...");
    
    // Tables with owner_id foreign key (UPDATED - added protocols!)
    const ownerIdTables = [
      'app_templates',
      'appointments', 
      'audit_log',
      'clinic_settings',
      'clinics',
      'communication_campaigns',
      'communication_messages',
      'doctors',
      'exams',
      'file_attachments',
      'financial_billings',
      'financial_glosas',
      'financial_payables',
      'financial_payments',
      'financial_receivables',
      'insurances',
      'medical_records',
      'notifications',
      'patients',
      'prescriptions',
      'professionals',
      'protocols',           // ✅ ADDED!
      'stock_items',
      'system_users',
      'telemedicine_sessions',
    ];

    for (const table of ownerIdTables) {
      try {
        console.log(`   🗑️ Deleting from ${table} (owner_id)...`);
        const { error } = await supabase
          .from(table)
          .delete()
          .in('owner_id', userIds);
        
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error(`   ⚠️ Error deleting from ${table}:`, error.message);
        }
      } catch (err: any) {
        console.log(`   ⚠️ Skipping ${table}:`, err.message);
      }
    }

    // Tables with user_id foreign key
    const userIdTables = [
      { table: 'doctors', column: 'user_id' },
      { table: 'professionals', column: 'user_id' },
    ];

    for (const { table, column } of userIdTables) {
      try {
        console.log(`   🗑️ Deleting from ${table} (${column})...`);
        const { error } = await supabase
          .from(table)
          .delete()
          .in(column, userIds);
        
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error(`   ⚠️ Error deleting from ${table}:`, error.message);
        }
      } catch (err: any) {
        console.log(`   ⚠️ Skipping ${table}:`, err.message);
      }
    }

    // Tables with other foreign keys
    const otherFkTables = [
      { table: 'doctor_time_off', column: 'approved_by' },
      { table: 'drug_interaction_alerts', column: 'acknowledged_by' },
      { table: 'exams', column: 'requested_by_id' },
      { table: 'file_attachments', column: 'uploaded_by_id' },
      { table: 'medical_records', column: 'signed_by' },
    ];

    for (const { table, column } of otherFkTables) {
      try {
        console.log(`   🗑️ Deleting from ${table} (${column})...`);
        const { error } = await supabase
          .from(table)
          .delete()
          .in(column, userIds);
        
        if (error && !error.message.includes('relation') && !error.message.includes('does not exist')) {
          console.error(`   ⚠️ Error deleting from ${table}:`, error.message);
        }
      } catch (err: any) {
        console.log(`   ⚠️ Skipping ${table}:`, err.message);
      }
    }

    // Finally, delete profiles
    console.log("   🗑️ Deleting from profiles...");
    const { error: profilesError } = await supabase
      .from('profiles')
      .delete()
      .in('id', userIds);

    if (profilesError) {
      console.error("   ⚠️ Error deleting profiles:", profilesError.message);
    }

    // ═════════════════════════════════════════════════════════════════════════════
    // 3. NOW DELETE FROM auth.users (should work without FK constraints)
    // ═════════════════════════════════════════════════════════════════════════════
    
    console.log("🗑️ [Admin] Now deleting from auth.users...");
    const deleteResults = [];
    
    for (const user of users) {
      console.log(`   🗑️ Deleting user: ${user.email} (${user.id})`);
      const { error: deleteError } = await supabase.auth.admin.deleteUser(user.id);
      
      if (deleteError) {
        console.error(`   ❌ Failed to delete ${user.email}:`, deleteError.message);
        deleteResults.push({ email: user.email, success: false, error: deleteError.message });
      } else {
        console.log(`   ✅ Deleted: ${user.email}`);
        deleteResults.push({ email: user.email, success: true });
      }
    }

    const successCount = deleteResults.filter(r => r.success).length;
    const failCount = deleteResults.filter(r => !r.success).length;

    console.log(`✅ [Admin] Deletion complete: ${successCount} deleted, ${failCount} failed`);

    return c.json({
      message: "User deletion completed",
      total: users.length,
      deleted: successCount,
      failed: failCount,
      results: deleteResults
    });

  } catch (err: any) {
    console.error("❌ [Admin] Error deleting users:", err);
    return c.json({ error: `Error deleting users: ${err.message}` }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// POST /auth/signup — Create a new user with Supabase Auth
app.post("/make-server-d4766610/auth/signup", async (c) => {
  try {
    const { email, password, name, phone } = await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    // 🔒 SECURITY: Public signup ALWAYS creates ADMIN users
    // Other roles (doctor, receptionist, financial) must be created by admin inside the platform
    const role = "admin";

    // Sanitize all metadata fields to ensure they are strings (never undefined/null)
    const nameStr = name || email.split("@")[0];
    const userMetadata = {
      name: nameStr,
      full_name: nameStr,
      role: role,
      specialty: "",
      crm: "",
      crm_uf: "",
      phone: phone || "",
      status: "active",
      initials: nameStr.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    };

    console.log(
      `✨ [Signup] Starting PUBLIC registration for ${email} as ADMIN`,
    );

    const supabase = supabaseAdmin();

    // Check if user already exists in auth.users OR profiles table
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(
      (u: any) => u.email === email,
    );
    
    if (userExists) {
      console.log(`⚠️ [Signup] User already exists in auth.users: ${email}`);
      return c.json(
        { error: "Este e-mail já está cadastrado. Faça login." },
        409,
      );
    }

    // Double-check profiles table
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', email)
      .single();

    if (existingProfile) {
      console.log(`⚠️ [Signup] Profile already exists in profiles table: ${email}`);
      return c.json(
        { error: "Este e-mail já está cadastrado. Faça login." },
        409,
      );
    }

    // STEP 1: Create user in auth.users WITHOUT trigger dependency
    console.log(`🔐 [Signup] Creating auth user for ${email}...`);
    
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm to skip email verification
      user_metadata: userMetadata,
    });

    if (authError) {
      console.error(`❌ [Signup] Auth creation failed for ${email}:`, authError);
      
      // Handle specific errors
      if (authError.message.includes("duplicate") || authError.message.includes("already exists")) {
        return c.json({ error: "Este e-mail já está cadastrado. Faça login." }, 409);
      }
      
      // For database trigger errors, we'll continue and try manual profile creation
      if (!authError.message.includes("Database error")) {
        return c.json({ error: `Erro ao criar usuário: ${authError.message}` }, 500);
      }
      
      console.log(`⚠️ [Signup] Trigger failed, but continuing with manual profile creation...`);
    }

    // Get the user ID (either from success or from error recovery)
    const userId = authData?.user?.id;
    
    if (!userId) {
      console.error(`❌ [Signup] No user ID returned for ${email}`);
      return c.json({ error: "Falha ao obter ID do usuário criado" }, 500);
    }

    console.log(`✅ [Signup] Auth user created with ID: ${userId}`);

    // STEP 2: Manually create profile in profiles table (bypass trigger)
    console.log(`📝 [Signup] Creating profile in profiles table for ${email}...`);
    
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: userId,
        name: nameStr,
        email: email,
        role: role,
        specialty: '',
        crm: '',
        crm_uf: '',
        phone: phone || '',
        initials: userMetadata.initials,
        status: 'active',
      });

    if (profileError) {
      console.error(`❌ [Signup] Profile creation error for ${email}:`, profileError);
      
      // If profile already exists (trigger worked after all), that's OK
      if (profileError.message.includes('duplicate') || profileError.message.includes('unique') || profileError.code === '23505') {
        console.log(`✅ [Signup] Profile already exists (trigger worked), user ready: ${email}`);
        return c.json({ 
          user: authData?.user, 
          message: "Usuário criado com sucesso" 
        });
      }
      
      // If it's a different error, rollback the auth user
      console.error(`💥 [Signup] Unexpected profile error, rolling back user: ${email}`);
      try {
        await supabase.auth.admin.deleteUser(userId);
        console.log(`🗑️ [Signup] Rolled back auth user ${userId}`);
      } catch (deleteErr) {
        console.error(`⚠️ [Signup] Failed to rollback user ${userId}:`, deleteErr);
      }
      
      return c.json({ 
        error: `Erro ao criar perfil: ${profileError.message || profileError.code}. O usuário foi removido. Tente novamente.` 
      }, 500);
    }

    console.log(`✅ [Signup] Profile created successfully for ${email}`);
    console.log(`🎉 [Signup] User registration complete: ${email} (${userId})`);
    
    return c.json({ 
      user: authData?.user, 
      message: "Usuário criado com sucesso" 
    });
    
  } catch (err) {
    console.error(`💥 [Signup] Unexpected error:`, err);
    return c.json({ error: `Erro interno no cadastro: ${err}` }, 500);
  }
});

// POST /auth/create-user — Admin creates a user with specific role (linked to company)
app.post("/make-server-d4766610/auth/create-user", async (c) => {
  try {
    // Try to verify user from JWT token; if no valid session, allow if using anon key
    // (prototype mode — in production, enforce admin JWT)
    const authHeader = c.req.header("Authorization");
    const token = authHeader?.split(" ")[1];
    
    let adminEmail = "admin@system";
    
    // Try to verify as authenticated user first
    const admin = await verifyUser(authHeader);
    if (admin) {
      adminEmail = admin.email;
      // If authenticated, verify admin role
      const supabaseCheck = supabaseAdmin();
      const { data: { user: adminUser } } = await supabaseCheck.auth.getUser(token!);
      if (adminUser?.user_metadata?.role && adminUser.user_metadata.role !== "admin") {
        return c.json({ error: "Apenas administradores podem criar usuários" }, 403);
      }
    }
    // If no valid JWT but request has anon key, allow (prototype mode)

    const supabase = supabaseAdmin();

    const { email, password, name, phone, role, specialty, crm, crm_uf } = await c.req.json();

    if (!email || !password || !name || !role) {
      return c.json({ error: "Nome, e-mail, senha e perfil são obrigatórios" }, 400);
    }

    const validRoles = ["admin", "doctor", "receptionist", "financial"];
    if (!validRoles.includes(role)) {
      return c.json({ error: `Perfil inválido. Use: ${validRoles.join(", ")}` }, 400);
    }

    if (password.length < 6) {
      return c.json({ error: "A senha deve ter no mínimo 6 caracteres" }, 400);
    }

    const nameStr = name.trim();
    const initials = nameStr.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase();

    console.log(`👤 [CreateUser] Admin ${adminEmail} creating user ${email} with role ${role}`);

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some((u: any) => u.email === email);
    if (userExists) {
      return c.json({ error: "Este e-mail já está cadastrado no sistema" }, 409);
    }

    const userMetadata = {
      name: nameStr,
      full_name: nameStr,
      role,
      specialty: specialty || "",
      crm: crm || "",
      crm_uf: crm_uf || "",
      phone: phone || "",
      status: "active",
      initials,
    };

    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (authError) {
      console.error(`❌ [CreateUser] Auth error:`, authError);
      if (authError.message.includes("duplicate") || authError.message.includes("already exists")) {
        return c.json({ error: "Este e-mail já está cadastrado" }, 409);
      }
      if (!authError.message.includes("Database error")) {
        return c.json({ error: `Erro ao criar usuário: ${authError.message}` }, 500);
      }
    }

    const userId = authData?.user?.id;
    if (!userId) {
      return c.json({ error: "Falha ao obter ID do usuário criado" }, 500);
    }

    const { error: profileError } = await supabase.from("profiles").insert({
      id: userId,
      name: nameStr,
      email,
      role,
      specialty: specialty || "",
      crm: crm || "",
      crm_uf: crm_uf || "",
      phone: phone || "",
      initials,
      status: "active",
    });

    if (profileError && !profileError.message?.includes("duplicate") && profileError.code !== "23505") {
      console.error(`❌ [CreateUser] Profile error:`, profileError);
      try { await supabase.auth.admin.deleteUser(userId); } catch (_) {}
      return c.json({ error: `Erro ao criar perfil: ${profileError.message}` }, 500);
    }

    console.log(`✅ [CreateUser] User ${email} created by admin ${adminEmail} with role ${role}`);

    return c.json({
      user: {
        id: userId,
        email,
        name: nameStr,
        role,
        phone: phone || "",
        specialty: specialty || "",
        crm: crm || "",
        crm_uf: crm_uf || "",
        status: "active",
        initials,
      },
      message: "Usuário criado com sucesso",
    });
  } catch (err) {
    console.error(`💥 [CreateUser] Unexpected error:`, err);
    return c.json({ error: `Erro interno: ${err}` }, 500);
  }
});

// GET /auth/me — Get current user profile from token
app.get("/make-server-d4766610/auth/me", async (c) => {
  try {
    const user = await verifyUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Não autorizado" }, 401);
    }

    // Get user metadata from Supabase
    const supabase = supabaseAdmin();
    const token = c.req.header("Authorization")?.split(" ")[1];
    const {
      data: { user: fullUser },
    } = await supabase.auth.getUser(token!);

    return c.json({
      id: fullUser?.id,
      email: fullUser?.email,
      name: fullUser?.user_metadata?.name || "",
      role: fullUser?.user_metadata?.role || "admin",
      specialty: fullUser?.user_metadata?.specialty || "",
      crm: fullUser?.user_metadata?.crm || "",
      phone: fullUser?.user_metadata?.phone || "",
    });
  } catch (err) {
    console.log(`Auth/me error: ${err}`);
    return c.json({ error: `Erro ao obter perfil: ${err}` }, 500);
  }
});

// PUT /auth/profile — Update current user metadata
app.put("/make-server-d4766610/auth/profile", async (c) => {
  try {
    const user = await verifyUser(c.req.header("Authorization"));
    if (!user) {
      return c.json({ error: "Não autorizado" }, 401);
    }

    const updates = await c.req.json();
    const supabase = supabaseAdmin();
    const { error } = await supabase.auth.admin.updateUserById(user.id, {
      user_metadata: updates,
    });

    if (error) {
      return c.json({ error: `Erro ao atualizar perfil: ${error.message}` }, 500);
    }

    return c.json({ message: "Perfil atualizado com sucesso" });
  } catch (err) {
    console.error("Error updating profile:", err);
    return c.json({ error: `Erro ao atualizar perfil: ${err}` }, 500);
  }
});

// DELETE /auth/delete-account — Delete user account and all associated data
app.delete("/make-server-d4766610/auth/delete-account", async (c) => {
  try {
    // Verify user authentication
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ error: "Token de acesso não fornecido" }, 401);
    }

    const supabase = supabaseAdmin();
    
    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (authError || !user) {
      console.error("❌ [Delete Account] Auth error:", authError);
      return c.json({ error: "Usuário não autorizado" }, 401);
    }

    const userId = user.id;
    const userEmail = user.email;
    
    console.log(`🗑️ [Delete Account] Starting deletion for user: ${userEmail} (${userId})`);

    // STEP 1: Delete profile from profiles table (this will cascade delete related data)
    console.log(`🗑️ [Delete Account] Deleting profile for ${userEmail}...`);
    const { error: profileError } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (profileError) {
      console.error(`❌ [Delete Account] Profile deletion failed:`, profileError);
      // Continue anyway - profile might not exist
    } else {
      console.log(`✅ [Delete Account] Profile deleted successfully`);
    }

    // STEP 2: Delete user from auth.users
    console.log(`🗑️ [Delete Account] Deleting auth user for ${userEmail}...`);
    const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

    if (deleteError) {
      console.error(`❌ [Delete Account] Auth deletion failed:`, deleteError);
      return c.json({ 
        error: `Erro ao excluir conta: ${deleteError.message}` 
      }, 500);
    }

    console.log(`✅ [Delete Account] Account deleted successfully: ${userEmail}`);
    
    return c.json({ 
      message: "Conta excluída com sucesso",
      deleted_email: userEmail
    });

  } catch (err: any) {
    console.error(`💥 [Delete Account] Unexpected error:`, err);
    return c.json({ 
      error: `Erro ao excluir conta: ${err.message || err}` 
    }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// DATA COLLECTION ROUTES (KV Store)
// ═════════════════════════════════════════════════════════════════════════════

// Valid collection names (whitelist for security)
const VALID_COLLECTIONS = [
  "patients",
  "appointments",
  "medical_records",
  "exams",
  "stock",
  "queue",
  "notifications",
  "billings",
  "payments",
  "receivables",
  "payables",
  "professionals",
  "insurances",
  "protocols",
  "audit_log",
  "telemedicine",
  "system_users",
  "templates",
  "comm_messages",
  "file_attachments",
  "clinic_settings",
];

function kvKey(collection: string): string {
  return `ampliemed:${collection}`;
}

// GET /data/:collection — Retrieve entire collection
app.get("/make-server-d4766610/data/:collection", async (c) => {
  try {
    const collection = c.req.param("collection");
    if (!VALID_COLLECTIONS.includes(collection)) {
      return c.json({ error: `Coleção inválida: ${collection}` }, 400);
    }

    const data = await kv.get(kvKey(collection));
    return c.json({ data: data ?? null });
  } catch (err) {
    console.log(`Error reading collection ${c.req.param("collection")}: ${err}`);
    return c.json(
      {
        error: `Erro ao ler dados de ${c.req.param("collection")}: ${err}`,
      },
      500,
    );
  }
});

// PUT /data/:collection — Save entire collection
app.put("/make-server-d4766610/data/:collection", async (c) => {
  try {
    const collection = c.req.param("collection");
    if (!VALID_COLLECTIONS.includes(collection)) {
      return c.json({ error: `Coleção inválida: ${collection}` }, 400);
    }

    const { data } = await c.req.json();
    await kv.set(kvKey(collection), data);
    return c.json({ message: `${collection} salvo com sucesso` });
  } catch (err) {
    console.log(`Error saving collection ${c.req.param("collection")}: ${err}`);
    return c.json(
      {
        error: `Erro ao salvar ${c.req.param("collection")}: ${err}`,
      },
      500,
    );
  }
});

// DELETE /data/:collection — Delete entire collection
app.delete("/make-server-d4766610/data/:collection", async (c) => {
  try {
    const collection = c.req.param("collection");
    if (!VALID_COLLECTIONS.includes(collection)) {
      return c.json({ error: `Coleção inválida: ${collection}` }, 400);
    }

    await kv.del(kvKey(collection));
    return c.json({ message: `${collection} removido com sucesso` });
  } catch (err) {
    console.log(`Error deleting collection ${c.req.param("collection")}: ${err}`);
    return c.json(
      {
        error: `Erro ao remover ${c.req.param("collection")}: ${err}`,
      },
      500,
    );
  }
});

// POST /audit/save — Persist audit log entries via service_role (bypasses RLS)
// Audit log is append-only: INSERT ... ignoreDuplicates=true (never updates/deletes).
app.post("/make-server-d4766610/audit/save", async (c) => {
  try {
    const user = await verifyUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);

    const { entries } = await c.req.json();
    if (!Array.isArray(entries) || entries.length === 0) {
      return c.json({ success: true, inserted: 0 });
    }

    const supabase = supabaseAdmin();
    const rows = entries.map((e: any) => ({
      id: e.id,
      owner_id: user.id,              // always the verified user — no client spoofing
      user_name: e.user_name || "",
      user_role: e.user_role || "",
      action: e.action || "read",
      module: e.module || "",
      description: e.description || "",
      ip_address: e.ip_address || null,
      device: e.device || "",
      status: e.status || "success",
    }));

    // INSERT only — audit entries are immutable; skip ids that already exist
    const { error } = await supabase
      .from("audit_log")
      .upsert(rows, { onConflict: "id", ignoreDuplicates: true });

    if (error) {
      console.log(`[audit/save] DB error: ${error.message}`);
      return c.json({ error: error.message }, 500);
    }

    console.log(`[audit/save] Saved ${rows.length} entries for user ${user.id}`);
    return c.json({ success: true, inserted: rows.length });
  } catch (err) {
    console.log(`[audit/save] Unexpected error: ${err}`);
    return c.json({ error: `Erro ao salvar audit log: ${err}` }, 500);
  }
});

// POST /data/bulk-load — Load multiple collections at once (initial load)
app.post("/make-server-d4766610/data/bulk-load", async (c) => {
  try {
    const { collections } = await c.req.json();
    const keys = (collections as string[])
      .filter((col) => VALID_COLLECTIONS.includes(col))
      .map(kvKey);

    if (keys.length === 0) {
      return c.json({ data: {} });
    }

    const values = await kv.mget(keys);
    const result: Record<string, any> = {};
    (collections as string[]).forEach((col: string, i: number) => {
      if (VALID_COLLECTIONS.includes(col)) {
        result[col] = values[i] ?? null;
      }
    });

    return c.json({ data: result });
  } catch (err) {
    console.log(`Error in bulk-load: ${err}`);
    return c.json({ error: `Erro ao carregar dados em lote: ${err}` }, 500);
  }
});

// POST /data/bulk-save — Save multiple collections at once
app.post("/make-server-d4766610/data/bulk-save", async (c) => {
  try {
    const { collections } = await c.req.json();
    const entries = collections as { name: string; data: any }[];
    const validEntries = entries.filter((e) =>
      VALID_COLLECTIONS.includes(e.name),
    );

    if (validEntries.length === 0) {
      return c.json({ message: "Nenhuma coleção válida para salvar" });
    }

    const keys = validEntries.map((e) => kvKey(e.name));
    const values = validEntries.map((e) => e.data);
    await kv.mset(keys, values);

    return c.json({
      message: `${validEntries.length} coleção(ões) salva(s) com sucesso`,
    });
  } catch (err) {
    console.log(`Error in bulk-save: ${err}`);
    return c.json({ error: `Erro ao salvar dados em lote: ${err}` }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// STORAGE ROUTES (File uploads via Supabase Storage)
// ════════════════════════════════════════════════════════════════════════════

// POST /storage/upload — Upload a file via multipart/form-data (binary, no base64)
// FormData fields: file (Blob), folder (string), bucketType (string)
// Returns: { path, bucketType, url }  — only path should be persisted
app.post("/make-server-d4766610/storage/upload", async (c) => {
  try {
    const user = await verifyUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);

    let formData: FormData;
    try {
      formData = await c.req.formData();
    } catch (e) {
      return c.json({ error: "Requisição inválida: esperado multipart/form-data" }, 400);
    }

    const fileEntry = formData.get("file");
    const folder    = (formData.get("folder") as string | null) ?? "";
    const bucketTypeRaw = (formData.get("bucketType") as string | null) ?? "documents";

    if (!fileEntry || !(fileEntry instanceof File)) {
      return c.json({ error: "Campo 'file' é obrigatório e deve ser um arquivo (multipart/form-data)" }, 400);
    }

    const file = fileEntry as File;
    const contentType = file.type || "application/octet-stream";

    const resolvedType: BucketType =
      bucketTypeRaw in BUCKETS ? (bucketTypeRaw as BucketType) : "documents";
    const bucket = BUCKETS[resolvedType];

    // Validate MIME type allowlist per bucket
    const ALLOWED: Record<BucketType, string[]> = {
      avatars:   ["image/jpeg","image/png","image/webp","image/gif"],
      media:     ["image/jpeg","image/png","image/webp","image/gif","image/svg+xml"],
      documents: ["application/pdf","application/msword",
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                  "image/jpeg","image/png"],
      chat:      ["image/jpeg","image/png","image/webp","application/pdf","text/plain"],
    };

    if (!ALLOWED[resolvedType].includes(contentType)) {
      return c.json({ error: `Tipo de arquivo não permitido para ${resolvedType}: ${contentType}` }, 400);
    }

    // Validate size server-side (MB limits)
    const MAX_MB: Record<BucketType, number> = {
      avatars: 2, media: 5, documents: 20, chat: 10,
    };

    // Read binary data directly from the File — NO base64, NO atob
    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > MAX_MB[resolvedType] * 1024 * 1024) {
      return c.json({ error: `Arquivo muito grande. Máximo: ${MAX_MB[resolvedType]}MB` }, 400);
    }

    // Use the sanitized file name sent by the client (already timestamped)
    const fileName = file.name || `upload_${Date.now()}`;
    const filePath = folder ? `${folder}/${fileName}` : fileName;

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.storage
      .from(bucket.name)
      .upload(filePath, bytes, { contentType, upsert: true });

    if (error) {
      console.log(`Storage upload error [${bucket.name}]: ${error.message}`);
      return c.json({ error: `Erro no upload: ${error.message}` }, 500);
    }

    const storagePath = data?.path ?? filePath;

    // Return URL: public buckets → publicUrl, private → signedUrl (1h)
    let url: string | null = null;
    if (bucket.public) {
      const { data: pub } = supabase.storage
        .from(bucket.name)
        .getPublicUrl(storagePath);
      url = pub?.publicUrl ?? null;
    } else {
      const { data: signed } = await supabase.storage
        .from(bucket.name)
        .createSignedUrl(storagePath, 3600);
      url = signed?.signedUrl ?? null;
    }

    console.log(`[Upload] Success: ${bucket.name}/${storagePath} (${bytes.byteLength} bytes)`);
    return c.json({
      path: storagePath,
      bucketType: resolvedType,
      url,
      message: "Arquivo enviado com sucesso",
    });
  } catch (err) {
    console.log(`Unexpected storage upload error: ${err}`);
    return c.json({ error: `Erro interno no upload: ${err}` }, 500);
  }
});

// GET /storage/signed-url/:bucketType/* — Get a signed URL for a private bucket file
app.get("/make-server-d4766610/storage/signed-url/:bucketType/*", async (c) => {
  try {
    const user = await verifyUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);

    const bucketType = c.req.param("bucketType") as BucketType;
    if (!(bucketType in BUCKETS)) {
      return c.json({ error: `Tipo de bucket inválido: ${bucketType}` }, 400);
    }

    const bucket = BUCKETS[bucketType];
    if (bucket.public) {
      return c.json({ error: `Bucket ${bucketType} é público. Use a URL pública diretamente.` }, 400);
    }

    const prefix = `/make-server-d4766610/storage/signed-url/${bucketType}/`;
    const filePath = c.req.path.replace(prefix, "");

    if (!filePath) return c.json({ error: "Caminho do arquivo é obrigatório" }, 400);

    const expiresIn = Number(c.req.query("expires") ?? 3600);

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.storage
      .from(bucket.name)
      .createSignedUrl(filePath, expiresIn);

    if (error) {
      return c.json({ error: `Erro ao gerar URL assinada: ${error.message}` }, 500);
    }

    return c.json({ signedUrl: data?.signedUrl });
  } catch (err) {
    console.log(`Storage signed-url error: ${err}`);
    return c.json({ error: `Erro ao gerar URL: ${err}` }, 500);
  }
});

// GET /storage/url/* — Legacy signed URL (single bucket, for backwards compat)
app.get("/make-server-d4766610/storage/url/*", async (c) => {
  try {
    const filePath = c.req.path.replace("/make-server-d4766610/storage/url/", "");
    if (!filePath) return c.json({ error: "Caminho do arquivo é obrigatório" }, 400);

    const supabase = supabaseAdmin();

    // Try documents bucket first, then legacy
    let signed = null;
    const { data, error } = await supabase.storage
      .from(BUCKETS.documents.name)
      .createSignedUrl(filePath, 3600);

    if (error) {
      // Fall back to legacy bucket
      const { data: legacyData } = await supabase.storage
        .from(LEGACY_BUCKET)
        .createSignedUrl(filePath, 3600);
      signed = legacyData?.signedUrl;
    } else {
      signed = data?.signedUrl;
    }

    return c.json({ signedUrl: signed });
  } catch (err) {
    console.log(`Storage URL error: ${err}`);
    return c.json({ error: `Erro ao gerar URL: ${err}` }, 500);
  }
});

// DELETE /storage/file/:bucketType/* — Delete a file from a specific bucket
app.delete("/make-server-d4766610/storage/file/:bucketType/*", async (c) => {
  try {
    const user = await verifyUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);

    const bucketType = c.req.param("bucketType") as BucketType;
    const prefix = `/make-server-d4766610/storage/file/${bucketType}/`;
    const filePath = c.req.path.replace(prefix, "");

    const bucket = bucketType in BUCKETS ? BUCKETS[bucketType] : null;
    const bucketName = bucket?.name ?? LEGACY_BUCKET;

    const supabase = supabaseAdmin();
    const { error } = await supabase.storage.from(bucketName).remove([filePath]);

    if (error) {
      return c.json({ error: `Erro ao remover arquivo: ${error.message}` }, 500);
    }

    return c.json({ message: "Arquivo removido com sucesso" });
  } catch (err) {
    console.log(`Storage delete error: ${err}`);
    return c.json({ error: `Erro ao remover arquivo: ${err}` }, 500);
  }
});

// DELETE /file-attachments/:id — Atomic delete: DB record + Storage file
// Body (optional): { storagePath, bucketType } — if not provided, will look up from DB
app.delete("/make-server-d4766610/file-attachments/:id", async (c) => {
  try {
    const user = await verifyUser(c.req.header("Authorization"));
    if (!user) return c.json({ error: "Não autorizado" }, 401);

    const recordId = c.req.param("id");
    if (!recordId) return c.json({ error: "ID do arquivo é obrigatório" }, 400);

    const supabase = supabaseAdmin();

    // 1. Fetch the record from DB to get storagePath and bucketType
    let storagePath: string | null = null;
    let bucketType: BucketType | null = null;

    const body = await c.req.json().catch(() => null);
    if (body?.storagePath && body?.bucketType) {
      // Fast-path: caller provided the info
      storagePath = body.storagePath;
      bucketType = body.bucketType in BUCKETS ? (body.bucketType as BucketType) : null;
    } else {
      // Slow-path: look up from DB
      const { data: record, error: fetchErr } = await supabase
        .from("file_attachments")
        .select("storage_path, bucket_type")
        .eq("id", recordId)
        .single();

      if (fetchErr) {
        console.log(`[File Delete] Record not found: ${recordId} — ${fetchErr.message}`);
        // Record may already be gone; treat as success
        return c.json({ message: "Arquivo não encontrado (já removido)", id: recordId });
      }
      storagePath = record?.storage_path ?? null;
      bucketType = (record?.bucket_type in BUCKETS ? record.bucket_type : null) as BucketType | null;
    }

    // 2. Delete physical file from Storage (non-fatal if it fails)
    if (storagePath && bucketType) {
      const bucket = BUCKETS[bucketType];
      const { error: storageErr } = await supabase.storage
        .from(bucket.name)
        .remove([storagePath]);
      if (storageErr) {
        console.log(`[File Delete] Storage removal warning for ${storagePath}: ${storageErr.message}`);
        // Continue even if storage deletion fails — DB record should still be removed
      } else {
        console.log(`[File Delete] Removed from storage: ${bucket.name}/${storagePath}`);
      }
    }

    // 3. Delete DB record
    const { error: dbErr } = await supabase
      .from("file_attachments")
      .delete()
      .eq("id", recordId);

    if (dbErr) {
      console.log(`[File Delete] DB delete error for ${recordId}: ${dbErr.message}`);
      return c.json({ error: `Erro ao remover registro: ${dbErr.message}` }, 500);
    }

    console.log(`[File Delete] Successfully deleted file attachment: ${recordId}`);
    return c.json({ message: "Arquivo removido com sucesso", id: recordId });
  } catch (err) {
    console.log(`[File Delete] Unexpected error: ${err}`);
    return c.json({ error: `Erro ao remover arquivo: ${err}` }, 500);
  }
});

// ═════════════════════════════════════════════════════════════════════════════
// CATCH-ALL 404
// ═════════════════════════════════════════════════════════════════════════════

app.all("/make-server-d4766610/*", (c) => {
  return c.json({ error: "Rota não encontrada" }, 404);
});

Deno.serve(app.fetch);