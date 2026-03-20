/**
 * Base de dados TUSS (Terminologia Unificada da Saúde Suplementar)
 * Padrão ANS para procedimentos médicos
 */

export interface TUSS {
  code: string;
  description: string;
  category: string;
  value: number;
  type: 'consulta' | 'procedimento' | 'exame' | 'cirurgia' | 'internacao';
}

export const tussDatabase: TUSS[] = [
  // Consultas
  { code: '10101012', description: 'Consulta médica em consultório (no horário normal ou preestabelecido)', category: 'Consultas', value: 150.00, type: 'consulta' },
  { code: '10101020', description: 'Consulta médica em domicílio (no horário normal ou preestabelecido)', category: 'Consultas', value: 300.00, type: 'consulta' },
  { code: '10101039', description: 'Consulta médica em pronto-socorro (no horário normal ou preestabelecido)', category: 'Consultas', value: 200.00, type: 'consulta' },
  { code: '10101047', description: 'Consulta médica em ambulatório (no horário normal ou preestabelecido)', category: 'Consultas', value: 150.00, type: 'consulta' },
  
  // Pediatria
  { code: '10101055', description: 'Consulta em pediatria', category: 'Pediatria', value: 180.00, type: 'consulta' },
  { code: '10101063', description: 'Puericultura', category: 'Pediatria', value: 160.00, type: 'consulta' },
  
  // Cardiologia
  { code: '20101015', description: 'Eletrocardiograma (ECG)', category: 'Cardiologia', value: 80.00, type: 'exame' },
  { code: '20101023', description: 'Teste ergométrico', category: 'Cardiologia', value: 250.00, type: 'exame' },
  { code: '20101031', description: 'Ecocardiograma transtorácico', category: 'Cardiologia', value: 350.00, type: 'exame' },
  { code: '20101040', description: 'Holter 24 horas', category: 'Cardiologia', value: 400.00, type: 'exame' },
  { code: '20101058', description: 'MAPA - Monitorização ambulatorial da pressão arterial', category: 'Cardiologia', value: 350.00, type: 'exame' },
  
  // Exames Laboratoriais
  { code: '40301010', description: 'Hemograma completo', category: 'Laboratório', value: 25.00, type: 'exame' },
  { code: '40301028', description: 'Glicemia em jejum', category: 'Laboratório', value: 15.00, type: 'exame' },
  { code: '40301036', description: 'Hemoglobina glicada (HbA1c)', category: 'Laboratório', value: 40.00, type: 'exame' },
  { code: '40302679', description: 'Colesterol total', category: 'Laboratório', value: 18.00, type: 'exame' },
  { code: '40302687', description: 'Colesterol HDL', category: 'Laboratório', value: 20.00, type: 'exame' },
  { code: '40302695', description: 'Colesterol LDL', category: 'Laboratório', value: 20.00, type: 'exame' },
  { code: '40302709', description: 'Triglicerídeos', category: 'Laboratório', value: 20.00, type: 'exame' },
  { code: '40301133', description: 'Creatinina', category: 'Laboratório', value: 18.00, type: 'exame' },
  { code: '40301141', description: 'Ureia', category: 'Laboratório', value: 15.00, type: 'exame' },
  { code: '40301150', description: 'Ácido úrico', category: 'Laboratório', value: 18.00, type: 'exame' },
  { code: '40301168', description: 'TGO (AST)', category: 'Laboratório', value: 18.00, type: 'exame' },
  { code: '40301176', description: 'TGP (ALT)', category: 'Laboratório', value: 18.00, type: 'exame' },
  { code: '40301184', description: 'Bilirrubina total e frações', category: 'Laboratório', value: 25.00, type: 'exame' },
  { code: '40301192', description: 'Fosfatase alcalina', category: 'Laboratório', value: 18.00, type: 'exame' },
  { code: '40301206', description: 'Gama GT', category: 'Laboratório', value: 18.00, type: 'exame' },
  { code: '40301214', description: 'TSH', category: 'Laboratório', value: 35.00, type: 'exame' },
  { code: '40301222', description: 'T4 livre', category: 'Laboratório', value: 35.00, type: 'exame' },
  { code: '40301230', description: 'PSA total', category: 'Laboratório', value: 45.00, type: 'exame' },
  { code: '40301249', description: 'Exame de urina tipo I (EAS)', category: 'Laboratório', value: 20.00, type: 'exame' },
  { code: '40301257', description: 'Urocultura', category: 'Laboratório', value: 35.00, type: 'exame' },
  { code: '40301265', description: 'Parasitológico de fezes', category: 'Laboratório', value: 25.00, type: 'exame' },
  
  // Imagem - Raio-X
  { code: '40801012', description: 'Radiografia de tórax (PA e perfil)', category: 'Imagem', value: 80.00, type: 'exame' },
  { code: '40801020', description: 'Radiografia de abdômen', category: 'Imagem', value: 70.00, type: 'exame' },
  { code: '40801039', description: 'Radiografia de coluna lombar', category: 'Imagem', value: 90.00, type: 'exame' },
  { code: '40801047', description: 'Radiografia de joelho', category: 'Imagem', value: 70.00, type: 'exame' },
  { code: '40801055', description: 'Radiografia de ombro', category: 'Imagem', value: 70.00, type: 'exame' },
  { code: '40801063', description: 'Radiografia de punho', category: 'Imagem', value: 60.00, type: 'exame' },
  { code: '40801071', description: 'Radiografia de mão', category: 'Imagem', value: 60.00, type: 'exame' },
  { code: '40801080', description: 'Radiografia de pé', category: 'Imagem', value: 60.00, type: 'exame' },
  
  // Imagem - Ultrassom
  { code: '40901017', description: 'Ultrassonografia de abdômen total', category: 'Imagem', value: 180.00, type: 'exame' },
  { code: '40901025', description: 'Ultrassonografia de abdômen superior', category: 'Imagem', value: 150.00, type: 'exame' },
  { code: '40901033', description: 'Ultrassonografia pélvica (via abdominal)', category: 'Imagem', value: 150.00, type: 'exame' },
  { code: '40901041', description: 'Ultrassonografia transvaginal', category: 'Imagem', value: 180.00, type: 'exame' },
  { code: '40901050', description: 'Ultrassonografia obstétrica', category: 'Imagem', value: 200.00, type: 'exame' },
  { code: '40901068', description: 'Ultrassonografia de tireoide', category: 'Imagem', value: 150.00, type: 'exame' },
  { code: '40901076', description: 'Ultrassonografia de mamas', category: 'Imagem', value: 180.00, type: 'exame' },
  { code: '40901084', description: 'Ultrassonografia doppler de membros inferiores', category: 'Imagem', value: 250.00, type: 'exame' },
  
  // Imagem - Tomografia
  { code: '41001010', description: 'Tomografia computadorizada de crânio', category: 'Imagem', value: 500.00, type: 'exame' },
  { code: '41001028', description: 'Tomografia computadorizada de tórax', category: 'Imagem', value: 550.00, type: 'exame' },
  { code: '41001036', description: 'Tomografia computadorizada de abdômen', category: 'Imagem', value: 600.00, type: 'exame' },
  { code: '41001044', description: 'Tomografia computadorizada de coluna lombar', category: 'Imagem', value: 500.00, type: 'exame' },
  
  // Imagem - Ressonância Magnética
  { code: '41101015', description: 'Ressonância magnética de crânio', category: 'Imagem', value: 800.00, type: 'exame' },
  { code: '41101023', description: 'Ressonância magnética de coluna lombar', category: 'Imagem', value: 850.00, type: 'exame' },
  { code: '41101031', description: 'Ressonância magnética de joelho', category: 'Imagem', value: 750.00, type: 'exame' },
  { code: '41101040', description: 'Ressonância magnética de ombro', category: 'Imagem', value: 750.00, type: 'exame' },
  
  // Endoscopia
  { code: '30701011', description: 'Endoscopia digestiva alta (esofagogastroduodenoscopia)', category: 'Endoscopia', value: 450.00, type: 'procedimento' },
  { code: '30701020', description: 'Colonoscopia', category: 'Endoscopia', value: 550.00, type: 'procedimento' },
  { code: '30701038', description: 'Retossigmoidoscopia', category: 'Endoscopia', value: 350.00, type: 'procedimento' },
  
  // Procedimentos Ortopédicos
  { code: '30606012', description: 'Infiltração articular', category: 'Ortopedia', value: 200.00, type: 'procedimento' },
  { code: '30606020', description: 'Imobilização com gesso', category: 'Ortopedia', value: 180.00, type: 'procedimento' },
  { code: '30606039', description: 'Redução incruenta de fratura', category: 'Ortopedia', value: 350.00, type: 'procedimento' },
  
  // Pequenas Cirurgias
  { code: '31301010', description: 'Sutura de ferimento', category: 'Pequenas Cirurgias', value: 250.00, type: 'cirurgia' },
  { code: '31301028', description: 'Drenagem de abscesso', category: 'Pequenas Cirurgias', value: 300.00, type: 'cirurgia' },
  { code: '31301036', description: 'Exérese de cisto sebáceo', category: 'Pequenas Cirurgias', value: 350.00, type: 'cirurgia' },
  { code: '31301044', description: 'Cauterização de verruga', category: 'Pequenas Cirurgias', value: 180.00, type: 'cirurgia' },
  { code: '31301052', description: 'Biópsia de pele', category: 'Pequenas Cirurgias', value: 250.00, type: 'cirurgia' },
  
  // Ginecologia e Obstetrícia
  { code: '31201016', description: 'Papanicolau (colpocitologia oncótica)', category: 'Ginecologia', value: 80.00, type: 'exame' },
  { code: '31201024', description: 'Colposcopia', category: 'Ginecologia', value: 200.00, type: 'exame' },
  { code: '31201032', description: 'Inserção de DIU', category: 'Ginecologia', value: 300.00, type: 'procedimento' },
  { code: '31201040', description: 'Retirada de DIU', category: 'Ginecologia', value: 200.00, type: 'procedimento' },
  
  // Oftalmologia
  { code: '20201011', description: 'Tonometria', category: 'Oftalmologia', value: 60.00, type: 'exame' },
  { code: '20201020', description: 'Fundo de olho', category: 'Oftalmologia', value: 80.00, type: 'exame' },
  { code: '20201038', description: 'Campimetria computadorizada', category: 'Oftalmologia', value: 150.00, type: 'exame' },
  
  // Otorrinolaringologia
  { code: '20301016', description: 'Audiometria tonal e vocal', category: 'Otorrinolaringologia', value: 100.00, type: 'exame' },
  { code: '20301024', description: 'Impedanciometria', category: 'Otorrinolaringologia', value: 80.00, type: 'exame' },
  { code: '20301032', description: 'Laringoscopia indireta', category: 'Otorrinolaringologia', value: 150.00, type: 'exame' },
  { code: '30301017', description: 'Lavagem de ouvido', category: 'Otorrinolaringologia', value: 80.00, type: 'procedimento' },
  
  // Dermatologia
  { code: '30501019', description: 'Crioterapia (por lesão)', category: 'Dermatologia', value: 120.00, type: 'procedimento' },
  { code: '30501027', description: 'Curetagem de molusco contagioso', category: 'Dermatologia', value: 150.00, type: 'procedimento' },
  
  // Fisioterapia
  { code: '50101016', description: 'Sessão de fisioterapia motora', category: 'Fisioterapia', value: 80.00, type: 'procedimento' },
  { code: '50101024', description: 'Sessão de RPG (Reeducação Postural Global)', category: 'Fisioterapia', value: 120.00, type: 'procedimento' },
  
  // Psicologia
  { code: '10102019', description: 'Consulta/sessão com psicólogo', category: 'Psicologia', value: 150.00, type: 'consulta' },
  
  // Nutrição
  { code: '10103015', description: 'Consulta com nutricionista', category: 'Nutrição', value: 120.00, type: 'consulta' },
  
  // Cirurgias Gerais
  { code: '31401015', description: 'Apendicectomia', category: 'Cirurgia Geral', value: 3500.00, type: 'cirurgia' },
  { code: '31401023', description: 'Colecistectomia videolaparoscópica', category: 'Cirurgia Geral', value: 4500.00, type: 'cirurgia' },
  { code: '31401031', description: 'Herniorrafia inguinal', category: 'Cirurgia Geral', value: 3000.00, type: 'cirurgia' },
  { code: '31401040', description: 'Hemorroidectomia', category: 'Cirurgia Geral', value: 2800.00, type: 'cirurgia' },
];

