-- Tabla para asignar múltiples parcelas a una misma venta
-- Cada parcela (1..500) solo puede estar asignada una vez en total.

CREATE TABLE IF NOT EXISTS public.parcelas_asignaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  venta_id UUID NOT NULL REFERENCES public.parcelas_ventas(id) ON DELETE CASCADE,
  parcela_numero INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Validación 1..500
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'parcelas_asignaciones_parcela_numero_range'
  ) THEN
    ALTER TABLE public.parcelas_asignaciones
      ADD CONSTRAINT parcelas_asignaciones_parcela_numero_range
      CHECK (parcela_numero BETWEEN 1 AND 500);
  END IF;
END
$$;

-- Unicidad global por número de parcela
CREATE UNIQUE INDEX IF NOT EXISTS idx_parcelas_asignaciones_parcela_numero_unique
  ON public.parcelas_asignaciones (parcela_numero);

CREATE INDEX IF NOT EXISTS idx_parcelas_asignaciones_venta_id
  ON public.parcelas_asignaciones (venta_id);

ALTER TABLE public.parcelas_asignaciones ENABLE ROW LEVEL SECURITY;

-- Leer asignaciones (para dashboard)
CREATE POLICY "Users can view all parcelas_asignaciones"
  ON public.parcelas_asignaciones FOR SELECT
  TO authenticated
  USING (true);

-- Insert/Update/Delete: dueño de la venta o ADMIN/SUBCOMISION
CREATE POLICY "Users can insert parcelas_asignaciones for their ventas"
  ON public.parcelas_asignaciones FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parcelas_ventas v
      WHERE v.id = venta_id
        AND (
          v.user_id = auth.uid()
          OR public.current_user_can_manage_parcelas()
        )
    )
  );

CREATE POLICY "Users can update parcelas_asignaciones for their ventas"
  ON public.parcelas_asignaciones FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parcelas_ventas v
      WHERE v.id = venta_id
        AND (
          v.user_id = auth.uid()
          OR public.current_user_can_manage_parcelas()
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parcelas_ventas v
      WHERE v.id = venta_id
        AND (
          v.user_id = auth.uid()
          OR public.current_user_can_manage_parcelas()
        )
    )
  );

CREATE POLICY "Users can delete parcelas_asignaciones for their ventas"
  ON public.parcelas_asignaciones FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.parcelas_ventas v
      WHERE v.id = venta_id
        AND (
          v.user_id = auth.uid()
          OR public.current_user_can_manage_parcelas()
        )
    )
  );

-- Backfill desde parcela_numero (si existía)
INSERT INTO public.parcelas_asignaciones (venta_id, parcela_numero)
SELECT id, parcela_numero
FROM public.parcelas_ventas
WHERE parcela_numero IS NOT NULL
ON CONFLICT (parcela_numero) DO NOTHING;

