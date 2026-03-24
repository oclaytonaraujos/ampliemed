## 🔄 Clinic-First: Fluxos Visuais

---

## 1️⃣ Clinic Signup Flow

```
┌─────────────────────────────────────────────────────────────┐
│  PUBLIC: User accesses /registrar-clinica                  │
└──────────────────────┬──────────────────────────────────────┘
                       │
        ┌──────────────┴──────────────┐
        │   ClinicSignup Component    │
        └──────────────┬──────────────┘
                       │
          ╔════════════╝═══════════════╗
          ║    4-Step Wizard Form      ║
          ╚════════════╤═══════════════╝
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───┴────┐  ┌─────────┴──────┐  ┌─────────┴─────┐
│Step 1  │  │  Step 2: Pwd  │  │ Step 3: Addr │
│Clinic  │  │  ↓ validate  │  │  ↓ format   │
│Info    │  │  ✓ 8+ chars  │  │  ✓ CEP     │
└───┬────┘  └────────────┬──┘  └──────┬──────┘
    │✓                   │            │✓
    └───────────────┬────┴────────────┘
                    │
          ┌─────────┴─────────┐
          │    Step 4: Terms  │
          │  ✓ LGPD consent   │
          │  ✓ ToS accept     │
          └────────┬──────────┘
                   │
        ┌──────────┴─────────────┐
        │  api.clinicSignup()    │
        └──────────┬─────────────┘
                   │
        ┌──────────▼────────────────────┐
        │ Edge Function:                 │
        │ POST /auth/clinic-signup       │
        └──────────┬────────────────────┘
                   │
    ┌──────────────┼──────────────┐
    │              │              │
┌───┴──────┐  ┌───┴────┐  ┌──────┴──────┐
│ Validate │  │  Auth  │  │  Database  │
│ CNPJ     │  │  User  │  │  Records   │
│ Email    │  │ CREATE │  │ clinic     │
│ Password │  └───┬────┘  │ membership │
└──────────┘      │       └──────┬──────┘
                  │              │
         ┌────────┴──────────────┘
         │
    ┌────┴──────────────────────────┐
    │ Response:                      │
    │ ✓ clinic { id, name, ... }    │
    │ ✓ admin { id, email }         │
    │ ✓ inviteLink                  │
    └────┬──────────────────────────┘
         │
         ▼
    onSignupSuccess()
         │
    ┌────┴─────────────┐
    │ Auto-login admin │
    │ Redirect to:     │
    │ /dashboard or    │
    │ /invite-flow     │
    └──────────────────┘
```

---

## 2️⃣ Generate Professional Invite

```
┌────────────────────────────────────────┐
│  Clinic Admin Dashboard                │
│  "Adicionar Profissional" button       │
└────────────┬─────────────────────────┘
             │
        ┌────▼────────────────┐
        │ Modal: Invite Form  │
        │ [Email input field] │
        │ [Role dropdown]     │
        │ [Send button]       │
        └────┬────────────────┘
             │
   ┌─────────┴─────────────┐
   │ api.generateInvite()  │
   └─────────┬─────────────┘
             │
   ┌─────────▼──────────────────────┐
   │ Edge Function:                  │
   │ POST /clinic/[clinicId]/invite │
   └─────────┬──────────────────────┘
             │
   ┌─────────┼──────────────────────┐
   │         │                      │
┌──┴──┐  ┌──┴──────┐  ┌────────┬───┴───┐
│Verify│ │Generate │  │  Create     │Log
│Admin │ │ Token   │  │  Record    │Audit
│Role  │ │ (uuid)  │  │  in DB     │
└──┬───┘  └──┬──┬───┘  └──────┬──────┘
   │         │ │              │
   └────┬────┴─┴──────────────┘
        │
   ┌────▼────────────────────────┐
   │ Response:                    │
   │ ✓ token: abc123xyz...       │
   │ ✓ inviteLink: (URL)         │
   │ ✓ expiresAt: +48h           │
   └────┬────────────────────────┘
        │
   ┌────▼──────────────────────┐
   │ Admin:                     │
   │ • Copy link / Send email   │
   │ • Professional receives    │
   │   https://...?token=abc... │
   └────────────────────────────┘
```

---

## 3️⃣ Professional Accepts Invite

