-- Create parcelas_ventas table for tracking plot sales
CREATE TABLE IF NOT EXISTS public.parcelas_ventas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre_apellido TEXT NOT NULL,
  precio NUMERIC(10, 2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Enable Row Level Security
ALTER TABLE public.parcelas_ventas ENABLE ROW LEVEL SECURITY;

-- Policies: authenticated users can manage their own data
CREATE POLICY "Users can view all parcelas_ventas"
  ON public.parcelas_ventas FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert parcelas_ventas"
  ON public.parcelas_ventas FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own parcelas_ventas"
  ON public.parcelas_ventas FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own parcelas_ventas"
  ON public.parcelas_ventas FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
