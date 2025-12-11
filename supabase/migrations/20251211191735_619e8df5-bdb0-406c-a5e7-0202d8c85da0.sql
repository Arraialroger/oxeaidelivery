-- Add Foreign Keys to establish relationships between tables

-- orders → addresses
ALTER TABLE orders 
ADD CONSTRAINT orders_address_id_fkey 
FOREIGN KEY (address_id) REFERENCES addresses(id) ON DELETE SET NULL;

-- orders → customers
ALTER TABLE orders 
ADD CONSTRAINT orders_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL;

-- order_items → orders
ALTER TABLE order_items 
ADD CONSTRAINT order_items_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- order_items → products
ALTER TABLE order_items 
ADD CONSTRAINT order_items_product_id_fkey 
FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE SET NULL;

-- order_item_options → order_items
ALTER TABLE order_item_options 
ADD CONSTRAINT order_item_options_order_item_id_fkey 
FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE CASCADE;

-- kds_events → orders
ALTER TABLE kds_events 
ADD CONSTRAINT kds_events_order_id_fkey 
FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE;

-- addresses → customers
ALTER TABLE addresses 
ADD CONSTRAINT addresses_customer_id_fkey 
FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE;