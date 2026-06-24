// Templates de catálogo por segmento - sugestões iniciais que o lojista pode editar.
// O AutoManager atende micronegócios em geral; estes são só pontos de partida.
export const CATEGORIAS_POR_SEGMENTO: Record<string, string[]> = {
  semijoias: ["Anéis", "Brincos", "Colares", "Pulseiras", "Conjuntos", "Tornozeleiras"],
  bijuteria: ["Brincos", "Colares", "Pulseiras", "Tiaras", "Pingentes"],
  joias: ["Anéis", "Brincos", "Colares", "Pulseiras", "Alianças"],
  cosmeticos: ["Maquiagem", "Skincare", "Perfumaria", "Cabelos", "Unhas"],
  doces: ["Doces", "Salgados", "Bolos & Tortas", "Kits", "Encomendas"],
  roupas: ["Blusas", "Calças", "Vestidos", "Calçados", "Acessórios"],
  papelaria: ["Material escolar", "Canetas", "Cadernos", "Presentes", "Festa"],
  petshop: ["Ração", "Petiscos", "Higiene", "Brinquedos", "Acessórios"],
  outro: ["Geral"],
};

export const SEGMENTOS = [
  { id: "doces", label: "Doces & comida caseira" },
  { id: "semijoias", label: "Semijoias" },
  { id: "bijuteria", label: "Bijuteria" },
  { id: "cosmeticos", label: "Cosméticos & perfumaria" },
  { id: "roupas", label: "Roupas & acessórios" },
  { id: "papelaria", label: "Papelaria & presentes" },
  { id: "petshop", label: "Pet shop" },
  { id: "joias", label: "Joias" },
  { id: "outro", label: "Outro" },
];

// Lista efetiva de categorias da loja: as personalizadas; senão, as sugestões do segmento.
export function categoriasDaLoja(config: { categorias?: string[]; segmento: string }): string[] {
  if (config.categorias && config.categorias.length) return config.categorias;
  return CATEGORIAS_POR_SEGMENTO[config.segmento] || ["Geral"];
}

// Produtos de exemplo para quem escolhe "começar com exemplos" - demoável na hora.
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
