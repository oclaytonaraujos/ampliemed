# Correção de Sincronização da Fila de Espera

## Problema Identificado

Quando uma consulta era confirmada no módulo de Agenda, o paciente não era adicionado imediatamente à fila de espera, ou a sincronização falhava. Isso ocorria devido a dois problemas principais:

### 1. **Dependência Circular no useEffect** ❌

```typescript
// ❌ ANTES - Código problemático
useEffect(() => {
  // ... lógica de adicionar à fila
}, [appointments, queueEntries, setQueueEntries]);
//                 ^^^^^^^^^^^^ Dependência circular!
```

**Problema**: O `useEffect` tinha `queueEntries` como dependência E chamava `setQueueEntries` dentro dele, causando:
- Re-renders infinitos ou múltiplas execuções
- State inconsistente durante a atualização
- Perda de sincronização entre agenda e fila

### 2. **Cálculo Incorreto do Ticket Number** ❌

```typescript
// ❌ ANTES - Número de senha errado
const ticketNum = String(queueEntries.length + 1).padStart(3, '0');
```

**Problema**: Ao usar `queueEntries.length + 1`, se pacientes fossem removidos da fila, novos tickets poderiam ter números duplicados.

**Exemplo**:
- Fila com 5 pacientes: senhas 001, 002, 003, 004, 005
- Remove paciente 003
- Fila agora tem length = 4
- Próximo ticket seria 005 novamente ❌ DUPLICADO!

## Solução Implementada

### 1. ✅ Callback Form no setState

Usamos a **forma de callback** do `setState` para acessar o estado atual sem precisar dele como dependência:

```typescript
// ✅ DEPOIS - Sem dependência circular
useEffect(() => {
  const todayStr = new Date().toISOString().split('T')[0];
  const confirmedTodayApts = appointments.filter(apt => 
    apt.date === todayStr && apt.status === 'confirmado'
  );
  
  // Callback form acessa prevQueue sem precisar de dependência
  setQueueEntries(prevQueue => {
    const newEntries = [...prevQueue];
    let hasChanges = false;
    
    confirmedTodayApts.forEach(apt => {
      // Usa prevQueue em vez de queueEntries
      const alreadyInQueue = prevQueue.some(q =>
        (q.cpf && apt.patientCPF && q.cpf.replace(/\D/g, '') === apt.patientCPF.replace(/\D/g, '')) ||
        q.name.toLowerCase() === apt.patientName.toLowerCase()
      );
      
      if (!alreadyInQueue) {
        // Adiciona novo paciente
        newEntries.push(newEntry);
        hasChanges = true;
      }
    });
    
    return hasChanges ? newEntries : prevQueue;
  });
}, [appointments, setQueueEntries]); // ✅ Sem queueEntries!
```

**Benefícios**:
- ✅ Sem re-renders infinitos
- ✅ State sempre consistente
- ✅ Sincronização imediata
- ✅ Performance otimizada (só atualiza se houver mudanças)

### 2. ✅ Cálculo Correto do Ticket Number

```typescript
// ✅ DEPOIS - Busca o maior número existente
const maxTicket = newEntries.reduce((max, q) => {
  const n = parseInt(q.ticketNumber, 10);
  return isNaN(n) ? max : Math.max(max, n);
}, 0);
const ticketNum = String(maxTicket + 1).padStart(3, '0');
```

**Exemplo corrigido**:
- Fila com senhas: 001, 002, 004, 005 (003 foi removido)
- `maxTicket` = 5
- Próximo ticket = 006 ✅ CORRETO!

### 3. ✅ Sincronização na Confirmação de Consulta

Aplicada a mesma correção em `handleConfirmAppointment()`:

