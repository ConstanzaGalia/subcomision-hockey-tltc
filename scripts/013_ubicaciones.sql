-- Catálogo de ubicaciones del dinero + FK en todos los movimientos monetarios.
-- Ejecutar en el SQL Editor de Supabase después de los scripts previos.

-- -----------------------------------------------------------------------------
-- 1. Tabla ubicaciones
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.ubicaciones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  orden INTEGER,
  activo BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT ubicaciones_nombre_unique UNIQUE (nombre)
);

INSERT INTO public.ubicaciones (nombre, orden) VALUES
  ('Rocio', 1),
  ('Sole', 2),
  ('Negra gb', 3),
  ('Vicky', 4),
  ('Pilar', 5),
  ('Guili', 6),
  ('Mari Barraquero', 7),
  ('Cuenta cantina', 8),
  ('Cuenta Hockey', 9)
ON CONFLICT (nombre) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 2. Columna ubicacion_id (nullable → backfill → NOT NULL)
-- -----------------------------------------------------------------------------
ALTER TABLE public.parcelas_ventas
  ADD COLUMN IF NOT EXISTS ubicacion_id UUID REFERENCES public.ubicaciones(id);

ALTER TABLE public.cuota_extraordinaria
  ADD COLUMN IF NOT EXISTS ubicacion_id UUID REFERENCES public.ubicaciones(id);

ALTER TABLE public.prestamos
  ADD COLUMN IF NOT EXISTS ubicacion_id UUID REFERENCES public.ubicaciones(id);

ALTER TABLE public.producto_ventas
  ADD COLUMN IF NOT EXISTS ubicacion_id UUID REFERENCES public.ubicaciones(id);

ALTER TABLE public.balance_movimientos
  ADD COLUMN IF NOT EXISTS ubicacion_id UUID REFERENCES public.ubicaciones(id);

UPDATE public.parcelas_ventas pv
SET ubicacion_id = u.id
FROM (SELECT id FROM public.ubicaciones WHERE nombre = 'Cuenta Hockey' LIMIT 1) u
WHERE pv.ubicacion_id IS NULL;

UPDATE public.cuota_extraordinaria c
SET ubicacion_id = u.id
FROM (SELECT id FROM public.ubicaciones WHERE nombre = 'Cuenta Hockey' LIMIT 1) u
WHERE c.ubicacion_id IS NULL;

UPDATE public.prestamos p
SET ubicacion_id = u.id
FROM (SELECT id FROM public.ubicaciones WHERE nombre = 'Cuenta Hockey' LIMIT 1) u
WHERE p.ubicacion_id IS NULL;

UPDATE public.producto_ventas pv
SET ubicacion_id = u.id
FROM (SELECT id FROM public.ubicaciones WHERE nombre = 'Cuenta Hockey' LIMIT 1) u
WHERE pv.ubicacion_id IS NULL;

UPDATE public.balance_movimientos b
SET ubicacion_id = u.id
FROM (SELECT id FROM public.ubicaciones WHERE nombre = 'Cuenta Hockey' LIMIT 1) u
WHERE b.ubicacion_id IS NULL;

