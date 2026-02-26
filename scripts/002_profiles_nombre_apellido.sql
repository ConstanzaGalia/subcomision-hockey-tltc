-- Agregar nombre y apellido a perfiles (desde el formulario de registro).
-- Ejecutar en el SQL Editor de Supabase después de 000_profiles_and_roles.sql

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nombre TEXT,
  ADD COLUMN IF NOT EXISTS apellido TEXT;

-- Actualizar el trigger para copiar nombre y apellido desde auth.users.raw_user_meta_data
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
