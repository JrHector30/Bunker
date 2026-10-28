-- ==============================================================================
-- SCRIPT DE SEGURIDAD: HABILITACIÓN DE ROW LEVEL SECURITY (RLS) PARA BUNKER
-- ==============================================================================
-- Este script activa RLS en todas las tablas del esquema público de Supabase.
-- 
-- Arquitectura de Bunker:
-- 1. El backend (Express + Prisma) se conecta con el rol de conexión directa 'postgres'
--    o 'service_role', el cual tiene privilegios BYPASSRLS (no se ve afectado).
-- 2. La API pública de Supabase (PostgREST vía roles 'anon' y 'authenticated')
--    quedará completamente bloqueada por defecto, impidiendo accesos indebidos
--    o filtración de datos desde el navegador o mediante la clave anónima pública.
-- ==============================================================================

-- 1. Habilitación de RLS en todas las tablas del schema 'public'
ALTER TABLE IF EXISTS "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PasswordRecovery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Mesa" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Categoria" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Plato" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Comanda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "DetalleComanda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Arqueo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MovimientoCaja" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Insumo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "RecetaInsumo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "MovimientoInsumo" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "PedidoCancelado" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "permisos_modulos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "Configuracion" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "tickets_pendientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "dispositivos_red" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "historial_reparaciones" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "SyncOperation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

-- 2. Regla dinámica adicional: Garantizar que cualquier tabla adicional en 'public' tenga RLS
DO $$ 
DECLARE 
    r RECORD;
BEGIN 
    FOR r IN (
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    ) LOOP 
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', r.tablename);
    END LOOP; 
END $$;

-- 3. Revocar permisos de acceso directo a PostgREST para los roles públicos (anon y authenticated)
--    Esto asegura que nadie con la URL de Supabase y el anon_key pueda consultar la API REST directa.
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL ROUTINES IN SCHEMA public FROM anon, authenticated;

-- Garantizar que el rol 'service_role' y 'postgres' mantengan acceso administrativo total
GRANT ALL ON ALL TABLES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO postgres, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO postgres, service_role;

-- 4. Consulta de verificación: Comprueba el estado de RLS de cada tabla
SELECT 
    tablename, 
    rowsecurity AS rls_activo
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename ASC;
