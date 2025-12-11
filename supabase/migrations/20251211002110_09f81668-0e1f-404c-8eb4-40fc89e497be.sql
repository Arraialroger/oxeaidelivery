-- Add cancellation_reason column to orders table
ALTER TABLE public.orders 
ADD COLUMN cancellation_reason text;