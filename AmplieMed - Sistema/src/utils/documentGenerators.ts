/**
 * Geradores de documentos médicos (PDF simulado e XML TISS)
 */

interface PrescriptionData {
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
}

interface PatientData {
  name: string;
  cpf: string;
  birthDate: string;
  age: number;
}

interface DoctorData {
  name: string;
  crm: string;
  specialty: string;
}

/**
 * Gera HTML para impressão de receita médica
 * Aceita tanto a assinatura clássica quanto uma simplificada para templates
 */
export function generatePrescriptionHTML(
  patientOrSimple: PatientData | { doctorName: string; crm: string; patientName: string; medications: any[] },
  doctorOrUndef?: DoctorData,
  prescriptions?: PrescriptionData[],
  date?: string
): string {
  // Simplified call from TemplatesModule
  if ('doctorName' in patientOrSimple) {
    const s = patientOrSimple as any;
    return generatePrescriptionHTMLInternal(
      { name: s.patientName, cpf: '', birthDate: '', age: 0 },
      { name: s.doctorName, crm: s.crm || '', specialty: '' },
      s.medications || [],
      new Date().toLocaleDateString('pt-BR')
    );
  }
  return generatePrescriptionHTMLInternal(patientOrSimple as PatientData, doctorOrUndef!, prescriptions!, date!);
}

