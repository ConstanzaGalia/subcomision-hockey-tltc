-- Migración si ya corriste una versión anterior de 026 sin rifas_campanas.
-- Seguro de re-ejecutar. Si 026 nuevo ya creó todo, este script solo completa lo faltante.

CREATE TABLE IF NOT EXISTS public.rifas_campanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  cuenta_para_cancha BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Si rifas existe sin campana_id, agregar columna y backfill
DO $$
DECLARE
  v_owner UUID;
  v_campana UUID;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'rifas'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rifas' AND column_name = 'campana_id'
  ) THEN
    ALTER TABLE public.rifas ADD COLUMN campana_id UUID REFERENCES public.rifas_campanas(id) ON DELETE CASCADE;

    SELECT user_id INTO v_owner FROM public.rifas ORDER BY created_at ASC LIMIT 1;
    IF v_owner IS NULL THEN
      SELECT id INTO v_owner FROM auth.users ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF v_owner IS NOT NULL THEN
      INSERT INTO public.rifas_campanas (nombre, descripcion, activa, cuenta_para_cancha, user_id)
      VALUES (
        'Rifa del auto',
        'Migrada desde asignaciones existentes',
        true,
        true,
        v_owner
      )
      RETURNING id INTO v_campana;

      UPDATE public.rifas SET campana_id = v_campana WHERE campana_id IS NULL;
    END IF;

    ALTER TABLE public.rifas ALTER COLUMN campana_id SET NOT NULL;
  END IF;
END $$;

-- Quitar cuenta_para_cancha de asignaciones si quedó de la versión anterior
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'rifas' AND column_name = 'cuenta_para_cancha'
  ) THEN
    -- Mover valor a la campaña si existe una sola campaña ligada
    UPDATE public.rifas_campanas c
    SET cuenta_para_cancha = COALESCE((
      SELECT bool_and(r.cuenta_para_cancha)
      FROM public.rifas r
      WHERE r.campana_id = c.id
    ), true);

    ALTER TABLE public.rifas DROP COLUMN cuenta_para_cancha;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_rifas_campana_id ON public.rifas(campana_id);

-- Reaplicar RPC con join a campanas (idempotente con 026)
DROP FUNCTION IF EXISTS public.get_campana_publica();

CREATE OR REPLACE FUNCTION public.get_campana_publica()
RETURNS TABLE (
  objetivo_usd NUMERIC,
  parcelas_usd NUMERIC,
  prestamos_usd NUMERIC,
  cuota_usd NUMERIC,
  cuota_ars NUMERIC,
  productos_usd NUMERIC,
  productos_ars NUMERIC,
  balance_usd NUMERIC,
  balance_ars NUMERIC,
  rifas_usd NUMERIC,
  rifas_ars NUMERIC,
  parcelas_vendidas INTEGER
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    COALESCE((SELECT monto_usd FROM public.objetivo_cancha WHERE id = 'default'), 0),
    COALESCE((SELECT SUM(precio) FROM public.parcelas_ventas), 0),
    COALESCE((SELECT SUM(monto) FROM public.prestamos WHERE cuenta_para_cancha = true), 0),
    COALESCE((SELECT SUM(monto) FROM public.cuota_extraordinaria WHERE moneda = 'USD' AND cuenta_para_cancha = true), 0),
    COALESCE((SELECT SUM(monto) FROM public.cuota_extraordinaria WHERE moneda = 'ARS' AND cuenta_para_cancha = true), 0),
    COALESCE((
      SELECT SUM(v.total) FROM public.producto_ventas v
      JOIN public.productos p ON p.id = v.producto_id
      WHERE p.moneda = 'USD' AND v.cuenta_para_cancha = true
    ), 0),
    COALESCE((
      SELECT SUM(v.total) FROM public.producto_ventas v
      JOIN public.productos p ON p.id = v.producto_id
      WHERE p.moneda = 'ARS' AND v.cuenta_para_cancha = true
    ), 0),
    (
      COALESCE((
        SELECT SUM(monto) FROM public.balance_movimientos
        WHERE tipo = 'INGRESO' AND moneda = 'USD' AND cuenta_para_cancha = true
      ), 0)
      - COALESCE((
        SELECT SUM(monto) FROM public.balance_movimientos
        WHERE tipo = 'GASTO' AND moneda = 'USD'
      ), 0)
    ),
    (
      COALESCE((
        SELECT SUM(monto) FROM public.balance_movimientos
        WHERE tipo = 'INGRESO' AND moneda = 'ARS' AND cuenta_para_cancha = true
      ), 0)
      - COALESCE((
        SELECT SUM(monto) FROM public.balance_movimientos
        WHERE tipo = 'GASTO' AND moneda = 'ARS'
      ), 0)
    ),
    COALESCE((
      SELECT SUM(p.monto)
      FROM public.rifas_pagos p
      JOIN public.rifas r ON r.id = p.rifa_id
      JOIN public.rifas_campanas c ON c.id = r.campana_id
      WHERE r.moneda = 'USD' AND c.cuenta_para_cancha = true
    ), 0),
    COALESCE((
      SELECT SUM(p.monto)
      FROM public.rifas_pagos p
      JOIN public.rifas r ON r.id = p.rifa_id
      JOIN public.rifas_campanas c ON c.id = r.campana_id
      WHERE r.moneda = 'ARS' AND c.cuenta_para_cancha = true
    ), 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.parcelas_asignaciones), 0);
$$;

GRANT EXECUTE ON FUNCTION public.get_campana_publica() TO anon;
GRANT EXECUTE ON FUNCTION public.get_campana_publica() TO authenticated;

NOTIFY pgrst, 'reload schema';
