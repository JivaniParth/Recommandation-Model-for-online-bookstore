import React, { createContext, useReducer, useCallback } from "react";
import { cartReducer } from "./cartReducer";
import CartContext from "./CartContext";
import { CART_ACTIONS, initialCartState } from "./cartTypes";

// Cart Provider Component
export const CartProvider = ({ children }) => {
  const [state, dispatch] = useReducer(cartReducer, initialCartState);

  // Add item to cart
  const addToCart = useCallback((book) => {
    dispatch({ type: CART_ACTIONS.ADD_ITEM, payload: book });
  }, []);

  // Remove item from cart
  const removeFromCart = useCallback((bookId) => {
    dispatch({ type: CART_ACTIONS.REMOVE_ITEM, payload: bookId });
  }, []);

  // Update item quantity
  const updateCartQuantity = useCallback((bookId, change) => {
    dispatch({
      type: CART_ACTIONS.UPDATE_QUANTITY,
      payload: { id: bookId, change },
    });
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    dispatch({ type: CART_ACTIONS.CLEAR_CART });
  }, []);

  // Toggle favorite
  const toggleFavorite = useCallback((bookId) => {
    dispatch({ type: CART_ACTIONS.TOGGLE_FAVORITE, payload: bookId });
  }, []);

  // Calculate total price
  const getTotalPrice = useCallback(() => {
    return state.items.reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }, [state.items]);

  // Calculate total items
  const getTotalItems = useCallback(() => {
    return state.items.reduce((total, item) => total + item.quantity, 0);
  }, [state.items]);

  // Get cart items count
  const getCartItemsCount = useCallback(() => {
    return state.items.length;
  }, [state.items]);

  // Check if item is in cart
  const isInCart = useCallback(
    (bookId) => {
      return state.items.some((item) => item.id === bookId);
    },
    [state.items]
  );

  // Get item quantity in cart
  const getItemQuantity = useCallback(
    (bookId) => {
      const item = state.items.find((item) => item.id === bookId);
      return item ? item.quantity : 0;
    },
    [state.items]
  );

  const value = {
    // State
    cart: state.items,
    favorites: state.favorites,

    // Actions
    addToCart,
    removeFromCart,
    updateCartQuantity,
    clearCart,
    toggleFavorite,

    // Computed values
    getTotalPrice,
    getTotalItems,
    getCartItemsCount,
    isInCart,
    getItemQuantity,
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};
