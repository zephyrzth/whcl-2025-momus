import { ReactNode } from "react";
import { useAuth } from "../contexts/AuthContext";
import MomusIcon from "../../assets/momus-icon.webp";
import { Link, useLocation, useNavigate } from "react-router-dom";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const navigationItems = [
    { id: "canvas", label: "Canvas", path: "/canvas" },
    { id: "marketplace", label: "Marketplace", path: "/marketplace" },
  ];

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const isActivePath = (path: string) => {
    return location.pathname === path;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-gray-800 bg-gray-900/95 backdrop-blur supports-[backdrop-filter]:bg-gray-900/60">
        <div className="container mx-auto flex h-16 max-w-screen-2xl items-center justify-between px-4">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-2">
              <Link
                to="/canvas"
                className="flex items-center space-x-2 transition-opacity hover:opacity-80"
              >
                <img
                  src={MomusIcon}
                  alt="Momus"
                  className="h-12 w-12 object-contain"
                />
                <span className="text-xl font-bold text-white">Momus</span>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden items-center space-x-6 text-sm md:flex">
              {navigationItems.map((item) => (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`transition-colors hover:text-white ${
                    isActivePath(item.path)
                      ? "font-medium text-white"
                      : "text-gray-300"
                  }`}
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            <span className="hidden text-sm text-gray-300 sm:inline">
              Welcome,{" "}
              {user?.displayName
                ? `${user.displayName} (${user.principalId})`
                : user?.principalId}
            </span>
            <button
              onClick={handleLogout}
              className="text-sm font-medium text-gray-300 transition-colors hover:text-white"
            >
              Logout
            </button>
          </div>
        </div>

        {/* Mobile Navigation */}
        <nav className="border-t border-gray-800 bg-gray-900 px-4 py-2 md:hidden">
          <div className="flex space-x-6 text-sm">
            {navigationItems.map((item) => (
              <Link
                key={item.id}
                to={item.path}
                className={`transition-colors hover:text-white ${
                  isActivePath(item.path)
                    ? "font-medium text-white"
                    : "text-gray-300"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>
    </div>
  );
}
