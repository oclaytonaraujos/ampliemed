import { useState, useEffect, useCallback } from 'react';
import { Search, User, Calendar, FileText, Stethoscope, DollarSign, Package, X, Clock, ArrowRight } from 'lucide-react';
import { useApp } from './AppContext';

interface SearchResult {
  id: string;
  type: 'patient' | 'appointment' | 'record' | 'professional' | 'financial' | 'stock' | 'exam';
  title: string;
  subtitle: string;
  icon: any;
  action: () => void;
}

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (module: string, data?: any) => void;
}

export function GlobalSearch({ isOpen, onClose, onNavigate }: GlobalSearchProps) {
  const { patients, appointments, medicalRecords, stockItems, exams, professionals } = useApp();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const addToRecent = (search: string) => {
    setRecentSearches(prev => {
      const filtered = prev.filter(s => s !== search);
      return [search, ...filtered].slice(0, 5);
    });
  };

  const performSearch = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) { setResults([]); return; }
    const lq = searchQuery.toLowerCase();
    const res: SearchResult[] = [];

    // Pacientes
    patients.forEach(p => {
      if (p.name.toLowerCase().includes(lq) || p.cpf.includes(lq) || p.phone.includes(lq) || p.email.toLowerCase().includes(lq)) {
        res.push({ id: p.id, type: 'patient', title: p.name, subtitle: `CPF: ${p.cpf} • ${p.phone}`, icon: User,
          action: () => { onNavigate('patients'); addToRecent(p.name); onClose(); } });
      }
    });

    // Agendamentos
    appointments.forEach(a => {
      if (a.patientName.toLowerCase().includes(lq) || a.doctorName.toLowerCase().includes(lq) || a.date.includes(lq) || a.specialty.toLowerCase().includes(lq)) {
        res.push({ id: a.id, type: 'appointment', title: `${a.patientName}`, subtitle: `${a.doctorName} • ${a.date} ${a.time} • ${a.specialty}`, icon: Calendar,
          action: () => { onNavigate('schedule'); addToRecent(a.patientName); onClose(); } });
      }
    });

    // Prontuários
    medicalRecords.forEach(r => {
      if (r.patientName.toLowerCase().includes(lq) || r.doctorName.toLowerCase().includes(lq) || r.cid10.toLowerCase().includes(lq) || r.chiefComplaint.toLowerCase().includes(lq)) {
        res.push({ id: r.id, type: 'record', title: `Prontuário — ${r.patientName}`, subtitle: `${r.date} • ${r.doctorName} • CID: ${r.cid10}`, icon: FileText,
          action: () => { onNavigate('records'); addToRecent(`Prontuário ${r.patientName}`); onClose(); } });
      }
    });

    // Exames
    exams.forEach(e => {
      if (e.patientName.toLowerCase().includes(lq) || e.examType.toLowerCase().includes(lq) || e.requestedBy.toLowerCase().includes(lq)) {
        res.push({ id: e.id, type: 'exam', title: `Exame — ${e.patientName}`, subtitle: `${e.examType} • ${e.requestDate} • ${e.status}`, icon: FileText,
          action: () => { onNavigate('exams'); addToRecent(e.patientName); onClose(); } });
      }
    });

    // Profissionais
    professionals.forEach(p => {
      if (p.name.toLowerCase().includes(lq) || p.specialty.toLowerCase().includes(lq) || p.crm.toLowerCase().includes(lq)) {
        res.push({ id: p.id, type: 'professional', title: p.name, subtitle: `${p.specialty} • CRM ${p.crm}/${p.crmUf}`, icon: Stethoscope,
          action: () => { onNavigate('professionals'); addToRecent(p.name); onClose(); } });
      }
    });

    // Estoque
    stockItems.forEach(s => {
      if (s.name.toLowerCase().includes(lq) || s.supplier.toLowerCase().includes(lq)) {
        res.push({ id: s.id, type: 'stock', title: s.name, subtitle: `${s.category} • ${s.quantity} ${s.unit} • ${s.supplier}`, icon: Package,
          action: () => { onNavigate('stock'); addToRecent(s.name); onClose(); } });
      }
    });

    setResults(res.slice(0, 20));
    setSelectedIndex(0);
  }, [patients, appointments, medicalRecords, stockItems, exams, professionals, onNavigate, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, results.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, 0)); }
      else if (e.key === 'Enter' && results[selectedIndex]) { e.preventDefault(); results[selectedIndex].action(); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  useEffect(() => {
    const timer = setTimeout(() => performSearch(query), 200);
    return () => clearTimeout(timer);
  }, [query, performSearch]);

  // Reset on open
  useEffect(() => { if (isOpen) { setQuery(''); setResults([]); setSelectedIndex(0); } }, [isOpen]);

  if (!isOpen) return null;

  const typeLabel: Record<string, string> = {
    patient: 'Paciente', appointment: 'Agendamento', record: 'Prontuário',
    professional: 'Profissional', financial: 'Financeiro', stock: 'Estoque', exam: 'Exame',
  };
  const typeColor: Record<string, string> = {
    patient: 'text-pink-600 bg-pink-50', appointment: 'text-green-600 bg-green-50',
    record: 'text-purple-600 bg-purple-50', professional: 'text-orange-600 bg-orange-50',
    financial: 'text-emerald-600 bg-emerald-50', stock: 'text-gray-600 bg-gray-50',
    exam: 'text-pink-600 bg-pink-50',
  };

  const totalItems = patients.length + appointments.length + medicalRecords.length + exams.length + professionals.length + stockItems.length;

  return (
    <>
      <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 animate-fade-in" onClick={onClose} />
      <div className="fixed top-20 left-1/2 -translate-x-1/2 w-full max-w-2xl z-50 px-4 animate-slide-down">
        <div className="bg-white border border-gray-200 shadow-2xl">
          <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-200">
            <Search className="w-5 h-5 text-gray-400" />
            <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
              placeholder={`Buscar em ${totalItems} registros — pacientes, consultas, prontuários...`}
              className="flex-1 bg-transparent text-gray-900 placeholder-gray-400 outline-none" autoFocus />
            <div className="flex items-center gap-2">
              <kbd className="px-2 py-1 bg-gray-100 text-gray-600 text-xs">ESC</kbd>
              <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="max-h-[500px] overflow-y-auto">
            {!query && recentSearches.length > 0 && (
              <div className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs font-medium text-gray-500 uppercase">Buscas Recentes</p>
                </div>
                <div className="space-y-1">
                  {recentSearches.map((s, i) => (
                    <button key={i} onClick={() => setQuery(s)}
                      className="w-full flex items-center justify-between px-3 py-2 hover:bg-gray-50 transition-colors text-left group">
                      <span className="text-sm text-gray-700">{s}</span>
                      <ArrowRight className="w-4 h-4 text-gray-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!query && recentSearches.length === 0 && (
              <div className="p-8 text-center">
                <Search className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">Digite para buscar em todo o sistema</p>
                <p className="text-xs text-gray-400 mt-1">{totalItems} registros indexados</p>
              </div>
            )}

            {query && results.length === 0 && (
              <div className="p-12 text-center">
                <Search className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 mb-1">Nenhum resultado encontrado para "{query}"</p>
                <p className="text-sm text-gray-400">Tente buscar por nome, CPF, CRM, tipo de exame ou medicamento</p>
              </div>
            )}

            {results.length > 0 && (
              <div className="p-2">
                <div className="space-y-1">
                  {results.map((result, index) => {
                    const Icon = result.icon;
                    const isSelected = index === selectedIndex;
                    return (
                      <button key={result.id} onClick={result.action}
                        className={`w-full flex items-start gap-3 px-3 py-3 transition-colors text-left ${isSelected ? 'bg-pink-50' : 'hover:bg-gray-50'}`}
                        onMouseEnter={() => setSelectedIndex(index)}>
                        <div className={`p-2 ${typeColor[result.type] || 'bg-gray-50 text-gray-600'}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900">{result.title}</p>
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs">{typeLabel[result.type]}</span>
                          </div>
                          <p className="text-xs text-gray-500 truncate">{result.subtitle}</p>
                        </div>
                        {isSelected && <kbd className="px-2 py-1 bg-gray-100 text-gray-600 text-xs flex-shrink-0">Enter</kbd>}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-200">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600">↑</kbd><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600">↓</kbd> Navegar</span>
              <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-white border border-gray-200 text-gray-600">Enter</kbd> Selecionar</span>
            </div>
            <p className="text-xs text-gray-400">{results.length} resultado(s)</p>
          </div>
        </div>
      </div>
    </>
  );
}