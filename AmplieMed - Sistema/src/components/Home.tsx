import { Activity } from 'lucide-react';
import logoAmplieMed from '../assets/775bd1b6594b305b8d42a07d24da813913fe5060.png';

export function Home() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="text-center">
        {/* Logo */}
        <div className="flex items-center justify-center mb-8">
          <img 
            src={logoAmplieMed} 
            alt="AmplieMed"
            className="h-24 w-auto"
          />
        </div>
        
        {/* Subtítulo */}
        <p className="text-lg text-gray-600">
          Sistema de Gestão Médica
        </p>
      </div>
    </div>
  );
}