-- SQL script to create the 'citas' table for appointment booking

BEGIN;

-- 1. Create the 'citas' table
CREATE TABLE IF NOT EXISTS public.citas (
    id BIGSERIAL PRIMARY KEY,
    negocio_id TEXT NOT NULL,
    nombre TEXT NOT NULL,
    telefono TEXT,
    servicio TEXT NOT NULL,
    fecha DATE NOT NULL,
    hora_inicio TIME NOT NULL,
    estado TEXT NOT NULL DEFAULT 'programada', -- e.g., 'programada', 'completada', 'cancelada'
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT uq_cita_slot UNIQUE (negocio_id, fecha, hora_inicio)
);

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_citas_negocio_fecha ON public.citas(negocio_id, fecha);

-- 3. Enable Row Level Security (RLS)
ALTER TABLE public.citas ENABLE ROW LEVEL SECURITY;

-- 4. Create permissive RLS policies for public access
-- These policies allow public clients to read available slots and book new appointments.
-- The application logic is responsible for filtering by `negocio_id`.
DROP POLICY IF EXISTS citas_select_public ON public.citas;
CREATE POLICY citas_select_public ON public.citas
    FOR SELECT
    USING (true);

DROP POLICY IF EXISTS citas_insert_public ON public.citas;
CREATE POLICY citas_insert_public ON public.citas
    FOR INSERT
    WITH CHECK (true);

-- Note: We are not creating public UPDATE or DELETE policies by default
-- to prevent users from modifying or deleting others' appointments.
-- Admin policies for these actions will be defined separately.

COMMIT;
