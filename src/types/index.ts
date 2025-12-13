export interface Category {
  id: string;
  name: string;
  order_index: number | null;
}

export interface Product {
  id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  category_id: string | null;
  is_active: boolean | null;
}

export interface ProductOption {
  id: string;
  product_id: string | null;
  name: string;
  type: string; // 'mandatory' | 'addon' | 'removal'
  group_name: string | null;
  price: number | null;
}

export interface CartItem {
  id: string;
  product: Product;
  quantity: number;
  selectedOptions: SelectedOption[];
  note: string;
  totalPrice: number;
}

export interface SelectedOption {
  id: string;
  name: string;
  price: number;
  type: string;
  groupName: string | null;
}

export interface Address {
  id?: string;
  customer_id?: string | null;
  street: string;
  number: string;
  neighborhood: string;
  complement?: string | null;
  reference?: string | null;
}

export interface Order {
  id: string;
  customer_id: string | null;
  address_id: string | null;
  status: 'pending' | 'preparing' | 'ready' | 'delivered' | 'cancelled';
  payment_method: string;
  change_amount: number | null;
  subtotal: number;
  delivery_fee: number;
  total: number;
  pix_proof_url: string | null;
  created_at: string | null;
}

export interface OrderItem {
  id: string;
  order_id: string | null;
  product_id: string | null;
  quantity: number;
  unit_price: number;
  note: string | null;
}

export interface Config {
  id: number;
  delivery_fee: number | null;
  restaurant_open: boolean | null;
  kds_enabled: boolean | null;
  hero_banner_url: string | null;
}
