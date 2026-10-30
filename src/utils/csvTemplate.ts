/**
 * Utilitário para geração e download do arquivo modelo CSV padrão para importação de faturas de cartão.
 */
export function downloadStandardCsvTemplate(): void {
  const csvContent =
`Data;Descricao;Valor;Parcela;Categoria
15/10/2026;Supermercado Pao de Acucar;342,50;1/1;Mercado / Supermercado
18/10/2026;Posto Shell Combustivel;180,00;1/1;Uber & Combustivel
20/10/2026;Magazine Luiza Eletronicos;125,00;02/10;Lazer & Diversos
22/10/2026;Farmacia Droga Raia;89,90;1/1;Saude & Farmacia
25/10/2026;Restaurante Almoco Executivo;65,00;1/1;iFood & Restaurantes
`;

  // Cria um Blob UTF-8 com BOM para abrir perfeitamente no Excel e Google Planilhas
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'modelo_fatura_cartao_padrao.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
