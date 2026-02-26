-- Permite que ADMIN y SUBCOMISION editen y eliminen cualquier venta de parcela
-- (además del dueño de la fila, que ya puede por las políticas existentes).
-- Ejecutar en el SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION public.current_user_can_manage_parcelas()
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

-- Quienes pueden gestionar parcelas pueden actualizar cualquier venta
CREATE POLICY "Admins and subcomision can update any parcelas_ventas"
  ON public.parcelas_ventas FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_parcelas())
  WITH CHECK (public.current_user_can_manage_parcelas());

-- Quienes pueden gestionar parcelas pueden eliminar cualquier venta
CREATE POLICY "Admins and subcomision can delete any parcelas_ventas"
  ON public.parcelas_ventas FOR DELETE
  TO authenticated
  USING (public.current_user_can_manage_parcelas());
