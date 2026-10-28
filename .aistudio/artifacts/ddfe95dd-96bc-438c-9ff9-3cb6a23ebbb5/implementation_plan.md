# Plano de Implementação Revisado: Rotativo de Cartão & Cadastro Direto de Dívidas Passadas

Este plano atualizado incorpora a regra estrita de negócio solicitada: **as transações projetadas de rotativo e juros serão automaticamente removidas quando a fatura real daquele mês for importada no sistema**, garantindo que não haja qualquer duplicidade de lançamentos.

---

## 1. Visão Geral das Funcionalidades

### Funcionalidade 1: Gestão de Rotativo de Cartão & Limpeza Automática pós-Importação
- **Ao pagar a fatura no Checklist**:
  - Modal pergunta se o pagamento foi **Integral** ou **Parcial**.
  - Se parcial: usuário digita o valor pago; o sistema calcula o saldo rotativado (`total - pago`).
  - Alerta preventivo caso a fatura do mês anterior já estivesse em rotativo.
  - O sistema calcula os juros com a fórmula: `valor rotativado * (taxa % do cartão) = Juros do Rotativo`.
  - São criadas 2 transações discriminadas no cartão para o mês seguinte:
    1. `Saldo Rotativo Fatura [Mês]` (com tag `isRotativoProjection: true`)
    2. `Juros Rotativo [Mês] (X% a.m.)` (com tag `isRotativoProjection: true`)
- **Regra de Exclusão Automática (Anti-Duplicidade)**:
  - Quando a fatura real daquele mês for importada via CSV/extrato bancário (ou quando o usuário consolidar a fatura real), o sistema **remove automaticamente** quaisquer transações marcadas como `isRotativoProjection` daquele cartão e mês, já que a fatura real importada já virá com os encargos definitivos cobrados pelo banco.

### Funcionalidade 2: Cadastro Direto de Dívidas Anteriores (Passado/Postergadas)
- Permite registrar dívidas trazidas do passado sem precisar navegar para meses anteriores.
- Botão "+ Cadastrar Dívida Atrasada" disponível em **ambos os locais**:
  - No card de *Projeção de Dívidas e Contas Atrasadas (Postergadas)* no **Dashboard**;
  - Na barra de ações do **Controle Mensal**.
- **Campos**:
  - Fonte / Credor (ex: "Banco do Brasil", "Empréstimo Familiar", "Fornecedor X")
  - Título / Descrição
  - Valor Principal
  - Data de Início da Dívida
  - Taxa de Juros de Atraso (% a.m. ou % a.d.)
  - Vigência Projetada: seletor de Mês/Ano limite de manutenção **OU** opção "Indeterminado / Até eu pagar".
- **Fluxo de Quitação & Negociação**:
  - Botão de registrar pagamento na tabela de dívidas.
  - Pergunta se houve negociação; permite informar o valor negociado efetivamente pago.
  - Exibe a economia/desconto obtido em reais e porcentagem.
  - Atualiza o status para "Paga" e mantém o histórico na projeção.

---

## 2. Detalhamento Técnico das Modificações

### A. Tipos de Dados (`src/types/finance.ts`)
- **`CardTransaction`**:
  - `isRotativoProjection?: boolean` (identifica transações geradas pela projeção de rotativo)
  - `rotativoSourceMonth?: string` (mês de origem que gerou o saldo rotativo)
- **`PushedDebtBill`**:
  - `creditorSource?: string` (Nome do credor / fonte)
  - `startDate?: string` (Data original da dívida)
  - `targetEndMonth?: string` (Mês limite planejado; ausente/vazio se indeterminado)
  - `isDirectDebt?: boolean` (Flag indicando lançamento direto)
  - `isNegotiated?: boolean` (Se houve negociação no pagamento)
  - `actualPaidAmount?: number` (Valor final pago)
  - `negotiationDiscount?: number` (Economia obtida)
  - `paidDate?: string` (Data em que foi quitada)
  - `negotiationNotes?: string` (Notas e acordos da quitação)

