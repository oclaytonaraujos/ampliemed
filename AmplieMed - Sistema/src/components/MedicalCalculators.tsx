import { useState } from 'react';
import { Calculator, Activity, Heart, Baby, AlertCircle } from 'lucide-react';
import { UserRole } from '../App';

interface MedicalCalculatorsProps {
  userRole: UserRole;
}

export function MedicalCalculators({ userRole }: MedicalCalculatorsProps) {
  const [activeCalc, setActiveCalc] = useState<'imc' | 'dose' | 'clearance' | 'risk' | 'apgar'>('imc');

  // IMC Calculator
  const [weight, setWeight] = useState('');
  const [height, setHeight] = useState('');
  const [imcResult, setImcResult] = useState<number | null>(null);

  // Pediatric Dose Calculator
  const [medicationDose, setMedicationDose] = useState('');
  const [childWeight, setChildWeight] = useState('');
  const [doseResult, setDoseResult] = useState<number | null>(null);

  // Creatinine Clearance
  const [age, setAge] = useState('');
  const [creatinine, setCreatinine] = useState('');
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [clearanceResult, setClearanceResult] = useState<number | null>(null);

  // Cardiovascular Risk
  const [cholesterol, setCholesterol] = useState('');
  const [hdl, setHdl] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [smoker, setSmoker] = useState(false);
  const [diabetes, setDiabetes] = useState(false);
  const [riskResult, setRiskResult] = useState<string | null>(null);

  // APGAR Score
  const [apgarScores, setApgarScores] = useState({
    heartRate: 0,
    respiration: 0,
    muscletone: 0,
    reflex: 0,
    color: 0,
  });
  const [apgarTotal, setApgarTotal] = useState(0);

  const calculateIMC = () => {
    const w = parseFloat(weight);
    const h = parseFloat(height) / 100;
    if (w && h) {
      const imc = w / (h * h);
      setImcResult(parseFloat(imc.toFixed(2)));
    }
  };

  const calculatePediatricDose = () => {
    const dose = parseFloat(medicationDose);
    const w = parseFloat(childWeight);
    if (dose && w) {
      const result = dose * w;
      setDoseResult(parseFloat(result.toFixed(2)));
    }
  };

  const calculateClearance = () => {
    const w = parseFloat(weight);
    const a = parseFloat(age);
    const cr = parseFloat(creatinine);
    if (w && a && cr) {
      let clearance = ((140 - a) * w) / (72 * cr);
      if (gender === 'female') {
        clearance *= 0.85;
      }
      setClearanceResult(parseFloat(clearance.toFixed(2)));
    }
  };

  const calculateCardiovascularRisk = () => {
    const chol = parseFloat(cholesterol);
    const hdlVal = parseFloat(hdl);
    const bp = parseFloat(systolicBP);
    const ageVal = parseFloat(age);

    if (chol && hdlVal && bp && ageVal) {
      let score = 0;
      
      // Escore de risco simplificado baseado nos fatores de risco de Framingham
      if (ageVal > 50) score += 2;
      if (chol > 200) score += 2;
      if (hdlVal < 40) score += 2;
      if (bp > 140) score += 2;
      if (smoker) score += 2;
      if (diabetes) score += 2;

      if (score <= 3) setRiskResult('Baixo Risco');
      else if (score <= 6) setRiskResult('Risco Moderado');
      else setRiskResult('Alto Risco');
    }
  };

  const calculateApgar = () => {
    const total = Object.values(apgarScores).reduce((sum, val) => sum + val, 0);
    setApgarTotal(total);
  };

  const getIMCClassification = (imc: number) => {
    if (imc < 18.5) return { label: 'Baixo Peso', color: 'text-pink-600' };
    if (imc < 25) return { label: 'Peso Normal', color: 'text-green-600' };
    if (imc < 30) return { label: 'Sobrepeso', color: 'text-yellow-600' };
    if (imc < 35) return { label: 'Obesidade Grau I', color: 'text-orange-600' };
    if (imc < 40) return { label: 'Obesidade Grau II', color: 'text-red-600' };
    return { label: 'Obesidade Grau III', color: 'text-red-700' };
  };

  const getApgarClassification = (score: number) => {
    if (score >= 8) return { label: 'Normal', color: 'text-green-600' };
    if (score >= 5) return { label: 'Asfixia Leve', color: 'text-yellow-600' };
    if (score >= 3) return { label: 'Asfixia Moderada', color: 'text-orange-600' };
    return { label: 'Asfixia Severa', color: 'text-red-600' };
  };

  const calculators = [
    { id: 'imc', label: 'IMC e Superfície Corporal', icon: Activity },
    { id: 'dose', label: 'Doses Pediátricas', icon: Baby },
    { id: 'clearance', label: 'Clearance de Creatinina', icon: Calculator },
    { id: 'risk', label: 'Risco Cardiovascular', icon: Heart },
    { id: 'apgar', label: 'APGAR Score', icon: Baby },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Calculadoras Médicas</h1>
        <p className="text-sm text-gray-500">Ferramentas de cálculo para auxílio clínico</p>
      </div>

      {/* Calculator Selection */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {calculators.map((calc) => {
          const Icon = calc.icon;
          return (
            <button
              key={calc.id}
              onClick={() => setActiveCalc(calc.id as any)}
              className={`flex items-center gap-2 px-4 py-3 whitespace-nowrap transition-colors ${
                activeCalc === calc.id
                  ? 'bg-pink-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-700 hover:border-pink-600'
              }`}
            >
              <Icon className="w-4 h-4" />
              {calc.label}
            </button>
          );
        })}
      </div>

      {/* IMC Calculator */}
      {activeCalc === 'imc' && (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculadora de IMC</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                placeholder="Ex: 70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Altura (cm)</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                placeholder="Ex: 170"
              />
            </div>
          </div>

          <button
            onClick={calculateIMC}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
          >
            Calcular
          </button>

          {imcResult !== null && (
            <div className="mt-6 p-4 bg-pink-50 border border-pink-200">
              <p className="text-sm text-gray-700 mb-2">Resultado:</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{imcResult}</p>
              <p className={`text-sm font-medium ${getIMCClassification(imcResult).color}`}>
                {getIMCClassification(imcResult).label}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Pediatric Dose Calculator */}
      {activeCalc === 'dose' && (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Calculadora de Doses Pediátricas</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dose por kg (mg/kg)</label>
              <input
                type="number"
                value={medicationDose}
                onChange={(e) => setMedicationDose(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                placeholder="Ex: 10"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Peso da Criança (kg)</label>
              <input
                type="number"
                value={childWeight}
                onChange={(e) => setChildWeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                placeholder="Ex: 15"
              />
            </div>
          </div>

          <button
            onClick={calculatePediatricDose}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
          >
            Calcular
          </button>

          {doseResult !== null && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200">
              <p className="text-sm text-gray-700 mb-2">Dose Total:</p>
              <p className="text-3xl font-bold text-gray-900">{doseResult} mg</p>
            </div>
          )}
        </div>
      )}

      {/* Creatinine Clearance */}
      {activeCalc === 'clearance' && (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Clearance de Creatinina (Cockcroft-Gault)</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Idade (anos)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                placeholder="Ex: 65"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Peso (kg)</label>
              <input
                type="number"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                placeholder="Ex: 70"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Creatinina (mg/dL)</label>
              <input
                type="number"
                value={creatinine}
                onChange={(e) => setCreatinine(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                placeholder="Ex: 1.2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sexo</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as 'male' | 'female')}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
              >
                <option value="male">Masculino</option>
                <option value="female">Feminino</option>
              </select>
            </div>
          </div>

          <button
            onClick={calculateClearance}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
          >
            Calcular
          </button>

          {clearanceResult !== null && (
            <div className="mt-6 p-4 bg-purple-50 border border-purple-200">
              <p className="text-sm text-gray-700 mb-2">Clearance de Creatinina:</p>
              <p className="text-3xl font-bold text-gray-900 mb-2">{clearanceResult} mL/min</p>
              <p className="text-sm text-gray-600">
                Normal: {'>'}90 mL/min | Insuf. Leve: 60-89 | Moderada: 30-59 | Grave: {'<'}30
              </p>
            </div>
          )}
        </div>
      )}

      {/* Cardiovascular Risk */}
      {activeCalc === 'risk' && (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Risco Cardiovascular</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Idade (anos)</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Colesterol Total (mg/dL)</label>
              <input
                type="number"
                value={cholesterol}
                onChange={(e) => setCholesterol(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HDL (mg/dL)</label>
              <input
                type="number"
                value={hdl}
                onChange={(e) => setHdl(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">PA Sistólica (mmHg)</label>
              <input
                type="number"
                value={systolicBP}
                onChange={(e) => setSystolicBP(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
              />
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={smoker}
                  onChange={(e) => setSmoker(e.target.checked)}
                  className="w-4 h-4 text-pink-600 border-gray-300"
                />
                Tabagista
              </label>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={diabetes}
                  onChange={(e) => setDiabetes(e.target.checked)}
                  className="w-4 h-4 text-pink-600 border-gray-300"
                />
                Diabetes
              </label>
            </div>
          </div>

          <button
            onClick={calculateCardiovascularRisk}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
          >
            Calcular
          </button>

          {riskResult && (
            <div className={`mt-6 p-4 border ${
              riskResult === 'Baixo Risco' ? 'bg-green-50 border-green-200' :
              riskResult === 'Risco Moderado' ? 'bg-yellow-50 border-yellow-200' :
              'bg-red-50 border-red-200'
            }`}>
              <p className="text-sm text-gray-700 mb-2">Classificação:</p>
              <p className={`text-2xl font-bold ${
                riskResult === 'Baixo Risco' ? 'text-green-600' :
                riskResult === 'Risco Moderado' ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {riskResult}
              </p>
            </div>
          )}
        </div>
      )}

      {/* APGAR Score */}
      {activeCalc === 'apgar' && (
        <div className="bg-white border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">APGAR Score</h3>
          
          <div className="space-y-4">
            {[
              { key: 'heartRate', label: 'Frequência Cardíaca', options: ['Ausente (0)', '<100 bpm (1)', '>100 bpm (2)'] },
              { key: 'respiration', label: 'Respiração', options: ['Ausente (0)', 'Irregular/Fraca (1)', 'Forte/Choro (2)'] },
              { key: 'muscletone', label: 'Tônus Muscular', options: ['Flácido (0)', 'Alguma Flexão (1)', 'Movimentos Ativos (2)'] },
              { key: 'reflex', label: 'Irritabilidade Reflexa', options: ['Sem Resposta (0)', 'Careta (1)', 'Choro Vigoroso (2)'] },
              { key: 'color', label: 'Cor da Pele', options: ['Cianótico/Pálido (0)', 'Corpo Róseo/Extremidades Azuis (1)', 'Completamente Róseo (2)'] },
            ].map((item) => (
              <div key={item.key}>
                <label className="block text-sm font-medium text-gray-700 mb-2">{item.label}</label>
                <select
                  value={apgarScores[item.key as keyof typeof apgarScores]}
                  onChange={(e) => setApgarScores({ ...apgarScores, [item.key]: parseInt(e.target.value) })}
                  className="w-full px-3 py-2 border border-gray-300 focus:outline-none focus:border-pink-600"
                >
                  {item.options.map((option, index) => (
                    <option key={index} value={index}>{option}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          <button
            onClick={calculateApgar}
            className="mt-4 w-full md:w-auto px-6 py-2 bg-pink-600 text-white hover:bg-pink-700 transition-colors"
          >
            Calcular Score
          </button>

          {apgarTotal > 0 && (
            <div className="mt-6 p-4 bg-pink-50 border border-pink-200">
              <p className="text-sm text-gray-700 mb-2">Score APGAR:</p>
              <p className="text-4xl font-bold text-gray-900 mb-2">{apgarTotal}/10</p>
              <p className={`text-sm font-medium ${getApgarClassification(apgarTotal).color}`}>
                {getApgarClassification(apgarTotal).label}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
