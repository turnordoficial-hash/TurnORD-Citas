-- SQL script to set the active services for barberia007

-- Use a transaction to ensure all operations succeed or fail together
BEGIN;

-- Use a DO block to define a variable for the target business ID
DO $$
DECLARE
    target_negocio_id TEXT := 'barberia007';
BEGIN
    -- Delete all existing services for the specified business
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

-- Commit the transaction
COMMIT;
