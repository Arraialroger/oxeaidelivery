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
  is_combo: boolean | null;
}

export interface ProductOption {
  id: string;
  product_id: string | null;
  name: string;
  type: string; // 'mandatory' | 'addon' | 'removal'
  group_name: string | null;
  price: number | null;
}

export interface ComboSlot {
  id: string;
  combo_id: string;
  slot_label: string;
  category_id: string | null;
  quantity: number | null;
  slot_order: number | null;
  created_at: string | null;
}

export interface ComboSlotProduct {
  id: string;
  slot_id: string;
  product_id: string;
  price_difference: number | null;
  is_default: boolean | null;
  created_at: string | null;
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
  // Loyalty program fields
  loyalty_enabled: boolean | null;
  loyalty_stamps_goal: number | null;
  loyalty_min_order: number | null;
  loyalty_reward_value: number | null;
}

export interface StampTransaction {
  id: string;
  customer_id: string | null;
  order_id: string | null;
  type: 'earned' | 'redeemed' | 'expired' | 'manual_adjustment';
  amount: number;
  balance_after: number;
  notes: string | null;
  created_at: string | null;
}
