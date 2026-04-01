-- Add address fields to professionals table
ALTER TABLE public.professionals
  ADD COLUMN IF NOT EXISTS address_cep         text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_street      text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_number      text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_complement  text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_neighborhood text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_city        text DEFAULT '',
  ADD COLUMN IF NOT EXISTS address_state       text DEFAULT '';
