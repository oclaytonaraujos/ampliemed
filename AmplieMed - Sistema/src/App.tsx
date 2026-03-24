import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner';
import * as Sentry from '@sentry/react';
import { AppProvider } from './components/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';

// Initialize Sentry for error tracking and monitoring
const isDev = import.meta.env.DEV;
const isProd = import.meta.env.PROD;

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN || '',
  enabled: isProd,
  environment: isProd ? 'production' : 'development',
  tracesSampleRate: isProd ? 0.1 : 1.0,
  integrations: [],
  // Note: Session replay requires @sentry/replay package
  // replaysSessionSampleRate: 0.1,
  // replaysOnErrorSampleRate: 1.0,
});

// UserRole type exported so other components can import it
export type UserRole = 'admin' | 'doctor' | 'receptionist' | 'financial';

// v2.0 - MedicalRecordsUnified module (replaces MedicalRecords + ElectronicMedicalRecord)
function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <RouterProvider router={router} />
        <Toaster
          position="top-right"
          richColors
          closeButton
          duration={3500}
          toastOptions={{
            style: {
              fontFamily: 'inherit',
              fontSize: '13px',
            },
          }}
        />
      </AppProvider>
    </ErrorBoundary>
  );
}

export default Sentry.withProfiler(App);