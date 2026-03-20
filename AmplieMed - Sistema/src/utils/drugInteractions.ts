/**
 * Sistema de detecção de interações medicamentosas
 */

export interface DrugInteraction {
  drug1: string;
  drug2: string;
  severity: 'leve' | 'moderada' | 'grave';
  description: string;
  recommendation: string;
}

// Base de dados de interações medicamentosas comuns
const interactionsDatabase: DrugInteraction[] = [
  // Anticoagulantes
  {
    drug1: 'varfarina',
    drug2: 'ácido acetilsalicílico',
    severity: 'grave',
    description: 'Aumento significativo do risco de sangramento',
    recommendation: 'Evitar uso concomitante. Se necessário, monitorar INR rigorosamente.',
  },
  {
    drug1: 'varfarina',
    drug2: 'aspirina',
    severity: 'grave',
    description: 'Aumento significativo do risco de sangramento',
    recommendation: 'Evitar uso concomitante. Se necessário, monitorar INR rigorosamente.',
  },
  {
    drug1: 'varfarina',
    drug2: 'anti-inflamatório',
    severity: 'grave',
    description: 'Risco aumentado de hemorragia gastrointestinal',
    recommendation: 'Considerar alternativas. Monitorar sinais de sangramento.',
  },
  
  // IECA + Diuréticos poupadores de potássio
  {
    drug1: 'enalapril',
    drug2: 'espironolactona',
    severity: 'moderada',
    description: 'Risco de hipercalemia (potássio elevado)',
    recommendation: 'Monitorar níveis de potássio regularmente.',
  },
  {
    drug1: 'losartana',
    drug2: 'espironolactona',
    severity: 'moderada',
    description: 'Risco de hipercalemia (potássio elevado)',
    recommendation: 'Monitorar níveis de potássio regularmente.',
  },
  
  // IECA + Anti-inflamatórios
  {
    drug1: 'enalapril',
    drug2: 'ibuprofeno',
    severity: 'moderada',
    description: 'Redução do efeito anti-hipertensivo e risco de insuficiência renal',
    recommendation: 'Monitorar pressão arterial e função renal.',
  },
  {
    drug1: 'losartana',
    drug2: 'diclofenaco',
    severity: 'moderada',
    description: 'Redução do efeito anti-hipertensivo e risco de insuficiência renal',
    recommendation: 'Monitorar pressão arterial e função renal.',
  },
  
  // Antibióticos + Anticoagulantes
  {
    drug1: 'azitromicina',
    drug2: 'varfarina',
    severity: 'moderada',
    description: 'Potencialização do efeito anticoagulante',
    recommendation: 'Monitorar INR durante e após o tratamento antibiótico.',
  },
  {
    drug1: 'ciprofloxacino',
    drug2: 'varfarina',
    severity: 'moderada',
    description: 'Potencialização do efeito anticoagulante',
    recommendation: 'Monitorar INR durante e após o tratamento antibiótico.',
  },
  
  // Estatinas + Fibratos
  {
    drug1: 'sinvastatina',
    drug2: 'genfibrozila',
    severity: 'grave',
    description: 'Risco muito aumentado de rabdomiólise (destruição muscular)',
    recommendation: 'Contraindicado. Considerar outras estatinas se necessário fibrato.',
  },
  {
    drug1: 'atorvastatina',
    drug2: 'genfibrozila',
    severity: 'moderada',
    description: 'Risco aumentado de miopatia e rabdomiólise',
    recommendation: 'Monitorar sintomas musculares e CPK. Usar menor dose de estatina.',
  },
  
  // ISRS + Tramadol
  {
    drug1: 'fluoxetina',
    drug2: 'tramadol',
    severity: 'grave',
    description: 'Risco de síndrome serotoninérgica (condição potencialmente fatal)',
    recommendation: 'Evitar uso concomitante. Considerar analgésico alternativo.',
  },
  {
    drug1: 'sertralina',
    drug2: 'tramadol',
    severity: 'grave',
    description: 'Risco de síndrome serotoninérgica',
    recommendation: 'Evitar uso concomitante. Considerar analgésico alternativo.',
  },
  
  // Benzodiazepínicos + Álcool
  {
    drug1: 'diazepam',
    drug2: 'álcool',
    severity: 'grave',
    description: 'Depressão respiratória grave e risco de morte',
    recommendation: 'Orientar paciente a evitar totalmente o consumo de álcool.',
  },
  {
    drug1: 'clonazepam',
    drug2: 'álcool',
    severity: 'grave',
    description: 'Depressão respiratória grave e risco de morte',
    recommendation: 'Orientar paciente a evitar totalmente o consumo de álcool.',
  },
  
  // Metformina + Contraste iodado
  {
    drug1: 'metformina',
    drug2: 'contraste',
    severity: 'grave',
    description: 'Risco de acidose láctica em pacientes com função renal comprometida',
    recommendation: 'Suspender metformina 48h antes e após exame com contraste.',
  },
  
  // Digoxina + Amiodarona
  {
    drug1: 'digoxina',
    drug2: 'amiodarona',
    severity: 'grave',
    description: 'Aumento dos níveis de digoxina com risco de toxicidade',
    recommendation: 'Reduzir dose de digoxina em 50%. Monitorar níveis séricos.',
  },
  
  // Levotiroxina + Ferro
  {
    drug1: 'levotiroxina',
    drug2: 'sulfato ferroso',
    severity: 'moderada',
    description: 'Redução da absorção de levotiroxina',
    recommendation: 'Administrar com intervalo de 4 horas entre os medicamentos.',
  },
  {
    drug1: 'levotiroxina',
    drug2: 'carbonato de cálcio',
    severity: 'moderada',
    description: 'Redução da absorção de levotiroxina',
    recommendation: 'Administrar com intervalo de 4 horas entre os medicamentos.',
  },
  
  // Omeprazol + Clopidogrel
  {
    drug1: 'omeprazol',
    drug2: 'clopidogrel',
    severity: 'moderada',
    description: 'Redução do efeito antiagregante plaquetário do clopidogrel',
    recommendation: 'Preferir outro inibidor de bomba de prótons (pantoprazol).',
  },
  
  // Antibióticos + Anticoncepcional
  {
    drug1: 'amoxicilina',
    drug2: 'anticoncepcional',
    severity: 'leve',
    description: 'Possível redução da eficácia contraceptiva',
    recommendation: 'Orientar uso de método contraceptivo adicional durante tratamento.',
  },
  {
    drug1: 'rifampicina',
    drug2: 'anticoncepcional',
    severity: 'grave',
    description: 'Redução significativa da eficácia contraceptiva',
    recommendation: 'Usar método contraceptivo alternativo não hormonal.',
  },
];

