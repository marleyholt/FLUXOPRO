# Sistema de Versões de Faturas, Barra Flutuante e Gestão Dinâmica de Cartões de Crédito

Permitir o acompanhamento semanal e contínuo das faturas de cartão de crédito através de versões históricas alternáveis (snapshots), barra flutuante inferior para navegação ágil, download de modelo CSV padrão e campos detalhados de metadados na importação (data da retirada, nome da versão e observações).

## User Review & Critical Decisions

> [!IMPORTANT]
> **Decisões confirmadas pelo usuário na Fase 1:**
> 1. **Gerenciamento de Versões:** Salvar cada importação de extrato/CSV como uma versão completa (snapshot), permitindo alternar livremente entre as versões (ex.: Semana 1, Semana 2, Fatura Final) sem perda de histórico.
> 2. **Interface de Navegação:** Implementação de uma barra flutuante inferior fixa com seletor rápido de cartão e controle de versão ativa.
> 3. **Reflexo em Cascata no Sistema:** A versão selecionada substitui os lançamentos daquele cartão e mês em **todo o sistema** (Central de Cartões, Matriz Anual, Previsão Orçamentária e Controle Mensal).
> 4. **Segurança de Sincronização Firebase:** As importações e alternâncias de versões atualizam imediatamente a projeção local (sem latência), mas só gravam no Firestore quando o usuário acionar o botão de salvar.

---

## 1. Visão Geral & Conceito Central

- **O que faz:** Transforma o módulo de cartões de crédito de uma ferramenta mensal estática em um **centro de acompanhamento dinâmico e contínuo**. O usuário pode importar extratos semanalmente ou a qualquer momento, salvando cada importação como uma versão nomeada (ex.: "Semana 1 - Prévia", "Semana 2", "Fatura Fechada").
- **Público / Contexto:** Usuários e gestores financeiros que realizam controle orçamentário preditivo ao longo do mês e precisam saber como os gastos em tempo real afetam o fluxo de caixa futuro antes do fechamento oficial da fatura.
- **Valor Agregado:** Elimina a limitação de analisar a fatura apenas uma vez no mês. Garante comparabilidade entre previsões parciais e o valor consolidado final, mantendo a integridade total da Matriz Anual.

---

## 2. Experiência do Usuário & Design Visual

### Fluxos Principais do Usuário

1. **Download do Modelo CSV Padrão:**
   - Na Central de Cartões e no Modal de Importação, haverá o botão **"Baixar Modelo CSV Padrão"**.
   - O arquivo gerado traz colunas universais compatíveis (`Data;Descricao;Valor;Parcela;Categoria`), com dados de exemplo prontos para Excel ou Google Sheets.

2. **Importação Enriquecida de Nova Versão:**
   - O modal de importação passa a solicitar:
     - **Data de Extração do Extrato** (ex.: `2026-10-15`).
     - **Nome da Versão** (sugestão automática: `"Prévia 15/10"` ou editável pelo usuário, como `"Semana 2"`).
     - **Observações** (ex.: *"Não inclui compras do fim de semana"*).
   - Ao confirmar, o sistema gera uma nova versão de fatura, preservando a versão anterior e tornando a recém-importada a **versão ativa**.

3. **Barra Flutuante Inferior (Dock de Cartões & Versões):**
   - Fixada na parte inferior da tela com acabamento escuro sofisticado (`bg-zinc-900/95 backdrop-blur-md border border-zinc-800`), contendo:
     - **Seletor Rápido de Cartão:** Abas compactas com o nome e bandeira do cartão.
     - **Controle de Versão Ativa:** Dropdown ou pílula interativa mostrando a versão atual (ex.: `v2: Semana 2 (15/10) - R$ 3.450,00`).
     - **Botão "Gerenciar Versões":** Abre o modal comparativo para inspecionar, renomear, alternar ou excluir versões salvas.
     - **Indicador de Sincronização:** Lembrete visual para salvar no Firebase ao concluir ajustes.

