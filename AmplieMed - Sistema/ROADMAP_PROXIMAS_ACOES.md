# 🎯 Next Steps - AmplieMed v2.0

**Current Status**: ✅ 67% Complete | Ready for Production (with optimizations)

---

## 🚀 Immediate Actions (Next 1-2 Hours)

### 1️⃣ Validate Bundle Performance
```bash
# Analyze current bundle composition
npx source-map-explorer 'build/assets/*.js'

# This will show:
# - Which dependencies are largest
# - Which components take most space
# - Opportunities to tree-shake
```

**Expected Output**: Identify patient-module (599KB) as top consumer

---

### 2️⃣ Implement Lazy Loading for Routes
```typescript
// src/routes.tsx - Example

import { Suspense, lazy } from 'react';
import LoadingSpinner from './components/EmptyState';

// Lazy load heavy components
const PatientManagement = lazy(() => 
  import('./components/PatientManagement')
);
const ScheduleManagement = lazy(() => 
  import('./components/ScheduleManagementWithPayment')
);
const FinancialModule = lazy(() => 
  import('./components/FinancialModule')
);

// In route definitions:
{
  path: '/patients',
  element: (
    <Suspense fallback={<LoadingSpinner />}>
      <PatientManagement />
    </Suspense>
  ),
}
```

**Expected Result**: patient-module chunk loads only when route accessed

---

### 3️⃣ Apply React.memo to List Components
```typescript
// Example: src/components/PatientCard.tsx

import { memo, useMemo } from 'react';
import { withMemo } from '@/utils/componentMemoization';

interface PatientCardProps {
  patient: PatientInput;
  onClick?: () => void;
}

// Option A: Using memo hook
const PatientCard = memo(
  ({ patient, onClick }: PatientCardProps) => {
    return (
      <div className="card" onClick={onClick}>
        <h3>{patient.name}</h3>
        <p>{patient.email}</p>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Custom comparison for memoization
    return (
      prevProps.patient.id === nextProps.patient.id &&
      prevProps.onClick === nextProps.onClick
    );
  }
);

// Option B: Using withMemo HOC
const PatientCardOptimized = withMemo(PatientCard, {
  dependencies: ['patient.id', 'onClick'],
});

export default PatientCard;
```

**Components to Apply**:
- [ ] PatientCard
- [ ] AppointmentCard
- [ ] ExamResultItem
- [ ] FinancialTransactionRow
- [ ] QueueItem

**Expected Impact**: 15-20% reduction in re-renders

---

## 🌓 Dark Mode Completion (2-3 Hours)

### Step 1: Verify next-themes Installation
```bash
npm list next-themes
# Should show: next-themes@0.0.16 (or similar)
```

### Step 2: Update Component Usage
```typescript
// Example: src/components/Header.tsx

import { useTheme } from 'next-themes';

export function Header() {
  const { theme, setTheme } = useTheme();
  
  return (
    <header className="dark:bg-slate-900 dark:text-white">
      <button 
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
      >
        {theme === 'dark' ? '☀️' : '🌙'}
      </button>
    </header>
  );
}
```

### Step 3: Apply Dark Mode Classes
```bash
# Search for components using TailwindCSS
grep -r "className=" src/components/ | grep -v "dark:" | head -20

# Add dark: variants to:
# - Backgrounds (bg-white -> bg-white dark:bg-slate-900)
# - Text (text-gray-900 -> text-gray-900 dark:text-white)  
# - Borders (border-gray-200 -> border-gray-200 dark:border-gray-700)
```

**Files to Update**:
- [ ] Header.tsx
- [ ] Dashboard.tsx
- [ ] PatientManagement.tsx
- [ ] All card components
- [ ] Modal/Dialog components

**Testing Dark Mode**:
```bash
# Add to tailwind.config.js or next.config
module.exports = {
  darkMode: 'class', // or 'media'
  // ...
}

# Test with browser DevTools:
# 1. Open DevTools
# 2. Ctrl+Shift+P -> "Emulate CSS media feature prefers-color-scheme"
# 3. Select "dark" or "light"
```

---

## 🔄 Fragment AppContext (4-6 Hours)

### Current State
- Single monolithic AppContext with all state
- Heavy re-renders when any state changes

### New Architecture
```
AppContext (provider only)
├── ScheduleContext (appointments, schedules)
├── PatientContext (patients, medical records)
├── FinancialContext (transactions, billing)
├── UIContext (modals, notifications)
└── UserContext (auth, permissions)
```

### Step 1: Create Specialized Contexts
```bash
# Create new context files
touch src/contexts/{
  ScheduleContext.tsx,
  PatientContext.tsx,
  FinancialContext.tsx,
  UIContext.tsx
}
```

