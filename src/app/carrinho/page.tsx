"use client";

import Link from "next/link";
import { useCart, cartKey } from "@/context/cart-context";
import { formatPrice } from "@/lib/format";
import { WHATSAPP_NUMBER } from "@/lib/config";
import { getWhatsAppCheckoutUrl } from "@/lib/whatsapp";

export default function CarrinhoPage() {
  const { items, updateQuantity, removeItem, subtotal } = useCart();
  const url = getWhatsAppCheckoutUrl(items);

  return (
    <div className="py-10">
      <h1 className="text-2xl font-bold">Carrinho</h1>

      {items.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-cream/10 p-6 text-sm text-cream/70">
          Seu carrinho está vazio.{" "}
          <Link href="/catalogo" className="underline text-cream">Ver catálogo</Link>
        </div>
      ) : (
        <div className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
          <div className="space-y-3">
            {items.map((item) => {
              const key = cartKey(item);
              return (
                <div key={key} className="flex gap-3 rounded-2xl border border-cream/10 bg-coal p-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.image} alt={item.name} className="h-20 w-20 rounded-xl object-cover" />
                  <div className="flex-1 text-sm">
                    <p className="text-[11px] text-cream/50">{item.productId}</p>
                    <p className="font-semibold">{item.name}</p>
                    <p className="text-cream/70">{item.size} • {item.colorName}</p>
                    <p className="mt-1">{formatPrice(item.unitPrice * item.quantity)}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <button onClick={() => updateQuantity(key, item.quantity - 1)} className="rounded-full border border-cream/20 px-3">-</button>
                      <span>{item.quantity}</span>
                      <button onClick={() => updateQuantity(key, item.quantity + 1)} className="rounded-full border border-cream/20 px-3">+</button>
                      <button onClick={() => removeItem(key)} className="ml-2 text-xs text-cream/60 underline">remover</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-fit rounded-2xl border border-cream/10 bg-coal p-5">
            <p className="text-sm text-cream/70">Total dos produtos</p>
            <p className="text-2xl font-bold">{formatPrice(subtotal)}</p>
            <p className="mt-1 text-xs text-cream/50">Sem frete — calculado no WhatsApp por CEP.</p>
            {url ? (
              <a href={url} target="_blank" rel="noreferrer" className="mt-4 block rounded-full bg-cream py-3 text-center text-sm font-semibold text-ink">
                Finalizar pedido no WhatsApp
              </a>
            ) : (
              <p className="mt-4 rounded-2xl border border-yellow-200/20 bg-yellow-200/10 p-3 text-xs">
                Configure NEXT_PUBLIC_WHATSAPP_NUMBER no .env para ativar o botão. Veja .env.example.
              </p>
            )}
            <Link href="/catalogo" className="mt-3 block text-center text-sm text-cream/70 underline">
              Continuar comprando
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