### B. Lógica de Contexto (`src/context/FinanceContext.tsx`)
1. **`payCardInvoiceWithRotativo`**:
   - Registra o pagamento (integral ou parcial) no mês da fatura.
   - Se parcial: gera as duas transações projetadas no mês seguinte com `isRotativoProjection: true`.
2. **`importCsvTransactions` & `setCardRealInvoice` (Regra Anti-Duplicidade)**:
   - Ao importar transações ou salvar a fatura real para `cardId` no mês `invoiceMonth`:
   - Executa filtro para **excluir** `data.cardTransactions` onde:
     `t.cardId === cardId && t.startMonth === invoiceMonth && t.isRotativoProjection === true`.
3. **`addDirectDebt`**:
   - Cria uma nova `PushedDebtBill` associada ao controle de dívidas com status `'pushed'`, campos de credor, taxa de juros e data limite (ou indeterminada).
4. **`settlePushedDebt`**:
   - Atualiza a dívida para `'paid'`, grava `actualPaidAmount`, `isNegotiated`, `paidDate` e anotações.
5. **`deletePushedDebt`**:
   - Permite exclusão de dívidas cadastradas.

### C. Componentes de Interface (UI)
1. **`CardInvoicePaymentModal.tsx`**:
   - Acionado ao clicar no checkbox de uma fatura de cartão no Checklist.
   - Permite escolher pagamento Integral ou Parcial.
   - Mostra alerta caso o mês anterior já estivesse em rotativo.
   - Calcula o valor rotativado e juros automaticamente com base na taxa `% a.m.` cadastrada no cartão.
2. **`DirectDebtModal.tsx`**:
   - Modal para cadastrar uma nova dívida ou conta atrasada trazida do passado.
   - Campos de credor, valor, data início, taxa de juros e seletor de data de término ou "Indeterminado".
3. **`DebtSettlementModal.tsx`**:
   - Modal para liquidar uma dívida postergada com campos de valor original, valor negociado, data e notas.
4. **`DashboardTab.tsx`**:
   - Adição do botão "+ Cadastrar Dívida Atrasada" no cabeçalho do card de Projeção de Dívidas.
   - Exibição de Credor, Data de Início, Prazo Projetado (ou badge "Indeterminado") e ações de quitação.
5. **`MonthlyControlTab.tsx`**:
   - Botão de acesso rápido "+ Dívida Atrasada" na área de ações.
   - Conexão do novo modal de pagamento com rotativo no checklist.

---

## 3. Plano de Verificação

### Testes Manuais & Funcionais
1. **Verificação da Regra de Rotativo & Exclusão na Importação Real**:
   - Fazer pagamento parcial de R$ 500 em uma fatura de R$ 1.500 no cartão com 10% a.m. de taxa.
   - Verificar no mês seguinte a presença dos 2 itens discriminados (`Saldo Rotativo: R$ 1.000` e `Juros: R$ 100`).
   - Simular a importação de CSV da fatura real para o mês seguinte:
     - Conferir se os 2 lançamentos projetados de rotativo somem automaticamente do sistema, deixando apenas os itens reais da fatura.
2. **Alerta de Rotativo Consecutivo**:
   - Ao tentar pagar parcialmente novamente no segundo mês consecutivo, validar a exibição do alerta amarelo de risco de juros compostos.
3. **Verificação de Cadastro de Dívidas**:
   - Cadastrar dívida anterior através do botão do Dashboard e conferir se ela aparece imediatamente na tabela.
   - Cadastrar outra dívida através do botão do Controle Mensal com opção "Indeterminado / Até eu pagar".
   - Realizar a quitação com negociação e validar o cálculo da economia e mudança de status para "Paga".
4. **Compilação e Linter**:
   - Executar `lint_applet` e `compile_applet` para garantir código limpo e sem erros de TypeScript.
