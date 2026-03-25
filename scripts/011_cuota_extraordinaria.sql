-- Cuota extraordinaria: ingresos en USD o ARS con recibo PDF
--
-- Requiere la tabla `profiles` (ya existe en scripts/000_profiles_and_roles.sql).

CREATE TABLE IF NOT EXISTS public.cuota_extraordinaria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_apellido TEXT NOT NULL,
  moneda TEXT NOT NULL CHECK (moneda IN ('USD', 'ARS')),
  metodo_pago TEXT NOT NULL CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA')),
  monto NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  fecha DATE NOT NULL,
  recibo_generado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  recibo_generado_en TIMESTAMPTZ,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  ,
  CONSTRAINT cuota_extraordinaria_moneda_metodo_pago_check
    CHECK (
      (moneda = 'USD' AND metodo_pago = 'EFECTIVO')
      OR
      (moneda = 'ARS' AND metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA'))
    )
);

CREATE INDEX IF NOT EXISTS idx_cuota_extraordinaria_fecha ON public.cuota_extraordinaria(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_cuota_extraordinaria_created_at ON public.cuota_extraordinaria(created_at DESC);

ALTER TABLE public.cuota_extraordinaria ENABLE ROW LEVEL SECURITY;

-- Compatibilidad / idempotencia: si la tabla ya existía sin metodo_pago
ALTER TABLE public.cuota_extraordinaria
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT;

UPDATE public.cuota_extraordinaria
SET metodo_pago = 'EFECTIVO'
WHERE metodo_pago IS NULL;

ALTER TABLE public.cuota_extraordinaria
  ALTER COLUMN metodo_pago SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cuota_extraordinaria_metodo_pago_values_check'
  ) THEN
    ALTER TABLE public.cuota_extraordinaria
      ADD CONSTRAINT cuota_extraordinaria_metodo_pago_values_check
      CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'cuota_extraordinaria_moneda_metodo_pago_check'
  ) THEN
    ALTER TABLE public.cuota_extraordinaria
      ADD CONSTRAINT cuota_extraordinaria_moneda_metodo_pago_check
      CHECK (
        (moneda = 'USD' AND metodo_pago = 'EFECTIVO')
        OR
        (moneda = 'ARS' AND metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA'))
      );
  END IF;
END $$;

-- Quienes pueden gestionar cuotas extraordinarias pueden actualizar/eliminar cualquiera
CREATE OR REPLACE FUNCTION public.current_user_can_manage_cuota_extraordinaria()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('ADMIN', 'SUBCOMISION')
  );
$$;

DROP POLICY IF EXISTS "Users can view all cuota_extraordinaria" ON public.cuota_extraordinaria;
CREATE POLICY "Users can view all cuota_extraordinaria"
  ON public.cuota_extraordinaria FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own cuota_extraordinaria" ON public.cuota_extraordinaria;
CREATE POLICY "Users can insert their own cuota_extraordinaria"
  ON public.cuota_extraordinaria FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own cuota_extraordinaria" ON public.cuota_extraordinaria;
CREATE POLICY "Users can update their own cuota_extraordinaria"
  ON public.cuota_extraordinaria FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_cuota_extraordinaria())
  WITH CHECK (auth.uid() = user_id OR public.current_user_can_manage_cuota_extraordinaria());

DROP POLICY IF EXISTS "Users can delete their own cuota_extraordinaria" ON public.cuota_extraordinaria;
CREATE POLICY "Users can delete their own cuota_extraordinaria"
  ON public.cuota_extraordinaria FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_cuota_extraordinaria());

