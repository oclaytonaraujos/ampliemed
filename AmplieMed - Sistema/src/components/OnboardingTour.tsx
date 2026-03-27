import { useState } from 'react';
import { X, ChevronLeft, ChevronRight, CheckCircle } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  target?: string;
}

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OnboardingTour({ isOpen, onClose }: OnboardingTourProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const steps: OnboardingStep[] = [
    {
      title: 'Bem-vindo ao AmplieMed! 👋',
      description: 'Vamos fazer um tour rápido pelas principais funcionalidades do sistema. Este guia levará apenas 2 minutos.',
    },
    {
      title: 'Busca Global (Ctrl+K)',
      description: 'Use o atalho Ctrl+K (ou Cmd+K no Mac) para buscar rapidamente pacientes, agendamentos, prontuários e muito mais em todo o sistema.',
    },
    {
      title: 'Dashboard Inteligente',
      description: 'Visualize métricas em tempo real, gráficos interativos e indicadores de desempenho. Personalize os widgets conforme sua necessidade.',
    },
    {
      title: 'Agenda com Drag & Drop',
      description: 'Arraste e solte compromissos para reagendar facilmente. Visualize por dia, semana ou mês e gerencie múltiplos profissionais.',
    },
    {
      title: 'Prontuário Eletrônico Unificado',
      description: 'Anamnese estruturada, exame físico, prescrição digital com assinatura ICP-Brasil, e evolução clínica. Tudo em uma única interface que combina listagem histórica e formulário completo.',
    },
    {
      title: 'Fila de Espera Inteligente',
      description: 'Gerencie a fila de atendimento com painel de TV para sala de espera, notificações automáticas via WhatsApp/SMS e controle de tempo médio.',
    },
    {
      title: 'Calculadoras Médicas',
      description: 'IMC, doses pediátricas, clearance de creatinina, scores clínicos e muito mais. Ferramentas essenciais sempre à mão.',
    },
    {
      title: 'Templates e Modelos',
      description: 'Biblioteca completa de templates para prescrições, atestados, prontuários e relatórios. Crie macros para textos frequentes.',
    },
    {
      title: 'Relatórios Gerenciais',
      description: 'Dashboards financeiros, operacionais e clínicos com gráficos avançados. Exporte em PDF, Excel ou CSV.',
    },
    {
      title: 'Gestão de Convênios',
      description: 'Cadastro completo de convênios, tabelas TUSS/CBHPM, autorizações, guias TISS e controle de glosas.',
    },
    {
      title: 'Multi-clínica',
      description: 'Gerencie múltiplas unidades em um único sistema. Troque entre clínicas facilmente e visualize dashboard consolidado.',
    },
    {
      title: 'Tudo Pronto! ✅',
      description: 'Você está pronto para usar o AmplieMed. Explore as funcionalidades e não hesite em usar o atalho Ctrl+K para buscar o que precisa!',
    },
  ];

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onClose();
  };

  if (!isOpen) return null;

  const step = steps[currentStep];
  const progress = ((currentStep + 1) / steps.length) * 100;

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-white/30 backdrop-blur-md z-50 animate-fade-in" />

      {/* Tour Modal */}
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg z-50 px-4 animate-slide-down">
        <div className="bg-white border border-gray-200 shadow-2xl">
          {/* Progress Bar */}
          <div className="h-1 bg-gray-200">
            <div
              className="h-1 bg-pink-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-pink-50">
                {currentStep === steps.length - 1 ? (
                  <CheckCircle className="w-5 h-5 text-pink-600" />
                ) : (
                  <span className="text-pink-600 font-bold">{currentStep + 1}/{steps.length}</span>
                )}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{step.title}</h3>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 transition-colors"
            >
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            <p className="text-gray-700 leading-relaxed">{step.description}</p>

            {currentStep === 0 && (
              <div className="mt-4 p-4 bg-pink-50 border border-pink-200">
                <p className="text-sm text-pink-900">
                  💡 <strong>Dica:</strong> Você pode acessar este tutorial novamente através do menu de Ajuda.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between p-6 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleSkip}
              className="text-sm text-gray-600 hover:text-gray-900 transition-colors"
            >
              Pular Tutorial
            </button>

            <div className="flex items-center gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handlePrev}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                  Anterior
                </button>
              )}
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
              >
                {currentStep === steps.length - 1 ? 'Concluir' : 'Próximo'}
                {currentStep < steps.length - 1 && <ChevronRight className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}