
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Route, ReportIncident, BookOpen, Star, User, LogOut,
  Menu, X
} from 'lucide-react';

const Navbar = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  const navItems = [
    { name: "Route Planner", path: "/route-planner", icon: <Route className="w-5 h-5" /> },
    { name: "Report Incident", path: "/report-incident", icon: <ReportIncident className="w-5 h-5" /> },
    { name: "Survivor Blog", path: "/survivor-blog", icon: <BookOpen className="w-5 h-5" /> },
    { name: "Rate a Route", path: "/rate-route", icon: <Star className="w-5 h-5" /> },
    { name: "Profile", path: "/profile", icon: <User className="w-5 h-5" /> },
  ];

  const isActive = (path: string) => {
    return location.pathname === path ? "bg-serenova-100 text-serenova-700" : "text-gray-600 hover:bg-serenova-50";
  };

  return (
    <nav className="bg-white border-b border-serenova-100 sticky top-0 z-30">
      <div className="serenova-container py-2">
        <div className="flex items-center justify-between">
          <Link to="/dashboard" className="flex items-center space-x-2">
            <div className="bg-serenova-500 h-8 w-8 rounded-full flex items-center justify-center">
              <span className="text-white font-bold text-lg">S</span>
            </div>
            <span className="font-bold text-xl text-serenova-700">Serenova</span>
          </Link>

          {/* Mobile menu button */}
          <button 
            onClick={toggleMenu}
            className="md:hidden p-2 rounded-md text-gray-600 hover:text-serenova-500"
          >
            {isMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>

          {/* Desktop navigation */}
          <div className="hidden md:flex space-x-4">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2 rounded-md text-sm font-medium ${isActive(item.path)}`}
              >
                <span className="mr-1.5">{item.icon}</span>
                {item.name}
              </Link>
            ))}
            <Link
              to="/"
              className="flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-serenova-50"
            >
              <LogOut className="w-5 h-5 mr-1.5" />
              Logout
            </Link>
          </div>
        </div>
      </div>

      {/* Mobile navigation */}
      {isMenuOpen && (
        <div className="md:hidden animate-fade-in">
          <div className="px-2 py-3 space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center px-3 py-2.5 rounded-md text-base font-medium ${isActive(item.path)}`}
                onClick={() => setIsMenuOpen(false)}
              >
                <span className="mr-3">{item.icon}</span>
                {item.name}
              </Link>
            ))}
            <Link
              to="/"
              className="flex items-center px-3 py-2.5 rounded-md text-base font-medium text-gray-600 hover:bg-serenova-50"
              onClick={() => setIsMenuOpen(false)}
            >
              <LogOut className="w-5 h-5 mr-3" />
              Logout
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
