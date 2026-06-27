import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col items-center justify-center text-center px-4">
      <div className="mb-8">
        <span className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600">404</span>
      </div>
      <h1 className="text-3xl font-bold text-white mb-2">Lost in the Manga-verse!</h1>
      <p className="text-gray-400 mb-8 max-w-md">
        The page you're looking for wandered off into another dimension. Even Gojo's six eyes couldn't find it.
      </p>
      <div className="flex gap-4">
        <Link
          to="/"
          className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg font-semibold hover:opacity-90 transition-opacity"
        >
          Return Home
        </Link>
        <Link
          to="/books"
          className="px-6 py-3 border border-purple-500 text-purple-400 rounded-lg font-semibold hover:bg-purple-500/10 transition-colors"
        >
          Browse Books
        </Link>
      </div>
    </div>
  );
}