/**
 * Busca TUSS por código ou descrição
 */
export function searchTUSS(query: string): TUSS[] {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) return [];
  
  return tussDatabase.filter(item => 
    item.code.includes(searchTerm) ||
    item.description.toLowerCase().includes(searchTerm) ||
    item.category.toLowerCase().includes(searchTerm)
  ).slice(0, 20); // Limita a 20 resultados
}

/**
 * Busca TUSS por categoria
 */
export function getTUSSByCategory(category: string): TUSS[] {
  return tussDatabase.filter(item => item.category === category);
}

/**
 * Busca TUSS por tipo
 */
export function getTUSSByType(type: TUSS['type']): TUSS[] {
  return tussDatabase.filter(item => item.type === type);
}

/**
 * Obtém todas as categorias únicas
 */
export function getTUSSCategories(): string[] {
  return Array.from(new Set(tussDatabase.map(item => item.category)));
}

/**
 * Obtém procedimento TUSS por código exato
 */
export function getTUSSByCode(code: string): TUSS | undefined {
  return tussDatabase.find(item => item.code === code);
}

/**
 * Calcula valor total de múltiplos procedimentos
 */
export function calculateTotalValue(procedures: { code: string; quantity: number }[]): number {
  return procedures.reduce((total, proc) => {
    const tuss = getTUSSByCode(proc.code);
    if (tuss) {
      return total + (tuss.value * proc.quantity);
    }
    return total;
  }, 0);
}
