
  import { defineConfig } from 'vite';
  import react from '@vitejs/plugin-react';
  import tailwindcss from '@tailwindcss/vite';
  import path from 'path';

  export default defineConfig({
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      target: 'esnext',
      outDir: 'build',
      rollupOptions: {
        output: {
          manualChunks: {
            // Separate UI library chunks
            'ui-radix': [
              '@radix-ui/react-dialog',
              '@radix-ui/react-dropdown-menu',
              '@radix-ui/react-select',
              '@radix-ui/react-tabs',
            ],
            // Medical utilities chunk
            'medical-core': [
              './src/utils/validators.ts',
              './src/utils/dataMappers.ts',
              './src/utils/documentGenerators.ts',
            ],
            // Financial chunk
            'financial-module': [
              './src/components/FinancialModule.tsx',
              './src/components/DoctorFinancialReport.tsx',
            ],
            // Schedule/appointments chunk
            'schedule-module': [
              './src/components/ScheduleManagementWithPayment.tsx',
              './src/components/AgendaSidebar.tsx',
            ],
            // Patient management chunk
            'patient-module': [
              './src/components/PatientManagement.tsx',
              './src/components/PatientDetailView.tsx',
            ],
          },
        },
      },
    },
    server: {
      port: 3000,
      open: true,
    },
  });