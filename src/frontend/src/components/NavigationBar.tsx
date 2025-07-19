interface NavigationBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

/**
 * NavigationBar component for switching between different views
 */
export function NavigationBar({
  activeView,
  onViewChange,
}: NavigationBarProps) {
  const menuItems = [
    { id: "home", label: "Home" },
    { id: "llm", label: "LLM" },
    { id: "counter", label: "Counter" },
  ];

  return (
    <nav className="fixed top-0 right-0 left-0 z-50 border-b border-gray-700 bg-gray-900 px-4 py-3">
      <div className="mx-auto max-w-4xl">
        <ul className="flex justify-center space-x-8">
          {menuItems.map((item) => (
            <li key={item.id}>
              <button
                onClick={() => onViewChange(item.id)}
                className={`rounded-md px-4 py-2 font-medium transition-colors duration-200 ${
                  activeView === item.id
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-700 hover:text-white"
                }`}
              >
                {item.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}
