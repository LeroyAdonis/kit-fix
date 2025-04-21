import React from "react";
import { ArrowLeft } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-pure-white p-4">
      <div className="max-w-md w-full glass-card p-8 text-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-fiery-red/10 text-fiery-red mb-6">
          <span className="text-3xl font-bold">404</span>
        </div>
        
        <h1 className="heading-lg mb-4 text-jet-black">Page Not Found</h1>
        
        <p className="text-gray-700 mb-8">
          The page you are looking for might have been removed, had its name changed, or is temporarily unavailable.
        </p>
        
        <a 
          href="/" 
          className="btn-primary inline-flex items-center justify-center"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;