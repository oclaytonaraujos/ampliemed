/**
 * AmplieMed — Export Service
 * Funções para exportar dados em CSV, JSON e PDF.
 * PDF gerado via HTML + window.print() — sem dependência de biblioteca externa.
 */

// ─── CSV Export ───────────────────────────────────────────────────────────────

export function exportToCSV(
  data: Record<string, unknown>[],
  filename: string,
  columns?: { key: string; label: string }[]
): void {
  if (!data.length) return;

  const cols = columns || Object.keys(data[0]).map(k => ({ key: k, label: k }));
  const header = cols.map(c => `"${c.label}"`).join(',');
  const rows = data.map(row =>
    cols.map(c => {
      const val = row[c.key];
      const str = val === null || val === undefined ? '' : String(val);
      return `"${str.replace(/"/g, '""')}"`;
    }).join(',')
  );

  const bom = '\uFEFF'; // UTF-8 BOM for Excel
  const csv = bom + [header, ...rows].join('\n');
  downloadBlob(csv, `${filename}.csv`, 'text/csv;charset=utf-8');
}

// ─── JSON Export ──────────────────────────────────────────────────────────────

export function exportToJSON(data: unknown, filename: string): void {
  const json = JSON.stringify(data, null, 2);
  downloadBlob(json, `${filename}.json`, 'application/json');
}

// ─── Blob download helper ─────────────────────────────────────────────────────

