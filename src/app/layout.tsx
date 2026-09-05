import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/context/cart-context";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: "GEEKO — Seu universo. Seu estilo.",
  description:
    "Roupas geek minimalistas frente + verso. Camisetas e moletons sob demanda.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <CartProvider>
          <Header />
          <main className="mx-auto min-h-[70vh] max-w-6xl px-4">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
