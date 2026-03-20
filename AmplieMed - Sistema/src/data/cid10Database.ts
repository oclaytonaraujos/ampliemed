/**
 * Base de dados CID-10 (Classificação Internacional de Doenças - 10ª Revisão)
 * Versão reduzida com as principais doenças por categoria
 */

export interface CID10 {
  code: string;
  description: string;
  category: string;
}

export const cid10Database: CID10[] = [
  // Doenças infecciosas e parasitárias (A00-B99)
  { code: 'A00', description: 'Cólera', category: 'Doenças Infecciosas' },
  { code: 'A01.0', description: 'Febre tifóide', category: 'Doenças Infecciosas' },
  { code: 'A09', description: 'Diarreia e gastroenterite de origem infecciosa presumível', category: 'Doenças Infecciosas' },
  { code: 'A15', description: 'Tuberculose respiratória', category: 'Doenças Infecciosas' },
  { code: 'A90', description: 'Dengue [dengue clássico]', category: 'Doenças Infecciosas' },
  { code: 'B01', description: 'Varicela [catapora]', category: 'Doenças Infecciosas' },
  { code: 'B05', description: 'Sarampo', category: 'Doenças Infecciosas' },
  { code: 'B06', description: 'Rubéola', category: 'Doenças Infecciosas' },
  { code: 'B20', description: 'Doença pelo HIV resultando em doenças infecciosas e parasitárias', category: 'Doenças Infecciosas' },
  
  // Neoplasias (C00-D48)
  { code: 'C15', description: 'Neoplasia maligna do esôfago', category: 'Neoplasias' },
  { code: 'C16', description: 'Neoplasia maligna do estômago', category: 'Neoplasias' },
  { code: 'C18', description: 'Neoplasia maligna do cólon', category: 'Neoplasias' },
  { code: 'C34', description: 'Neoplasia maligna dos brônquios e dos pulmões', category: 'Neoplasias' },
  { code: 'C50', description: 'Neoplasia maligna da mama', category: 'Neoplasias' },
  { code: 'C61', description: 'Neoplasia maligna da próstata', category: 'Neoplasias' },
  { code: 'D50', description: 'Anemia por deficiência de ferro', category: 'Neoplasias' },
  
  // Doenças endócrinas, nutricionais e metabólicas (E00-E90)
  { code: 'E10', description: 'Diabetes mellitus insulino-dependente', category: 'Endócrinas e Metabólicas' },
  { code: 'E11', description: 'Diabetes mellitus não-insulino-dependente', category: 'Endócrinas e Metabólicas' },
  { code: 'E14', description: 'Diabetes mellitus não especificado', category: 'Endócrinas e Metabólicas' },
  { code: 'E66', description: 'Obesidade', category: 'Endócrinas e Metabólicas' },
  { code: 'E78', description: 'Distúrbios do metabolismo de lipoproteínas e outras lipidemias', category: 'Endócrinas e Metabólicas' },
  { code: 'E03', description: 'Outros hipotireoidismos', category: 'Endócrinas e Metabólicas' },
  { code: 'E05', description: 'Tireotoxicose [hipertireoidismo]', category: 'Endócrinas e Metabólicas' },
  
  // Transtornos mentais e comportamentais (F00-F99)
  { code: 'F10', description: 'Transtornos mentais e comportamentais devidos ao uso de álcool', category: 'Transtornos Mentais' },
  { code: 'F20', description: 'Esquizofrenia', category: 'Transtornos Mentais' },
  { code: 'F31', description: 'Transtorno afetivo bipolar', category: 'Transtornos Mentais' },
  { code: 'F32', description: 'Episódios depressivos', category: 'Transtornos Mentais' },
  { code: 'F33', description: 'Transtorno depressivo recorrente', category: 'Transtornos Mentais' },
  { code: 'F41', description: 'Outros transtornos ansiosos', category: 'Transtornos Mentais' },
  { code: 'F41.0', description: 'Transtorno de pânico [ansiedade paroxística episódica]', category: 'Transtornos Mentais' },
  { code: 'F41.1', description: 'Ansiedade generalizada', category: 'Transtornos Mentais' },
  
  // Doenças do sistema nervoso (G00-G99)
  { code: 'G40', description: 'Epilepsia', category: 'Sistema Nervoso' },
  { code: 'G43', description: 'Enxaqueca', category: 'Sistema Nervoso' },
  { code: 'G44', description: 'Outras síndromes de algias cefálicas', category: 'Sistema Nervoso' },
  { code: 'G45', description: 'Acidentes vasculares cerebrais isquêmicos transitórios e síndromes correlatas', category: 'Sistema Nervoso' },
  { code: 'G47.0', description: 'Distúrbios do início e da manutenção do sono [insônias]', category: 'Sistema Nervoso' },
  { code: 'G56.0', description: 'Síndrome do túnel do carpo', category: 'Sistema Nervoso' },
  
  // Doenças do olho e anexos (H00-H59)
  { code: 'H10', description: 'Conjuntivite', category: 'Olho e Anexos' },
  { code: 'H25', description: 'Catarata senil', category: 'Olho e Anexos' },
  { code: 'H40', description: 'Glaucoma', category: 'Olho e Anexos' },
  { code: 'H52.0', description: 'Hipermetropia', category: 'Olho e Anexos' },
  { code: 'H52.1', description: 'Miopia', category: 'Olho e Anexos' },
  { code: 'H52.2', description: 'Astigmatismo', category: 'Olho e Anexos' },
  
  // Doenças do ouvido e da apófise mastóide (H60-H95)
  { code: 'H60', description: 'Otite externa', category: 'Ouvido' },
  { code: 'H65', description: 'Otite média não supurativa', category: 'Ouvido' },
  { code: 'H66', description: 'Otite média supurativa e as não especificadas', category: 'Ouvido' },
  { code: 'H81', description: 'Transtornos da função vestibular', category: 'Ouvido' },
  { code: 'H90', description: 'Perda de audição por transtorno de condução e/ou neuro-sensorial', category: 'Ouvido' },
  
  // Doenças do aparelho circulatório (I00-I99)
  { code: 'I10', description: 'Hipertensão essencial (primária)', category: 'Aparelho Circulatório' },
  { code: 'I11', description: 'Doença cardíaca hipertensiva', category: 'Aparelho Circulatório' },
  { code: 'I20', description: 'Angina pectoris', category: 'Aparelho Circulatório' },
  { code: 'I21', description: 'Infarto agudo do miocárdio', category: 'Aparelho Circulatório' },
  { code: 'I25', description: 'Doença isquêmica crônica do coração', category: 'Aparelho Circulatório' },
  { code: 'I48', description: 'Flutter e fibrilação atrial', category: 'Aparelho Circulatório' },
  { code: 'I50', description: 'Insuficiência cardíaca', category: 'Aparelho Circulatório' },
  { code: 'I63', description: 'Infarto cerebral', category: 'Aparelho Circulatório' },
  { code: 'I64', description: 'Acidente vascular cerebral, não especificado como hemorrágico ou isquêmico', category: 'Aparelho Circulatório' },
  { code: 'I73.9', description: 'Doença vascular periférica não especificada', category: 'Aparelho Circulatório' },
  { code: 'I83', description: 'Varizes dos membros inferiores', category: 'Aparelho Circulatório' },
  
  // Doenças do aparelho respiratório (J00-J99)
  { code: 'J00', description: 'Nasofaringite aguda [resfriado comum]', category: 'Aparelho Respiratório' },
  { code: 'J01', description: 'Sinusite aguda', category: 'Aparelho Respiratório' },
  { code: 'J02', description: 'Faringite aguda', category: 'Aparelho Respiratório' },
  { code: 'J03', description: 'Amigdalite aguda', category: 'Aparelho Respiratório' },
  { code: 'J06', description: 'Infecções agudas das vias aéreas superiores de localizações múltiplas e não especificadas', category: 'Aparelho Respiratório' },
  { code: 'J18', description: 'Pneumonia por microorganismo não especificado', category: 'Aparelho Respiratório' },
  { code: 'J20', description: 'Bronquite aguda', category: 'Aparelho Respiratório' },
  { code: 'J32', description: 'Sinusite crônica', category: 'Aparelho Respiratório' },
  { code: 'J40', description: 'Bronquite não especificada como aguda ou crônica', category: 'Aparelho Respiratório' },
  { code: 'J44', description: 'Outras doenças pulmonares obstrutivas crônicas', category: 'Aparelho Respiratório' },
  { code: 'J45', description: 'Asma', category: 'Aparelho Respiratório' },
  { code: 'J45.0', description: 'Asma predominantemente alérgica', category: 'Aparelho Respiratório' },
  
  // Doenças do aparelho digestivo (K00-K93)
  { code: 'K21', description: 'Doença de refluxo gastroesofágico', category: 'Aparelho Digestivo' },
  { code: 'K25', description: 'Úlcera gástrica', category: 'Aparelho Digestivo' },
  { code: 'K26', description: 'Úlcera duodenal', category: 'Aparelho Digestivo' },
  { code: 'K29', description: 'Gastrite e duodenite', category: 'Aparelho Digestivo' },
  { code: 'K30', description: 'Dispepsia', category: 'Aparelho Digestivo' },
  { code: 'K35', description: 'Apendicite aguda', category: 'Aparelho Digestivo' },
  { code: 'K40', description: 'Hérnia inguinal', category: 'Aparelho Digestivo' },
  { code: 'K58', description: 'Síndrome do cólon irritável', category: 'Aparelho Digestivo' },
  { code: 'K59.0', description: 'Constipação', category: 'Aparelho Digestivo' },
  { code: 'K64', description: 'Hemorróidas e trombose venosa perianal', category: 'Aparelho Digestivo' },
  { code: 'K80', description: 'Colelitíase [cálculo da vesícula biliar]', category: 'Aparelho Digestivo' },
  
  // Doenças da pele e do tecido subcutâneo (L00-L99)
  { code: 'L20', description: 'Dermatite atópica', category: 'Pele e Tecido Subcutâneo' },
  { code: 'L23', description: 'Dermatites alérgicas de contato', category: 'Pele e Tecido Subcutâneo' },
  { code: 'L29', description: 'Prurido', category: 'Pele e Tecido Subcutâneo' },
  { code: 'L30', description: 'Outras dermatites', category: 'Pele e Tecido Subcutâneo' },
  { code: 'L40', description: 'Psoríase', category: 'Pele e Tecido Subcutâneo' },
  { code: 'L50', description: 'Urticária', category: 'Pele e Tecido Subcutâneo' },
  { code: 'L70', description: 'Acne', category: 'Pele e Tecido Subcutâneo' },
  
  // Doenças do sistema osteomuscular (M00-M99)
  { code: 'M06', description: 'Outras artrites reumatóides', category: 'Sistema Osteomuscular' },
  { code: 'M15', description: 'Poliartrose', category: 'Sistema Osteomuscular' },
  { code: 'M16', description: 'Coxartrose [artrose da articulação do quadril]', category: 'Sistema Osteomuscular' },
  { code: 'M17', description: 'Gonartrose [artrose do joelho]', category: 'Sistema Osteomuscular' },
  { code: 'M19', description: 'Outras artroses', category: 'Sistema Osteomuscular' },
  { code: 'M25.5', description: 'Dor articular', category: 'Sistema Osteomuscular' },
  { code: 'M47', description: 'Espondilose', category: 'Sistema Osteomuscular' },
  { code: 'M51', description: 'Outros transtornos de discos intervertebrais', category: 'Sistema Osteomuscular' },
  { code: 'M54', description: 'Dorsalgia', category: 'Sistema Osteomuscular' },
  { code: 'M54.1', description: 'Radiculopatia', category: 'Sistema Osteomuscular' },
  { code: 'M54.2', description: 'Cervicalgia', category: 'Sistema Osteomuscular' },
  { code: 'M54.3', description: 'Ciática', category: 'Sistema Osteomuscular' },
  { code: 'M54.4', description: 'Lumbago com ciática', category: 'Sistema Osteomuscular' },
  { code: 'M54.5', description: 'Dor lombar baixa', category: 'Sistema Osteomuscular' },
  { code: 'M62.6', description: 'Distensão muscular', category: 'Sistema Osteomuscular' },
  { code: 'M75', description: 'Lesões do ombro', category: 'Sistema Osteomuscular' },
  { code: 'M77', description: 'Outras entesopatias', category: 'Sistema Osteomuscular' },
  { code: 'M79.1', description: 'Mialgia', category: 'Sistema Osteomuscular' },
  { code: 'M79.3', description: 'Paniculite não especificada', category: 'Sistema Osteomuscular' },
  { code: 'M81', description: 'Osteoporose sem fratura patológica', category: 'Sistema Osteomuscular' },
  
  // Doenças do aparelho geniturinário (N00-N99)
  { code: 'N10', description: 'Nefrite túbulo-intersticial aguda [pielonefrite aguda]', category: 'Aparelho Geniturinário' },
  { code: 'N18', description: 'Insuficiência renal crônica', category: 'Aparelho Geniturinário' },
  { code: 'N20', description: 'Cálculo do rim e do ureter', category: 'Aparelho Geniturinário' },
  { code: 'N30', description: 'Cistite', category: 'Aparelho Geniturinário' },
  { code: 'N39.0', description: 'Infecção do trato urinário de localização não especificada', category: 'Aparelho Geniturinário' },
  { code: 'N40', description: 'Hiperplasia da próstata', category: 'Aparelho Geniturinário' },
  { code: 'N70', description: 'Salpingite e ooforite', category: 'Aparelho Geniturinário' },
  { code: 'N76', description: 'Outras afecções inflamatórias da vagina e da vulva', category: 'Aparelho Geniturinário' },
  { code: 'N94.6', description: 'Dismenorreia não especificada', category: 'Aparelho Geniturinário' },
  
  // Gravidez, parto e puerpério (O00-O99)
  { code: 'O00', description: 'Gravidez ectópica', category: 'Gravidez e Parto' },
  { code: 'O13', description: 'Hipertensão gestacional [induzida pela gravidez] sem proteinúria significativa', category: 'Gravidez e Parto' },
  { code: 'O14', description: 'Hipertensão gestacional [induzida pela gravidez] com proteinúria significativa', category: 'Gravidez e Parto' },
  { code: 'O20', description: 'Hemorragia do início da gravidez', category: 'Gravidez e Parto' },
  { code: 'O24', description: 'Diabetes mellitus na gravidez', category: 'Gravidez e Parto' },
  { code: 'O80', description: 'Parto único espontâneo', category: 'Gravidez e Parto' },
  
  // Sintomas, sinais e achados anormais (R00-R99)
  { code: 'R05', description: 'Tosse', category: 'Sintomas e Sinais' },
  { code: 'R06.0', description: 'Dispneia', category: 'Sintomas e Sinais' },
  { code: 'R07', description: 'Dor de garganta e no peito', category: 'Sintomas e Sinais' },
  { code: 'R10', description: 'Dor abdominal e pélvica', category: 'Sintomas e Sinais' },
  { code: 'R11', description: 'Náusea e vômitos', category: 'Sintomas e Sinais' },
  { code: 'R19.7', description: 'Diarreia não especificada', category: 'Sintomas e Sinais' },
  { code: 'R50', description: 'Febre de origem desconhecida e de outras origens', category: 'Sintomas e Sinais' },
  { code: 'R51', description: 'Cefaleia', category: 'Sintomas e Sinais' },
  { code: 'R52', description: 'Dor não classificada em outra parte', category: 'Sintomas e Sinais' },
  { code: 'R53', description: 'Mal estar e fadiga', category: 'Sintomas e Sinais' },
  { code: 'R60.0', description: 'Edema localizado', category: 'Sintomas e Sinais' },
  
  // Lesões, envenenamentos (S00-T98)
  { code: 'S06', description: 'Traumatismo intracraniano', category: 'Lesões e Envenenamentos' },
  { code: 'S13', description: 'Luxação, entorse e distensão das articulações e dos ligamentos do pescoço', category: 'Lesões e Envenenamentos' },
  { code: 'S52', description: 'Fratura do antebraço', category: 'Lesões e Envenenamentos' },
  { code: 'S62', description: 'Fratura ao nível do punho e da mão', category: 'Lesões e Envenenamentos' },
  { code: 'S72', description: 'Fratura do fêmur', category: 'Lesões e Envenenamentos' },
  { code: 'S82', description: 'Fratura da perna, incluindo tornozelo', category: 'Lesões e Envenenamentos' },
  { code: 'S93', description: 'Luxação, entorse e distensão das articulações e dos ligamentos do tornozelo e do pé', category: 'Lesões e Envenenamentos' },
  { code: 'T14.1', description: 'Ferimento de região não especificada do corpo', category: 'Lesões e Envenenamentos' },
  { code: 'T30', description: 'Queimadura e corrosão, parte não especificada do corpo', category: 'Lesões e Envenenamentos' },
  { code: 'T78.3', description: 'Edema angioneurótico', category: 'Lesões e Envenenamentos' },
  { code: 'T78.4', description: 'Alergia não especificada', category: 'Lesões e Envenenamentos' },
  
  // Causas externas (V01-Y98)
  { code: 'W19', description: 'Queda sem especificação', category: 'Causas Externas' },
  { code: 'X44', description: 'Envenenamento [intoxicação] acidental por e exposição a outras drogas, medicamentos e substâncias biológicas não especificadas', category: 'Causas Externas' },
  
  // Fatores que influenciam o estado de saúde (Z00-Z99)
  { code: 'Z00', description: 'Exame geral e investigação de pessoas sem queixas ou diagnóstico relatado', category: 'Fatores de Saúde' },
  { code: 'Z01', description: 'Outros exames e investigações especiais de pessoas sem queixa ou diagnóstico relatado', category: 'Fatores de Saúde' },
  { code: 'Z23', description: 'Necessidade de imunização contra uma única doença bacteriana', category: 'Fatores de Saúde' },
  { code: 'Z30', description: 'Anticoncepção', category: 'Fatores de Saúde' },
  { code: 'Z34', description: 'Supervisão de gravidez normal', category: 'Fatores de Saúde' },
  { code: 'Z71', description: 'Pessoas em contato com os serviços de saúde para outros aconselhamentos e conselho médico, não classificados em outra parte', category: 'Fatores de Saúde' },
  { code: 'Z76.3', description: 'Pessoa em boa saúde acompanhando pessoa doente', category: 'Fatores de Saúde' },
];

