-- RPC público (anon) para leer únicamente número de parcela y dueño.
-- Evita otorgar permisos directos sobre public.parcelas_ventas.

CREATE OR REPLACE FUNCTION public.get_parcelas_publicas()
RETURNS TABLE (parcela_numero INTEGER, nombre_apellido TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT a.parcela_numero, v.nombre_apellido
  FROM public.parcelas_asignaciones a
  JOIN public.parcelas_ventas v ON v.id = a.venta_id
  ORDER BY a.parcela_numero ASC;
$$;

REVOKE ALL ON FUNCTION public.get_parcelas_publicas() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_parcelas_publicas() TO anon;
GRANT EXECUTE ON FUNCTION public.get_parcelas_publicas() TO authenticated;

