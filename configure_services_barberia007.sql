-- SQL script to create and set the active services for barberia007
-- This script is self-contained and idempotent.

BEGIN;

-- =============================
-- 1. Ensure the 'servicios' table exists
-- =============================
CREATE TABLE IF NOT EXISTS public.servicios (
  id BIGSERIAL PRIMARY KEY,
  negocio_id TEXT NOT NULL,
  nombre TEXT NOT NULL,
  duracion_min INTEGER NOT NULL DEFAULT 25,
  precio NUMERIC NOT NULL DEFAULT 0,
  activo BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT ux_servicios_neg_nombre UNIQUE (negocio_id, nombre)
);

-- Ensure RLS is enabled
ALTER TABLE public.servicios ENABLE ROW LEVEL SECURITY;

-- Ensure basic policies exist for public access
-- This allows the user-facing app to read services and the admin to manage them.
-- Note: These are permissive policies; for production, you might want more restrictive ones based on roles.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'servicios_select_public') THEN
    CREATE POLICY servicios_select_public ON public.servicios FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'servicios_insert_public') THEN
    CREATE POLICY servicios_insert_public ON public.servicios FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'servicios_update_public') THEN
    CREATE POLICY servicios_update_public ON public.servicios FOR UPDATE USING (true) WITH CHECK (true);
  END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'servicios_delete_public') THEN
    CREATE POLICY servicios_delete_public ON public.servicios FOR DELETE USING (true);
  END IF;
END
$$;


-- =============================
-- 2. Set the specific services for barberia007
-- =============================
DO $$
DECLARE
    target_negocio_id TEXT := 'barberia007';
BEGIN
    -- Delete all existing services for the specified business to ensure a clean slate
    RAISE NOTICE 'Deleting existing services for negocio_id: %', target_negocio_id;
    DELETE FROM public.servicios WHERE negocio_id = target_negocio_id;

    -- Insert the new list of services as specified
    RAISE NOTICE 'Inserting new services for negocio_id: %', target_negocio_id;
    INSERT INTO public.servicios (negocio_id, nombre, duracion_min, precio, activo)
    VALUES
        (target_negocio_id, 'corte de cabello', 15, 0, TRUE),
        (target_negocio_id, 'cerquillo', 15, 0, TRUE),
        (target_negocio_id, 'corte y barba', 15, 0, TRUE),
        (target_negocio_id, 'arreglo de cejas', 15, 0, TRUE);
END $$;

COMMIT;
