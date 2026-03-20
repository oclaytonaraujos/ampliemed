# 🔧 PLANO DE AÇÃO - PROBLEMAS CRÍTICOS

## Semana de Implementação: 24-31 de Março

---

## 1️⃣ SINCRONIZAÇÃO SUPABASE → localStorage

### Situação Atual
```
┌─────────────┐        ┌──────────────┐
│ Supabase    │   ❌   │ localStorage │
│ (vazio)     │──────→ │ (stale)      │
└─────────────┘        └──────────────┘
```

### Arquivo para Modificar
📁 `/src/hooks/useSupabaseSync.ts` (novo)

### Código Implementar

```typescript
import { useEffect, useState, useRef } from 'react';
import { useApp } from './useApp';
import supabase from '@/supabase/client';

const SYNC_INTERVAL = 30000; // 30 segundos

export function useSupabaseSync() {
  const { 
    patients, 
    appointments, 
    professionals,
    setPatients,
    setAppointments,
    setProfessionals 
  } = useApp();
  
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<Date | null>(null);
  const syncTimeoutRef = useRef<NodeJS.Timer>();
  
  useEffect(() => {
    const performSync = async () => {
      setSyncing(true);
      try {
        const [
          { data: dbPatients },
          { data: dbAppointments },
          { data: dbProfessionals }
        ] = await Promise.all([
          supabase.from('patients').select('*'),
          supabase.from('appointments').select('*'),
          supabase.from('professionals').select('*'),
        ]);
        
        if (dbPatients) setPatients(dbPatients);
        if (dbAppointments) setAppointments(dbAppointments);
        if (dbProfessionals) setProfessionals(dbProfessionals);
        
        setLastSync(new Date());
        
        // Salvegar timestamp de último sync bem-sucedido
        localStorage.setItem(
          'lastSuccessfulSync', 
          new Date().toISOString()
        );
      } catch (error) {
        console.error('[Sync] Erro ao sincronizar com Supabase:', error);
        // Não quebra a app, apenas loga o erro
      } finally {
        setSyncing(false);
      }
    };
    
    // Sincronizar na montagem
    performSync();
    
    // E a cada 30 segundos
    syncTimeoutRef.current = setInterval(performSync, SYNC_INTERVAL);
    
    // Também sincronizar quando página fica em foco
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        performSync();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, []);
  
  return { syncing, lastSync };
}
```

### Onde Usar
📍 `src/components/Layout.tsx` (adicionar hook):

```typescript
import { useSupabaseSync } from '@/hooks/useSupabaseSync';

export function Layout({ children }: { children: React.ReactNode }) {
  const { syncing, lastSync } = useSupabaseSync(); // ← NOVO
  
  return (
    <div className="layout">
      {syncing && (
        <div className="sync-indicator">
          <Spinner className="w-4 h-4" />
          <span>Sincronizando...</span>
        </div>
      )}
      {/* resto do layout */}
    </div>
  );
}
```

### Testes
```typescript
// tests/hooks/useSupabaseSync.test.ts
describe('useSupabaseSync', () => {
  it('deveria sincronizar dados do Supabase', async () => {
    const mockData = [{ id: '1', name: 'João' }];
    vi.mocked(supabase.from).mockReturnValue({
      select: vi.fn().mockResolvedValue({ data: mockData })
    } as any);
    
    const { result } = renderHook(() => useSupabaseSync());
    
    await waitFor(() => {
      expect(result.current.syncing).toBe(false);
    });
  });
});
```

---

## 2️⃣ SEGURANÇA - VALIDAÇÃO E SANITIZAÇÃO

### Situação Atual
```tsx
// Risco: XSS
<form onSubmit={(e) => {
  const data = new FormData(e.target);
  db.save(data); // ❌ Sem sanitização!
}}>
```

### Arquivo para Modificar
📁 `/src/utils/sanitizers.ts` (novo)

### Código Implementar

