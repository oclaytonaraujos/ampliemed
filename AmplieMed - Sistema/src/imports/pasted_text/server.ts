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
const BUCKET_NAME = "make-d4766610-medical-files";

async function ensureBucket() {
  try {
    const supabase = supabaseAdmin();
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(
      (bucket: any) => bucket.name === BUCKET_NAME,
    );
    if (!bucketExists) {
      await supabase.storage.createBucket(BUCKET_NAME, { public: false });
      console.log(`Bucket ${BUCKET_NAME} created successfully`);
    }
  } catch (err) {
    console.log(`Error ensuring bucket: ${err}`);
  }
}

// Run bucket setup on startup
ensureBucket();

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

// ═════════════════════════════════════════════════════════════════════════════
// AUTH ROUTES
// ═════════════════════════════════════════════════════════════════════════════

// POST /auth/signup — Create a new user with Supabase Auth
app.post("/make-server-d4766610/auth/signup", async (c) => {
  try {
    const { email, password, name, role, specialty, crm, phone } =
      await c.req.json();

    if (!email || !password) {
      return c.json({ error: "Email e senha são obrigatórios" }, 400);
    }

    // Validate role against the user_role enum in the database
    const VALID_ROLES = ["admin", "doctor", "receptionist", "financial"];
    const sanitizedRole = VALID_ROLES.includes(role) ? role : "doctor";

    // Sanitize all metadata fields to ensure they are strings (never undefined/null)
    const nameStr = name || email.split("@")[0];
    const userMetadata = {
      name: nameStr,
      full_name: nameStr,
      role: sanitizedRole,
      specialty: specialty || "",
      crm: crm || "",
      crm_uf: "",
      phone: phone || "",
      status: "active",
      initials: nameStr.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase(),
    };

    console.log(
      `✨ [Signup] Starting registration for ${email} with role=${sanitizedRole}`,
    );

    const supabase = supabaseAdmin();

    // Check if user already exists
    const { data: existingUsers } = await supabase.auth.admin.listUsers();
    const userExists = existingUsers?.users?.some(
      (u: any) => u.email === email,
    );
    if (userExists) {
      console.log(`⚠️ [Signup] User already exists: ${email}`);
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
        role: sanitizedRole,
        specialty: specialty || '',
        crm: crm || '',
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
      return c.json(
        { error: `Erro ao atualizar perfil: ${error.message}` },
        400,
      );
    }

    return c.json({ message: "Perfil atualizado com sucesso" });
  } catch (err) {
    console.log(`Profile update error: ${err}`);
    return c.json({ error: `Erro ao atualizar perfil: ${err}` }, 500);
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
// ═════════════════════════════════════════════════════════════════════════════

// POST /storage/upload — Upload a file (base64)
app.post("/make-server-d4766610/storage/upload", async (c) => {
  try {
    const { fileName, fileData, contentType, folder } = await c.req.json();

    if (!fileName || !fileData) {
      return c.json(
        { error: "fileName e fileData são obrigatórios" },
        400,
      );
    }

    const supabase = supabaseAdmin();
    await ensureBucket();

    // Decode base64 to Uint8Array
    const binaryStr = atob(fileData);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const filePath = folder ? `${folder}/${fileName}` : fileName;
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, bytes, {
        contentType: contentType || "application/octet-stream",
        upsert: true,
      });

    if (error) {
      console.log(`Storage upload error: ${error.message}`);
      return c.json(
        { error: `Erro no upload: ${error.message}` },
        500,
      );
    }

    // Generate signed URL (valid for 1 hour)
    const { data: urlData } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);

    return c.json({
      path: data?.path,
      signedUrl: urlData?.signedUrl,
      message: "Arquivo enviado com sucesso",
    });
  } catch (err) {
    console.log(`Unexpected storage upload error: ${err}`);
    return c.json({ error: `Erro interno no upload: ${err}` }, 500);
  }
});

// GET /storage/url/:path — Get a signed URL for a file
app.get("/make-server-d4766610/storage/url/*", async (c) => {
  try {
    const filePath = c.req.path.replace(
      "/make-server-d4766610/storage/url/",
      "",
    );

    if (!filePath) {
      return c.json({ error: "Caminho do arquivo é obrigatório" }, 400);
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.storage
      .from(BUCKET_NAME)
      .createSignedUrl(filePath, 3600);

    if (error) {
      return c.json(
        { error: `Erro ao gerar URL: ${error.message}` },
        500,
      );
    }

    return c.json({ signedUrl: data?.signedUrl });
  } catch (err) {
    console.log(`Storage URL error: ${err}`);
    return c.json({ error: `Erro ao gerar URL: ${err}` }, 500);
  }
});

// DELETE /storage/file/:path — Delete a file
app.delete("/make-server-d4766610/storage/file/*", async (c) => {
  try {
    const filePath = c.req.path.replace(
      "/make-server-d4766610/storage/file/",
      "",
    );

    const supabase = supabaseAdmin();
    const { error } = await supabase.storage
      .from(BUCKET_NAME)
      .remove([filePath]);

    if (error) {
      return c.json(
        { error: `Erro ao remover arquivo: ${error.message}` },
        500,
      );
    }

    return c.json({ message: "Arquivo removido com sucesso" });
  } catch (err) {
    console.log(`Storage delete error: ${err}`);
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