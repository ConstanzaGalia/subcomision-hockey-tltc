-- Transparencia / avance de campaña: solo usuarios autenticados (portal / dashboard).
-- Ejecutar en el SQL Editor de Supabase.

REVOKE EXECUTE ON FUNCTION public.get_campana_publica() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_campana_publica() TO authenticated;

NOTIFY pgrst, 'reload schema';
