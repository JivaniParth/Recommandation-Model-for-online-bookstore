import React from "react";
import { Plus, Minus, X } from "lucide-react";

const CartItem = ({ item, updateCartQuantity, removeFromCart }) => {
  return (
    <div className="flex items-center space-x-4 bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
      <div className="flex-shrink-0">
        <img
          src={item.image}
          alt={item.title}
          className="w-20 h-24 md:w-24 md:h-32 object-cover rounded-lg"
        />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-semibold text-lg text-gray-900 mb-1">
          {item.title}
        </h4>
        <p className="text-gray-600 text-sm mb-2">{item.author}</p>
        <p className="text-xl font-bold text-indigo-600 mb-3">${item.price}</p>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => updateCartQuantity(item.id, -1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-150 border border-gray-300"
          >
            <Minus className="w-4 h-4 text-gray-600" />
          </button>
          <span className="font-semibold text-lg px-4 py-1 bg-gray-50 rounded-lg min-w-[3rem] text-center">
            {item.quantity}
          </span>
          <button
            onClick={() => updateCartQuantity(item.id, 1)}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors duration-150 border border-gray-300"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="flex flex-col items-end space-y-2">
        <button
          onClick={() => removeFromCart(item.id)}
          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors duration-150"
        >
          <X className="w-5 h-5" />
        </button>
        <p className="text-lg font-semibold text-gray-900">
          ${(item.price * item.quantity).toFixed(2)}
        </p>
      </div>
    </div>
  );
};

export default CartItem;