/**
 * Normaliza nome do medicamento para busca
 */
function normalizeDrugName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove acentos
    .replace(/\s+\d+\s*mg.*$/i, '') // Remove dosagem
    .trim();
}

/**
 * Detecta interações entre medicamentos
 */
export function detectInteractions(medications: string[]): DrugInteraction[] {
  const interactions: DrugInteraction[] = [];
  const normalizedMeds = medications.map(med => normalizeDrugName(med));
  
  // Verifica todas as combinações de pares
  for (let i = 0; i < normalizedMeds.length; i++) {
    for (let j = i + 1; j < normalizedMeds.length; j++) {
      const med1 = normalizedMeds[i];
      const med2 = normalizedMeds[j];
      
      // Busca interação na base de dados
      const found = interactionsDatabase.find(
        interaction =>
          (med1.includes(interaction.drug1) && med2.includes(interaction.drug2)) ||
          (med1.includes(interaction.drug2) && med2.includes(interaction.drug1))
      );
      
      if (found && !interactions.find(int => 
        int.drug1 === found.drug1 && int.drug2 === found.drug2
      )) {
        interactions.push(found);
      }
    }
  }
  
  return interactions;
}

/**
 * Verifica se há interações graves
 */
export function hasSevereInteractions(medications: string[]): boolean {
  const interactions = detectInteractions(medications);
  return interactions.some(int => int.severity === 'grave');
}

/**
 * Agrupa interações por gravidade
 */
export function groupInteractionsBySeverity(interactions: DrugInteraction[]): {
  grave: DrugInteraction[];
  moderada: DrugInteraction[];
  leve: DrugInteraction[];
} {
  return {
    grave: interactions.filter(int => int.severity === 'grave'),
    moderada: interactions.filter(int => int.severity === 'moderada'),
    leve: interactions.filter(int => int.severity === 'leve'),
  };
}

/**
 * Gera relatório de interações em HTML
 */
export function generateInteractionsReport(interactions: DrugInteraction[]): string {
  if (interactions.length === 0) {
    return '<p style="color: green;">✓ Nenhuma interação medicamentosa detectada.</p>';
  }
  
  const grouped = groupInteractionsBySeverity(interactions);
  let html = '<div style="font-family: Arial, sans-serif; font-size: 12pt;">';
  
  if (grouped.grave.length > 0) {
    html += '<div style="background: #fee; border-left: 4px solid #c00; padding: 10px; margin-bottom: 10px;">';
    html += '<strong style="color: #c00;">⚠️ INTERAÇÕES GRAVES:</strong><ul>';
    grouped.grave.forEach(int => {
      html += `<li><strong>${int.drug1} + ${int.drug2}</strong>: ${int.description}<br>`;
      html += `<em>Recomendação: ${int.recommendation}</em></li>`;
    });
    html += '</ul></div>';
  }
  
  if (grouped.moderada.length > 0) {
    html += '<div style="background: #ffeaa7; border-left: 4px solid #f90; padding: 10px; margin-bottom: 10px;">';
    html += '<strong style="color: #f90;">⚠️ INTERAÇÕES MODERADAS:</strong><ul>';
    grouped.moderada.forEach(int => {
      html += `<li><strong>${int.drug1} + ${int.drug2}</strong>: ${int.description}<br>`;
      html += `<em>Recomendação: ${int.recommendation}</em></li>`;
    });
    html += '</ul></div>';
  }
  
  if (grouped.leve.length > 0) {
    html += '<div style="background: #fff9e6; border-left: 4px solid #fc0; padding: 10px; margin-bottom: 10px;">';
    html += '<strong style="color: #990;">ℹ️ INTERAÇÕES LEVES:</strong><ul>';
    grouped.leve.forEach(int => {
      html += `<li><strong>${int.drug1} + ${int.drug2}</strong>: ${int.description}<br>`;
      html += `<em>Recomendação: ${int.recommendation}</em></li>`;
    });
    html += '</ul></div>';
  }
  
  html += '</div>';
  return html;
}
