import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { Building2, ChevronDown, Settings } from 'lucide-react';
import { useApp } from './AppContext';
import { useNavigate } from 'react-router';

export interface ClinicSelectorRef {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export const ClinicSelector = forwardRef<ClinicSelectorRef>((props, ref) => {
  const { clinicSettings } = useApp();
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  const clinicName = clinicSettings.clinicName || 'Clínica não configurada';
  const clinicAddress = clinicSettings.address || '';

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    open: () => setIsOpen(true),
    close: () => setIsOpen(false),
    toggle: () => setIsOpen(prev => !prev),
  }));

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 transition-colors min-w-[240px]"
      >
        <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">{clinicName}</p>
          {clinicAddress && (
            <p className="text-xs text-gray-500 truncate">{clinicAddress}</p>
          )}
        </div>
        <ChevronDown className={`w-4 h-4 text-gray-600 transition-transform flex-shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 shadow-lg z-20 min-w-[280px]">
            <div className="p-2">
              <p className="px-3 py-2 text-xs font-medium text-gray-500 uppercase tracking-wide">
                Unidade Ativa
              </p>

              {/* Single clinic card */}
              <div className="px-3 py-3 flex items-center gap-3 bg-blue-50 border border-blue-200 mx-1 mb-1">
                <Building2 className="w-4 h-4 text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-blue-900 truncate">{clinicName}</p>
                  {clinicAddress && (
                    <p className="text-xs text-blue-600 truncate">{clinicAddress}</p>
                  )}
                </div>
                <div className="w-2 h-2 bg-blue-600 rounded-full flex-shrink-0" />
              </div>

              {!clinicSettings.clinicName && (
                <p className="px-3 py-2 text-xs text-amber-600">
                  Configure o nome da clínica em Configurações.
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <button
                onClick={() => {
                  navigate('/configuracoes');
                  setIsOpen(false);
                }}
                className="w-full flex items-center justify-center gap-2 text-sm text-blue-600 hover:text-blue-700"
              >
                <Settings className="w-4 h-4" />
                <span>Configurações da Clínica</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
});

ClinicSelector.displayName = 'ClinicSelector';