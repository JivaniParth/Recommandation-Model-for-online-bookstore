const BookCardSkeleton = () => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden border border-gray-200 animate-pulse">
      <div className="aspect-[3/4] bg-gray-200"></div>
      <div className="p-4">
        <div className="h-4 bg-gray-200 rounded mb-2"></div>
        <div className="h-3 bg-gray-200 rounded w-2/3 mb-4"></div>
        <div className="h-6 bg-gray-200 rounded w-1/3 mb-3"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  );
};

export default BookCardSkeleton;
