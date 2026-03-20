-- Add payment model fields to the professionals table
ALTER TABLE public.professionals
ADD COLUMN payment_model TEXT,
ADD COLUMN payment_percentage NUMERIC;