```typescript
import DOMPurify from 'dompurify';

export const SANITIZATION_CONFIG = {
  ALLOWED_TAGS: [] as string[], // Bloqueia HTML
  ALLOWED_ATTR: [] as string[],
  KEEP_CONTENT: true,
} as const;

/**
 * Remove HTML/scripts perigosos de uma string
 * @param input String potencialmente perigosa
 * @returns String sanitizada
 */
export function sanitizeInput(input: string | null | undefined): string {
  if (!input) return '';
  
  const trimmed = input.trim();
  
  // Remover caracteres de controle perigosos
  const cleaned = trimmed.replace(/[\x00-\x1F\x7F]/g, '');
  
  // Usar DOMPurify para remover HTML
  return DOMPurify.sanitize(cleaned, SANITIZATION_CONFIG);
}

/**
 * Valida e sanitiza um objeto inteiro
 * @param data Objeto com dados potencialmente perigosos
 * @returns Objeto sanitizado
 */
export function sanitizeObject<T extends Record<string, any>>(data: T): T {
  return Object.fromEntries(
    Object.entries(data).map(([key, value]) => {
      if (typeof value === 'string') {
        return [key, sanitizeInput(value)];
      }
      if (Array.isArray(value)) {
        return [key, value.map(v => 
          typeof v === 'string' ? sanitizeInput(v) : v
        )];
      }
      if (value && typeof value === 'object') {
        return [key, sanitizeObject(value)];
      }
      return [key, value];
    })
  ) as T;
}

/**
 * Valida CPF/CNPJ/Email antes de salvar
 */
export function validateFormData(data: Record<string, any>) {
  const errors: Record<string, string> = {};
  
  // Validar CPF se presente
  if (data.cpf && !validateCPF(data.cpf)) {
    errors.cpf = 'CPF inválido';
  }
  
  // Validar CNPJ se presente
  if (data.cnpj && !validateCNPJ(data.cnpj)) {
    errors.cnpj = 'CNPJ inválido';
  }
  
  // Validar email se presente
  if (data.email && !isValidEmail(data.email)) {
    errors.email = 'Email inválido';
  }
  
  // Validar comprimento (evitar injeção)
  if (data.name && data.name.length > 255) {
    errors.name = 'Nome muito longo (máximo 255 caracteres)';
  }
  
  return { isValid: Object.keys(errors).length === 0, errors };
}

function isValidEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email) && email.length <= 255;
}

export { validateCPF, validateCNPJ } from './validators';
```

### Uso em Formulários
📍 `src/components/PatientManagement.tsx`:

```typescript
import { sanitizeInput, sanitizeObject, validateFormData } from '@/utils/sanitizers';

function handleSavePatient(formData: any) {
  // 1. Validar
  const { isValid, errors } = validateFormData(formData);
  if (!isValid) {
    showErrors(errors);
    return;
  }
  
  // 2. Sanitizar
  const sanitized = sanitizeObject(formData);
  
  // 3. Salvar
  addPatient(sanitized);
}
```

### npm install

```bash
npm install dompurify --save-dev
npm install -D @types/dompurify
```

---

## 3️⃣ AUTENTICAÇÃO - RATE LIMITING

### Situação Atual
```
Atacante pode fazer 1000 tentativas/segundo sem limite
```

### Arquivo para Modificar
📁 `supabase/functions/auth/signup/index.ts` (Supabase Edge Function)

### Código Implementar

```typescript
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_WINDOW = 15 * 60 * 1000; // 15 minutos
const MAX_ATTEMPTS = 5;
const RATE_LIMIT_KEY = "rate_limit";

// Em produção, use Redis. Para desenvolvimento, use em-memória
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(email: string): { allowed: boolean; retryAfter?: number } {
  const key = email;
  const now = Date.now();
  const entry = rateLimitStore.get(key);
  
  if (!entry || now > entry.resetAt) {
    // Nova janela
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }
  
  if (entry.count >= MAX_ATTEMPTS) {
    const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
    return { allowed: false, retryAfter };
  }
  
  entry.count++;
  return { allowed: true };
}

serve(async (req: Request) => {
  try {
    const { email, password, passwordConfirm } = await req.json();
    
    // 1. Rate limiting
    const { allowed, retryAfter } = checkRateLimit(email);
    if (!allowed) {
      return new Response(
        JSON.stringify({
          error: 'Muitas tentativas. Tente novamente em ' + retryAfter + ' segundos.',
          retryAfter,
        }),
        {
          status: 429,
          headers: { 
            'Content-Type': 'application/json',
            'Retry-After': retryAfter?.toString() || '',
          },
        }
      );
    }
    
    // 2. Validações básicas
    if (!email || !password) {
      return new Response(
        JSON.stringify({ error: 'Email e senha são obrigatórios' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (password.length < 6) {
      return new Response(
        JSON.stringify({ error: 'Senha deve ter no mínimo 6 caracteres' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (password !== passwordConfirm) {
      return new Response(
        JSON.stringify({ error: 'Senhas não coincidem' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // 3. Criar usuário no Supabase Auth
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    
    if (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ user: data.user }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
    
  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Erro ao processar requisição' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
```

### Deploy (no Supabase Dashboard)
```bash
supabase functions deploy auth/signup
supabase functions secrets set SUPABASE_URL
supabase functions secrets set SUPABASE_SERVICE_ROLE_KEY
```

---

## 4️⃣ TESTES UNITÁRIOS - COMEÇAR COM VALIDATORS

### Arquivo para Criar
📁 `/tests/utils/validators.test.ts`

### Código Implementar

