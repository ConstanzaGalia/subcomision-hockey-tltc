-- RPC público (anon) con agregados de la campaña.
-- Ejecutar en el SQL Editor de Supabase.
-- No expone filas individuales ni nombres (salvo lo ya cubierto por get_parcelas_publicas).

CREATE OR REPLACE FUNCTION public.get_campana_publica()
RETURNS TABLE (
  objetivo_usd NUMERIC,
  parcelas_usd NUMERIC,
  prestamos_usd NUMERIC,
  cuota_usd NUMERIC,
  cuota_ars NUMERIC,
  productos_usd NUMERIC,
  productos_ars NUMERIC,
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
    COALESCE((SELECT SUM(monto) FROM public.prestamos), 0),
    COALESCE((SELECT SUM(monto) FROM public.cuota_extraordinaria WHERE moneda = 'USD'), 0),
    COALESCE((SELECT SUM(monto) FROM public.cuota_extraordinaria WHERE moneda = 'ARS'), 0),
    COALESCE((
      SELECT SUM(v.total)
      FROM public.producto_ventas v
      JOIN public.productos p ON p.id = v.producto_id
      WHERE p.moneda = 'USD'
    ), 0),
    COALESCE((
      SELECT SUM(v.total)
      FROM public.producto_ventas v
      JOIN public.productos p ON p.id = v.producto_id
      WHERE p.moneda = 'ARS'
    ), 0),
    COALESCE((SELECT COUNT(*)::integer FROM public.parcelas_asignaciones), 0);
$$;

REVOKE ALL ON FUNCTION public.get_campana_publica() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_campana_publica() TO anon;
GRANT EXECUTE ON FUNCTION public.get_campana_publica() TO authenticated;
