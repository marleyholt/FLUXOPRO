import { GoogleGenAI } from '@google/genai';
import { CsvParsedItem } from '../types/finance';

export const GEMINI_WEB_MANUAL_PROMPT = `Você é um extrator de faturas de cartão de crédito.
Analise a fatura anexada (PDF ou imagem) e extraia todas as transações em formato CSV com separador vírgula, exatamente com as colunas:
Data,Descrição,Valor,Parcela

Exemplo:
2026-01-05,Supermercado Pão de Açúcar,340.50,À vista
2026-01-12,Magazine Luiza,120.00,03/10
2026-01-18,Posto Ipiranga,210.00,À vista
2026-01-20,Netflix,55.90,Mensal

Regras:
1. Valores em formato numérico padrão (ex: 340.50).
2. Não inclua linhas de pagamento de fatura anterior.
3. Forneça apenas o bloco CSV pronto para copiar e salvar.`;

export async function parseInvoicePdfWithGemini(
  pdfFile: File,
  apiKeyOverride?: string
): Promise<CsvParsedItem[]> {
  const apiKey =
    apiKeyOverride ||
    process.env.GEMINI_API_KEY ||
    (typeof window !== 'undefined' ? (window as any).GEMINI_API_KEY : '');

  if (!apiKey) {
    throw new Error(
      'Chave GEMINI_API_KEY não configurada. Configure a chave no menu ou utilize a opção manual de CSV.'
    );
  }

  // Convert PDF to base64
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] || result;
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(pdfFile);
  });

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `Você é um extrator financeiro especialista em faturas de cartão de crédito brasileiras (Nubank, Itaú, Bradesco, Santander, Inter, C6, XP, etc.).
Analise detalhadamente este arquivo PDF da fatura e extraia todas as compras e lançamentos individuais.

Retorne EXCLUSIVAMENTE um array JSON com a seguinte estrutura para cada item:
[
  {
    "date": "YYYY-MM-DD",
    "description": "Nome limpo do estabelecimento ou serviço",
    "amount": 125.50,
    "installmentsCurrent": 3,
    "installmentsTotal": 10,
    "category": "Supermercado | Restaurante | Farmácia | Transporte | Assinaturas | Eletrônicos | Viagem | Outros",
    "needsReview": false
  }
]

Regras obrigatórias:
1. Ignore linhas de pagamento de faturas anteriores (ex: 'Pagamento recebido', 'Pagamento de fatura').
2. Converta todos os valores para números float positivos (ex: 95.40).
3. Se a compra for parcelada (ex: '02/10', 'Parcela 2 de 5'), preencha installmentsCurrent e installmentsTotal. Se for à vista ou assinatura, deixe nulo.
4. Se a descrição for atípica, muito alta (> R$ 1.500) ou suspeita, defina "needsReview": true.
5. Retorne SOMENTE o código JSON, sem texto explicativo adicional.`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType: pdfFile.type || 'application/pdf',
            },
          },
          {
            text: prompt,
          },
        ],
      },
    ],
  });

  const textResponse = response.text || '';
  
  // Clean JSON markup if present
  let cleanJson = textResponse.trim();
  if (cleanJson.startsWith('```json')) {
    cleanJson = cleanJson.replace(/^```json/, '').replace(/```$/, '').trim();
  } else if (cleanJson.startsWith('```')) {
    cleanJson = cleanJson.replace(/^```/, '').replace(/```$/, '').trim();
  }

  const parsedArray = JSON.parse(cleanJson);
  if (!Array.isArray(parsedArray)) {
    throw new Error('A resposta da IA não retornou uma lista válida de transações.');
  }

  return parsedArray.map((item: any, idx: number) => ({
    id: `ai-pdf-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    date: item.date || new Date().toISOString().slice(0, 10),
    description: item.description || 'Lançamento Fatura',
    amount: Math.abs(Number(item.amount) || 0),
    installmentsCurrent: item.installmentsCurrent ? Number(item.installmentsCurrent) : undefined,
    installmentsTotal: item.installmentsTotal ? Number(item.installmentsTotal) : undefined,
    category: item.category || 'Fatura Cartão',
    selected: true,
    needsReview: !!item.needsReview,
  }));
}
