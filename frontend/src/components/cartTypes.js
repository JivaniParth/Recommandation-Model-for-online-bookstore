// Cart Action Types
export const CART_ACTIONS = {
  ADD_ITEM: "ADD_ITEM",
  REMOVE_ITEM: "REMOVE_ITEM",
  UPDATE_QUANTITY: "UPDATE_QUANTITY",
  CLEAR_CART: "CLEAR_CART",
  TOGGLE_FAVORITE: "TOGGLE_FAVORITE",
};

// Initial state
export const initialCartState = {
  items: [],
  favorites: [],
};
