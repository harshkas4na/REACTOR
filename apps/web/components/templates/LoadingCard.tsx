export default function LoadingCard() {
    return (
      <div className="h-full animate-pulse bg-gray-800 rounded-lg">
        <div className="h-48 bg-gray-700" />
        <div className="p-6">
          <div className="h-6 bg-gray-700 rounded w-3/4 mb-4" />
          <div className="space-y-3">
            <div className="h-4 bg-gray-700 rounded" />
            <div className="h-4 bg-gray-700 rounded w-5/6" />
            <div className="h-4 bg-gray-700 rounded w-4/6" />
          </div>
        </div>
      </div>
    );
  }