-- Movimientos de balance: ingresos y gastos, en ARS o USD
CREATE TABLE IF NOT EXISTS public.balance_movimientos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL CHECK (tipo IN ('INGRESO', 'GASTO')),
  moneda TEXT NOT NULL CHECK (moneda IN ('ARS', 'USD')),
  monto NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  descripcion TEXT,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_balance_movimientos_fecha ON public.balance_movimientos(fecha DESC);
CREATE INDEX IF NOT EXISTS idx_balance_movimientos_created_at ON public.balance_movimientos(created_at DESC);

ALTER TABLE public.balance_movimientos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all balance_movimientos"
  ON public.balance_movimientos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert balance_movimientos"
  ON public.balance_movimientos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own balance_movimientos"
  ON public.balance_movimientos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own balance_movimientos"
  ON public.balance_movimientos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Permite que ADMIN y SUBCOMISION editen/eliminen cualquier movimiento de balance
CREATE OR REPLACE FUNCTION public.current_user_can_manage_balance()
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

CREATE POLICY "Admins and subcomision can update any balance_movimientos"
  ON public.balance_movimientos FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_balance())
  WITH CHECK (public.current_user_can_manage_balance());

CREATE POLICY "Admins and subcomision can delete any balance_movimientos"
  ON public.balance_movimientos FOR DELETE
  TO authenticated
  USING (public.current_user_can_manage_balance());

-- Actualiza updated_at automáticamente
CREATE OR REPLACE FUNCTION public.set_updated_at_balance_movimientos()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_balance_movimientos_updated_at ON public.balance_movimientos;
CREATE TRIGGER trg_balance_movimientos_updated_at
BEFORE UPDATE ON public.balance_movimientos
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at_balance_movimientos();

