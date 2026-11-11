-- Balance en el avance de cancha = ingresos (cuenta_para_cancha) − TODOS los gastos.
-- Ejecutar en el SQL Editor de Supabase después de 025/026 (o 027).

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
    COALESCE((
      SELECT SUM(monto) FROM public.prestamos
      WHERE cuenta_para_cancha = true
    ), 0),
    COALESCE((
      SELECT SUM(monto) FROM public.cuota_extraordinaria
      WHERE moneda = 'USD' AND cuenta_para_cancha = true
    ), 0),
    COALESCE((
      SELECT SUM(monto) FROM public.cuota_extraordinaria
      WHERE moneda = 'ARS' AND cuenta_para_cancha = true
    ), 0),
    COALESCE((
      SELECT SUM(v.total)
      FROM public.producto_ventas v
      JOIN public.productos p ON p.id = v.producto_id
      WHERE p.moneda = 'USD' AND v.cuenta_para_cancha = true
    ), 0),
    COALESCE((
      SELECT SUM(v.total)
      FROM public.producto_ventas v
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

REVOKE ALL ON FUNCTION public.get_campana_publica() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campana_publica() TO anon;
GRANT EXECUTE ON FUNCTION public.get_campana_publica() TO authenticated;

NOTIFY pgrst, 'reload schema';
