import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import type { CartItem, Product, SelectedOption } from '@/types';

// Generate cart storage key based on restaurant slug
const getCartStorageKey = (slug: string | undefined) => {
  return slug ? `cart-${slug}` : 'cart-default';
};

// Load cart from localStorage
const loadCartFromStorage = (slug: string | undefined): CartItem[] => {
  try {
    const key = getCartStorageKey(slug);
    const stored = localStorage.getItem(key);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error loading cart from storage:', error);
  }
  return [];
};

interface CartContextType {
  items: CartItem[];
  addItem: (product: Product, quantity: number, options: SelectedOption[], note: string) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  subtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { slug } = useParams<{ slug: string }>();
  const [items, setItems] = useState<CartItem[]>(() => loadCartFromStorage(slug));

  // Reload cart when slug changes (switching restaurants)
  useEffect(() => {
    setItems(loadCartFromStorage(slug));
  }, [slug]);

  // Persist cart to localStorage whenever items change
  useEffect(() => {
    try {
      const key = getCartStorageKey(slug);
      localStorage.setItem(key, JSON.stringify(items));
    } catch (error) {
      console.error('Error saving cart to storage:', error);
    }
  }, [items, slug]);

  const addItem = useCallback((
    product: Product,
    quantity: number,
    options: SelectedOption[],
    note: string
  ) => {
    const optionsTotal = options.reduce((sum, opt) => sum + (opt.price || 0), 0);
    const totalPrice = (product.price + optionsTotal) * quantity;

    const newItem: CartItem = {
      id: `${product.id}-${Date.now()}`,
      product,
      quantity,
      selectedOptions: options,
      note,
      totalPrice,
    };

    setItems((prev) => [...prev, newItem]);
  }, []);

  const removeItem = useCallback((itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const updateQuantity = useCallback((itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeItem(itemId);
      return;
    }

    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          const optionsTotal = item.selectedOptions.reduce(
            (sum, opt) => sum + (opt.price || 0),
            0
          );
          return {
            ...item,
            quantity,
            totalPrice: (item.product.price + optionsTotal) * quantity,
          };
        }
        return item;
      })
    );
  }, [removeItem]);

  const clearCart = useCallback(() => {
    setItems([]);
    try {
      const key = getCartStorageKey(slug);
      localStorage.removeItem(key);
    } catch (error) {
      console.error('Error clearing cart from storage:', error);
    }
  }, [slug]);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalItems,
        subtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
