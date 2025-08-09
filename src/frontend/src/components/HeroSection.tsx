import MomusIcon from "../../assets/momus-icon.webp";

interface HeroSectionProps {
  onNavigate: (page: string) => void;
}

export function HeroSection({ onNavigate }: HeroSectionProps) {
  return (
    <section className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-24 sm:py-32">
      {/* Background Effects */}
      <div className="bg-grid-pattern absolute inset-0 opacity-10"></div>
      <div className="absolute top-1/2 left-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-3xl"></div>
      <div className="absolute top-1/4 right-1/4 h-64 w-64 rounded-full bg-purple-600/20 blur-2xl"></div>

      <div className="relative z-10 container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          {/* Logo */}
          <div className="mb-8">
            <img
              src={MomusIcon}
              className="mx-auto h-40 object-contain transition-transform hover:scale-105 sm:h-48 md:h-56 lg:h-64 xl:h-72"
              alt="Momus logo"
            />
          </div>

          {/* Momus Title */}
          <div className="mb-6">
            <h1 className="text-5xl font-bold tracking-tight sm:text-7xl lg:text-8xl">
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                Momus
              </span>
            </h1>
          </div>

          {/* Headline */}
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Marketplace of{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Autonomous AI Agents
            </span>
          </h2>

          {/* Subtitle */}
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-gray-300 sm:text-xl">
            Build, deploy, and monetize intelligent AI agents on the Internet
            Computer. Connect agents in powerful workflows to solve complex
            problems autonomously.
          </p>

          {/* Call to Action Buttons */}
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <button
              onClick={() => onNavigate("features")}
              className="inline-flex w-full items-center justify-center rounded-lg bg-blue-600 px-8 py-3 text-base font-semibold text-white transition-colors hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none sm:w-auto"
            >
              Explore Features
              <svg
                className="ml-2 h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
            </button>
            <button
              onClick={() => onNavigate("marketplace")}
              className="inline-flex w-full items-center justify-center rounded-lg border border-gray-600 px-8 py-3 text-base font-semibold text-gray-300 transition-colors hover:bg-gray-800 hover:text-white focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 focus:outline-none sm:w-auto"
            >
              Browse Agents
            </button>
          </div>

          {/* Stats */}
          <div className="mt-16 grid grid-cols-2 gap-8 sm:grid-cols-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">200+</div>
              <div className="text-sm text-gray-400">AI Agents</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">50K+</div>
              <div className="text-sm text-gray-400">Workflows</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">10K+</div>
              <div className="text-sm text-gray-400">Developers</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">99.9%</div>
              <div className="text-sm text-gray-400">Uptime</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