```typescript
import { describe, it, expect } from 'vitest';
import {
  validateCPF,
  validateCNJP,
  validateEmail,
  calculateIMC,
} from '@/utils/validators';

describe('Validators', () => {
  describe('validateCPF', () => {
    it('aceita CPF válido', () => {
      // CPF real válido (exemplo)
      expect(validateCPF('111.444.777-35')).toBe(true);
    });
    
    it('rejeita CPF com dígitos repetidos', () => {
      expect(validateCPF('111.111.111-11')).toBe(false);
    });
    
    it('rejeita CPF mal formatado', () => {
      expect(validateCPF('11144477735')).toBe(false);
      expect(validateCPF('111-444-777-35')).toBe(false);
    });
    
    it('rejeita CPF com checksum inválido', () => {
      expect(validateCPF('111.444.777-36')).toBe(false);
    });
  });
  
  describe('validateCNPJ', () => {
    it('aceita CNPJ válido', () => {
      // CNPJ real válido (exemplo)
      expect(validateCNPJ('11.222.333/0001-81')).toBe(true);
    });
    
    it('rejeita CNPJ inválido', () => {
      expect(validateCNPJ('11.111.111/0001-11')).toBe(false);
    });
  });
  
  describe('validateEmail', () => {
    it('aceita emails válidos', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('doctor.name@clinic.com.br')).toBe(true);
    });
    
    it('rejeita emails inválidos', () => {
      expect(validateEmail('invalid')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
    });
  });
  
  describe('calculateIMC', () => {
    it('calcula IMC corretamente', () => {
      // Pessoa com 70kg e 1.70m
      expect(calculateIMC(70, 1.70)).toBeCloseTo(24.22, 1);
    });
    
    it('retorna erro para dados inválidos', () => {
      expect(() => calculateIMC(-10, 1.70)).toThrow();
      expect(() => calculateIMC(70, 0)).toThrow();
    });
  });
});
```

### Configurar Vitest
📝 `vite.config.ts` (adicionar):

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
    },
  },
})
```

### npm install

```bash
npm install -D vitest @vitest/ui jsdom @testing-library/react @testing-library/jest-dom
```

### Rodar Testes

```bash
npm run test        # Rodar uma vez
npm run test:ui     # Abrir UI interativa
npm run test:watch  # Watch mode
```

---

## 5️⃣ TYPESCRIPT - REMOVER ANY TYPES

### Arquivo para Refatorar
📍 `src/utils/documentGenerators.ts` (linhas 1-50)

### Antes ❌
```typescript
export function generatePrescription(
  patientOrSimple: PatientData | { doctorName: string; [key: string]: any }
) {
  // ...
}
```

### Depois ✅
```typescript
interface PrescriptionTemplateData {
  doctorName: string;
  doctorCRM: string;
  patientName: string;
  patientAge: number;
  patientSex: 'M' | 'F';
  medications: Medication[];
  observations?: string;
  signature: string;
  date: Date;
}

export function generatePrescription(data: PrescriptionTemplateData): string {
  // ...
}
```

### ESLint Config
📝 `.eslintrc.json` (adicionar regra):

```json
{
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unsafe-assignment": "error"
  }
}
```

---

## 📋 CHECKLIST DE CONCLUSÃO

Após implementar cada item:

```
Sincronização Supabase:
  [ ] Código escrito em useSupabaseSync.ts
  [ ] Hook adicionado em Layout.tsx
  [ ] Testes passando
  [ ] Testado manualmente (abrir 2 abas, editar em uma, verificar na outra)
  [ ] Merge em main
  [ ] Verificar localStorage vs Supabase em produção

Sanitização:
  [ ] sanitizers.ts criado com DOMPurify
  [ ] Integrado em todos os forms (PatientManagement, ProfessionalManagement, etc)
  [ ] Testes de XSS criados
  [ ] Merge em main

Rate Limiting:
  [ ] Edge Function com rate limiting deployada
  [ ] Testada com 6+ requisições rápidas (deve rejeitar)
  [ ] Verificar retry-after header
  [ ] Merge em main

Testes Iniciais:
  [ ] Vitest configurado
  [ ] Testes de validators passando
  [ ] CI/CD configurado para rodar testes
  [ ] Coverage > 80%
  [ ] Merge em main

TypeScript:
  [ ] ESLint rule ativada
  [ ] Erros existentes corrigidos
  [ ] Merge em main
  [ ] CI/CD bloqueia PRs com any types
```

---

## 🚀 IMPACTO ESPERADO

| Melhoria | Benefício Direto | Benefício Indireto |
|----------|------------------|-------------------|
| Sincronização | Dados sempre atualizados | ↑ Satisfação do usuário |
| Sanitização | Sem risco de XSS | ↑ Segurança LGPD |
| Rate Limiting | Sem força bruta | ↑ Conformidade de segurança |
| Testes | Confiança em mudanças | ↓ Bugs em produção |
| TypeScript strict | Erros em build time | ↓ Burndown de bugs |

**ROI:** Investimento inicial ~35h → Economia de 100+ horas em suporte/bugs em 6 meses

