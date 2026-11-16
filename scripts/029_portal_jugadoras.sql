-- Portal de jugadoras: rol JUGADORA, cuenta_user_id, vínculos y RLS.
-- Ejecutar en el SQL Editor de Supabase.

-- 1. Rol JUGADORA en enum user_role (si existe) y/o CHECK de profiles
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      WHERE t.typname = 'user_role' AND e.enumlabel = 'JUGADORA'
    ) THEN
      ALTER TYPE public.user_role ADD VALUE 'JUGADORA';
    END IF;
  END IF;
END $$;

-- Si profiles.role es TEXT con CHECK, recrear el constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
      AND data_type = 'text'
  ) THEN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_role_check
      CHECK (role IN ('ADMIN', 'SUBCOMISION', 'COORDINADOR_DEPORTIVO', 'ENTRENADOR', 'JUGADORA'));
  END IF;
END $$;

-- Actualizar admin_set_user_role para aceptar JUGADORA (staff no debería asignarlo por UI, pero el RPC queda consistente)
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

  IF new_role NOT IN ('ADMIN', 'SUBCOMISION', 'COORDINADOR_DEPORTIVO', 'ENTRENADOR', 'JUGADORA') THEN
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

-- Trigger de perfil: respetar role en metadata (para altas de jugadoras)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_role text;
BEGIN
  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'ENTRENADOR');
  IF v_role NOT IN ('ADMIN', 'SUBCOMISION', 'COORDINADOR_DEPORTIVO', 'ENTRENADOR', 'JUGADORA') THEN
    v_role := 'ENTRENADOR';
  END IF;

  INSERT INTO public.profiles (id, email, role, nombre, apellido)
  VALUES (
    NEW.id,
    NEW.email,
    v_role::user_role,
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

-- 2. Cuenta de login de la jugadora
ALTER TABLE public.jugadoras
  ADD COLUMN IF NOT EXISTS cuenta_user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_jugadoras_cuenta_user_id ON public.jugadoras(cuenta_user_id);

-- 3. Vínculos a jugadora
ALTER TABLE public.cuota_extraordinaria
  ADD COLUMN IF NOT EXISTS jugadora_id UUID REFERENCES public.jugadoras(id) ON DELETE SET NULL;

ALTER TABLE public.rifas
  ADD COLUMN IF NOT EXISTS jugadora_id UUID REFERENCES public.jugadoras(id) ON DELETE SET NULL;

ALTER TABLE public.parcelas_ventas
  ADD COLUMN IF NOT EXISTS jugadora_id UUID REFERENCES public.jugadoras(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_cuota_extraordinaria_jugadora_id ON public.cuota_extraordinaria(jugadora_id);
CREATE INDEX IF NOT EXISTS idx_rifas_jugadora_id ON public.rifas(jugadora_id);
CREATE INDEX IF NOT EXISTS idx_parcelas_ventas_jugadora_id ON public.parcelas_ventas(jugadora_id);

-- 4. Precio por rifa en la campaña
ALTER TABLE public.rifas_campanas
  ADD COLUMN IF NOT EXISTS precio_unitario NUMERIC(12, 2) CHECK (precio_unitario IS NULL OR precio_unitario >= 0);

-- Helpers
CREATE OR REPLACE FUNCTION public.current_user_is_jugadora()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = 'JUGADORA'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_jugadora_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT id FROM public.jugadoras WHERE cuenta_user_id = auth.uid() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.current_user_is_staff_finanzas()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('ADMIN', 'SUBCOMISION')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_jugadora() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_jugadora_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_user_is_staff_finanzas() TO authenticated;

-- 5. RLS: jugadora lee su propia ficha
DROP POLICY IF EXISTS "Jugadora can read own row" ON public.jugadoras;
CREATE POLICY "Jugadora can read own row"
  ON public.jugadoras FOR SELECT
  TO authenticated
  USING (cuenta_user_id = auth.uid());

DROP POLICY IF EXISTS "Jugadora can read own division" ON public.divisiones;
CREATE POLICY "Jugadora can read own division"
  ON public.divisiones FOR SELECT
  TO authenticated
  USING (
    public.current_user_is_jugadora()
    AND id = (SELECT division_id FROM public.jugadoras WHERE cuenta_user_id = auth.uid() LIMIT 1)
  );

-- Cuota: staff ve todo; jugadora solo lo suyo
DROP POLICY IF EXISTS "Users can view all cuota_extraordinaria" ON public.cuota_extraordinaria;
CREATE POLICY "Staff can view all cuota_extraordinaria"
  ON public.cuota_extraordinaria FOR SELECT
  TO authenticated
  USING (public.current_user_is_staff_finanzas());

DROP POLICY IF EXISTS "Jugadora can view own cuota_extraordinaria" ON public.cuota_extraordinaria;
CREATE POLICY "Jugadora can view own cuota_extraordinaria"
  ON public.cuota_extraordinaria FOR SELECT
  TO authenticated
  USING (jugadora_id IS NOT NULL AND jugadora_id = public.current_jugadora_id());

-- Parcelas
DROP POLICY IF EXISTS "Users can view all parcelas_ventas" ON public.parcelas_ventas;
CREATE POLICY "Staff can view all parcelas_ventas"
  ON public.parcelas_ventas FOR SELECT
  TO authenticated
  USING (public.current_user_is_staff_finanzas());

DROP POLICY IF EXISTS "Jugadora can view own parcelas_ventas" ON public.parcelas_ventas;
CREATE POLICY "Jugadora can view own parcelas_ventas"
  ON public.parcelas_ventas FOR SELECT
  TO authenticated
  USING (jugadora_id IS NOT NULL AND jugadora_id = public.current_jugadora_id());

-- Rifas asignaciones
DROP POLICY IF EXISTS "Users can view all rifas" ON public.rifas;
CREATE POLICY "Staff can view all rifas"
  ON public.rifas FOR SELECT
  TO authenticated
  USING (public.current_user_is_staff_finanzas());

DROP POLICY IF EXISTS "Jugadora can view own rifas" ON public.rifas;
CREATE POLICY "Jugadora can view own rifas"
  ON public.rifas FOR SELECT
  TO authenticated
  USING (jugadora_id IS NOT NULL AND jugadora_id = public.current_jugadora_id());

-- Rifas pagos
DROP POLICY IF EXISTS "Users can view all rifas_pagos" ON public.rifas_pagos;
CREATE POLICY "Staff can view all rifas_pagos"
  ON public.rifas_pagos FOR SELECT
  TO authenticated
  USING (public.current_user_is_staff_finanzas());

DROP POLICY IF EXISTS "Jugadora can view own rifas_pagos" ON public.rifas_pagos;
CREATE POLICY "Jugadora can view own rifas_pagos"
  ON public.rifas_pagos FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rifas r
      WHERE r.id = rifa_id
        AND r.jugadora_id = public.current_jugadora_id()
    )
  );

-- Campañas de rifa: jugadora puede leer las de sus asignaciones (para precio)
DROP POLICY IF EXISTS "Users can view all rifas_campanas" ON public.rifas_campanas;
CREATE POLICY "Staff can view all rifas_campanas"
  ON public.rifas_campanas FOR SELECT
  TO authenticated
  USING (public.current_user_is_staff_finanzas());

DROP POLICY IF EXISTS "Jugadora can view related rifas_campanas" ON public.rifas_campanas;
CREATE POLICY "Jugadora can view related rifas_campanas"
  ON public.rifas_campanas FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.rifas r
      WHERE r.campana_id = id
        AND r.jugadora_id = public.current_jugadora_id()
    )
  );

NOTIFY pgrst, 'reload schema';
