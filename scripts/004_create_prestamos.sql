-- Tabla de prestamos (monto prestado, nombre, si ya se devolvio)
CREATE TABLE IF NOT EXISTS public.prestamos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_apellido TEXT NOT NULL,
  monto NUMERIC(10, 2) NOT NULL,
  devuelto BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_prestamos_created_at ON public.prestamos(created_at DESC);

ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view all prestamos"
  ON public.prestamos FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert prestamos"
  ON public.prestamos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own prestamos"
  ON public.prestamos FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own prestamos"
  ON public.prestamos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Permite que ADMIN y SUBCOMISION editen/eliminen cualquier prestamo (ejecutar despues de 003 si existe)
CREATE OR REPLACE FUNCTION public.current_user_can_manage_prestamos()
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

CREATE POLICY "Admins and subcomision can update any prestamos"
  ON public.prestamos FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_prestamos())
  WITH CHECK (public.current_user_can_manage_prestamos());

CREATE POLICY "Admins and subcomision can delete any prestamos"
  ON public.prestamos FOR DELETE
  TO authenticated
  USING (public.current_user_can_manage_prestamos());
