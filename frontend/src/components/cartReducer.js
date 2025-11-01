import { CART_ACTIONS } from "./cartTypes";

// Cart Reducer
export const cartReducer = (state, action) => {
  switch (action.type) {
    case CART_ACTIONS.ADD_ITEM: {
      const existingItem = state.items.find(
        (item) => item.id === action.payload.id
      );

      if (existingItem) {
        return {
          ...state,
          items: state.items.map((item) =>
            item.id === action.payload.id
              ? { ...item, quantity: item.quantity + 1 }
              : item
          ),
        };
      }

      return {
        ...state,
        items: [...state.items, { ...action.payload, quantity: 1 }],
      };
    }

    case CART_ACTIONS.REMOVE_ITEM: {
      return {
        ...state,
        items: state.items.filter((item) => item.id !== action.payload),
      };
    }

    case CART_ACTIONS.UPDATE_QUANTITY: {
      const { id, change } = action.payload;
      return {
        ...state,
        items: state.items
          .map((item) => {
            if (item.id === id) {
              const newQuantity = item.quantity + change;
              return newQuantity <= 0
                ? null
                : { ...item, quantity: newQuantity };
            }
            return item;
          })
          .filter(Boolean),
      };
    }

    case CART_ACTIONS.CLEAR_CART: {
      return {
        ...state,
        items: [],
      };
    }

    case CART_ACTIONS.TOGGLE_FAVORITE: {
      const bookId = action.payload;
      return {
        ...state,
        favorites: state.favorites.includes(bookId)
          ? state.favorites.filter((id) => id !== bookId)
          : [...state.favorites, bookId],
      };
    }

    default:
      return state;
  }
};
