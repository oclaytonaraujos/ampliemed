# Correção de Sincronização do Dashboard

## Problema Identificado

Os dados do Dashboard não estavam refletindo o estado real do banco de dados Supabase porque os **status derivados** não eram calculados automaticamente quando os dados eram carregados. Isso afetava os seguintes KPIs:

1. **Receita Mensal** - Funcionando ✅
2. **Taxa de Ocupação** - Funcionando ✅
3. **Exames Pendentes** - Funcionando ✅
4. **Estoque Crítico** - ❌ Não calculava status baseado em quantidade/validade
5. **A Receber Vencido** - ❌ Não calculava status 'overdue' baseado em datas vencidas
6. **Receitas vs Despesas** - ❌ Não calculava payables vencidos para despesas

## Solução Implementada

### 1. Funções de Cálculo de Status Automático

Adicionei três funções auxiliares em `/utils/dataMappers.ts`:

#### `calculateReceivableStatus(dueDate, currentStatus)`
- Se status já é 'received', mantém
- Se `due_date` < hoje → retorna 'overdue'
- Caso contrário → retorna 'pending'

#### `calculatePayableStatus(dueDate, currentStatus)`
- Se status já é 'paid', mantém
- Se `due_date` < hoje → retorna 'overdue'
- Caso contrário → retorna 'pending'

#### `calculateStockStatus(quantity, minQuantity, expiry)`
- Verifica primeiro se está vencido (expiry < hoje) → retorna 'vencido'
- Se quantity === 0 → retorna 'critico'
- Se quantity <= minQuantity → retorna 'critico'
- Se quantity <= minQuantity * 1.5 → retorna 'baixo'
- Caso contrário → retorna 'ok'

### 2. Integração nos Mappers

Os status calculados são aplicados automaticamente quando os dados são carregados do banco:

```typescript
// ✅ Stock Items (linha ~419)
export function stockItemFromRow(row: any): any {
  return {
    // ... outros campos
    status: calculateStockStatus(row.quantity, row.min_quantity, row.expiry) || 'ok',
  };
}

// ✅ Receivables (linha ~564)
export function receivableFromRow(row: any): any {
  return {
    // ... outros campos
    status: calculateReceivableStatus(row.due_date, row.status) || 'pending',
  };
}

// ✅ Payables (linha ~580)
export function payableFromRow(row: any): any {
  return {
    // ... outros campos
    status: calculatePayableStatus(row.due_date, row.status) || 'pending',
  };
}
```

## Impacto nos KPIs do Dashboard

### ✅ Estoque Crítico
```typescript
const criticalStock = stockItems.filter(s => 
  s.status === 'critico' || s.status === 'baixo'
).length;
```
Agora identifica corretamente:
- Items com quantidade zero
- Items abaixo do estoque mínimo
- Items próximos do estoque mínimo (até 1.5x)
- Items vencidos

### ✅ A Receber Vencido
```typescript
const overdueReceivables = financialReceivables.filter(r => 
  r.status === 'overdue'
).length;
```
Agora identifica corretamente contas a receber com data de vencimento no passado.

### ✅ Receitas vs Despesas
```typescript
const despesas = financialPayables
  .filter(p => {
    if (!p.dueDate || p.status !== 'paid') return false;
    // ... filtra por mês
  })
  .reduce((s, p) => s + p.amount, 0);
```
Agora calcula corretamente despesas pagas e identifica despesas vencidas.

## Dados Persistidos no Banco

**IMPORTANTE**: Os cálculos de status são realizados **apenas na leitura** (fromRow). Os dados salvos no banco mantêm os status originais para preservar o histórico:

- `stockItemToRow()` - Salva o status fornecido pelo usuário
- `receivableToRow()` - Salva o status fornecido pelo sistema
- `payableToRow()` - Salva o status fornecido pelo sistema

Isso permite que:
1. Mudanças manuais de status sejam respeitadas (ex: marcar receivable como 'received')
2. Recálculo automático em toda leitura baseado nas regras de negócio
3. Auditoria completa do histórico de status

## Como Testar

1. **Estoque Crítico**:
   - Crie um item de estoque com `quantity <= minQuantity`
   - Verifique se aparece no KPI "Estoque Crítico" do Dashboard
   - Crie um item com data de validade passada
   - Verifique se também aparece como crítico

2. **A Receber Vencido**:
   - Crie um receivable com `due_date` anterior a hoje
   - Verifique se aparece no KPI "A Receber Vencido"
   - Marque como 'received'
   - Verifique se desaparece do KPI

3. **Receitas vs Despesas**:
   - Crie appointments com `paymentStatus = 'pago'` no mês atual
   - Crie payables com `status = 'paid'` no mês atual
   - Verifique se o gráfico mostra receitas e despesas corretamente

## Arquivos Modificados

- ✅ `/utils/dataMappers.ts` - Adicionadas funções de cálculo de status e integração nos mappers
- ✅ Criado `/CORRECAO_DASHBOARD_SYNC.md` - Esta documentação

## Próximos Passos

Se ainda houver dados faltando no Dashboard:

1. Verificar se há dados reais no banco Supabase:
   ```sql
   SELECT COUNT(*) FROM appointments WHERE payment_status = 'pago';
   SELECT COUNT(*) FROM financial_receivables WHERE due_date < CURRENT_DATE;
   SELECT COUNT(*) FROM stock_items WHERE quantity <= min_quantity;
   ```

2. Verificar logs no console do navegador para erros de sincronização

3. Verificar se as migrations foram executadas corretamente:
   - `20260317000002_add_tuss_code_to_appointments.sql`
   - `20260317000003_create_communication_campaigns.sql`
