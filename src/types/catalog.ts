export type Product = {
  id: string; // ID / SKU visível: ex GKV-CAM-001
  name: string;
  slug: string;
  description: string;
  price: number;
  kind: "camiseta" | "moletom";
  category: string;
  images: { src: string; alt: string }[];
  sizes: string[];
  colors: { id: string; name: string; hex: string }[];
  active: boolean;
  featured?: boolean;
  /** true = personalizada SAGYX (troca só por defeito); false = lisa (troca em 7 dias) */
  personalized: boolean;
  /** SKU base da peça na Dimona (ex: CAM-ALG-PRETA-G). Obrigatório p/ automação. */
  dimonaSku?: string;
  /** URL pública do PNG em alta da estampa (300 DPI, fundo transparente). */
  printArtUrl?: string;
  /** Mapa opcional "TAMANHO:corId" -> SKU Dimona. Ex: {"G:preta":"CAM-ALG-PRETA-G"} */
  dimonaVariantSkus?: Record<string, string>;
  createdAt: string;
};

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  image: string;
  size: string;
  colorId: string;
  colorName: string;
  quantity: number;
  unitPrice: number;
  personalized?: boolean;
};