ALTER TABLE public.parcelas_ventas ALTER COLUMN ubicacion_id SET NOT NULL;
ALTER TABLE public.cuota_extraordinaria ALTER COLUMN ubicacion_id SET NOT NULL;
ALTER TABLE public.prestamos ALTER COLUMN ubicacion_id SET NOT NULL;
ALTER TABLE public.producto_ventas ALTER COLUMN ubicacion_id SET NOT NULL;
ALTER TABLE public.balance_movimientos ALTER COLUMN ubicacion_id SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parcelas_ventas_ubicacion_id ON public.parcelas_ventas(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_cuota_extraordinaria_ubicacion_id ON public.cuota_extraordinaria(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_ubicacion_id ON public.prestamos(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_producto_ventas_ubicacion_id ON public.producto_ventas(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_balance_movimientos_ubicacion_id ON public.balance_movimientos(ubicacion_id);

-- -----------------------------------------------------------------------------
-- 3. RLS ubicaciones (solo lectura para autenticados)
-- -----------------------------------------------------------------------------
ALTER TABLE public.ubicaciones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read ubicaciones" ON public.ubicaciones;
CREATE POLICY "Authenticated can read ubicaciones"
  ON public.ubicaciones FOR SELECT
  TO authenticated
  USING (true);

-- -----------------------------------------------------------------------------
-- 4. RPCs parcelas: reemplazar firma para incluir p_ubicacion_id
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.create_parcela_venta_with_parcelas(TEXT, NUMERIC, INTEGER[]);
DROP FUNCTION IF EXISTS public.update_parcela_venta_with_parcelas(UUID, TEXT, NUMERIC, INTEGER[]);

CREATE OR REPLACE FUNCTION public.create_parcela_venta_with_parcelas(
  p_nombre_apellido TEXT,
  p_precio NUMERIC,
  p_parcela_numeros INTEGER[],
  p_ubicacion_id UUID
)
RETURNS public.parcelas_ventas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta public.parcelas_ventas;
  v_num INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_ubicacion_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.ubicaciones WHERE id = p_ubicacion_id) THEN
    RAISE EXCEPTION 'Ubicación inválida';
  END IF;

  INSERT INTO public.parcelas_ventas (nombre_apellido, precio, user_id, ubicacion_id)
  VALUES (trim(p_nombre_apellido), p_precio, auth.uid(), p_ubicacion_id)
  RETURNING * INTO v_venta;

  IF p_parcela_numeros IS NOT NULL THEN
    FOREACH v_num IN ARRAY p_parcela_numeros LOOP
      IF v_num IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.parcelas_asignaciones (venta_id, parcela_numero)
      VALUES (v_venta.id, v_num);
    END LOOP;
  END IF;

  RETURN v_venta;
END;
$$;

REVOKE ALL ON FUNCTION public.create_parcela_venta_with_parcelas(TEXT, NUMERIC, INTEGER[], UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parcela_venta_with_parcelas(TEXT, NUMERIC, INTEGER[], UUID) TO authenticated;


CREATE OR REPLACE FUNCTION public.update_parcela_venta_with_parcelas(
  p_venta_id UUID,
  p_nombre_apellido TEXT,
  p_precio NUMERIC,
  p_parcela_numeros INTEGER[],
  p_ubicacion_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_num INTEGER;
  v_can_manage BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF p_ubicacion_id IS NULL OR NOT EXISTS (SELECT 1 FROM public.ubicaciones WHERE id = p_ubicacion_id) THEN
    RAISE EXCEPTION 'Ubicación inválida';
  END IF;

  SELECT user_id INTO v_owner
  FROM public.parcelas_ventas
  WHERE id = p_venta_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Venta inexistente';
  END IF;

  v_can_manage := (v_owner = auth.uid()) OR public.current_user_can_manage_parcelas();
  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sin permiso';
  END IF;

  UPDATE public.parcelas_ventas
  SET nombre_apellido = trim(p_nombre_apellido),
      precio = p_precio,
      ubicacion_id = p_ubicacion_id
  WHERE id = p_venta_id;

  DELETE FROM public.parcelas_asignaciones WHERE venta_id = p_venta_id;

  IF p_parcela_numeros IS NOT NULL THEN
    FOREACH v_num IN ARRAY p_parcela_numeros LOOP
      IF v_num IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.parcelas_asignaciones (venta_id, parcela_numero)
      VALUES (p_venta_id, v_num);
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_parcela_venta_with_parcelas(UUID, TEXT, NUMERIC, INTEGER[], UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_parcela_venta_with_parcelas(UUID, TEXT, NUMERIC, INTEGER[], UUID) TO authenticated;

-- -----------------------------------------------------------------------------
-- 5. Vista agregada: totales por ubicación (ARS / USD, balance con signo)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.totales_por_ubicacion()
RETURNS TABLE (
  ubicacion_id UUID,
  orden INTEGER,
  nombre TEXT,
  total_ars NUMERIC,
  total_usd NUMERIC
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    u.id,
    u.orden,
    u.nombre,
    (
      COALESCE((
        SELECT SUM(c.monto) FROM public.cuota_extraordinaria c
        WHERE c.ubicacion_id = u.id AND c.moneda = 'ARS'
      ), 0)
      + COALESCE((
        SELECT SUM(pv.total) FROM public.producto_ventas pv
        INNER JOIN public.productos p ON p.id = pv.producto_id
        WHERE pv.ubicacion_id = u.id AND p.moneda = 'ARS'
      ), 0)
      + COALESCE((
        SELECT SUM(m.monto) FROM public.balance_movimientos m
        WHERE m.ubicacion_id = u.id AND m.tipo = 'INGRESO' AND m.moneda = 'ARS'
      ), 0)
      - COALESCE((
        SELECT SUM(m.monto) FROM public.balance_movimientos m
        WHERE m.ubicacion_id = u.id AND m.tipo = 'GASTO' AND m.moneda = 'ARS'
      ), 0)
    )::NUMERIC(14,2),
    (
      COALESCE((SELECT SUM(pv.precio) FROM public.parcelas_ventas pv WHERE pv.ubicacion_id = u.id), 0)
      + COALESCE((
        SELECT SUM(c.monto) FROM public.cuota_extraordinaria c
        WHERE c.ubicacion_id = u.id AND c.moneda = 'USD'
      ), 0)
      + COALESCE((SELECT SUM(p.monto) FROM public.prestamos p WHERE p.ubicacion_id = u.id), 0)
      + COALESCE((
        SELECT SUM(pv.total) FROM public.producto_ventas pv
        INNER JOIN public.productos p ON p.id = pv.producto_id
        WHERE pv.ubicacion_id = u.id AND p.moneda = 'USD'
      ), 0)
      + COALESCE((
        SELECT SUM(m.monto) FROM public.balance_movimientos m
        WHERE m.ubicacion_id = u.id AND m.tipo = 'INGRESO' AND m.moneda = 'USD'
      ), 0)
      - COALESCE((
        SELECT SUM(m.monto) FROM public.balance_movimientos m
        WHERE m.ubicacion_id = u.id AND m.tipo = 'GASTO' AND m.moneda = 'USD'
      ), 0)
    )::NUMERIC(14,2)
  FROM public.ubicaciones u
  WHERE u.activo = true
  ORDER BY u.orden NULLS LAST, u.nombre;
$$;

REVOKE ALL ON FUNCTION public.totales_por_ubicacion() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.totales_por_ubicacion() TO authenticated;

-- -----------------------------------------------------------------------------
-- 6. Detalle de movimientos filtrados por ubicación
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.list_movimientos_por_ubicacion(p_ubicacion_id UUID)
RETURNS TABLE (
  fuente TEXT,
  fecha DATE,
  moneda TEXT,
  monto NUMERIC,
  detalle TEXT,
  origen_id UUID
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT * FROM (
    SELECT
      'PARCELA'::TEXT AS fuente,
      (pv.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE AS fecha,
      'USD'::TEXT AS moneda,
      pv.precio AS monto,
      pv.nombre_apellido AS detalle,
      pv.id AS origen_id
    FROM public.parcelas_ventas pv
    WHERE pv.ubicacion_id = p_ubicacion_id

    UNION ALL

    SELECT
      'CUOTA_EXTRAORDINARIA'::TEXT,
      c.fecha,
      c.moneda,
      c.monto,
      c.nombre_apellido,
      c.id
    FROM public.cuota_extraordinaria c
    WHERE c.ubicacion_id = p_ubicacion_id

    UNION ALL

    SELECT
      'PRESTAMO'::TEXT,
      (p.created_at AT TIME ZONE 'America/Argentina/Buenos_Aires')::DATE,
      'USD'::TEXT,
      p.monto,
      p.nombre_apellido,
      p.id
    FROM public.prestamos p
    WHERE p.ubicacion_id = p_ubicacion_id

    UNION ALL

    SELECT
      'VENTA_PRODUCTO'::TEXT,
      pv.fecha,
      pr.moneda,
      pv.total,
      (pr.nombre || ' × ' || pv.cantidad::TEXT),
      pv.id
    FROM public.producto_ventas pv
    INNER JOIN public.productos pr ON pr.id = pv.producto_id
    WHERE pv.ubicacion_id = p_ubicacion_id

    UNION ALL

    SELECT
      'BALANCE'::TEXT,
      bm.fecha,
      bm.moneda,
      CASE WHEN bm.tipo = 'INGRESO' THEN bm.monto ELSE -bm.monto END,
      COALESCE(NULLIF(trim(bm.descripcion), ''), bm.tipo),
      bm.id
    FROM public.balance_movimientos bm
    WHERE bm.ubicacion_id = p_ubicacion_id
  ) AS movs
  ORDER BY fecha DESC, fuente, origen_id;
$$;

REVOKE ALL ON FUNCTION public.list_movimientos_por_ubicacion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_movimientos_por_ubicacion(UUID) TO authenticated;
