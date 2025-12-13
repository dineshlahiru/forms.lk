import { FileText, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="bg-[#1A365D] text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <Link to="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-[#1A365D]" />
              </div>
              <span className="text-xl font-bold">forms.lk</span>
            </Link>
            <p className="text-gray-300 text-sm max-w-md mb-4">
              Find, fill, and download official Sri Lankan forms in your preferred language.
              Free service for everyone.
            </p>
            <div className="flex items-center gap-4 text-sm text-gray-300">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4" />
                <span>English | සිංහල | தமிழ்</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/forms" className="hover:text-white transition-colors">Browse Forms</Link></li>
              <li><Link to="/dashboard" className="hover:text-white transition-colors">My Saved Forms</Link></li>
              <li><a href="#" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#" className="hover:text-white transition-colors">FAQ</a></li>
            </ul>
          </div>

          {/* Categories */}
          <div>
            <h3 className="font-semibold mb-4">Popular Categories</h3>
            <ul className="space-y-2 text-sm text-gray-300">
              <li><Link to="/forms?category=Divisional+Secretariat" className="hover:text-white transition-colors">Divisional Secretariat</Link></li>
              <li><Link to="/forms?category=Police" className="hover:text-white transition-colors">Police</Link></li>
              <li><Link to="/forms?category=Motor+Traffic" className="hover:text-white transition-colors">Motor Traffic (RMV)</Link></li>
              <li><Link to="/forms?category=Banks" className="hover:text-white transition-colors">Banks</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            &copy; {new Date().getFullYear()} forms.lk. Free for everyone.
          </p>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-white transition-colors">Contact</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