export function downloadBlob(content: string, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── PDF via HTML/print ───────────────────────────────────────────────────────

export function exportToPDF(
  title: string,
  subtitle: string,
  columns: { header: string; dataKey: string }[],
  rows: Record<string, unknown>[],
  filename: string,
  summaryRows?: { label: string; value: string }[]
): void {
  const now = new Date().toLocaleString('pt-BR');
  const dateStr = new Date().toISOString().split('T')[0];

  const summaryHtml = summaryRows?.length
    ? `<div class="summary">${summaryRows.map(s =>
        `<div class="kpi"><span class="kpi-value">${s.value}</span><span class="kpi-label">${s.label}</span></div>`
      ).join('')}</div>`
    : '';

  const thead = `<tr>${columns.map(c => `<th>${c.header}</th>`).join('')}</tr>`;
  const tbody = rows.map((row, i) =>
    `<tr class="${i % 2 === 0 ? 'even' : 'odd'}">${columns.map(c => {
      const val = row[c.dataKey];
      return `<td>${val === null || val === undefined ? '' : String(val)}</td>`;
    }).join('')}</tr>`
  ).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>${title} — AmplieMed</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; font-size: 11px; color: #111827; background: #fff; }
  .header { background: #111827; color: #fff; padding: 14px 20px; display: flex; justify-content: space-between; align-items: center; }
  .header-title { font-size: 16px; font-weight: 700; }
  .header-brand { font-size: 10px; color: #9ca3af; }
  .meta { padding: 12px 20px; border-bottom: 1px solid #e5e7eb; display: flex; justify-content: space-between; align-items: center; }
  .meta-title { font-size: 14px; font-weight: 600; color: #1d4ed8; }
  .meta-date { font-size: 10px; color: #6b7280; }
  .summary { display: flex; gap: 12px; padding: 12px 20px; background: #f8fafc; border-bottom: 1px solid #e5e7eb; }
  .kpi { background: #eff6ff; border: 1px solid #bfdbfe; padding: 8px 14px; min-width: 100px; }
  .kpi-value { display: block; font-size: 16px; font-weight: 700; color: #1d4ed8; }
  .kpi-label { display: block; font-size: 9px; color: #6b7280; margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em; }
  .table-wrap { padding: 16px 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 10px; }
  th { background: #111827; color: #fff; padding: 7px 10px; text-align: left; font-size: 9px; text-transform: uppercase; letter-spacing: 0.05em; }
  td { padding: 6px 10px; border-bottom: 1px solid #f3f4f6; }
  tr.odd td { background: #f9fafb; }
  tr.even td { background: #fff; }
  .footer { padding: 10px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: space-between; font-size: 9px; color: #9ca3af; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none; }
  }
</style>
</head>
<body>
<div class="header">
  <span class="header-title">AmplieMed</span>
  <span class="header-brand">Plataforma de Gestão Clínica</span>
</div>
<div class="meta">
  <div>
    <div class="meta-title">${title}</div>
    <div class="meta-date">${subtitle}</div>
  </div>
  <div class="meta-date">Gerado em: ${now}</div>
</div>
${summaryHtml}
<div class="table-wrap">
  <table>
    <thead>${thead}</thead>
    <tbody>${tbody}</tbody>
  </table>
</div>
<div class="footer">
  <span>AmplieMed © ${new Date().getFullYear()} — Conformidade LGPD/CFM</span>
  <span>${filename}_${dateStr} — ${rows.length} registros</span>
</div>
<script>window.onload = function() { window.print(); }</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=1100,height=750');
  if (win) {
    win.document.write(html);
    win.document.close();
  }
}

// ─── Pacientes CSV ────────────────────────────────────────────────────────────

export function exportPatients(patients: unknown[]): void {
  exportToCSV(patients as Record<string, unknown>[], `pacientes_${today()}`, [
    { key: 'name', label: 'Nome' },
    { key: 'cpf', label: 'CPF' },
    { key: 'birthDate', label: 'Data de Nascimento' },
    { key: 'gender', label: 'Sexo' },
    { key: 'phone', label: 'Telefone' },
    { key: 'email', label: 'E-mail' },
    { key: 'insurance', label: 'Convênio' },
    { key: 'status', label: 'Status' },
    { key: 'createdAt', label: 'Cadastrado em' },
  ]);
}

export function exportPatientsPDF(patients: unknown[]): void {
  const list = patients as Record<string, unknown>[];
  exportToPDF(
    'Relatório de Pacientes',
    `Total: ${list.length} pacientes`,
    [
      { header: 'Nome', dataKey: 'name' },
      { header: 'CPF', dataKey: 'cpf' },
      { header: 'Data Nasc.', dataKey: 'birthDate' },
      { header: 'Sexo', dataKey: 'gender' },
      { header: 'Telefone', dataKey: 'phone' },
      { header: 'E-mail', dataKey: 'email' },
      { header: 'Convênio', dataKey: 'insurance' },
      { header: 'Status', dataKey: 'status' },
    ],
    list,
    'pacientes',
    [
      { label: 'Total', value: String(list.length) },
      { label: 'Ativos', value: String(list.filter((p) => p['status'] === 'active').length) },
      { label: 'Inativos', value: String(list.filter((p) => p['status'] === 'inactive').length) },
    ]
  );
}

// ─── Consultas CSV/PDF ────────────────────────────────────────────────────────

export function exportAppointments(appointments: unknown[]): void {
  exportToCSV(appointments as Record<string, unknown>[], `consultas_${today()}`, [
    { key: 'date', label: 'Data' },
    { key: 'time', label: 'Hora' },
    { key: 'patientName', label: 'Paciente' },
    { key: 'doctorName', label: 'Médico' },
    { key: 'specialty', label: 'Especialidade' },
    { key: 'type', label: 'Tipo' },
    { key: 'status', label: 'Status' },
    { key: 'paymentStatus', label: 'Pagamento' },
    { key: 'consultationValue', label: 'Valor (R$)' },
  ]);
}

export function exportAppointmentsPDF(appointments: unknown[]): void {
  const list = appointments as Record<string, unknown>[];
  const totalValue = list.reduce((s, a) => s + (Number(a['consultationValue']) || 0), 0);
  exportToPDF(
    'Relatório de Consultas',
    `Total: ${list.length} consultas`,
    [
      { header: 'Data', dataKey: 'date' },
      { header: 'Hora', dataKey: 'time' },
      { header: 'Paciente', dataKey: 'patientName' },
      { header: 'Médico', dataKey: 'doctorName' },
      { header: 'Especialidade', dataKey: 'specialty' },
      { header: 'Tipo', dataKey: 'type' },
      { header: 'Status', dataKey: 'status' },
      { header: 'Valor', dataKey: 'consultationValue' },
    ],
    list,
    'consultas',
    [
      { label: 'Total', value: String(list.length) },
      { label: 'Realizadas', value: String(list.filter((a) => a['status'] === 'realizado').length) },
      { label: 'Receita', value: `R$ ${totalValue.toFixed(2)}` },
    ]
  );
}

// ─── Financeiro CSV/PDF ───────────────────────────────────────────────────────

export function exportFinancial(payments: unknown[]): void {
  exportToCSV(payments as Record<string, unknown>[], `financeiro_${today()}`, [
    { key: 'date', label: 'Data' },
    { key: 'patient', label: 'Paciente' },
    { key: 'type', label: 'Tipo' },
    { key: 'amount', label: 'Valor (R$)' },
    { key: 'method', label: 'Forma de Pagamento' },
    { key: 'status', label: 'Status' },
  ]);
}

export function exportFinancialPDF(payments: unknown[], receivables: unknown[], payables: unknown[]): void {
  const pmts = payments as Record<string, unknown>[];
  const pays = payables as Record<string, unknown>[];
  const totalReceived = pmts.filter(p => p['status'] === 'received').reduce((s, p) => s + (Number(p['amount']) || 0), 0);
  const totalPaid = pays.filter(p => p['status'] === 'paid').reduce((s, p) => s + (Number(p['amount']) || 0), 0);
  exportToPDF(
    'Relatório Financeiro',
    `Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
    [
      { header: 'Data', dataKey: 'date' },
      { header: 'Paciente/Fornecedor', dataKey: 'patient' },
      { header: 'Tipo', dataKey: 'type' },
      { header: 'Valor (R$)', dataKey: 'amount' },
      { header: 'Método', dataKey: 'method' },
      { header: 'Status', dataKey: 'status' },
    ],
    pmts,
    'financeiro',
    [
      { label: 'Receita', value: `R$ ${totalReceived.toFixed(2)}` },
      { label: 'Despesas', value: `R$ ${totalPaid.toFixed(2)}` },
      { label: 'Saldo', value: `R$ ${(totalReceived - totalPaid).toFixed(2)}` },
    ]
  );
}

// ─── Estoque CSV ──────────────────────────────────────────────────────────────

export function exportStock(items: unknown[]): void {
  exportToCSV(items as Record<string, unknown>[], `estoque_${today()}`, [
    { key: 'name', label: 'Item' },
    { key: 'category', label: 'Categoria' },
    { key: 'quantity', label: 'Quantidade' },
    { key: 'unit', label: 'Unidade' },
    { key: 'minQuantity', label: 'Qtd. Mínima' },
    { key: 'status', label: 'Status' },
    { key: 'expiry', label: 'Validade' },
    { key: 'supplier', label: 'Fornecedor' },
    { key: 'batch', label: 'Lote' },
  ]);
}

// ─── Exames CSV ───────────────────────────────────────────────────────────────

export function exportExams(exams: unknown[]): void {
  exportToCSV(exams as Record<string, unknown>[], `exames_${today()}`, [
    { key: 'requestDate', label: 'Data Solicitação' },
    { key: 'patientName', label: 'Paciente' },
    { key: 'examType', label: 'Tipo de Exame' },
    { key: 'requestedBy', label: 'Médico Solicitante' },
    { key: 'status', label: 'Status' },
    { key: 'priority', label: 'Prioridade' },
    { key: 'laboratory', label: 'Laboratório' },
  ]);
}

// ─── Audit Log CSV/PDF ────────────────────────────────────────────────────────

export function exportAuditLog(entries: unknown[]): void {
  exportToCSV(entries as Record<string, unknown>[], `auditoria_${today()}`, [
    { key: 'timestamp', label: 'Data/Hora' },
    { key: 'user', label: 'Usuário' },
    { key: 'userRole', label: 'Perfil' },
    { key: 'action', label: 'Ação' },
    { key: 'module', label: 'Módulo' },
    { key: 'description', label: 'Descrição' },
    { key: 'ipAddress', label: 'IP' },
    { key: 'status', label: 'Status' },
  ]);
}

export function exportAuditLogPDF(entries: unknown[]): void {
  const list = entries as Record<string, unknown>[];
  exportToPDF(
    'Log de Auditoria — AmplieMed',
    `Conformidade LGPD/CFM — ${list.length} registros`,
    [
      { header: 'Data/Hora', dataKey: 'timestamp' },
      { header: 'Usuário', dataKey: 'user' },
      { header: 'Perfil', dataKey: 'userRole' },
      { header: 'Ação', dataKey: 'action' },
      { header: 'Módulo', dataKey: 'module' },
      { header: 'Descrição', dataKey: 'description' },
      { header: 'IP', dataKey: 'ipAddress' },
      { header: 'Status', dataKey: 'status' },
    ],
    list,
    'auditoria'
  );
}

// ─── Profissionais CSV ────────────────────────────────────────────────────────

export function exportProfessionals(professionals: unknown[]): void {
  exportToCSV(professionals as Record<string, unknown>[], `profissionais_${today()}`, [
    { key: 'name', label: 'Nome' },
    { key: 'crm', label: 'CRM' },
    { key: 'specialty', label: 'Especialidade' },
    { key: 'email', label: 'E-mail' },
    { key: 'phone', label: 'Telefone' },
    { key: 'status', label: 'Status' },
  ]);
}

// ─── Import CSV ───────────────────────────────────────────────────────────────

export function importFromCSV(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length < 2) { reject(new Error('Arquivo vazio ou inválido')); return; }

        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        const rows = lines.slice(1).map(line => {
          const values = line.match(/(".*?"|[^,]+|(?<=,)(?=,))/g) || [];
          const row: Record<string, string> = {};
          headers.forEach((h, i) => {
            row[h] = (values[i] || '').replace(/^"|"$/g, '').trim();
          });
          return row;
        });

        resolve(rows);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file, 'UTF-8');
  });
}

export function importFromJSON<T>(file: File): Promise<T> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        resolve(data as T);
      } catch {
        reject(new Error('JSON inválido'));
      }
    };
    reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
    reader.readAsText(file);
  });
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().split('T')[0];
}