```
┌───────────────────────────────────────────┐
│  PUBLIC: Professional opens email link    │
│  /register?token=abc123xyz...             │
└────────────┬────────────────────────────┘
             │
   ┌─────────▼──────────────────────────┐
   │ (To be created):                   │
   │ ProfessionalInviteAccept Component │
   └─────────┬──────────────────────────┘
             │
   ┌─────────┼──────────────────────────────┐
   │         │                              │
┌──┴──────────┴──────┐  ┌──────────────────┴─┐
│ Pre-filled fields: │  │ User enters:       │
│ • Email (from DB)  │  │ • Password (new) │
│ • Clinic name      │  │ • Confirm Pwd    │
│ • Role (from token)│  │ • Name (optional)│
└──────────┬─────────┘  └──────────┬────────┘
           │                       │
           └───────────┬───────────┘
                       │
           ┌───────────▼────────────────────┐
           │ Validate:                      │
           │ ✓ Token valid (format)         │
           │ ✓ Password strong              │
           │ ✓ Passwords match              │
           └───────────┬────────────────────┘
                       │
           ┌───────────▼──────────────────────┐
           │ api.acceptClinicInvite()         │
           └───────────┬──────────────────────┘
                       │
           ┌───────────▼──────────────────────────┐
           │ Edge Function:                       │
           │ POST /auth/accept-clinic-invite      │
           └───────────┬──────────────────────────┘
                       │
    ┌──────────────────┼──────────────────┐
    │                  │                  │
┌───┴───────┐  ┌──────┴─────┐  ┌────────┴─────┐
│ Validate  │  │   Create   │  │   Create     │
│ Token:    │  │   Auth     │  │   Membership │
│ • Exists  │  │   User     │  │   Record     │
│ • Not exp │  │   in Auth  │  │   clinic_id  │
│ • Not used│  └────┬───────┘  └───────┬──────┘
└──────────┘       │                  │
                   └────┬─────────────┘
                        │
                ┌───────▼──────────────┐
                │ Mark token as used   │
                │ used_at = NOW()      │
                │ used_by = user.id    │
                └───────┬──────────────┘
                        │
                ┌───────▼──────────────┐
                │ Log audit record     │
                │ action: 'create'     │
                │ module: 'Sistema'    │
                └───────┬──────────────┘
                        │
                ┌───────▼──────────────────────┐
                │ Response:                    │
                │ ✓ clinic { id, name }       │
                │ ✓ user { id, email }        │
                │ ✓ message                   │
                └───────┬──────────────────────┘
                        │
                        ▼
            ┌───────────────────────┐
            │ Auto-login user       │
            │ Redirect to /dashboard│
            │ (clinic context set)  │
            └───────────────────────┘
```

---

## 4️⃣ Data Access Flow (with RLS)

```
┌──────────────────────────────────┐
│  User logs in (any clinic)       │
└──────────────┬───────────────────┘
               │
       ┌───────▼──────────┐
       │ setCurrentUser() │
       │ clinic_id = X    │
       └───────┬──────────┘
               │
    ┌──────────┴──────────┐
    │                     │
    │  Query: SELECT patients
    │  WHERE clinic_id = $clinic_id
    │
    ▼
┌────────────────────────────────────┐
│ Supabase Client executes query     │
│                                    │
│ RLS Policy checks:                 │
│ 1. user is authenticated?          │
│ 2. clinic_id in clinic_memberships?│
│ 3. membership.active = true?       │
│                                    │
│ If ✓: rows returned                │
│ If ✗: empty result set             │
└────────────────────────────────────┘
    │
    ▼
┌────────────────────────────────────┐
│ User A (clinic 1)                  │
│ ✓ Can see patients in clinic 1     │
│ ✗ Cannot see patients in clinic 2  │
│                                    │
│ User B (clinic 2)                  │
│ ✓ Can see patients in clinic 2     │
│ ✗ Cannot see patients in clinic 1  │
│                                    │
│ User C (both clinics)              │
│ ✓ Can see patients in clinic 1 & 2 │
│ (has memberships in both)          │
└────────────────────────────────────┘
```

---

## 5️⃣ Role-Based Access (clinic_memberships)

```
┌──────────────────────────────────────────────────┐
│         Clinic: "Clínica São Paulo"              │
└──────────────────────────────────────────────────┘
    │
    ├─ User A (role: admin)
    │  ├─ ✓ View patients
    │  ├─ ✓ View appointments
    │  ├─ ✓ Generate invites
    │  ├─ ✓ Manage members
    │  ├─ ✓ View financials
    │  └─ ✓ View audit logs
    │
    ├─ User B (role: doctor)
    │  ├─ ✓ View patients
    │  ├─ ✓ Create appointments
    │  ├─ ✓ View own records
    │  ├─ ✗ Manage members
    │  ├─ ✗ View financials
    │  └─ ✗ View audit logs
    │
    ├─ User C (role: receptionist)
    │  ├─ ✓ View patients
    │  ├─ ✓ Create appointments
    │  ├─ ✓ Check queue
    │  ├─ ✗ Create records
    │  ├─ ✗ Manage members
    │  └─ ✗ View financials
    │
    └─ User D (role: financial)
       ├─ ✓ View financials
       ├─ ✓ Create billing
       ├─ ✓ View payments
       ├─ ✗ Create appointments
       ├─ ✗ Create records
       └─ ✗ Manage members
```

