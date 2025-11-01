import React from "react";
import { Filter } from "lucide-react";

const CategoryFilter = ({
  categories,
  selectedCategory,
  setSelectedCategory,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Filter className="w-5 h-5 mr-2 text-gray-500" />
        Categories
      </h3>
      <div className="space-y-1">
        {categories.map((category) => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`w-full text-left px-3 py-2 text-sm rounded-md transition-colors duration-150 ${
              selectedCategory === category.id
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
};

export default CategoryFilter;
