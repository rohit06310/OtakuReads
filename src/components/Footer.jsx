import { Link } from 'react-router-dom';
import { BookOpen, Github, Twitter, Instagram, Heart } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-gray-950 border-t border-gray-800 mt-auto">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-600 to-pink-600 rounded-lg flex items-center justify-center">
                <BookOpen size={16} className="text-white" />
              </div>
              <span className="text-xl font-black text-white">OtakuReads</span>
            </div>
            <p className="text-gray-400 text-sm leading-relaxed max-w-xs">
              Your ultimate destination for manga, light novels, and anime art books. Discover stories that transcend dimensions.
            </p>
            <div className="flex gap-4 mt-6">
              <a href="#" className="text-gray-500 hover:text-purple-400 transition-colors">
                <Twitter size={20} />
              </a>
              <a href="#" className="text-gray-500 hover:text-purple-400 transition-colors">
                <Instagram size={20} />
              </a>
              <a href="#" className="text-gray-500 hover:text-purple-400 transition-colors">
                <Github size={20} />
              </a>
            </div>
          </div>

          {/* Links */}
          <div>
            <h3 className="text-white font-semibold mb-4">Explore</h3>
            <ul className="space-y-2">
              {[
                { label: 'Home', to: '/' },
                { label: 'Browse Books', to: '/books' },
                { label: 'My Wishlist', to: '/wishlist' },
                { label: 'My Orders', to: '/profile' },
              ].map((item) => (
                <li key={item.to}>
                  <Link to={item.to} className="text-gray-400 hover:text-purple-400 text-sm transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="text-white font-semibold mb-4">Categories</h3>
            <ul className="space-y-2">
              {['Shonen', 'Seinen', 'Shojo', 'Isekai', 'Slice of Life'].map((cat) => (
                <li key={cat}>
                  <Link
                    to={`/books?category=${cat}`}
                    className="text-gray-400 hover:text-purple-400 text-sm transition-colors"
                  >
                    {cat}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-gray-800 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-gray-500 text-sm">
            © {new Date().getFullYear()} OtakuReads. All rights reserved.
          </p>
          <p className="text-gray-500 text-sm flex items-center gap-1">
            Made with <Heart size={14} className="text-pink-500 fill-pink-500" /> for otakus everywhere
          </p>
        </div>
      </div>
    </footer>
  );
}
