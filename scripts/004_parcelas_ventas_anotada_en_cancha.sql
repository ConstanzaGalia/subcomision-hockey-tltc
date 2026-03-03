-- Columna para marcar si la parcela está anotada en la cancha
ALTER TABLE public.parcelas_ventas
  ADD COLUMN IF NOT EXISTS anotada_en_cancha BOOLEAN NOT NULL DEFAULT false;
