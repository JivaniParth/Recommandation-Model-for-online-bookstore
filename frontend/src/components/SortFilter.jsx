import React from "react";

const SortFilter = ({ sortBy, setSortBy }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Sort By</h3>
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value)}
        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
      >
        <option value="title">Title (A-Z)</option>
        <option value="price-low">Price (Low to High)</option>
        <option value="price-high">Price (High to Low)</option>
        <option value="rating">Highest Rated</option>
        <option value="popularity">Most Popular</option>
      </select>
    </div>
  );
};

export default SortFilter;
