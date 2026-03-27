import { ArrowLeft, User } from 'lucide-react';
import { useNavigate } from 'react-router';

interface BackToPatientBannerProps {
  patientName: string;
  patientId: string;
}

export function BackToPatientBanner({ patientName, patientId }: BackToPatientBannerProps) {
  const navigate = useNavigate();

  return (
    <div className="bg-pink-50 border border-pink-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4 mb-4">
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-pink-600" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-pink-900 truncate">
            Ação vinculada ao paciente: <strong>{patientName}</strong>
          </p>
          <p className="text-xs text-pink-600">Preencha os dados e conclua, ou volte ao cadastro do paciente.</p>
        </div>
      </div>
      <button
        onClick={() => navigate('/pacientes', { state: { viewPatientId: patientId } })}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-pink-300 text-pink-700 hover:bg-pink-100 rounded-lg transition-colors text-sm font-medium whitespace-nowrap flex-shrink-0"
      >
        <ArrowLeft className="w-4 h-4" />
        Voltar ao Paciente
      </button>
    </div>
  );
}
