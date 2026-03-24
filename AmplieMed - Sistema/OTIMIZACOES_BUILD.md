# Plano de Otimização - Build & Performance

## Status: Build ✅ Completo | ⚠️ Otimizações Necessárias

---

## 🚨 Problemas Identificados

### 1. Sentry Replay Export Error
**Localização**: `src/App.tsx` line 16  
**Erro**: `"Replay" is not exported by "@sentry/react/build/esm/index.js"`  
**Impacto**: Low - warning only, application builds successfully

**Solução**:
```typescript
// ❌ Atual (src/App.tsx line 16)
import { Replay } from '@sentry/react';

// ✅ Correto
import Sentry from '@sentry/react';
// Use: Sentry.Replay()
```

---

### 2. Bundle Chunks Grandes (>500KB)
**Aviso**: Vite detectou chunks acima do limite

| Chunk | Tamanho | gzip | Status |
|-------|---------|------|--------|
| patient-module | 599.76 KB | 169.17 KB | ⚠️ Muito grande |
| index (main) | 987.87 KB | 243.85 KB | ⚠️ Muito grande |
| schedule-module | 74.72 KB | 14.80 KB | ✅ OK |
| financial-module | 65.42 KB | 9.41 KB | ✅ OK |
| medical-core | 26.63 KB | 6.96 KB | ✅ OK |

**Causa**: patient-module tem múltiplos componentes pesados  
**Impacto**: Slow initial load em conexões lentas

---

## 📋 Ações de Otimização

### Ação 1: Corrigir Sentry Replay (15 minutos)

**Passos**:
1. Abrir `src/App.tsx`
2. Remover importação de `Replay`
3. Usar Sentry.Replay() diretamente

**Resultado esperado**: Sem warnings no build

---

### Ação 2: Fragmentar patient-module (30-45 minutos)

**Problema**: 599KB é muito para um único chunk  
**Estratégia**: Separar em patient-cards + patient-list + patient-forms

**Opção A: Rotas lazy loading** (Recomendado)
```typescript
// src/routes.tsx
const PatientManagement = lazy(() => import('./components/PatientManagement'));
const PatientDetailView = lazy(() => 
  import('./components/PatientDetailView')
);
```

**Opção B: Manual chunks adicionais** (vite.config.ts)
```typescript
manualChunks: {
  'patient-management': ['src/components/PatientManagement.tsx'],
  'patient-detail': ['src/components/PatientDetailView.tsx'],
  'patient-cards': ['src/components/PatientCard.tsx'],
}
```

---

### Ação 3: Reduzir Main Bundle (45-60 minutos)

**Problema**: index.js (987KB) contém tudo importado no App.tsx  
**Estratégia**: Lazy load contextos e providers

**Identificar imports pesados**:
```bash
# Analizar imports em src/App.tsx
du -sh node_modules/@sentry/react  # Sentry weight
du -sh node_modules/react-helmet-async  # Helmet weight
du -sh node_modules/dompurify  # DOMPurify weight
```

**Lazy load Sentry**:
```typescript
const SentryWrapper = lazy(() => import('./utils/sentrySetup'));
```

---

## ✅ Métrica-Alvo após Otimizações

| Métrica | Antes | Alvo | Prioridade |
|---------|-------|------|-----------|
| Chunk maior | 987KB | <500KB | 🔴 Critical |
| Gzip main | 243KB | <150KB | 🔴 Critical |
| Total JS | ~1.8MB | <1.0MB | 🟠 High |
| Chunks > 500KB | 2 | 0 | 🔴 Critical |

---

## 🔍 Análise de Tamanho (Próximas Ações)

### Instalar source-map-explorer (Recomendado)
```bash
npm install --save-dev source-map-explorer
npm run build
npx source-map-explorer 'build/assets/*.js'
```

**Isso revelará**:
- Quais bibliotecas ocupam mais espaço
- Quais componentes são maiores
- Oportunidades de tree-shaking

---

## 📊 Checklist de Otimização

- [ ] Corrigir Sentry Replay import
- [ ] Executar `source-map-explorer` para análise detalhada
- [ ] Implementar lazy loading de rotas (Dashboard → PatientManagement)
- [ ] Separar patient-module em sub-chunks
- [ ] Validar gzip size < 150KB para main bundle
- [ ] Re-build e medir novo tamanho
- [ ] Testar performance em conexão 3G
- [ ] Documentar changes em IMPLEMENTACAO_MELHORIAS.md

---

## ⚡ Quick Start para Próximas Melhorias

**Se usar Lazy Loading** (Recomendado):
```typescript
// src/routes.tsx
import { Suspense, lazy } from 'react';

const PatientManagement = lazy(() => 
  import('./components/PatientManagement')
);

// Em Route definitions:
{
  element: (
    <Suspense fallback={<LoadingSpinner />}>
      <PatientManagement />
    </Suspense>
  )
}
```

**Se usar Manual Chunks** (Alternativa):
```typescript
// vite.config.ts
manualChunks: {
  'patient-management': ['src/components/PatientManagement.tsx'],
  'schedule-views': ['src/components/ScheduleManagementWithPayment.tsx'],
  'financial-tools': ['src/components/FinancialModule.tsx'],
}
```

---

## 📌 Status Atual

✅ **Build**: Funciona corretamente  
✅ **Code Splitting**: Configurado com 5 chunks  
⚠️ **Performance**: Chunks grandes identificados  
⚠️ **Warnings**: Sentry Replay precisa correção  

**Próximo passo**: Escolher entre Lazy Loading ou Manual Chunks e implementar