```typescript
// ✅ Callback form para sincronização imediata
setQueueEntries(prevQueue => {
  const alreadyInQueue = prevQueue.some(q =>
    (q.cpf && apt.patientCPF && q.cpf.replace(/\D/g, '') === apt.patientCPF.replace(/\D/g, '')) ||
    q.name.toLowerCase() === apt.patientName.toLowerCase()
  );
  
  if (alreadyInQueue) {
    return prevQueue; // Sem mudanças
  }
  
  // Calcula ticket corretamente
  const maxTicket = prevQueue.reduce((max, q) => {
    const n = parseInt(q.ticketNumber, 10);
    return isNaN(n) ? max : Math.max(max, n);
  }, 0);
  const ticketNum = String(maxTicket + 1).padStart(3, '0');
  
  // Cria nova entrada
  const newEntry = { /* ... */ };
  
  // Notificações agendadas para após a atualização
  setTimeout(() => {
    addNotification({ /* ... */ });
    addAuditEntry({ /* ... */ });
  }, 0);
  
  return [...prevQueue, newEntry]; // ✅ Retorna novo estado
});
```

## Arquivos Modificados

- ✅ `/components/ScheduleManagementWithPayment.tsx`
  - Linha ~143-190: useEffect de sincronização inicial
  - Linha ~355-410: handleConfirmAppointment

## Benefícios da Correção

### 🚀 Performance
- Elimina re-renders desnecessários
- Evita loops infinitos de atualização
- Reduz carga no navegador

### 🎯 Precisão
- Tickets sempre únicos e sequenciais
- Nenhum paciente duplicado na fila
- Estado consistente entre agenda e fila

### ⚡ Sincronização Imediata
- Paciente aparece na fila IMEDIATAMENTE após confirmação
- UI atualiza instantaneamente
- Sem delay ou necessidade de refresh manual

### 🔒 Confiabilidade
- Previne race conditions
- State sempre consistente
- Notificações enviadas no momento correto

## Como Testar

1. **Teste de Confirmação Básica**:
   - Crie uma consulta para hoje
   - Confirme a consulta
   - ✅ Verifique que o paciente aparece IMEDIATAMENTE na fila de espera
   - ✅ Verifique que o ticket number é único

2. **Teste de Tickets Duplicados**:
   - Adicione 5 pacientes à fila (001-005)
   - Remova o paciente 003
   - Confirme uma nova consulta
   - ✅ Novo ticket deve ser 006, não 005

3. **Teste de Duplicação**:
   - Confirme a mesma consulta duas vezes
   - ✅ Paciente deve aparecer apenas UMA vez na fila

4. **Teste de Sincronização em Lote**:
   - Crie 3 consultas para hoje
   - Marque todas como "confirmado"
   - ✅ Todas devem aparecer na fila imediatamente
   - ✅ Com tickets sequenciais únicos

## Conceito Técnico: Callback Form do setState

### ❌ Forma Normal (problemática com dependências):
```typescript
setQueueEntries([...queueEntries, newEntry]); // Precisa de queueEntries no useEffect
```

### ✅ Callback Form (sem dependência):
```typescript
setQueueEntries(prevQueue => [...prevQueue, newEntry]); // Não precisa de dependência!
```

**Por que funciona melhor?**
- O React garante que `prevQueue` sempre tem o valor mais atualizado
- Não cria closure sobre o valor antigo de `queueEntries`
- Evita stale closures e race conditions
- Permite otimizações de batching do React

## Próximos Passos

Se ainda houver problemas de sincronização:

1. Verificar logs do console para erros
2. Verificar se `setQueueEntries` está sendo importado corretamente do AppContext
3. Verificar se há outros useEffects modificando `queueEntries` sem callback form
4. Verificar se as migrations foram executadas (tabela `queue_entries` existe)

## Referências

- [React setState Callback Form](https://react.dev/reference/react/useState#updating-state-based-on-the-previous-state)
- [React useEffect Dependencies](https://react.dev/reference/react/useEffect#specifying-reactive-dependencies)
- [Avoiding Race Conditions](https://react.dev/learn/you-might-not-need-an-effect#updating-state-based-on-props-or-state)
