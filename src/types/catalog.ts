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
  /** true = personalizada Geeko (troca só por defeito); false = lisa (troca em 7 dias) */
  personalized: boolean;
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
