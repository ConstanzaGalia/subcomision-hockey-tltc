-- Módulo Rifas: campañas (ej. "Rifa del auto") + asignación por persona + pagos.
-- Requiere ubicaciones (013) y preferible 025 (cuenta_para_cancha en otras tablas).
-- Ejecutar en el SQL Editor de Supabase.

-- Campañas de rifa (creables: auto, otra, etc.)
CREATE TABLE IF NOT EXISTS public.rifas_campanas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  activa BOOLEAN NOT NULL DEFAULT true,
  cuenta_para_cancha BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rifas_campanas_created_at ON public.rifas_campanas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rifas_campanas_activa ON public.rifas_campanas(activa);

-- Asignaciones: personas a las que se les dieron números de una campaña
CREATE TABLE IF NOT EXISTS public.rifas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campana_id UUID NOT NULL REFERENCES public.rifas_campanas(id) ON DELETE CASCADE,
  nombre_apellido TEXT NOT NULL,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  entregado BOOLEAN NOT NULL DEFAULT false,
  moneda TEXT NOT NULL CHECK (moneda IN ('ARS', 'USD')),
  ubicacion_id UUID NOT NULL REFERENCES public.ubicaciones(id) ON DELETE RESTRICT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rifas_fecha ON public.rifas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_rifas_created_at ON public.rifas(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rifas_ubicacion_id ON public.rifas(ubicacion_id);
CREATE INDEX IF NOT EXISTS idx_rifas_campana_id ON public.rifas(campana_id);

CREATE TABLE IF NOT EXISTS public.rifas_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rifa_id UUID NOT NULL REFERENCES public.rifas(id) ON DELETE CASCADE,
  monto NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  nota TEXT,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rifas_pagos_rifa_id ON public.rifas_pagos(rifa_id);
CREATE INDEX IF NOT EXISTS idx_rifas_pagos_fecha ON public.rifas_pagos(fecha DESC);

ALTER TABLE public.rifas_campanas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rifas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rifas_pagos ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_rifas()
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

-- Campañas
DROP POLICY IF EXISTS "Users can view all rifas_campanas" ON public.rifas_campanas;
CREATE POLICY "Users can view all rifas_campanas"
  ON public.rifas_campanas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own rifas_campanas" ON public.rifas_campanas;
CREATE POLICY "Users can insert their own rifas_campanas"
  ON public.rifas_campanas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update rifas_campanas" ON public.rifas_campanas;
CREATE POLICY "Users can update rifas_campanas"
  ON public.rifas_campanas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_rifas())
  WITH CHECK (auth.uid() = user_id OR public.current_user_can_manage_rifas());

DROP POLICY IF EXISTS "Users can delete rifas_campanas" ON public.rifas_campanas;
CREATE POLICY "Users can delete rifas_campanas"
  ON public.rifas_campanas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_rifas());

-- Asignaciones
DROP POLICY IF EXISTS "Users can view all rifas" ON public.rifas;
CREATE POLICY "Users can view all rifas"
  ON public.rifas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own rifas" ON public.rifas;
CREATE POLICY "Users can insert their own rifas"
  ON public.rifas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update rifas" ON public.rifas;
CREATE POLICY "Users can update rifas"
  ON public.rifas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_rifas())
  WITH CHECK (auth.uid() = user_id OR public.current_user_can_manage_rifas());

DROP POLICY IF EXISTS "Users can delete rifas" ON public.rifas;
CREATE POLICY "Users can delete rifas"
  ON public.rifas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_rifas());

-- Pagos
DROP POLICY IF EXISTS "Users can view all rifas_pagos" ON public.rifas_pagos;
CREATE POLICY "Users can view all rifas_pagos"
  ON public.rifas_pagos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert their own rifas_pagos" ON public.rifas_pagos;
CREATE POLICY "Users can insert their own rifas_pagos"
  ON public.rifas_pagos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update rifas_pagos" ON public.rifas_pagos;
CREATE POLICY "Users can update rifas_pagos"
  ON public.rifas_pagos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_rifas())
  WITH CHECK (auth.uid() = user_id OR public.current_user_can_manage_rifas());

DROP POLICY IF EXISTS "Users can delete rifas_pagos" ON public.rifas_pagos;
CREATE POLICY "Users can delete rifas_pagos"
  ON public.rifas_pagos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR public.current_user_can_manage_rifas());

-- Campaña pública: rendimiento de rifas cuando la campaña cuenta para la cancha
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
      + COALESCE((
        SELECT SUM(p.monto)
        FROM public.rifas_pagos p
        INNER JOIN public.rifas r ON r.id = p.rifa_id
        WHERE r.ubicacion_id = u.id AND r.moneda = 'ARS'
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
      + COALESCE((
        SELECT SUM(p.monto)
        FROM public.rifas_pagos p
        INNER JOIN public.rifas r ON r.id = p.rifa_id
        WHERE r.ubicacion_id = u.id AND r.moneda = 'USD'
      ), 0)
    )::NUMERIC(14,2)
  FROM public.ubicaciones u
  WHERE u.activo = true
  ORDER BY u.orden NULLS LAST, u.nombre;
$$;

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

    UNION ALL

    SELECT
      'RIFA'::TEXT,
      p.fecha,
      r.moneda,
      p.monto,
      (c.nombre || ' · ' || r.nombre_apellido || COALESCE(' · ' || NULLIF(trim(p.nota), ''), '')),
      p.id
    FROM public.rifas_pagos p
    INNER JOIN public.rifas r ON r.id = p.rifa_id
    INNER JOIN public.rifas_campanas c ON c.id = r.campana_id
    WHERE r.ubicacion_id = p_ubicacion_id
  ) AS movs
  ORDER BY fecha DESC, fuente, origen_id;
$$;

NOTIFY pgrst, 'reload schema';
