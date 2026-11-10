-- Permite a un ADMIN cambiar el rol de otro usuario (bypasea RLS).
-- Ejecutar TODO el archivo de una vez en el SQL Editor de Supabase.

CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'ADMIN'
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_user_role(target_id uuid, new_role text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  IF NOT public.current_user_is_admin() THEN
    RAISE EXCEPTION 'Solo un administrador puede cambiar roles';
  END IF;

  IF target_id = auth.uid() THEN
    RAISE EXCEPTION 'No podés cambiar tu propio rol';
  END IF;

  IF new_role NOT IN ('ADMIN', 'SUBCOMISION', 'COORDINADOR_DEPORTIVO', 'ENTRENADOR') THEN
    RAISE EXCEPTION 'Rol no válido';
  END IF;

  UPDATE public.profiles
  SET role = new_role::user_role
  WHERE id = target_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No se encontró el usuario';
  END IF;

  RETURN new_role;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, text) TO authenticated;

NOTIFY pgrst, 'reload schema';
