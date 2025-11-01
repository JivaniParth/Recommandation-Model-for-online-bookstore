import React from "react";
import { ShoppingCart, X } from "lucide-react";
import CartItem from "./CartItem";

const ShoppingCartSidebar = ({
  showCart,
  setShowCart,
  cart,
  getTotalItems,
  getTotalPrice,
  updateCartQuantity,
  removeFromCart,
  onCheckout, // Add this prop
}) => {
  if (!showCart) return null;

  return (
    // Changed to full screen overlay
    <div className="fixed inset-0 z-50 bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white sticky top-0 z-10">
        <h2 className="text-xl font-semibold text-gray-900">
          Shopping Cart ({getTotalItems()})
        </h2>
        <button
          onClick={() => setShowCart(false)}
          className="p-2 hover:bg-gray-100 rounded-md transition-colors duration-150"
        >
          <X className="w-6 h-6 text-gray-500" />
        </button>
      </div>

      {/* Cart Content */}
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 pb-32">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <ShoppingCart className="w-16 h-16 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-900 mb-2">
                Your cart is empty
              </h3>
              <p className="text-gray-500 text-lg mb-6">
                Add some books to get started!
              </p>
              <button
                onClick={() => setShowCart(false)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors duration-150"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto">
              <div className="grid gap-4 md:gap-6">
                {cart.map((item) => (
                  <CartItem
                    key={item.id}
                    item={item}
                    updateCartQuantity={updateCartQuantity}
                    removeFromCart={removeFromCart}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Checkout Section - Fixed at bottom */}
        {cart.length > 0 && (
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
            <div className="max-w-4xl mx-auto">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0">
                <div className="text-center sm:text-left">
                  <p className="text-sm text-gray-600">
                    {getTotalItems()} items in cart
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    Total: ${getTotalPrice().toFixed(2)}
                  </p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    onClick={() => setShowCart(false)}
                    className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-150 font-medium"
                  >
                    Continue Shopping
                  </button>
                  <button
                    onClick={onCheckout}
                    className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-150 font-medium text-lg"
                  >
                    Proceed to Checkout
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ShoppingCartSidebar;
