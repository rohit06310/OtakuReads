import { Link, useNavigate } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export default function Unauthorized() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center px-4">
      <div className="mb-6 w-24 h-24 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/30">
        <ShieldOff size={40} className="text-red-400" />
      </div>
      <h1 className="text-4xl font-black text-white mb-2">403</h1>
      <h2 className="text-xl font-bold text-red-400 mb-3">Access Forbidden</h2>
      <p className="text-gray-400 mb-8 max-w-md">
        You don't have permission to access this page. Your current role doesn't grant access here.
      </p>
      <div className="flex gap-4">
        <button
          onClick={() => navigate(-1)}
          className="px-6 py-3 border border-gray-600 text-gray-300 rounded-lg font-semibold hover:bg-gray-800 transition-colors"
        >
          Go Back
        </button>
        <Link
          to="/"
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Return Home
        </Link>
      </div>
    </div>
  );
}
