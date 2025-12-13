import { Link, useLocation } from 'react-router-dom';
import { FileText, Menu, X, User, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Home' },
    { to: '/forms', label: 'Forms' },
    { to: '/#news', label: 'News', isAnchor: true },
    { to: '/#contact', label: 'Contact Us', isAnchor: true },
  ];

  const handleAnchorClick = (e: React.MouseEvent, anchor: string) => {
    if (location.pathname === '/') {
      e.preventDefault();
      const element = document.querySelector(anchor);
      element?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#1A365D] rounded-lg flex items-center justify-center">
              <FileText className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-[#1A365D]">forms.lk</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link) => (
              link.isAnchor ? (
                <a
                  key={link.to}
                  href={link.to}
                  onClick={(e) => handleAnchorClick(e, link.to.replace('/', ''))}
                  className="text-sm font-medium text-[#4A5568] hover:text-[#1A365D] transition-colors"
                >
                  {link.label}
                </a>
              ) : (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`text-sm font-medium transition-colors ${
                    location.pathname === link.to
                      ? 'text-[#3182CE]'
                      : 'text-[#4A5568] hover:text-[#1A365D]'
                  }`}
                >
                  {link.label}
                </Link>
              )
            ))}
          </nav>

          {/* Actions */}
          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/dashboard"
              className="text-sm font-medium text-[#4A5568] hover:text-[#1A365D] transition-colors"
            >
              My Forms
            </Link>
            <Link
              to="/admin"
              className="flex items-center gap-1.5 text-sm font-medium text-[#4A5568] hover:text-[#1A365D] transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Admin
            </Link>
            <button className="flex items-center gap-2 px-4 py-2 bg-[#1A365D] text-white rounded-lg text-sm font-medium hover:bg-[#2a4a7a] transition-colors">
              <User className="w-4 h-4" />
              Sign In
            </button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="md:hidden p-2"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-gray-600" />
            ) : (
              <Menu className="w-6 h-6 text-gray-600" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-gray-100">
            <nav className="flex flex-col gap-2">
              {navLinks.map((link) => (
                link.isAnchor ? (
                  <a
                    key={link.to}
                    href={link.to}
                    onClick={(e) => {
                      handleAnchorClick(e, link.to.replace('/', ''));
                      setMobileMenuOpen(false);
                    }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-[#4A5568] hover:bg-gray-50"
                  >
                    {link.label}
                  </a>
                ) : (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium ${
                      location.pathname === link.to
                        ? 'bg-[#EBF4FF] text-[#3182CE]'
                        : 'text-[#4A5568] hover:bg-gray-50'
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              ))}
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#4A5568] hover:bg-gray-50"
              >
                My Forms
              </Link>
              <Link
                to="/admin"
                onClick={() => setMobileMenuOpen(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#4A5568] hover:bg-gray-50 flex items-center gap-2"
              >
                <LayoutDashboard className="w-4 h-4" />
                Admin Dashboard
              </Link>
              <div className="mt-4 px-4">
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-[#1A365D] text-white rounded-lg text-sm font-medium">
                  <User className="w-4 h-4" />
                  Sign In
                </button>
              </div>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
}
