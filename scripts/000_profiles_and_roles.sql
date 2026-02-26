-- Tabla de perfiles (id = auth.users.id). Debe existir para que el dashboard y los roles funcionen.
-- Ejecutar en el SQL Editor de Supabase si aún no tenés la tabla.

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  nombre TEXT,
  apellido TEXT,
  role TEXT NOT NULL DEFAULT 'ENTRENADOR' CHECK (role IN ('ADMIN', 'SUBCOMISION', 'COORDINADOR_DEPORTIVO', 'ENTRENADOR')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índice para listar por fecha
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON public.profiles(created_at DESC);

-- Trigger: crear perfil automáticamente cuando un usuario se registra
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, nombre, apellido)
  VALUES (
    NEW.id,
    NEW.email,
    'ENTRENADOR',
    NEW.raw_user_meta_data->>'nombre',
    NEW.raw_user_meta_data->>'apellido'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    nombre = COALESCE(EXCLUDED.nombre, profiles.nombre),
    apellido = COALESCE(EXCLUDED.apellido, profiles.apellido);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS: solo usuarios autenticados
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Todos los autenticados pueden ver perfiles (para que el admin vea la lista)
CREATE POLICY "Authenticated can read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Cada usuario puede actualizar su propio perfil (solo campos permitidos, no role si querés restringir)
-- Para que solo ADMIN pueda cambiar roles de otros, usamos una función:
CREATE OR REPLACE FUNCTION public.current_user_is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'ADMIN'
  );
$$;

-- Admins pueden actualizar cualquier perfil (incl. role). Usuarios normales solo el propio (sin role).
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.current_user_is_admin())
  WITH CHECK (public.current_user_is_admin());

CREATE POLICY "Users can update own profile (non-role fields if you need)"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Nota: la app usa una Server Action que verifica que quien cambia un rol sea ADMIN.
--
-- Para asignar el primer ADMIN después del registro, ejecutá en SQL:
--   UPDATE public.profiles SET role = 'ADMIN' WHERE email = 'tu-email@ejemplo.com';
