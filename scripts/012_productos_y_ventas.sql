-- Catalogo de productos y registro de ventas
-- Ejecutar en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS public.productos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre TEXT NOT NULL,
  descripcion TEXT,
  precio NUMERIC(12, 2) NOT NULL CHECK (precio >= 0),
  moneda TEXT NOT NULL CHECK (moneda IN ('ARS', 'USD')),
  activo BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_productos_activo ON public.productos(activo);
CREATE INDEX IF NOT EXISTS idx_productos_nombre ON public.productos(nombre);

-- Nota: no usar CHECK (total >= 0) en la columna total: Postgres genera una
-- constraint con nombre producto_ventas_total_check y choca con un CONSTRAINT
-- explicito del mismo nombre. Con cantidad > 0 y precio_unitario >= 0, la
-- igualdad total = cantidad * precio_unitario implica total >= 0.
CREATE TABLE IF NOT EXISTS public.producto_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producto_id UUID NOT NULL REFERENCES public.productos(id) ON DELETE RESTRICT,
  cantidad INTEGER NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(12, 2) NOT NULL CHECK (precio_unitario >= 0),
  total NUMERIC(12, 2) NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  metodo_pago TEXT NOT NULL,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT producto_ventas_total_matches_qty_unit CHECK (total = cantidad * precio_unitario),
  CONSTRAINT producto_ventas_metodo_pago_values_check CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA'))
);

CREATE INDEX IF NOT EXISTS idx_producto_ventas_fecha ON public.producto_ventas(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_producto_ventas_producto_id ON public.producto_ventas(producto_id);
CREATE INDEX IF NOT EXISTS idx_producto_ventas_created_at ON public.producto_ventas(created_at DESC);

ALTER TABLE public.productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.producto_ventas ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_productos_ventas()
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

-- productos
DROP POLICY IF EXISTS "Users can view all productos" ON public.productos;
CREATE POLICY "Users can view all productos"
  ON public.productos FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert productos" ON public.productos;
CREATE POLICY "Users can insert productos"
  ON public.productos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own productos" ON public.productos;
CREATE POLICY "Users can update own productos"
  ON public.productos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own productos" ON public.productos;
CREATE POLICY "Users can delete own productos"
  ON public.productos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any productos" ON public.productos;
CREATE POLICY "Admins can update any productos"
  ON public.productos FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_productos_ventas())
  WITH CHECK (public.current_user_can_manage_productos_ventas());

DROP POLICY IF EXISTS "Admins can delete any productos" ON public.productos;
CREATE POLICY "Admins can delete any productos"
  ON public.productos FOR DELETE
  TO authenticated
  USING (public.current_user_can_manage_productos_ventas());

-- producto_ventas
DROP POLICY IF EXISTS "Users can view all producto_ventas" ON public.producto_ventas;
CREATE POLICY "Users can view all producto_ventas"
  ON public.producto_ventas FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Users can insert producto_ventas" ON public.producto_ventas;
CREATE POLICY "Users can insert producto_ventas"
  ON public.producto_ventas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own producto_ventas" ON public.producto_ventas;
CREATE POLICY "Users can update own producto_ventas"
  ON public.producto_ventas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own producto_ventas" ON public.producto_ventas;
CREATE POLICY "Users can delete own producto_ventas"
  ON public.producto_ventas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Admins can update any producto_ventas" ON public.producto_ventas;
CREATE POLICY "Admins can update any producto_ventas"
  ON public.producto_ventas FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_productos_ventas())
  WITH CHECK (public.current_user_can_manage_productos_ventas());

DROP POLICY IF EXISTS "Admins can delete any producto_ventas" ON public.producto_ventas;
CREATE POLICY "Admins can delete any producto_ventas"
  ON public.producto_ventas FOR DELETE
  TO authenticated
  USING (public.current_user_can_manage_productos_ventas());

-- Migracion: medio de pago (efectivo / transferencia) si la tabla ya existia sin esta columna
ALTER TABLE public.producto_ventas
  ADD COLUMN IF NOT EXISTS metodo_pago TEXT;

UPDATE public.producto_ventas
SET metodo_pago = 'EFECTIVO'
WHERE metodo_pago IS NULL;

ALTER TABLE public.producto_ventas
  ALTER COLUMN metodo_pago SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'producto_ventas_metodo_pago_values_check'
  ) THEN
    ALTER TABLE public.producto_ventas
      ADD CONSTRAINT producto_ventas_metodo_pago_values_check
      CHECK (metodo_pago IN ('EFECTIVO', 'TRANSFERENCIA'));
  END IF;
END $$;
