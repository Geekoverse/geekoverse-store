import { WHATSAPP_NUMBER } from "@/lib/config";
import { formatPrice } from "@/lib/format";
import type { CartItem } from "@/types/catalog";

export function buildWhatsAppMessage(items: CartItem[]) {
  const lines = [
    "Olá, GEEKO!",
    "",
    "Quero fazer um pedido:",
    "",
    "PEDIDO GEEKO",
    "",
  ];

  items.forEach((item) => {
    const tag = item.personalized === false ? "lisa" : "personalizada";
    lines.push(`• [${item.productId}] ${item.name} (${tag})`);
    lines.push(`Tamanho: ${item.size}`);
    lines.push(`Cor: ${item.colorName}`);
    lines.push(`Qtd: ${item.quantity}`);
    lines.push(`Valor: ${formatPrice(item.unitPrice * item.quantity)}`);
    lines.push("");
  });

  const total = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
  lines.push(`Total dos produtos (sem frete): ${formatPrice(total)}`);
  lines.push("");
  lines.push("Meus dados para entrega:");
  lines.push("Nome:");
  lines.push("CEP:");
  lines.push("Cidade/UF:");
  lines.push("Endereço + número + complemento:");

  return lines.join("\n");
}

export function getWhatsAppCheckoutUrl(items: CartItem[]) {
  if (!WHATSAPP_NUMBER) return null;
  const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(
    buildWhatsAppMessage(items)
  )}`;
}

export function getWhatsAppContactUrl(prefill?: string) {
  if (!WHATSAPP_NUMBER) return null;
  const digits = WHATSAPP_NUMBER.replace(/\D/g, "");
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(
    prefill ?? "Olá, GEEKO! Quero saber mais sobre as peças."
  )}`;
}
