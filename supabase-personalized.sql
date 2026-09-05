-- GEEKO — duas abas: lisas x personalizadas
-- Rode em: Supabase Dashboard > SQL Editor > New query > Run
-- O site funciona mesmo sem rodar (assume personalizada), mas rode para o admin gravar o tipo.

alter table products
  add column if not exists personalized boolean default true;

-- Produtos já cadastrados viram "personalizada" (regra mais segura).
-- Para marcar uma peça existente como lisa, use o botão "Virar lisa" no /admin
-- ou rode: update products set personalized = false where slug = 'camiseta-lisa-preta';
