import { useState, useEffect } from 'react';
import { Outlet, Navigate, useLocation, useNavigate } from 'react-router';
import { useApp } from './AppContext';
import { Header } from './Header';
import { Breadcrumbs } from './Breadcrumbs';
import { GlobalSearch } from './GlobalSearch';
import { OnboardingTour } from './OnboardingTour';
import { RecentActions } from './RecentActions';
import { MODULE_PATHS } from '../routes';

export function Layout() {
  const { isAuthenticated, isLoading, syncStatus } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showRecentActions, setShowRecentActions] = useState(false);

  const isHomePage = location.pathname === '/';

  // ── All hooks MUST be declared before any conditional return ────────────────

  // Ctrl+K / Cmd+K → open global search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setShowGlobalSearch(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Show onboarding once per user session
  const [hasShownOnboarding, setHasShownOnboarding] = useState(false);
  useEffect(() => {
    if (!isAuthenticated || hasShownOnboarding) return;
    setShowOnboarding(true);
    setHasShownOnboarding(true);
  }, [isAuthenticated, hasShownOnboarding]);

  // ── Guard: redirect to /login if not authenticated ──────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-pink-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 text-sm">Carregando AmplieMed...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Navigate helper: converts module IDs (legacy) to route paths
  const handleNavigate = (module: string) => {
    const path = MODULE_PATHS[module];
    if (path) navigate(path);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Header
        onOpenSearch={() => setShowGlobalSearch(true)}
        onOpenRecent={() => setShowRecentActions(true)}
        onOpenOnboarding={() => setShowOnboarding(true)}
      />

      {isHomePage ? (
        <div className="flex-1 animate-fade-in">
          <Outlet />
        </div>
      ) : (
        <main className="flex-1 max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-10 w-full">
          <Breadcrumbs />
          <div className="animate-fade-in">
            <Outlet />
          </div>
        </main>
      )}

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-600">
            © 2026 • Desenvolvido por{' '}
            <span className="text-gray-900">Amplie Marketing</span>. Todos os direitos reservados.
          </p>
        </div>
      </footer>

      {/* ── Global Overlays ─────────────────────────────────────────────────── */}
      <GlobalSearch
        isOpen={showGlobalSearch}
        onClose={() => setShowGlobalSearch(false)}
        onNavigate={handleNavigate}
      />
      <OnboardingTour
        isOpen={showOnboarding}
        onClose={() => setShowOnboarding(false)}
      />
      <RecentActions
        isOpen={showRecentActions}
        onClose={() => setShowRecentActions(false)}
        onNavigate={handleNavigate}
      />

      {/* Keyboard Shortcut Hint */}
      <div className="fixed bottom-4 right-4 bg-white border border-gray-200 px-3 py-2 shadow-lg opacity-0 hover:opacity-100 transition-opacity z-10">
        <p className="text-xs text-gray-600">
          Pressione{' '}
          <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 mx-1">
            Ctrl
          </kbd>
          +
          <kbd className="px-2 py-0.5 bg-gray-100 border border-gray-300 text-gray-700 mx-1">
            K
          </kbd>{' '}
          para buscar
        </p>
      </div>
    </div>
  );
}