/**
 * Busca CID-10 por código ou descrição
 */
export function searchCID10(query: string): CID10[] {
  const searchTerm = query.toLowerCase().trim();
  
  if (!searchTerm) return [];
  
  return cid10Database.filter(item => 
    item.code.toLowerCase().includes(searchTerm) ||
    item.description.toLowerCase().includes(searchTerm)
  ).slice(0, 20); // Limita a 20 resultados
}

/**
 * Busca CID-10 por categoria
 */
export function getCID10ByCategory(category: string): CID10[] {
  return cid10Database.filter(item => item.category === category);
}

/**
 * Obtém todas as categorias únicas
 */
export function getCID10Categories(): string[] {
  return Array.from(new Set(cid10Database.map(item => item.category)));
}

/**
 * Sugere CID-10 baseado em sintomas (IA simplificada)
 */
export function suggestCID10FromSymptoms(symptoms: string): CID10[] {
  const symptomsLower = symptoms.toLowerCase();
  const suggestions: CID10[] = [];
  
  // Mapeamento de sintomas para CIDs
  const symptomMap: { [key: string]: string[] } = {
    'febre': ['R50', 'A09', 'J18'],
    'tosse': ['R05', 'J20', 'J40', 'J45'],
    'dor de cabeça': ['R51', 'G43', 'G44'],
    'cefaleia': ['R51', 'G43', 'G44'],
    'náusea': ['R11', 'K30', 'K29'],
    'vômito': ['R11', 'A09', 'K30'],
    'diarreia': ['R19.7', 'A09', 'K58'],
    'dor abdominal': ['R10', 'K30', 'K35'],
    'dor no peito': ['R07', 'I20', 'I21'],
    'falta de ar': ['R06.0', 'I50', 'J45'],
    'dispneia': ['R06.0', 'I50', 'J45'],
    'pressão alta': ['I10', 'I11'],
    'hipertensão': ['I10', 'I11'],
    'diabetes': ['E11', 'E10', 'E14'],
    'dor nas costas': ['M54.5', 'M54', 'M47'],
    'lombar': ['M54.5', 'M54.4'],
    'ansiedade': ['F41.1', 'F41'],
    'depressão': ['F32', 'F33'],
    'gripe': ['J00', 'J06'],
    'resfriado': ['J00'],
    'sinusite': ['J01', 'J32'],
    'asma': ['J45', 'J45.0'],
    'alergia': ['T78.4', 'L50'],
  };
  
  // Busca por sintomas-chave
  for (const [symptom, codes] of Object.entries(symptomMap)) {
    if (symptomsLower.includes(symptom)) {
      codes.forEach(code => {
        const found = cid10Database.find(item => item.code === code);
        if (found && !suggestions.find(s => s.code === found.code)) {
          suggestions.push(found);
        }
      });
    }
  }
  
  return suggestions.slice(0, 5); // Retorna top 5 sugestões
}
