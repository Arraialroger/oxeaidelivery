import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem, Product, SelectedOption } from '@/types';

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
  const [items, setItems] = useState<CartItem[]>([]);

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
  }, []);

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