4. **Reflexo Imediato em Todo o Sistema:**
   - Ao trocar a versão ativa de um cartão para determinado mês, os valores de transações, faturas e projeções são recalculados instantaneamente:
     - Na **Matriz Anual**, a linha daquele cartão e o total de despesas passam a espelhar a versão selecionada.
     - No **Controle Mensal**, o teto de gastos e faturas mostram o total da versão ativa.
     - Na **Central de Cartões**, a listagem de compras exibe os lançamentos da versão ativa.

---

## 3. Decisões de Produto & Trade-Offs

### Decisão 1: Armazenamento por Snapshots Completos vs. Histórico Diferencial
- **Abordagem Escolhida:** Cada versão armazena o conjunto integral de transações daquela importação (`CardTransaction[]`) juntamente com o total da fatura e os metadados.
- **Por quê:** Permite ao usuário alternar instantaneamente entre a "Semana 1" e a "Fatura Final" sem risco de duplicidade de compras ou corrupção de lançamentos manuais adicionados posteriormente.
- **Alternativa Descartada:** Salvar apenas um diff incremental, que geraria complexidade desnecessária e inconsistências em caso de lançamentos cancelados no banco.

### Decisão 2: Persistência Local Imediata com Commit Explícito no Firebase
- **Abordagem Escolhida:** Alterações de versão e novas importações atualizam o estado em memória e no cache local imediatamente, recalculando os relatórios em $\approx 0\text{ms}$. O envio ao Firestore ocorre apenas com o botão "Salvar".
- **Por quê:** Atende à diretriz expressa do usuário de evitar requisições desnecessárias ao Firebase enquanto estiver explorando e alternando entre versões semanais.

---

## 4. Arquitetura Técnica & Estrutura de Dados

### Diagrama do Sistema

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Barra Flutuante Inferior                        │
│   [ Cartão: Nubank ▼ ]  │  [ Versão Ativa: Semana 2 (15/10) ▼ ]        │
│   [ + Importar CSV ]    │  [ ⬇ Baixar Modelo ]  │  [ 💾 Salvar Cloud ] │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ Altera versão ativa
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      FinanceContext (Estado Global)                    │
│  - CreditCards: activeInvoiceVersionIdByMonth                          │
│  - CreditCards: invoiceVersionsByMonth[month] -> InvoiceVersion[]      │
│  - CardTransactions: sincronizadas dinamicamente com a versão ativa    │
└───────────────────┬───────────────────────────────┬────────────────────┘
                    │                               │
                    ▼                               ▼
       ┌────────────────────────┐       ┌────────────────────────┐
       │   Matriz Anual (Tab)   │       │ Central Cartões (Tab)  │
       │ Projeção atualizada    │       │ Compras da versão      │
       │ com o valor da versão  │       │ exibidas no filtro     │
       └────────────────────────┘       └────────────────────────┘
```

### Novos Tipos de Dados

```typescript
export interface InvoiceVersion {
  id: string;                    // ID único da versão (ex: 'ver-173000-xyz')
  cardId: string;                // ID do cartão
  month: string;                 // Mês de referência (ex: '2026-10')
  name: string;                  // Nome amigável (ex: 'Semana 2 - Prévia')
  statementDate: string;         // Data de extração do extrato (YYYY-MM-DD)
  createdAt: string;             // Data de criação (ISO string)
  notes?: string;                // Observações adicionais
  totalAmount: number;           // Total consolidado da fatura nesta versão
  transactionCount: number;      // Quantidade de transações
  transactions: CardTransaction[]; // Snapshot completo das compras
}
```

Atualização no tipo `CreditCard`:
- `invoiceVersionsByMonth?: Record<string, InvoiceVersion[]>`
- `activeInvoiceVersionIdByMonth?: Record<string, string>`

### Mapeamento das Ações no Contexto
- `importCsvTransactionsWithVersion`: Processa o CSV, cria a nova versão com nome, data e notas, e define-a como ativa.
- `setActiveInvoiceVersion`: Alterna a versão ativa para determinado cartão e mês, atualizando o pool de `cardTransactions` para refletir os itens daquela versão.
- `deleteInvoiceVersion`: Remove uma versão específica sem apagar as demais.
- `generateStandardCsvTemplate`: Gera e dispara o download do arquivo CSV modelo no navegador.
