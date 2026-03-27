import { useState, useEffect } from 'react';
import { Search, X } from 'lucide-react';

interface SearchModalProps {
  type: 'cid10' | 'tuss';
  onSelect: (item: any) => void;
  onClose: () => void;
}

export function SearchModal({ type, onSelect, onClose }: SearchModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (searchTerm.length >= 2) {
      performSearch();
    } else {
      setResults([]);
    }
  }, [searchTerm]);

  const performSearch = async () => {
    setLoading(true);
    
    // Simula delay de busca
    await new Promise(resolve => setTimeout(resolve, 300));
    
    if (type === 'cid10') {
      const { searchCID10 } = await import('../data/cid10Database');
      setResults(searchCID10(searchTerm));
    } else {
      const { searchTUSS } = await import('../data/tussDatabase');
      setResults(searchTUSS(searchTerm));
    }
    
    setLoading(false);
  };

  const handleSelect = (item: any) => {
    onSelect(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">
            {type === 'cid10' ? 'Buscar CID-10' : 'Buscar Procedimento TUSS'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
              placeholder={
                type === 'cid10'
                  ? 'Digite o código ou descrição (ex: I10, hipertensão)'
                  : 'Digite o código ou descrição (ex: 10101012, consulta)'
              }
              autoFocus
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Digite no mínimo 2 caracteres para buscar
          </p>
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="text-center py-8 text-gray-500">
              <div className="animate-spin w-8 h-8 border-4 border-pink-600 border-t-transparent rounded-full mx-auto mb-2"></div>
              Buscando...
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              {searchTerm.length < 2 ? (
                <p>Digite para buscar</p>
              ) : (
                <p>Nenhum resultado encontrado para "{searchTerm}"</p>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((item, index) => (
                <button
                  key={index}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left p-3 border border-gray-200 hover:bg-pink-50 hover:border-pink-600 transition-colors"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-pink-600">
                          {item.code}
                        </span>
                        {type === 'tuss' && (
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs">
                            {item.category}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900">{item.description}</p>
                      {type === 'cid10' && (
                        <p className="text-xs text-gray-500 mt-1">{item.category}</p>
                      )}
                      {type === 'tuss' && (
                        <p className="text-xs text-green-600 mt-1 font-medium">
                          R$ {item.value.toFixed(2).replace('.', ',')}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-600 text-center">
            {results.length} resultado{results.length !== 1 ? 's' : ''} encontrado{results.length !== 1 ? 's' : ''}
          </p>
        </div>
      </div>
    </div>
  );
}