function generatePrescriptionHTMLInternal(
  patient: PatientData,
  doctor: DoctorData,
  prescriptions: PrescriptionData[],
  date: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Receita Médica</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.6; }
    .header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 15px; margin-bottom: 20px; }
    .logo { font-size: 24pt; font-weight: bold; color: #0066cc; }
    .doctor-info { font-size: 10pt; color: #666; margin-top: 5px; }
    .patient-info { background: #f5f5f5; padding: 10px; margin-bottom: 20px; border-left: 4px solid #0066cc; }
    .prescription-title { font-size: 14pt; font-weight: bold; margin: 20px 0 10px 0; }
    .prescription-item { margin-bottom: 20px; padding: 10px; border: 1px solid #ddd; }
    .medication-name { font-weight: bold; font-size: 13pt; color: #0066cc; }
    .signature-section { margin-top: 60px; text-align: center; }
    .signature-line { border-top: 1px solid #000; width: 300px; margin: 0 auto; padding-top: 5px; }
    .footer { text-align: center; font-size: 9pt; color: #999; margin-top: 40px; }
    .digital-signature { background: #e3f2fd; padding: 10px; margin-top: 20px; border: 1px dashed #0066cc; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AmplieMed</div>
    <div class="doctor-info">
      ${doctor.name} - CRM: ${doctor.crm}<br>
      ${doctor.specialty}<br>
      Telefone: (11) 3456-7890 | Email: contato@ampliemed.com.br
    </div>
  </div>

  <div class="patient-info">
    <strong>Paciente:</strong> ${patient.name}<br>
    <strong>CPF:</strong> ${patient.cpf} | <strong>Idade:</strong> ${patient.age} anos<br>
    <strong>Data:</strong> ${date}
  </div>

  <div class="prescription-title">ℹ️ PRESCRIÇÃO MÉDICA</div>

  ${prescriptions.map((rx, index) => `
    <div class="prescription-item">
      <div class="medication-name">${index + 1}. ${rx.medication}</div>
      <div style="margin-top: 8px;">
        <strong>Posologia:</strong> ${rx.dosage} - ${rx.frequency}<br>
        <strong>Duração do tratamento:</strong> ${rx.duration}<br>
        ${rx.instructions ? `<strong>Instruções:</strong> ${rx.instructions}` : ''}
      </div>
    </div>
  `).join('')}

  <div class="digital-signature">
    <strong>🔒 Assinatura Digital ICP-Brasil</strong><br>
    <small>Certificado A1: ${doctor.crm} | Data/Hora: ${new Date().toLocaleString('pt-BR')}</small><br>
    <small>Hash SHA-256: ${generateMockHash()}</small>
  </div>

  <div class="signature-section">
    <div class="signature-line">
      ${doctor.name}<br>
      CRM: ${doctor.crm} | ${doctor.specialty}
    </div>
  </div>

  <div class="footer">
    Esta receita foi gerada eletronicamente e possui validade jurídica com assinatura digital ICP-Brasil.<br>
    Verifique a autenticidade em: www.ampliemed.com.br/verificar
  </div>
</body>
</html>
  `;
}

/**
 * Gera HTML para impressão de atestado médico
 */
export function generateCertificateHTML(
  patientOrSimple: PatientData | { doctorName: string; crm: string; patientName: string; content: string },
  doctorOrUndef?: DoctorData,
  days?: number,
  reason?: string,
  date?: string
): string {
  if ('doctorName' in patientOrSimple) {
    const s = patientOrSimple as any;
    return generateCertificateHTMLInternal({ name: s.patientName, cpf: '', birthDate: '', age: 0 }, { name: s.doctorName, crm: s.crm || '', specialty: '' }, 1, s.content || '', new Date().toLocaleDateString('pt-BR'));
  }
  return generateCertificateHTMLInternal(patientOrSimple as PatientData, doctorOrUndef!, days!, reason!, date!);
}

function generateCertificateHTMLInternal(
  patient: PatientData,
  doctor: DoctorData,
  days: number,
  reason: string,
  date: string
): string {
  const startDate = new Date();
  const endDate = new Date();
  endDate.setDate(endDate.getDate() + days - 1);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Atestado Médico</title>
  <style>
    @page { size: A4; margin: 2cm; }
    body { font-family: Arial, sans-serif; font-size: 12pt; line-height: 1.8; }
    .header { text-align: center; border-bottom: 2px solid #0066cc; padding-bottom: 15px; margin-bottom: 40px; }
    .logo { font-size: 24pt; font-weight: bold; color: #0066cc; }
    .doctor-info { font-size: 10pt; color: #666; margin-top: 5px; }
    .certificate-title { text-align: center; font-size: 18pt; font-weight: bold; margin: 30px 0; text-transform: uppercase; }
    .content { text-align: justify; margin: 30px 0; font-size: 13pt; }
    .highlight { background: #fff3cd; padding: 2px 5px; }
    .signature-section { margin-top: 80px; text-align: center; }
    .signature-line { border-top: 1px solid #000; width: 300px; margin: 0 auto; padding-top: 5px; }
    .digital-signature { background: #e3f2fd; padding: 10px; margin-top: 30px; border: 1px dashed #0066cc; text-align: center; }
    .footer { text-align: center; font-size: 9pt; color: #999; margin-top: 40px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">AmplieMed</div>
    <div class="doctor-info">
      ${doctor.name} - CRM: ${doctor.crm}<br>
      ${doctor.specialty}<br>
      Av. Paulista, 1000 - São Paulo/SP | Tel: (11) 3456-7890
    </div>
  </div>

  <div class="certificate-title">Atestado Médico</div>

  <div class="content">
    <p>Atesto para os devidos fins que o(a) Sr(a). <strong>${patient.name}</strong>, 
    portador(a) do CPF <strong>${patient.cpf}</strong>, nascido(a) em <strong>${patient.birthDate}</strong>, 
    esteve sob meus cuidados médicos nesta data e necessita se afastar de suas atividades 
    pelo período de <span class="highlight"><strong>${days} (${numberToWords(days)}) ${days === 1 ? 'dia' : 'dias'}</strong></span>.</p>

    <p><strong>Período de afastamento:</strong> 
    ${startDate.toLocaleDateString('pt-BR')} a ${endDate.toLocaleDateString('pt-BR')}</p>

    ${reason ? `<p><strong>Observações médicas:</strong> ${reason}</p>` : ''}

    <p>Por ser verdade, firmo o presente.</p>
  </div>

  <div style="text-align: right; margin-top: 30px;">
    São Paulo, ${date}
  </div>

  <div class="digital-signature">
    <strong>🔒 Documento assinado digitalmente com certificado ICP-Brasil</strong><br>
    <small>Certificado A1: ${doctor.crm} | Data/Hora: ${new Date().toLocaleString('pt-BR')}</small><br>
    <small>Hash SHA-256: ${generateMockHash()}</small>
  </div>

  <div class="signature-section">
    <div class="signature-line">
      ${doctor.name}<br>
      CRM: ${doctor.crm} | ${doctor.specialty}
    </div>
  </div>

  <div class="footer">
    Este atestado foi gerado eletronicamente e possui validade jurídica com assinatura digital ICP-Brasil.<br>
    Verifique a autenticidade em: www.ampliemed.com.br/verificar
  </div>
</body>
</html>
  `;
}

/**
 * Gera XML no padrão TISS 3.05.00
 */
export function generateTISSXML(data: {
  patient: PatientData;
  doctor: DoctorData;
  procedures: Array<{ code: string; description: string; quantity: number; value: number }>;
  diagnosis: { cid10Code: string; cid10Description: string };
  date: string;
}): string {
  const totalValue = data.procedures.reduce((sum, proc) => sum + (proc.value * proc.quantity), 0);
  const guideNumber = `${Date.now()}`;

  return `<?xml version="1.0" encoding="UTF-8"?>
<ans:mensagemTISS xmlns:ans="http://www.ans.gov.br/padroes/tiss/schemas" 
                  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
                  xsi:schemaLocation="http://www.ans.gov.br/padroes/tiss/schemas TISS_3_05_00.xsd">
  
  <ans:cabecalho>
    <ans:identificacaoTransacao>
      <ans:tipoTransacao>ENVIO_LOTE_GUIAS</ans:tipoTransacao>
      <ans:sequencialTransacao>${guideNumber}</ans:sequencialTransacao>
      <ans:dataRegistroTransacao>${data.date.split('/').reverse().join('-')}</ans:dataRegistroTransacao>
      <ans:horaRegistroTransacao>${new Date().toTimeString().split(' ')[0]}</ans:horaRegistroTransacao>
    </ans:identificacaoTransacao>
    
    <ans:origem>
      <ans:identificacaoPrestador>
        <ans:codigoPrestadorNaOperadora>000001</ans:codigoPrestadorNaOperadora>
      </ans:identificacaoPrestador>
    </ans:origem>
    
    <ans:destino>
      <ans:registroANS>123456</ans:registroANS>
    </ans:destino>
    
    <ans:versaoPadrao>3.05.00</ans:versaoPadrao>
  </ans:cabecalho>
  
  <ans:prestadorParaOperadora>
    <ans:loteGuias>
      <ans:numeroLote>1</ans:numeroLote>
      
      <ans:guiasConsulta>
        <ans:guiaConsulta>
          <ans:cabecalhoGuia>
            <ans:registroANS>123456</ans:registroANS>
            <ans:numeroGuiaPrestador>${guideNumber}</ans:numeroGuiaPrestador>
          </ans:cabecalhoGuia>
          
          <ans:dadosBeneficiario>
            <ans:nomeBeneficiario>${escapeXML(data.patient.name)}</ans:nomeBeneficiario>
            <ans:numeroCPF>${data.patient.cpf.replace(/\D/g, '')}</ans:numeroCPF>
            <ans:dataNascimento>${data.patient.birthDate.split('/').reverse().join('-')}</ans:dataNascimento>
          </ans:dadosBeneficiario>
          
          <ans:dadosProfissionalExecutante>
            <ans:nomeProfissional>${escapeXML(data.doctor.name)}</ans:nomeProfissional>
            <ans:conselhoProfissional>06</ans:conselhoProfissional>
            <ans:numeroConselhoProfissional>${data.doctor.crm}</ans:numeroConselhoProfissional>
            <ans:UF>SP</ans:UF>
            <ans:CBOS>225120</ans:CBOS>
          </ans:dadosProfissionalExecutante>
          
          <ans:dadosAtendimento>
            <ans:dataAtendimento>${data.date.split('/').reverse().join('-')}</ans:dataAtendimento>
            <ans:indicacaoAcidente>9</ans:indicacaoAcidente>
            <ans:tipoConsulta>1</ans:tipoConsulta>
          </ans:dadosAtendimento>
          
          <ans:procedimentosExecutados>
            ${data.procedures.map((proc, index) => `
            <ans:procedimentoExecutado>
              <ans:sequencialItem>${index + 1}</ans:sequencialItem>
              <ans:dataExecucao>${data.date.split('/').reverse().join('-')}</ans:dataExecucao>
              <ans:procedimento>
                <ans:codigoTabela>22</ans:codigoTabela>
                <ans:codigoProcedimento>${proc.code}</ans:codigoProcedimento>
                <ans:descricaoProcedimento>${escapeXML(proc.description)}</ans:descricaoProcedimento>
              </ans:procedimento>
              <ans:quantidadeExecutada>${proc.quantity}</ans:quantidadeExecutada>
              <ans:valorUnitario>${proc.value.toFixed(2)}</ans:valorUnitario>
              <ans:valorTotal>${(proc.value * proc.quantity).toFixed(2)}</ans:valorTotal>
            </ans:procedimentoExecutado>
            `).join('')}
          </ans:procedimentosExecutados>
          
          <ans:observacao>
            <ans:diagnostico>
              <ans:codigoCID10>${data.diagnosis.cid10Code}</ans:codigoCID10>
              <ans:descricaoDiagnostico>${escapeXML(data.diagnosis.cid10Description)}</ans:descricaoDiagnostico>
            </ans:diagnostico>
          </ans:observacao>
          
          <ans:valorTotal>
            <ans:valorProcedimentos>${totalValue.toFixed(2)}</ans:valorProcedimentos>
            <ans:valorTotal>${totalValue.toFixed(2)}</ans:valorTotal>
          </ans:valorTotal>
          
          <ans:assinaturaDigital>
            <ans:tipoAssinatura>ICP-Brasil</ans:tipoAssinatura>
            <ans:hashDocumento>${generateMockHash()}</ans:hashDocumento>
            <ans:dataHoraAssinatura>${new Date().toISOString()}</ans:dataHoraAssinatura>
          </ans:assinaturaDigital>
        </ans:guiaConsulta>
      </ans:guiasConsulta>
    </ans:loteGuias>
  </ans:prestadorParaOperadora>
  
  <ans:epilogo>
    <ans:hash>${generateMockHash()}</ans:hash>
  </ans:epilogo>
  
</ans:mensagemTISS>`;
}

/**
 * Gera hash SHA-256 simulado
 */
function generateMockHash(): string {
  const chars = '0123456789abcdef';
  let hash = '';
  for (let i = 0; i < 64; i++) {
    hash += chars[Math.floor(Math.random() * chars.length)];
  }
  return hash;
}

/**
 * Escapa caracteres especiais para XML
 */
function escapeXML(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Converte número em extenso (simplificado)
 */
function numberToWords(num: number): string {
  const words = [
    '', 'um', 'dois', 'três', 'quatro', 'cinco', 'seis', 'sete', 'oito', 'nove', 'dez',
    'onze', 'doze', 'treze', 'quatorze', 'quinze', 'dezesseis', 'dezessete', 'dezoito', 'dezenove', 'vinte',
    'vinte e um', 'vinte e dois', 'vinte e três', 'vinte e quatro', 'vinte e cinco', 'vinte e seis', 'vinte e sete', 'vinte e oito', 'vinte e nove', 'trinta'
  ];
  return words[num] || num.toString();
}

/**
 * Baixa documento HTML como PDF (simulado via impressão do navegador)
 */
export function downloadPDF(html: string, filename: string): void {
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    
    setTimeout(() => {
      printWindow.print();
    }, 500);
  }
}

/**
 * Baixa XML como arquivo
 */
export function downloadXML(xml: string, filename: string): void {
  const blob = new Blob([xml], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

/**
 * Simulação de assinatura digital ICP-Brasil
 */
export function signDocumentICPBrasil(content: string, doctorName?: string, crm?: string): {
  signed: boolean;
  certificate: string;
  timestamp: string;
  hash: string;
} {
  return {
    signed: true,
    certificate: `ICP-Brasil A1 - ${doctorName || 'Médico'}${crm ? ` CRM: ${crm}` : ''}`,
    timestamp: new Date().toISOString(),
    hash: generateMockHash(),
  };
}
