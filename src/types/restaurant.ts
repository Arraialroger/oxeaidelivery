export interface Restaurant {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  hero_banner_url: string | null;
  primary_color: string | null;
  secondary_color: string | null;
  phone: string | null;
  whatsapp: string | null;
  address: string | null;
  status: string | null;
  settings: RestaurantSettings;
  created_at: string | null;
  updated_at: string | null;
}

export interface RestaurantSettings {
  is_open: boolean;
  kds_enabled: boolean;
  delivery_fee: number;
  local_ddd: string;
  loyalty_enabled: boolean;
  loyalty_stamps_goal: number;
  loyalty_min_order: number;
  loyalty_reward_value: number;
}

export const DEFAULT_SETTINGS: RestaurantSettings = {
  is_open: true,
  kds_enabled: true,
  delivery_fee: 5,
  local_ddd: '73',
  loyalty_enabled: false,
  loyalty_stamps_goal: 8,
  loyalty_min_order: 50,
  loyalty_reward_value: 50,
};
