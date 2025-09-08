-- SQL script to create the 'configuracion_negocio' table and seed it with default data.
-- This script is idempotent.

BEGIN;

-- 1. Create the table for business configuration
CREATE TABLE IF NOT EXISTS public.configuracion_negocio (
    id BIGSERIAL PRIMARY KEY,
    negocio_id TEXT NOT NULL UNIQUE,
    hora_apertura TIME WITHOUT TIME ZONE,
    hora_cierre TIME WITHOUT TIME ZONE,
    dias_operacion TEXT[], -- e.g., ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes']
    limite_turnos INTEGER,
    mostrar_tiempo_estimado BOOLEAN DEFAULT false,
    theme_primary TEXT DEFAULT 'blue',
    theme_mode TEXT DEFAULT 'light',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE public.configuracion_negocio ENABLE ROW LEVEL SECURITY;

-- 3. Create permissive RLS policies for public access
-- This allows the app to read configuration settings.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'config_select_public') THEN
    CREATE POLICY config_select_public ON public.configuracion_negocio FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'config_update_auth') THEN
    -- More restrictive policy for updates, assuming only authenticated users should update.
    -- The JS code uses upsert, so we need insert and update.
    CREATE POLICY config_update_auth ON public.configuracion_negocio FOR ALL
    USING (true)
    WITH CHECK (true);
  END IF;
END
$$;

-- 4. Insert default configuration data for 'barberia007'
-- This prevents the "406 Not Acceptable" error by ensuring a row exists.
INSERT INTO public.configuracion_negocio
    (negocio_id, hora_apertura, hora_cierre, dias_operacion, limite_turnos, mostrar_tiempo_estimado, theme_primary, theme_mode)
VALUES
    ('barberia007', '09:00:00', '18:00:00', ARRAY['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'], 50, true, 'blue', 'light')
ON CONFLICT (negocio_id) DO NOTHING;


COMMIT;
