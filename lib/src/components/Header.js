"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
var react_1 = require("react");
var lucide_react_1 = require("lucide-react");
var react_router_dom_1 = require("react-router-dom");
var auth_1 = require("react-firebase-hooks/auth");
var firebaseConfig_1 = require("@/firebaseConfig");
var authService_1 = require("../services/authService");
var Header = function () {
    var _a = (0, react_1.useState)(false), isMenuOpen = _a[0], setIsMenuOpen = _a[1];
    var _b = (0, react_1.useState)(false), scrolled = _b[0], setScrolled = _b[1];
    var _c = (0, react_1.useState)(''), activeSection = _c[0], setActiveSection = _c[1];
    var _d = (0, auth_1.useAuthState)(firebaseConfig_1.auth), user = _d[0], loading = _d[1], error = _d[2];
    var location = (0, react_router_dom_1.useLocation)();
    var navigate = (0, react_router_dom_1.useNavigate)();
    var logout = function () { return __awaiter(void 0, void 0, void 0, function () {
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0: return [4 /*yield*/, (0, authService_1.logoutUser)()];
                case 1:
                    _a.sent();
                    navigate("/");
                    return [2 /*return*/];
            }
        });
    }); };
    (0, react_1.useEffect)(function () {
        var handleScroll = function () {
            setScrolled(window.scrollY > 20);
            var sections = document.querySelectorAll('section[id]');
            var currentSection = '';
            sections.forEach(function (section) {
                var sectionTop = section.offsetTop - 120; // Adjust for fixed header
                var sectionHeight = section.offsetHeight;
                if (window.scrollY >= sectionTop && window.scrollY < sectionTop + sectionHeight) {
                    currentSection = "#".concat(section.id);
                }
            });
            if (activeSection !== currentSection) {
                setActiveSection(currentSection);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return function () { return window.removeEventListener('scroll', handleScroll); };
    }, []);
    (0, react_1.useEffect)(function () {
        if (location.pathname !== '/') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, [location.pathname, location.hash]);
    // useEffect(() => {
    //   setIsMenuOpen(false);
    // }, [location.pathname, location.hash]);
    var navItems = [
        { name: 'Home', path: '/' },
        { name: 'Services', path: '/#services' },
        { name: 'How It Works', path: '/#how-it-works' },
        { name: 'Reviews', path: '/#reviews' },
        { name: 'Contact', path: '/#contact' },
    ];
    var isActive = function (path) { return location.pathname + location.hash === path || activeSection === path; };
    return (<header className={"fixed top-0 left-0 right-0 z-50 transition-all duration-300 ".concat(scrolled ? 'py-2 bg-pure-white shadow-md' : 'py-4 bg-pure-white')}>
      <div className="container-custom flex items-center justify-between">
        <react_router_dom_1.Link to="/" className="flex items-center">
          <span className="text-2xl font-bold text-electric-blue">KitFix</span>
        </react_router_dom_1.Link>

        <nav className="hidden md:flex items-center space-x-8">
          {navItems.map(function (item) { return (<a key={item.name} href={item.path} className={"font-medium hover:text-electric-blue transition-colors duration-300 ".concat(isActive(item.path) ? 'text-electric-blue font-semibold' : 'text-jet-black')}>
              {item.name}
            </a>); })}

          {user ? (<>
              <react_router_dom_1.Link to="/dashboard" className={"font-medium hover:text-electric-blue transition-colors duration-300 ".concat(isActive('/dashboard') ? 'text-electric-blue font-semibold' : 'text-jet-black')}>
                Dashboard
              </react_router_dom_1.Link>
              <react_router_dom_1.Link to="/" onClick={logout} className="font-medium text-jet-black hover:text-electric-blue transition-colors duration-300">
                Logout
              </react_router_dom_1.Link>
            </>) : (<react_router_dom_1.Link to="/login" className={"font-medium hover:text-electric-blue transition-colors duration-300 ".concat(isActive('/login') ? 'text-electric-blue font-semibold' : 'text-jet-black')}>
              Login
            </react_router_dom_1.Link>)}

          <button type="button" onClick={function () { return navigate('/upload-photos'); }} className="bg-electric-blue text-white px-4 py-2 rounded-md font-medium">
            Start Repair
          </button>
        </nav>

        <button className="md:hidden text-jet-black" onClick={function () { return setIsMenuOpen(!isMenuOpen); }}>
          {isMenuOpen ? <lucide_react_1.X size={24}/> : <lucide_react_1.Menu size={24}/>}
        </button>

        {isMenuOpen && (<div className="md:hidden absolute top-full left-0 right-0 bg-pure-white shadow-md p-4">
            <nav className="flex flex-col space-y-4">
              {navItems.map(function (item) { return (<a key={item.name} href={item.path} className={"font-medium hover:text-electric-blue transition-colors duration-300 py-2 ".concat(isActive(item.path) ? 'text-electric-blue font-semibold' : 'text-jet-black')} onClick={function () { return setIsMenuOpen(false); }}>
                  {item.name}
                </a>); })}
              <button type="button" onClick={function () { return navigate('/login'); }} className="bg-electric-blue text-white px-4 py-2 rounded-md font-medium w-full">
                Start Repair
              </button>
            </nav>
          </div>)}
      </div>
    </header>);
};
exports.default = Header;
