-- Add customer_type column to customers table
ALTER TABLE customers 
ADD COLUMN customer_type TEXT DEFAULT 'tourist' CHECK (customer_type IN ('local', 'tourist'));

-- Create index for filtering
CREATE INDEX idx_customers_type ON customers(customer_type);

-- Allow admins to update customer_type
CREATE POLICY "admin_update_customer_type" ON customers
FOR UPDATE USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));