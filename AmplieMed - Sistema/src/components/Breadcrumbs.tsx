import { ChevronRight, Home } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router';
import { PATH_NAMES } from '../routes';

/**
 * Self-contained breadcrumb that reads the current path automatically.
 * No props needed — just drop it into any authenticated page layout.
 */
export function Breadcrumbs() {
  const navigate = useNavigate();
  const location = useLocation();

  // Build breadcrumb segments from the current pathname
  // e.g. /medicos/relatorio-financeiro → ['Médicos', 'Relatório Financeiro por Médico']
  const buildSegments = () => {
    const fullName = PATH_NAMES[location.pathname];
    if (fullName) return [{ label: fullName, path: location.pathname }];

    // Fallback: split path and try to resolve each segment
    const parts = location.pathname.split('/').filter(Boolean);
    const segments: { label: string; path: string }[] = [];
    let cumPath = '';
    for (const part of parts) {
      cumPath += '/' + part;
      const name = PATH_NAMES[cumPath] || part.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      segments.push({ label: name, path: cumPath });
    }
    return segments;
  };

  const segments = buildSegments();

  return (
    <nav className="flex items-center gap-2 text-sm mb-6">
      <button
        onClick={() => navigate('/')}
        className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition-colors"
      >
        <Home className="w-4 h-4" />
        Início
      </button>

      {segments.map((segment, index) => (
        <div key={segment.path} className="flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-gray-400" />
          {index === segments.length - 1 ? (
            <span className="text-gray-900 font-medium">{segment.label}</span>
          ) : (
            <button
              onClick={() => navigate(segment.path)}
              className="text-gray-500 hover:text-gray-700 transition-colors"
            >
              {segment.label}
            </button>
          )}
        </div>
      ))}
    </nav>
  );
}
