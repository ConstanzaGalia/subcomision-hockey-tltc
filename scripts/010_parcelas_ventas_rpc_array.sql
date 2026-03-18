-- RPCs para crear/editar ventas con múltiples parcelas de forma atómica
-- Requiere tablas: parcelas_ventas y parcelas_asignaciones

CREATE OR REPLACE FUNCTION public.create_parcela_venta_with_parcelas(
  p_nombre_apellido TEXT,
  p_precio NUMERIC,
  p_parcela_numeros INTEGER[]
)
RETURNS public.parcelas_ventas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_venta public.parcelas_ventas;
  v_num INTEGER;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  INSERT INTO public.parcelas_ventas (nombre_apellido, precio, user_id)
  VALUES (trim(p_nombre_apellido), p_precio, auth.uid())
  RETURNING * INTO v_venta;

  IF p_parcela_numeros IS NOT NULL THEN
    FOREACH v_num IN ARRAY p_parcela_numeros LOOP
      IF v_num IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.parcelas_asignaciones (venta_id, parcela_numero)
      VALUES (v_venta.id, v_num);
    END LOOP;
  END IF;

  RETURN v_venta;
END;
$$;

REVOKE ALL ON FUNCTION public.create_parcela_venta_with_parcelas(TEXT, NUMERIC, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_parcela_venta_with_parcelas(TEXT, NUMERIC, INTEGER[]) TO authenticated;


CREATE OR REPLACE FUNCTION public.update_parcela_venta_with_parcelas(
  p_venta_id UUID,
  p_nombre_apellido TEXT,
  p_precio NUMERIC,
  p_parcela_numeros INTEGER[]
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_num INTEGER;
  v_can_manage BOOLEAN;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'No autorizado';
  END IF;

  SELECT user_id INTO v_owner
  FROM public.parcelas_ventas
  WHERE id = p_venta_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Venta inexistente';
  END IF;

  v_can_manage := (v_owner = auth.uid()) OR public.current_user_can_manage_parcelas();
  IF NOT v_can_manage THEN
    RAISE EXCEPTION 'Sin permiso';
  END IF;

  UPDATE public.parcelas_ventas
  SET nombre_apellido = trim(p_nombre_apellido),
      precio = p_precio
  WHERE id = p_venta_id;

  -- Reemplaza asignaciones
  DELETE FROM public.parcelas_asignaciones WHERE venta_id = p_venta_id;

  IF p_parcela_numeros IS NOT NULL THEN
    FOREACH v_num IN ARRAY p_parcela_numeros LOOP
      IF v_num IS NULL THEN
        CONTINUE;
      END IF;
      INSERT INTO public.parcelas_asignaciones (venta_id, parcela_numero)
      VALUES (p_venta_id, v_num);
    END LOOP;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.update_parcela_venta_with_parcelas(UUID, TEXT, NUMERIC, INTEGER[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_parcela_venta_with_parcelas(UUID, TEXT, NUMERIC, INTEGER[]) TO authenticated;

