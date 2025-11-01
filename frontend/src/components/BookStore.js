import React, { useState, useEffect } from "react";
import "./BookStore.css";

const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:4000";

function BookStore() {
  const [userId, setUserId] = useState(2);
  const [products, setProducts] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [modelAssignment, setModelAssignment] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cart, setCart] = useState([]);
  const [showCart, setShowCart] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("all");

  useEffect(() => {
    fetchProducts();
    fetchUserAssignment();
  }, [userId]);

  const fetchProducts = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/products`);
      const data = await response.json();
      if (data.ok && data.products) {
        setProducts(data.products);
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
      // Fallback to mock data
      setProducts([
        {
          id: 1,
          name: "The Great Gatsby",
          category: "Classics",
          price: 12.99,
          sku: "9780743273565",
        },
        {
          id: 2,
          name: "To Kill a Mockingbird",
          category: "Classics",
          price: 13.99,
          sku: "9780061120084",
        },
        {
          id: 3,
          name: "1984",
          category: "Dystopian",
          price: 13.99,
          sku: "9780451524935",
        },
        {
          id: 4,
          name: "Dune",
          category: "Science Fiction",
          price: 16.99,
          sku: "9780441013593",
        },
        {
          id: 5,
          name: "The Hobbit",
          category: "Fantasy",
          price: 14.99,
          sku: "9780547928227",
        },
        {
          id: 6,
          name: "Pride and Prejudice",
          category: "Romance",
          price: 10.99,
          sku: "9780141439518",
        },
        {
          id: 7,
          name: "Gone Girl",
          category: "Thriller",
          price: 15.99,
          sku: "9780307588364",
        },
        {
          id: 8,
          name: "The Girl with the Dragon Tattoo",
          category: "Mystery",
          price: 16.99,
          sku: "9780307949486",
        },
        {
          id: 9,
          name: "And Then There Were None",
          category: "Mystery",
          price: 11.99,
          sku: "9780062073501",
        },
        {
          id: 10,
          name: "The Shining",
          category: "Thriller",
          price: 14.99,
          sku: "9781501142970",
        },
      ]);
    }
  };

  const fetchUserAssignment = async () => {
    try {
      const response = await fetch(`${API_BASE}/api/ab/user/${userId}`);
      const data = await response.json();
      console.log("User assignment:", data);
      if (data.ok) {
        setModelAssignment(data.assignment);
        fetchRecommendations(data.assignment.model_name);
      }
    } catch (err) {
      console.error("Failed to fetch user assignment:", err);
      // Try to fetch recommendations anyway with default model
      fetchRecommendations("collab");
    }
  };

  const fetchRecommendations = async (model = null) => {
    setLoading(true);

    try {
      const url = model
        ? `${API_BASE}/api/recommendations/${userId}?model=${model}&limit=6`
        : `${API_BASE}/api/recommendations/${userId}?limit=6`;

      console.log("Fetching recommendations from:", url);
      const response = await fetch(url);
      const data = await response.json();
      console.log("Recommendations response:", data);

      if (data.recommendations && data.recommendations.length > 0) {
        setRecommendations(data.recommendations);

        // Log impression events
        data.recommendations.forEach((rec) => {
          logEvent(
            userId,
            rec.product_id,
            modelAssignment?.model_id,
            "impression"
          );
        });
      } else {
        console.log("No recommendations returned");
        setRecommendations([]); // Set empty array to show message
      }
    } catch (err) {
      console.error("Failed to fetch recommendations:", err);
      setRecommendations([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  };

  const logEvent = async (
    userId,
    productId,
    modelId,
    eventType,
    metadata = {}
  ) => {
    try {
      await fetch(`${API_BASE}/api/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          product_id: productId,
          model_id: modelId,
          event_type: eventType,
          metadata,
        }),
      });
    } catch (err) {
      console.error("Failed to log event:", err);
    }
  };

  const handleProductClick = (productId) => {
    logEvent(userId, productId, modelAssignment?.model_id, "click");
  };

  const addToCart = (product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    logEvent(userId, product.id, modelAssignment?.model_id, "cart_add");
  };

  const removeFromCart = (productId) => {
    setCart((prev) => prev.filter((item) => item.id !== productId));
  };

  const checkout = () => {
    if (cart.length === 0) {
      alert("Your cart is empty!");
      return;
    }

    cart.forEach((item) => {
      logEvent(userId, item.id, modelAssignment?.model_id, "purchase", {
        quantity: item.quantity,
        total: item.price * item.quantity,
      });
    });

    alert(`Thank you for your purchase! Total: $${cartTotal.toFixed(2)}`);
    setCart([]);
    setShowCart(false);

    // Refresh recommendations after purchase
    setTimeout(() => fetchUserAssignment(), 1000);
  };

  const categories = ["all", ...new Set(products.map((p) => p.category))];
  const filteredProducts =
    selectedCategory === "all"
      ? products
      : products.filter((p) => p.category === selectedCategory);

  const cartTotal = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="bookstore-modern">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">📚</span>
            <h1>BookHaven</h1>
          </div>

          <nav className="nav">
            <select
              className="user-select"
              value={userId}
              onChange={(e) => setUserId(parseInt(e.target.value))}
            >
              <option value={1}>👤 Parth Jivani</option>
              <option value={2}>👤 Nirjari Sheth</option>
              <option value={3}>👤 John Doe</option>
              <option value={4}>👤 Jane Smith</option>
              <option value={5}>👤 Bob Wilson</option>
              <option value={6}>👤 Alice Johnson</option>
            </select>

            <button className="cart-btn" onClick={() => setShowCart(!showCart)}>
              🛒 Cart{" "}
              {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
            </button>
          </nav>
        </div>
      </header>

      {/* Cart Sidebar */}
      {showCart && (
        <div className="cart-overlay" onClick={() => setShowCart(false)}>
          <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
            <div className="cart-header">
              <h2>Shopping Cart</h2>
              <button onClick={() => setShowCart(false)}>✕</button>
            </div>

            <div className="cart-items">
              {cart.length === 0 ? (
                <p className="empty-cart">Your cart is empty</p>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="cart-item">
                    <div className="cart-item-info">
                      <h4>{item.name}</h4>
                      <p>
                        ${item.price} × {item.quantity}
                      </p>
                    </div>
                    <div className="cart-item-actions">
                      <span className="cart-item-total">
                        ${(item.price * item.quantity).toFixed(2)}
                      </span>
                      <button
                        className="remove-btn"
                        onClick={() => removeFromCart(item.id)}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {cart.length > 0 && (
              <div className="cart-footer">
                <div className="cart-total">
                  <span>Total:</span>
                  <span className="total-amount">${cartTotal.toFixed(2)}</span>
                </div>
                <button className="checkout-btn" onClick={checkout}>
                  Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Model Info Banner */}
      {modelAssignment && (
        <div className="model-banner">
          <div className="banner-content">
            <span className="banner-icon">🔬</span>
            <span>
              Recommendation Model:{" "}
              <strong>{modelAssignment.model_name}</strong> (Personalized for
              you)
            </span>
          </div>
        </div>
      )}

      <main className="main-content">
        {/* Recommendations Section - Always show */}
        <section className="recommendations">
          <h2 className="section-title">
            <span className="title-icon">⭐</span>
            Recommended for You
          </h2>

          {loading && (
            <div className="loading">
              <div className="spinner"></div>
              <p>Loading recommendations...</p>
            </div>
          )}

          {!loading && recommendations.length === 0 && (
            <div className="no-recommendations">
              <p>🔍 No recommendations available yet.</p>
              <p>
                Try purchasing some books to get personalized recommendations!
              </p>
              {modelAssignment && (
                <p className="model-info-text">
                  Your model: <strong>{modelAssignment.model_name}</strong>
                </p>
              )}
            </div>
          )}

          {!loading && recommendations.length > 0 && (
            <div className="products-grid">
              {recommendations.map((rec) => {
                const product = products.find(
                  (p) => p.id === rec.product_id
                ) || {
                  id: rec.product_id,
                  name: rec.product_name || `Product ${rec.product_id}`,
                  category: rec.category || "Unknown",
                  price: rec.price || 9.99,
                };

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    score={rec.score}
                    onView={handleProductClick}
                    onAddToCart={addToCart}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Category Filter */}
        <section className="catalog">
          <div className="catalog-header">
            <h2 className="section-title">
              <span className="title-icon">📖</span>
              Browse Books
            </h2>

            <div className="category-filter">
              {categories.map((cat) => (
                <button
                  key={cat}
                  className={`category-btn ${
                    selectedCategory === cat ? "active" : ""
                  }`}
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat === "all" ? "All Books" : cat}
                </button>
              ))}
            </div>
          </div>

          <div className="products-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
                onView={handleProductClick}
                onAddToCart={addToCart}
              />
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>© 2024 BookHaven - Powered by AI Recommendations</p>
        <p className="footer-tech">PostgreSQL • Neo4j • React • Express</p>
      </footer>
    </div>
  );
}

function ProductCard({ product, score, onView, onAddToCart }) {
  return (
    <div className="product-card-modern">
      <div className="product-image-modern">
        <span className="book-icon">📕</span>
        {score && (
          <div className="recommendation-badge">
            <span className="badge-icon">✨</span>
            Score: {score}
          </div>
        )}
      </div>

      <div className="product-info">
        <span className="product-category">{product.category}</span>
        <h3 className="product-title">{product.name}</h3>
        <div className="product-footer">
          <span className="product-price">${product.price}</span>
          <div className="product-actions-modern">
            <button
              className="view-btn-modern"
              onClick={() => onView(product.id)}
              title="View details"
            >
              👁️
            </button>
            <button
              className="cart-btn-modern"
              onClick={() => onAddToCart(product)}
              title="Add to cart"
            >
              🛒
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default BookStore;
