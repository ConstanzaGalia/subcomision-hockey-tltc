-- Portal: listado de jugadoras activas con estado Pagó / Debe (cuota extraordinaria).
-- Ejecutar en el SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION public.get_portal_cuota_estado()
RETURNS TABLE (
  jugadora_id UUID,
  apellido TEXT,
  nombre TEXT,
  dni TEXT,
  division_id UUID,
  division_nombre TEXT,
  bloque_id UUID,
  bloque_nombre TEXT,
  pago BOOLEAN,
  pagos_count BIGINT,
  ultima_fecha DATE
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT (
    public.current_user_is_jugadora()
    OR public.current_user_is_staff_finanzas()
  ) THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  RETURN QUERY
  SELECT
    j.id AS jugadora_id,
    j.apellido,
    j.nombre,
    j.dni::text,
    j.division_id,
    d.nombre AS division_nombre,
    j.bloque_id,
    b.nombre AS bloque_nombre,
    (COALESCE(agg.pagos_count, 0) > 0) AS pago,
    COALESCE(agg.pagos_count, 0) AS pagos_count,
    agg.ultima_fecha
  FROM public.jugadoras j
  JOIN public.divisiones d ON d.id = j.division_id
  LEFT JOIN public.bloques b ON b.id = j.bloque_id
  LEFT JOIN LATERAL (
    SELECT
      COUNT(*)::bigint AS pagos_count,
      MAX(c.fecha)::date AS ultima_fecha
    FROM public.cuota_extraordinaria c
    WHERE c.jugadora_id = j.id
  ) agg ON true
  WHERE j.activa = true
  ORDER BY d.orden ASC NULLS LAST, j.apellido ASC, j.nombre ASC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_portal_cuota_estado() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_portal_cuota_estado() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_portal_cuota_estado() TO authenticated;

NOTIFY pgrst, 'reload schema';
