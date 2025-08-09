import { useState } from "react";
import MomusIcon from "../../assets/momus-icon.webp";

interface HeaderProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export function Header({ currentPage, onNavigate }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const navigationItems = [
    { id: "home", label: "Home" },
    { id: "features", label: "Features" },
    { id: "weather", label: "Weather Demo" },
    { id: "marketplace", label: "Marketplace" },
    { id: "canvas", label: "Canvas" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
      <div className="container mx-auto flex h-16 max-w-screen-2xl items-center px-4">
        {/* Logo */}
        <div className="mr-6 flex items-center space-x-2">
          <button
            onClick={() => onNavigate("home")}
            className="flex items-center space-x-2 transition-opacity hover:opacity-80"
          >
            <img
              src={MomusIcon}
              alt="Momus"
              className="h-6 w-6 object-contain"
            />
            <span className="text-xl font-bold text-white">Momus</span>
          </button>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden items-center space-x-6 text-sm md:flex">
          {navigationItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`transition-colors hover:text-white ${
                currentPage === item.id
                  ? "font-medium text-white"
                  : "text-gray-300"
              }`}
            >
              {item.label}
            </button>
          ))}
        </nav>

        {/* Right side actions */}
        <div className="ml-auto flex items-center space-x-4">
          <button className="hidden h-9 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 md:inline-flex">
            Get Started
          </button>

          {/* Mobile menu button */}
          <button
            className="p-2 text-gray-300 hover:text-white md:hidden"
            onClick={() => setIsMenuOpen(!isMenuOpen)}
          >
            <svg
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              {isMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="border-t border-gray-800 bg-gray-900 md:hidden">
          <div className="container mx-auto px-4 py-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setIsMenuOpen(false);
                }}
                className={`block w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                  currentPage === item.id
                    ? "bg-gray-800 font-medium text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            ))}
            <button className="mt-2 h-9 w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
              Get Started
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
