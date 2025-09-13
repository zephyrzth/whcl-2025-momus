import { ReactNode, useEffect, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import MomusIcon from "../../assets/momus-icon.webp";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ledgerService } from "../services/ledgerService";

interface DashboardLayoutProps {
  children: ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  useAuth();
  const location = useLocation();
  useNavigate();

  const navigationItems = [
    { id: "canvas", label: "Canvas", path: "/canvas" },
    { id: "marketplace", label: "Marketplace", path: "/marketplace" },
  ];

  // logout is handled inside UserMenu

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
          <UserMenu />
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

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [principal, setPrincipal] = useState<string>("");
  const [accountId, setAccountId] = useState<string>("");
  const [balance, setBalance] = useState<string>("");
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    if (!user?.principalId) return;
    // Always fetch fresh on open
    (async () => {
      try {
        setLoading(true);
        setPrincipal(user.principalId);
        const info = await ledgerService.getLedgerInfoForPrincipal(
          user.principalId,
        );
        setAccountId(info.accountIdHex);
        setBalance(ledgerService.formatIcp(info.balanceE8s));
      } catch (err) {
        setBalance("Error");
      } finally {
        setLoading(false);
      }
    })();
  }, [open, user?.principalId]);

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch (_) {
      // ignore
    }
  };

  if (!user) {
    return null; // Hide when unauthenticated
  }

  const label = user.displayName
    ? `${user.displayName} (${user.principalId})`
    : user.principalId;

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center space-x-2 rounded px-3 py-1 text-sm text-gray-300 transition-colors hover:text-white"
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="hidden sm:inline">{label}</span>
        <span className="sm:hidden">Account</span>
        <svg
          className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 20 20"
          fill="currentColor"
          aria-hidden="true"
        >
          <path d="M5.23 7.21a.75.75 0 011.06.02L10 10.94l3.71-3.71a.75.75 0 111.06 1.06l-4.24 4.24a.75.75 0 01-1.06 0L5.21 8.29a.75.75 0 01.02-1.08z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[26rem] max-w-[95vw] origin-top-right rounded-md border border-gray-800 bg-gray-900 p-4 shadow-xl focus:outline-none">
          <div className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="text-gray-400">Principal ID</div>
              <div className="flex-1 text-right break-all text-white">
                {principal}
              </div>
              <button
                className="ml-2 shrink-0 rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-800"
                onClick={() => copy(principal)}
              >
                Copy
              </button>
            </div>

            <div className="flex items-start justify-between gap-2">
              <div className="text-gray-400">Wallet (Account ID)</div>
              <div className="flex-1 text-right break-all text-white">
                {accountId || (loading ? "Loading…" : "-")}
              </div>
              <button
                className="ml-2 shrink-0 rounded border border-gray-700 px-2 py-0.5 text-xs text-gray-300 hover:bg-gray-800"
                onClick={() => copy(accountId)}
                disabled={!accountId}
              >
                Copy
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div className="text-gray-400">Balance</div>
              <div className="text-white">
                {loading ? (
                  <span className="animate-pulse text-gray-400">Loading…</span>
                ) : (
                  balance || "-"
                )}
              </div>
            </div>

            <div>
              <button
                onClick={() => {
                  setOpen(false);
                  navigate("/usage");
                }}
                className="mt-2 w-full rounded border border-gray-700 bg-gray-800 px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-gray-700"
              >
                Usage
              </button>
            </div>

            <div className="mt-3 border-t border-gray-800 pt-3">
              <button
                onClick={handleLogout}
                className="w-full rounded bg-gray-800 px-3 py-2 text-left text-sm text-gray-200 transition-colors hover:bg-gray-700"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
