import React, { useState, useEffect } from "react";
import { Filter, ChevronDown, ChevronUp } from "lucide-react";
import apiService from "./apiService";

const Sidebar = ({
  categories,
  selectedCategory,
  setSelectedCategory,
  sortBy,
  setSortBy,
  selectedAuthor,
  setSelectedAuthor,
  selectedPublisher,
  setSelectedPublisher,
}) => {
  const [authors, setAuthors] = useState([]);
  const [publishers, setPublishers] = useState([]);
  const [showAuthors, setShowAuthors] = useState(false);
  const [showPublishers, setShowPublishers] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchFilters = async () => {
      try {
        setLoading(true);
        const response = await apiService.getFilters();
        if (response.success) {
          setAuthors(response.filters.authors || []);
          setPublishers(response.filters.publishers || []);
        }
      } catch (error) {
        console.error("Error fetching filters:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchFilters();
  }, []);

  return (
    <aside className="w-full lg:w-64 space-y-6">
      {/* Categories */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
          <Filter className="w-5 h-5 mr-2 text-gray-500" />
          Categories
        </h3>
        <div className="space-y-1 max-h-64 overflow-y-auto">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                selectedCategory === category.id
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
      </div>

      {/* Authors Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <button
          onClick={() => setShowAuthors(!showAuthors)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-gray-500" />
            Authors
          </h3>
          {showAuthors ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showAuthors && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => setSelectedAuthor("")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                !selectedAuthor
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              All Authors
            </button>
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : (
              authors.map((author) => (
                <button
                  key={author}
                  onClick={() => setSelectedAuthor(author)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                    selectedAuthor === author
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {author}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Publishers Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <button
          onClick={() => setShowPublishers(!showPublishers)}
          className="w-full flex items-center justify-between mb-4"
        >
          <h3 className="text-lg font-semibold text-gray-900 flex items-center">
            <Filter className="w-5 h-5 mr-2 text-gray-500" />
            Publishers
          </h3>
          {showPublishers ? (
            <ChevronUp className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-500" />
          )}
        </button>

        {showPublishers && (
          <div className="space-y-1 max-h-48 overflow-y-auto">
            <button
              onClick={() => setSelectedPublisher("")}
              className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                !selectedPublisher
                  ? "bg-indigo-50 text-indigo-700 font-medium"
                  : "text-gray-700 hover:bg-gray-50"
              }`}
            >
              All Publishers
            </button>
            {loading ? (
              <div className="px-3 py-2 text-sm text-gray-500">Loading...</div>
            ) : (
              publishers.map((publisher) => (
                <button
                  key={publisher}
                  onClick={() => setSelectedPublisher(publisher)}
                  className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
                    selectedPublisher === publisher
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {publisher}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Sort Filter */}
      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort By</h3>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        >
          <option value="title">Title (A-Z)</option>
          <option value="author">Author (A-Z)</option>
          <option value="publisher">Publisher (A-Z)</option>
          <option value="price-low">Price (Low to High)</option>
          <option value="price-high">Price (High to Low)</option>
          <option value="newest">Newest First</option>
        </select>
      </div>

      {/* Clear Filters */}
      {(selectedAuthor || selectedPublisher || selectedCategory !== "all") && (
        <button
          onClick={() => {
            setSelectedCategory("all");
            setSelectedAuthor("");
            setSelectedPublisher("");
          }}
          className="w-full bg-gray-100 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors duration-150 font-medium text-sm"
        >
          Clear All Filters
        </button>
      )}
    </aside>
  );
};

export default Sidebar;
