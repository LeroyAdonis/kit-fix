import { useState, useEffect } from 'react';
import { Menu, Shirt, X } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/firebaseConfig";
import { logoutUser } from "../services/authService";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const [user] = useAuthState(auth);
  const location = useLocation();
  const navigate = useNavigate();

  const logout = async () => {
    await logoutUser();
    navigate("/");
  };

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);

      const sections = document.querySelectorAll('section[id]');
      let currentSection = '';

      sections.forEach((section) => {
        const sectionTop = (section as HTMLElement).offsetTop - 120; // Adjust for fixed header
        const sectionHeight = (section as HTMLElement).offsetHeight;

        if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
          currentSection = `#${section.id}`;
        }
      });

      if (activeSection !== currentSection) {
        setActiveSection(currentSection);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (location.pathname !== '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [location.pathname, location.hash]);

  // useEffect(() => {
  //   setIsMenuOpen(false);
  // }, [location.pathname, location.hash]);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Services', path: '/#services' },
    { name: 'How It Works', path: '/#how-it-works' },
    { name: 'Reviews', path: '/#reviews' },
    { name: 'Contact', path: '/#contact' },
  ];

  const isActive = (path: string) => location.pathname + location.hash === path || activeSection === path;

  return (
    <header className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'py-2 bg-pure-white shadow-md' : 'py-4 bg-pure-white'}`}>
      <div className="container-custom flex items-center justify-between">
        <Link to="/" className="flex items-center">
          <Shirt className="h-5 w-5 fill-blue-500 stroke-blue-500" />
          <span className="text-2xl font-bold text-electric-blue">KitFix</span>
        </Link>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map((item) => (
            <a
              key={item.name}
              href={item.path}
              className={`font-medium hover:text-electric-blue transition-colors duration-300 ${isActive(item.path) ? 'text-electric-blue font-semibold' : 'text-jet-black'
                }`}
            >
              {item.name}
            </a>
          ))}

          {user ? (
            <>
              <Link to="/dashboard" className={`font-medium hover:text-electric-blue transition-colors duration-300 ${isActive('/dashboard') ? 'text-electric-blue font-semibold' : 'text-jet-black'}`}>
                Dashboard
              </Link>
              <Link to="/" onClick={logout} className="font-medium text-jet-black hover:text-electric-blue transition-colors duration-300">
                Logout
              </Link>
            </>
          ) : (
            <Link to="/login" className={`font-medium hover:text-electric-blue transition-colors duration-300 ${isActive('/login') ? 'text-electric-blue font-semibold' : 'text-jet-black'}`}>
              Login
            </Link>
          )}

          {user ? (
            <button
              type="button"
              onClick={() => navigate('/upload-photos')}
              className="bg-electric-blue text-white px-4 py-2 rounded-md font-medium"
            >
              Start Repair
            </button>
          ) : (
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="bg-electric-blue text-white px-4 py-2 rounded-md font-medium"
            >
              Start Repair
            </button>
          )}
        </nav>

        <button className="md:hidden text-jet-black" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>

        {isMenuOpen && (
          <div className="md:hidden absolute top-full left-0 right-0 bg-pure-white shadow-md p-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map((item) => (
                <a
                  key={item.name}
                  href={item.path}
                  className={`font-medium hover:text-electric-blue transition-colors duration-300 py-2 ${isActive(item.path) ? 'text-electric-blue font-semibold' : 'text-jet-black'
                    }`}
                  onClick={() => setIsMenuOpen(false)}
                >
                  {item.name}
                </a>
              ))}
              <button type="button" onClick={() => navigate('/login')} className="bg-electric-blue text-white px-4 py-2 rounded-md font-medium w-full">
                Start Repair
              </button>
            </nav>
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;

