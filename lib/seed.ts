// Templates de catálogo por segmento — usados para auto-configurar o onboarding.
export const CATEGORIAS_POR_SEGMENTO: Record<string, string[]> = {
  semijoias: ["Anéis", "Brincos", "Colares", "Pulseiras", "Conjuntos", "Tornozeleiras"],
  joias: ["Anéis", "Brincos", "Colares", "Pulseiras", "Alianças"],
  bijuteria: ["Brincos", "Colares", "Pulseiras", "Tiaras", "Pingentes"],
  outro: ["Geral"],
};

export const SEGMENTOS = [
  { id: "semijoias", label: "Semijoias" },
  { id: "joias", label: "Joias" },
  { id: "bijuteria", label: "Bijuteria" },
  { id: "outro", label: "Outro" },
];

// Produtos de exemplo para quem escolhe "começar com exemplos" — demoável na hora.
export function produtosExemplo(categorias: string[]) {
  const base = [
    { nome: "Anel Solitário Folheado", categoria: "Anéis", custo: 8, precoVenda: 35, estoqueAtual: 12 },
    { nome: "Brinco Argola Pequena", categoria: "Brincos", custo: 6, precoVenda: 28, estoqueAtual: 4 },
    { nome: "Colar Ponto de Luz", categoria: "Colares", custo: 12, precoVenda: 49, estoqueAtual: 8 },
    { nome: "Pulseira Riviera", categoria: "Pulseiras", custo: 15, precoVenda: 59, estoqueAtual: 2 },
    { nome: "Conjunto Noiva", categoria: "Conjuntos", custo: 30, precoVenda: 120, estoqueAtual: 5 },
  ];
  return base.filter((p) => categorias.includes(p.categoria) || categorias.includes("Geral"));
}
