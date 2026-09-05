import type { Product } from "@/types/catalog";

// Produtos iniciais de exemplo — edite pelo /admin sem mexer em código.
export const PRODUCTS: Product[] = [
  {
    id: "GKV-CAM-001",
    name: "Extra Life",
    slug: "extra-life",
    description:
      "Um 1-UP quase invisível no peito. Minimalista na frente e nas costas, para usar todo dia.",
    price: 89.9,
    kind: "camiseta",
    category: "Games",
    images: [
      { src: "/logo.jpeg", alt: "Extra Life — frente" },
      { src: "/logo.jpeg", alt: "Extra Life — verso" },
    ],
    sizes: ["P", "M", "G", "GG"],
    colors: [
      { id: "preta", name: "Preta", hex: "#111111" },
      { id: "off", name: "Off-white", hex: "#f3efe6" },
    ],
    active: true,
    featured: true,
    createdAt: "2026-09-01",
  },
  {
    id: "GKV-CAM-002",
    name: "Hello, World.",
    slug: "hello-world",
    description:
      "A primeira linha de todo dev, em tipografia discreta. Frente minimalista, verso com detalhe.",
    price: 89.9,
    kind: "camiseta",
    category: "Tech",
    images: [
      { src: "/logo.jpeg", alt: "Hello World — frente" },
      { src: "/logo.jpeg", alt: "Hello World — verso" },
    ],
    sizes: ["P", "M", "G", "GG"],
    colors: [
      { id: "preta", name: "Preta", hex: "#111111" },
      { id: "carvao", name: "Carvão", hex: "#2b2b2b" },
    ],
    active: true,
    featured: true,
    createdAt: "2026-09-01",
  },
  {
    id: "GKV-MOL-001",
    name: "Moletom Um Círculo",
    slug: "moletom-um-circulo",
    description:
      "Moletom canguru com anel minimalista bordado/estampado. Quentinho e discreto.",
    price: 189.9,
    kind: "moletom",
    category: "Fantasia",
    images: [
      { src: "/logo.jpeg", alt: "Moletom Um Círculo — frente" },
      { src: "/logo.jpeg", alt: "Moletom Um Círculo — verso" },
    ],
    sizes: ["P", "M", "G", "GG"],
    colors: [{ id: "preta", name: "Preta", hex: "#111111" }],
    active: true,
    featured: true,
    createdAt: "2026-09-01",
  },
];

export function getProduct(slug: string, custom: Product[] = []) {
  const all = [...custom, ...PRODUCTS];
  return all.find((p) => p.slug === slug && p.active);
}

export function getAllProducts(custom: Product[] = []) {
  const slugs = new Set(custom.map((p) => p.slug));
  return [...custom, ...PRODUCTS.filter((p) => !slugs.has(p.slug))].filter(
    (p) => p.active
  );
}
