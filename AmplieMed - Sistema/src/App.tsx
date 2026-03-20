import { RouterProvider } from 'react-router';
import { Toaster } from 'sonner@2.0.3';
import { AppProvider } from './components/AppContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { router } from './routes';

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

export default App;