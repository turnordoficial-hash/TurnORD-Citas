-- SQL script for schema updates for v2 features

BEGIN;

-- 1. Create the 'barberos' table
CREATE TABLE IF NOT EXISTS public.barberos (
    id BIGSERIAL PRIMARY KEY,
    negocio_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    foto_url TEXT, -- URL to a photo of the barber
    activo BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_barberos_negocio_nombre UNIQUE (negocio_id, nombre)
);

-- Apply RLS to the new table
ALTER TABLE public.barberos ENABLE ROW LEVEL SECURITY;

-- Policies for 'barberos' table
-- Allow public read access for active barbers
CREATE POLICY barberos_select_public ON public.barberos
    FOR SELECT
    USING (activo = TRUE);

-- Allow admin/authenticated users to manage barbers (example policy)
-- In a real scenario, you'd likely restrict this to a specific role.
CREATE POLICY barberos_manage_auth ON public.barberos
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Seed the 'barberos' table with some sample data for 'barberia007'
INSERT INTO public.barberos (negocio_id, nombre)
VALUES
    ('barberia007', 'Barbero 1'),
    ('barberia007', 'Barbero 2'),
    ('barberia007', 'Barbero 3')
ON CONFLICT (negocio_id, nombre) DO NOTHING;


-- 2. Modify the 'citas' table
-- Add the 'barber_id' column to associate an appointment with a barber
ALTER TABLE public.citas
    ADD COLUMN IF NOT EXISTS barber_id BIGINT REFERENCES public.barberos(id);

-- Drop the old unique constraint
ALTER TABLE public.citas
    DROP CONSTRAINT IF EXISTS uq_cita_slot;

-- Create a new unique constraint that includes the barber
ALTER TABLE public.citas
    ADD CONSTRAINT uq_cita_barber_slot UNIQUE (negocio_id, fecha, hora_inicio, barber_id);

-- Add an index for querying appointments by barber
CREATE INDEX IF NOT EXISTS idx_citas_barber_id ON public.citas(barber_id);


COMMIT;