### Step 2: Pattern Example
```typescript
// src/contexts/ScheduleContext.tsx

import { createContext, useContext, ReactNode } from 'react';

interface ScheduleContextType {
  appointments: Appointment[];
  loading: boolean;
  error: string | null;
  addAppointment: (apt: Appointment) => Promise<void>;
  updateAppointment: (id: string, apt: Partial<Appointment>) => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextType | undefined>(undefined);

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addAppointment = async (apt: Appointment) => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('appointments')
        .insert([apt])
        .select();
      setAppointments([...appointments, data[0]]);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScheduleContext.Provider value={{ appointments, loading, error, addAppointment }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) {
    throw new Error('useSchedule must be used within ScheduleProvider');
  }
  return context;
}
```

---

## 🧪 Add Component Tests (6-8 Hours)

### Step 1: Create Test Structure
```bash
# Create test files matching components
mkdir -p src/components/__tests__
touch src/components/__tests__/{
  PatientManagement.test.tsx,
  ScheduleManagement.test.tsx,
  FinancialModule.test.tsx,
  Dashboard.test.tsx
}
```

### Step 2: Test Pattern
```typescript
// src/components/__tests__/PatientManagement.test.tsx

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PatientManagement from '../PatientManagement';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

describe('PatientManagement', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
  });

  it('should render patient list', async () => {
    const mockPatients = [
      { id: '1', name: 'John Doe', email: 'john@example.com' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com' },
    ];

    // Mock API response
    vi.mock('@/utils/apiClient', () => ({
      apiRequest: vi.fn(() => Promise.resolve(mockPatients)),
    }));

    render(
      <QueryClientProvider client={queryClient}>
        <PatientManagement />
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });
  });

  it('should add new patient on form submit', async () => {
    const user = userEvent.setup();
    
    render(
      <QueryClientProvider client={queryClient}>
        <PatientManagement />
      </QueryClientProvider>
    );

    const input = screen.getByLabelText('Patient Name');
    await user.type(input, 'New Patient');
    
    const submitButton = screen.getByText('Add Patient');
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('New Patient')).toBeInTheDocument();
    });
  });

  it('should show validation error on invalid email', async () => {
    // Test email validation
  });
});
```

### Step 3: Run Tests
```bash
npm test                  # Run once
npm run test:watch      # Watch mode during development
npm run test:coverage   # See coverage report
```

---

## 🔧 Advanced Optimizations (Optional)

### Pre-rendering & SSG
```typescript
// If migration to Next.js eventually
export async function getStaticProps() {
  const patients = await fetchPatients();
  return {
    props: { patients },
    revalidate: 3600, // 1 hour
  };
}
```

### Web Workers for Heavy Computation
```typescript
// offloadHeavyComputation.worker.ts
self.onmessage = (e) => {
  const result = complexCalculation(e.data);
  self.postMessage(result);
};

// Usage in component
const worker = new Worker('offloadHeavyComputation.worker.ts');
worker.postMessage(data);
worker.onmessage = (e) => setResult(e.data);
```

---

## 📋 Checklist for Next Sprint

### Performance Optimization (2-3 hours)
- [ ] Run source-map-explorer for bundle analysis
- [ ] Implement lazy loading for heavy routes
- [ ] Apply React.memo to 5+ list components
- [ ] Re-build and measure bundle reduction
- [ ] Target: Reduce main chunk from 987KB to <500KB

### UI Enhancements (2-3 hours)
- [ ] Complete dark mode integration
- [ ] Test in light/dark mode
- [ ] CSS transitions for theme switching
- [ ] Storage persistence for theme preference

### Code Quality (4-6 hours)
- [ ] Fragment AppContext into specialized contexts
- [ ] Add 10+ component tests
- [ ] Migrate to QueryClient from direct supabase calls
- [ ] Add error boundary tests

---

## 🎯 Success Criteria

**After implementing above items**:

✅ Main bundle < 500KB (gzip < 150KB)  
✅ All 5 chunks < 300KB each  
✅ 40+ tests passing (component tests added)  
✅ Dark mode fully integrated  
✅ AppContext fragmented into 5 specialized contexts  
✅ Lazy loading working for 3+ heavy routes  
✅ React.memo applied to 10+ components  
✅ Test coverage > 50%  

---

## 📞 Quick Commands Reference

```bash
# Development
npm run dev              # Start dev server
npm test:watch         # Watch tests while coding

# Performance
npm run build          # Build & check size
npx source-map-explorer 'build/assets/*.js'

# Testing
npm test               # Run once
npm run test:coverage # Coverage report
npm run test:ui       # Interactive dashboard

# Cleanup
npm run build --empty  # Clean build directory
npm install            # Reinstall deps if issues
```

---

## 🎓 Resources

- **Lazy Loading**: https://react.dev/reference/react/lazy
- **React.memo**: https://react.dev/reference/react/memo
- **Testing Library**: https://testing-library.com/docs/react-testing-library/intro
- **Vitest**: https://vitest.dev/api/
- **next-themes**: https://github.com/pacocoursey/next-themes

---

**Estimated Total Time**: 12-16 hours for all optimizations  
**Priority Order**: Bundle optimization → Dark mode → Fragmentation → Tests  
**Next Review**: After implementing first 3 items
