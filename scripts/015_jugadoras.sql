-- Plantel: divisiones por edad, bloques por nivel y jugadoras.
-- Ejecutar en el SQL Editor de Supabase.

CREATE TABLE IF NOT EXISTS public.divisiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  codigo TEXT NOT NULL UNIQUE,
  nombre TEXT NOT NULL,
  edad_min INTEGER,
  edad_max INTEGER,
  es_manual BOOLEAN NOT NULL DEFAULT false,
  orden INTEGER NOT NULL
);

INSERT INTO public.divisiones (codigo, nombre, edad_min, edad_max, es_manual, orden)
VALUES
  ('10ma', '10ma', 0, 8, false, 1),
  ('9na', '9na', 9, 10, false, 2),
  ('8va', '8va', 11, 12, false, 3),
  ('sub14', 'Sub 14', 13, 14, false, 4),
  ('sub16', 'Sub 16', 15, 16, false, 5),
  ('sub19', 'Sub 19', 17, 19, false, 6),
  ('mayores', 'Mayores', 20, NULL, false, 7),
  ('preintermedia', 'Preintermedia', NULL, NULL, true, 8)
ON CONFLICT (codigo) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  edad_min = EXCLUDED.edad_min,
  edad_max = EXCLUDED.edad_max,
  es_manual = EXCLUDED.es_manual,
  orden = EXCLUDED.orden;

CREATE TABLE IF NOT EXISTS public.bloques (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  division_id UUID NOT NULL REFERENCES public.divisiones(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  orden INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT bloques_nombre_por_division UNIQUE (division_id, nombre)
);

CREATE INDEX IF NOT EXISTS idx_bloques_division_id ON public.bloques(division_id);

CREATE TABLE IF NOT EXISTS public.jugadoras (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  apellido TEXT NOT NULL,
  nombre TEXT NOT NULL,
  dni TEXT NOT NULL,
  fecha_nacimiento DATE NOT NULL,
  division_id UUID NOT NULL REFERENCES public.divisiones(id) ON DELETE RESTRICT,
  division_manual BOOLEAN NOT NULL DEFAULT false,
  bloque_id UUID REFERENCES public.bloques(id) ON DELETE SET NULL,
  activa BOOLEAN NOT NULL DEFAULT true,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT jugadoras_dni_unique UNIQUE (dni),
  CONSTRAINT jugadoras_dni_digits CHECK (dni ~ '^[0-9]{7,9}$')
);

CREATE INDEX IF NOT EXISTS idx_jugadoras_division_id ON public.jugadoras(division_id);
CREATE INDEX IF NOT EXISTS idx_jugadoras_bloque_id ON public.jugadoras(bloque_id);
CREATE INDEX IF NOT EXISTS idx_jugadoras_apellido ON public.jugadoras(apellido);

CREATE OR REPLACE FUNCTION public.jugadoras_bloque_misma_division()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_division UUID;
BEGIN
  IF NEW.bloque_id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT division_id INTO v_division
  FROM public.bloques
  WHERE id = NEW.bloque_id;

  IF v_division IS NULL THEN
    RAISE EXCEPTION 'El bloque no existe';
  END IF;

  IF v_division IS DISTINCT FROM NEW.division_id THEN
    RAISE EXCEPTION 'El bloque no pertenece a la misma división';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jugadoras_bloque_misma_division ON public.jugadoras;
CREATE TRIGGER trg_jugadoras_bloque_misma_division
  BEFORE INSERT OR UPDATE OF bloque_id, division_id
  ON public.jugadoras
  FOR EACH ROW
  EXECUTE FUNCTION public.jugadoras_bloque_misma_division();

CREATE OR REPLACE FUNCTION public.jugadoras_set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_jugadoras_set_updated_at ON public.jugadoras;
CREATE TRIGGER trg_jugadoras_set_updated_at
  BEFORE UPDATE ON public.jugadoras
  FOR EACH ROW
  EXECUTE FUNCTION public.jugadoras_set_updated_at();

ALTER TABLE public.divisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bloques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jugadoras ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.current_user_can_manage_jugadoras()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('ADMIN', 'SUBCOMISION', 'COORDINADOR_DEPORTIVO', 'ENTRENADOR')
  );
$$;

GRANT EXECUTE ON FUNCTION public.current_user_can_manage_jugadoras() TO authenticated;

DROP POLICY IF EXISTS "Authenticated can read divisiones" ON public.divisiones;
CREATE POLICY "Authenticated can read divisiones"
  ON public.divisiones FOR SELECT
  TO authenticated
  USING (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can insert divisiones" ON public.divisiones;
CREATE POLICY "Managers can insert divisiones"
  ON public.divisiones FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can update divisiones" ON public.divisiones;
CREATE POLICY "Managers can update divisiones"
  ON public.divisiones FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_jugadoras())
  WITH CHECK (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can read bloques" ON public.bloques;
CREATE POLICY "Managers can read bloques"
  ON public.bloques FOR SELECT
  TO authenticated
  USING (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can insert bloques" ON public.bloques;
CREATE POLICY "Managers can insert bloques"
  ON public.bloques FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can update bloques" ON public.bloques;
CREATE POLICY "Managers can update bloques"
  ON public.bloques FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_jugadoras())
  WITH CHECK (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can delete bloques" ON public.bloques;
CREATE POLICY "Managers can delete bloques"
  ON public.bloques FOR DELETE
  TO authenticated
  USING (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can read jugadoras" ON public.jugadoras;
CREATE POLICY "Managers can read jugadoras"
  ON public.jugadoras FOR SELECT
  TO authenticated
  USING (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can insert jugadoras" ON public.jugadoras;
CREATE POLICY "Managers can insert jugadoras"
  ON public.jugadoras FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_can_manage_jugadoras() AND auth.uid() = user_id);

DROP POLICY IF EXISTS "Managers can update jugadoras" ON public.jugadoras;
CREATE POLICY "Managers can update jugadoras"
  ON public.jugadoras FOR UPDATE
  TO authenticated
  USING (public.current_user_can_manage_jugadoras())
  WITH CHECK (public.current_user_can_manage_jugadoras());

DROP POLICY IF EXISTS "Managers can delete jugadoras" ON public.jugadoras;
CREATE POLICY "Managers can delete jugadoras"
  ON public.jugadoras FOR DELETE
  TO authenticated
  USING (public.current_user_can_manage_jugadoras());
