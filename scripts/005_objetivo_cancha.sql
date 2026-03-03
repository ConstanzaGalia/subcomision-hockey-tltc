-- Objetivo en USD a alcanzar para la cancha (un solo valor, editable desde el dashboard)
CREATE TABLE IF NOT EXISTS public.objetivo_cancha (
  id TEXT PRIMARY KEY DEFAULT 'default',
  monto_usd NUMERIC(12, 2) NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Una sola fila
INSERT INTO public.objetivo_cancha (id, monto_usd)
VALUES ('default', 0)
ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.objetivo_cancha ENABLE ROW LEVEL SECURITY;

-- Solo autenticados pueden leer (para mostrar en dashboard)
CREATE POLICY "Authenticated can read objetivo_cancha"
  ON public.objetivo_cancha FOR SELECT
  TO authenticated
  USING (true);

-- Solo ADMIN y SUBCOMISION pueden actualizar (via server action con service role, o esta policy)
CREATE OR REPLACE FUNCTION public.current_user_can_edit_objetivo()
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

CREATE POLICY "Admins and subcomision can update objetivo_cancha"
  ON public.objetivo_cancha FOR UPDATE
  TO authenticated
  USING (public.current_user_can_edit_objetivo())
  WITH CHECK (public.current_user_can_edit_objetivo());
