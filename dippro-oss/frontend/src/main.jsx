import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { HelmetProvider } from 'react-helmet-async';
// Import `/react` et non `/next` : DIPpro est une application Vite + React
// Router, pas Next.js — l'entrée `/next` référence des modules absents ici et
// ferait échouer le build.
import { Analytics } from '@vercel/analytics/react';
import './i18n';
import App from './App';
import ThemeProvider from './context/ThemeContext';
import { installGlobalErrorHandlers } from './lib/errorJournal';
import { installVersionWatch } from './lib/versionWatch';
import './index.css';
import './styles/liquid-glass.css';

installGlobalErrorHandlers();
installVersionWatch();

const BUILD_VERSION = '2026-07-14-api-fix';
console.info('DIPpro build', BUILD_VERSION);

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
      staleTime: 30000,
      refetchOnWindowFocus: false
    },
    mutations: { retry: 0 }
  }
});

function ThemedToaster() {
  return (
    <Toaster
      position="top-right"
      toastOptions={{
        style: {
          background: 'var(--glass-bg)',
          backdropFilter: 'blur(20px)',
          color: 'rgb(var(--text-primary))',
          border: '1px solid var(--border-default)',
          borderRadius: '10px',
          fontFamily: 'Geist, sans-serif',
          fontSize: '14px',
          boxShadow: 'var(--glass-shadow)',
        },
        success: { iconTheme: { primary: 'rgb(var(--gold))', secondary: 'transparent' } },
        error:   { iconTheme: { primary: 'rgb(var(--danger))', secondary: 'transparent' } },
      }}
    />
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <HelmetProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <BrowserRouter>
            <App />
            <ThemedToaster />
            {/* À l'intérieur du Router : c'est ce qui permet de compter chaque
                changement de route de cette application monopage, et pas
                uniquement le premier chargement. */}
            <Analytics />
          </BrowserRouter>
        </ThemeProvider>
      </QueryClientProvider>
    </HelmetProvider>
  </React.StrictMode>
);