---

## 6️⃣ Token Lifecycle

```
Timeline: Invite Token

Day 0 (Mon 18:00)
└─ A. Admin creates invite
   ├─ api.generateClinicInvite()
   ├─ token = uuid()
   ├─ created_at = NOW()
   ├─ expires_at = NOW() + 48h
   ├─ used_at = NULL
   └─ Status: VALID

Day 0 (Mon 18:05)
└─ B. Email sent to professional
   └─ Status: VALID (awaiting acceptance)

Day 1 (Tue 10:00)
├─ C. Professional clicks link
│  └─ Status: VALID
│
└─ D. Professional fills form
   └─ Status: VALID (still)

Day 1 (Tue 10:05)
└─ E. Professional submits
   ├─ api.acceptClinicInvite(token, data)
   ├─ Token validated (not expired, not used)
   ├─ User created
   ├─ Membership created
   ├─ used_at = NOW()
   ├─ used_by = user.id
   └─ Status: USED ✓

Day 3 (Thu 18:00)
└─ F. Token expires (even though used)
   ├─ Query: WHERE expires_at > NOW()
   │  └─ Token no longer returned
   │
   └─ Status: EXPIRED ✗
      (but user already created, so OK)

Possible Scenarios:
┌─────────────────────────────────────┐
│ if (used_at IS NOT NULL)            │ ← Already used
│   return ERROR: "Token used"        │
│                                     │
│ if (expires_at < NOW())             │ ← Expired
│   return ERROR: "Token expired"     │
│                                     │
│ else                                │ ← Valid
│   return OK: accept invite          │
└─────────────────────────────────────┘
```

---

## 7️⃣ Database Isolation Example

```
┌─────────────────────────────────────────────────────────┐
│            Supabase Database (public schema)            │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  clinics table                                          │
│  ┌────────────────────────────────┐                    │
│  │ id   │ name      │ owner_id     │                   │
│  ├──────┼───────────┼──────────────┤                    │
│  │ AAA  │ Clínica 1 │ user-A       │                   │
│  │ BBB  │ Clínica 2 │ user-B       │                   │
│  └────────────────────────────────┘                    │
│                                                         │
│  clinic_memberships table                              │
│  ┌──────────────────────────────────────┐              │
│  │ id  │ clinic_id │ user_id  │ role   │              │
│  ├─────┼───────────┼──────────┼────────┤              │
│  │ M1  │ AAA       │ user-A   │ admin  │ ← Owner      │
│  │ M2  │ AAA       │ user-C   │ doctor │ ← Member     │
│  │ M3  │ BBB       │ user-B   │ admin  │ ← Owner      │
│  │ M4  │ BBB       │ user-C   │ doctor │ ← Member     │
│  └──────────────────────────────────────┘              │
│                                                         │
│  patients table (with clinic_id)                       │
│  ┌──────────────────────────────────────┐              │
│  │ id  │ clinic_id │ name    │ ...      │              │
│  ├─────┼───────────┼─────────┼──────────┤              │
│  │ P1  │ AAA       │ João    │ ...      │              │
│  │ P2  │ AAA       │ Maria   │ ...      │              │
│  │ P3  │ BBB       │ Pedro   │ ...      │              │
│  │ P4  │ BBB       │ Ana     │ ...      │              │
│  └──────────────────────────────────────┘              │
│                                                         │
└─────────────────────────────────────────────────────────┘

Query Examples:
═════════════

User A logged in:
  SELECT * FROM patients
  WHERE clinic_id IN (
    SELECT clinic_id FROM clinic_memberships
    WHERE user_id = 'user-A' AND active = true
  )
  Result: P1, P2 (só da clínica AAA) ✓

User C logged in (multi-clinic):
  SELECT * FROM patients
  WHERE clinic_id IN (
    SELECT clinic_id FROM clinic_memberships  
    WHERE user_id = 'user-C' AND active = true
  )
  Result: P1, P2, P3, P4 (ambas clínicas) ✓

Hacker tries direct query as user-A:
  SELECT * FROM patients WHERE clinic_id = 'BBB'
  RLS Policy blocks:
  ✗ BBB NOT IN user-A's clinic_memberships
  Result: Empty set (denied) ✓
```

---

## ✅ Summary

| Fluxo | Passos | Tempo | Status |
|-------|--------|-------|--------|
| Clinic Signup | 4 | 5 min | ✅ UI Pronto |
| Generate Invite | 2 | 1 min | ✅ UI Ready |
| Accept Invite | 3 | 3 min | ✅ API Ready |
| Data Access (RLS) | Auto | ⚡ Real-time | ✅ Schema Ready |

**Próximo**: Implementar Edge Functions seguindo `CLINIC_FIRST_INTEGRATION_GUIDE.md`
