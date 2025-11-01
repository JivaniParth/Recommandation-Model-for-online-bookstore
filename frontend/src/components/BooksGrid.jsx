// Replace the entire BooksGrid.jsx component
// frontend/src/Components/BooksGrid.jsx

import React from "react";
import { Search } from "lucide-react";
import BookCard from "./BookCard";
import BookCardSkeleton from "./BookCardSkeleton";

const BooksGrid = ({
  filteredBooks,
  favorites,
  toggleFavorite,
  addToCart,
  selectedCategory,
  categories,
  loading = false, // Add default value for loading prop
}) => {
  return (
    <main className="flex-1 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-2 sm:mb-0">
          {selectedCategory === "all"
            ? "All Books"
            : categories.find((c) => c.id === selectedCategory)?.name}
        </h2>
        <p className="text-sm text-gray-600">
          {filteredBooks.length} books found
        </p>
      </div>

      {/* Books Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(8)].map((_, i) => (
            <BookCardSkeleton key={i} />
          ))}
        </div>
      ) : filteredBooks.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredBooks.map((book) => (
            <BookCard
              key={book.id}
              book={book}
              favorites={favorites}
              toggleFavorite={toggleFavorite}
              addToCart={addToCart}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="max-w-md mx-auto">
            <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
              <Search className="h-full w-full" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No books found
            </h3>
            <p className="text-gray-500">
              Try adjusting your search criteria or browse different categories.
            </p>
          </div>
        </div>
      )}
    </main>
  );
};

export default BooksGrid;
