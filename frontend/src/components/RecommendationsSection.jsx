import React, { useState, useEffect } from "react";
import { Sparkles, TrendingUp, Users, GitBranch } from "lucide-react";

// Recommendations Component
const RecommendationsSection = ({
  userId,
  onAddToCart,
  toggleFavorite,
  favorites,
}) => {
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modelInfo, setModelInfo] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (userId) {
      fetchRecommendations();
    }
  }, [userId]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);

      // First, get the A/B test assignment for this user
      const abResponse = await fetch(
        `http://localhost:4000/api/ab/user/${userId}`
      );
      const abData = await abResponse.json();

      if (!abData.ok) {
        throw new Error("Failed to get A/B assignment");
      }

      const { assignment } = abData;
      setModelInfo({
        id: assignment.model_id,
        name: assignment.model_name,
      });

      // Fetch recommendations (backend will use A/B assignment automatically)
      const recResponse = await fetch(
        `http://localhost:4000/api/recommendations/${userId}?limit=6`
      );
      const recData = await recResponse.json();

      if (recData.recommendations) {
        setRecommendations(recData.recommendations);

        // Log impressions for each recommended product
        recData.recommendations.forEach(async (rec) => {
          await logEvent({
            user_id: userId,
            product_id: rec.product_id,
            model_id: assignment.model_id,
            event_type: "impression",
            metadata: { score: rec.score },
          });
        });
      }
    } catch (err) {
      console.error("Error fetching recommendations:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const logEvent = async (eventData) => {
    try {
      await fetch("http://localhost:4000/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(eventData),
      });
    } catch (err) {
      console.error("Error logging event:", err);
    }
  };

  const handleBookClick = async (book) => {
    // Log click event
    if (modelInfo) {
      await logEvent({
        user_id: userId,
        product_id: book.product_id,
        model_id: modelInfo.id,
        event_type: "click",
        metadata: { score: book.score },
      });
    }
  };

  const handleAddToCart = async (book) => {
    await handleBookClick(book);
    onAddToCart(book);
  };

  const getModelIcon = (modelName) => {
    switch (modelName?.toLowerCase()) {
      case "collaborative":
        return <Users className="w-5 h-5" />;
      case "content":
        return <TrendingUp className="w-5 h-5" />;
      case "graph":
        return <GitBranch className="w-5 h-5" />;
      default:
        return <Sparkles className="w-5 h-5" />;
    }
  };

  const getModelColor = (modelName) => {
    switch (modelName?.toLowerCase()) {
      case "collaborative":
        return "bg-blue-50 text-blue-600 border-blue-200";
      case "content":
        return "bg-green-50 text-green-600 border-green-200";
      case "graph":
        return "bg-purple-50 text-purple-600 border-purple-200";
      default:
        return "bg-indigo-50 text-indigo-600 border-indigo-200";
    }
  };

  if (!userId) return null;

  return (
    <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-6 mb-8 border border-indigo-100">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-white p-2 rounded-lg shadow-sm">
            <Sparkles className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              Recommended For You
            </h2>
            <p className="text-sm text-gray-600">
              Books picked just for you based on your preferences
            </p>
          </div>
        </div>

        {modelInfo && (
          <div
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg border ${getModelColor(
              modelInfo.name
            )}`}
          >
            {getModelIcon(modelInfo.name)}
            <span className="text-sm font-medium capitalize">
              {modelInfo.name} Model
            </span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Finding perfect books for you...</p>
          </div>
        </div>
      ) : error ? (
        <div className="text-center py-16">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 max-w-md mx-auto">
            <p className="text-red-600">{error}</p>
            <button
              onClick={fetchRecommendations}
              className="mt-4 text-red-600 hover:text-red-800 underline"
            >
              Try Again
            </button>
          </div>
        </div>
      ) : recommendations.length === 0 ? (
        <div className="text-center py-16">
          <div className="bg-white rounded-lg p-8 max-w-md mx-auto border border-gray-200">
            <Sparkles className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No recommendations yet
            </h3>
            <p className="text-gray-500">
              Start browsing books to get personalized recommendations!
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {recommendations.map((book) => (
            <div
              key={book.product_id}
              className="group bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
                <img
                  src={
                    book.product_image ||
                    book.image ||
                    "https://via.placeholder.com/300x400?text=No+Image"
                  }
                  alt={book.product_name || book.title || "Book"}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/300x400?text=No+Image";
                  }}
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(book.product_id);
                  }}
                  className={`absolute top-2 right-2 p-2 rounded-full shadow-md transition-all duration-200 ${
                    favorites?.includes(book.product_id)
                      ? "bg-red-500 text-white"
                      : "bg-white text-gray-600 hover:text-red-500"
                  }`}
                >
                  <svg
                    className="w-4 h-4"
                    fill={
                      favorites?.includes(book.product_id)
                        ? "currentColor"
                        : "none"
                    }
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </button>

                {/* Recommendation Score Badge */}
                <div className="absolute top-2 left-2 bg-indigo-600 text-white px-2 py-1 rounded-full text-xs font-bold">
                  {Math.round(book.score * 100) / 10}/10
                </div>
              </div>

              <div className="p-3">
                <h3 className="font-medium text-sm text-gray-900 mb-1 line-clamp-2 min-h-[2.5rem]">
                  {book.product_name || book.title || "Unknown Title"}
                </h3>

                {book.price && (
                  <p className="text-lg font-bold text-indigo-600 mb-3">
                    ${parseFloat(book.price).toFixed(2)}
                  </p>
                )}

                <button
                  onClick={() => handleAddToCart(book)}
                  className="w-full bg-indigo-600 text-white text-sm py-2 px-3 rounded-lg hover:bg-indigo-700 transition-colors duration-150 font-medium"
                >
                  Add to Cart
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Model Info Footer */}
      {modelInfo && recommendations.length > 0 && (
        <div className="mt-6 p-4 bg-white rounded-lg border border-gray-200">
          <p className="text-xs text-gray-600 text-center">
            These recommendations are powered by our{" "}
            <span className="font-semibold text-indigo-600 capitalize">
              {modelInfo.name}
            </span>{" "}
            algorithm, analyzing your reading preferences to find books you'll
            love.
          </p>
        </div>
      )}
    </div>
  );
};

export default RecommendationsSection;
