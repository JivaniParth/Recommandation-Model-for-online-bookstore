import React from "react";
import { AlertTriangle } from "lucide-react";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Error caught by boundary:", error, errorInfo);
  }

  // Helper function to safely extract error message
  getErrorMessage = (error) => {
    if (!error) return "An unexpected error occurred";

    // Check if the error or its message is an object (which triggers the React error)
    if (
      typeof error === "object" &&
      error !== null &&
      !Array.isArray(error) &&
      !error.message
    ) {
      return "Critical backend error: An unexpected non-JSON object was returned (likely a database connection failure).";
    }
    if (typeof error.message === "object" && error.message !== null) {
      return "Critical backend error: An unexpected non-JSON object was returned (likely a database connection failure).";
    }

    // Return the message or safely stringify the whole error object
    return error.message || String(error) || "An unexpected error occurred";
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <div className="max-w-md w-full bg-white shadow-lg rounded-lg p-6">
            <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 rounded-full">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="mt-4 text-xl font-semibold text-center text-gray-900">
              Something went wrong
            </h2>
            <p className="mt-2 text-sm text-center text-gray-600">
              {/* Use the new safe function here */}
              {this.getErrorMessage(this.state.error)}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-6 w-full bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
