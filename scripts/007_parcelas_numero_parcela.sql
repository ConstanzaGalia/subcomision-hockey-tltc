-- Agrega número de parcela (1..500) a cada venta y lo hace único
ALTER TABLE public.parcelas_ventas
  ADD COLUMN IF NOT EXISTS parcela_numero INTEGER;

-- Validación de rango
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parcelas_ventas_parcela_numero_range'
  ) THEN
    ALTER TABLE public.parcelas_ventas
      ADD CONSTRAINT parcelas_ventas_parcela_numero_range
      CHECK (parcela_numero IS NULL OR (parcela_numero BETWEEN 1 AND 500));
  END IF;
END
$$;

-- Unicidad (permite múltiples NULL)
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcelas_ventas_parcela_numero_unique
  ON public.parcelas_ventas (parcela_numero)
  WHERE parcela_numero IS NOT NULL;

