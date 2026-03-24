import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner@2.0.3';
import * as Sentry from '@sentry/react';
import { AppProvider } from './components/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';

// Initialize Sentry for error tracking and monitoring
Sentry.init({
  dsn: process.env.REACT_APP_SENTRY_DSN,
  enabled: process.env.NODE_ENV === 'production',
  environment: process.env.NODE_ENV,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  integrations: [
    new Sentry.Replay({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Capture 10% of all transactions for performance monitoring
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
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