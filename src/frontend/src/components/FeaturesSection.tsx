interface FeaturesSectionProps {
  onNavigate: (page: string) => void;
}

export function FeaturesSection({ onNavigate }: FeaturesSectionProps) {
  const features = [
    {
      id: "weather",
      title: "Weather Intelligence Agent",
      description:
        "Get real-time weather insights with AI-powered recommendations for clothing, activities, and planning decisions.",
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.4 4.4 0 003 15z"
          />
        </svg>
      ),
      gradient: "from-blue-500 to-cyan-500",
      action: "Try Weather Agent",
    },
    {
      id: "marketplace",
      title: "Agent Marketplace",
      description:
        "Discover, purchase, and integrate powerful AI agents created by the community. Monetize your own agent creations.",
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"
          />
        </svg>
      ),
      gradient: "from-purple-500 to-pink-500",
      action: "Browse Marketplace",
    },
    {
      id: "canvas",
      title: "Visual Agent Canvas",
      description:
        "Connect multiple AI agents in powerful workflows using our intuitive drag-and-drop canvas interface.",
      icon: (
        <svg
          className="h-8 w-8"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 11H5m14-5v12a2 2 0 01-2 2H7a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2z"
          />
        </svg>
      ),
      gradient: "from-green-500 to-emerald-500",
      action: "Open Canvas",
    },
  ];

  return (
    <section className="bg-gray-900 py-24">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-bold tracking-tight text-white sm:text-4xl">
            Powerful AI Agent Platform
          </h2>
          <p className="mt-4 text-lg text-gray-300">
            Everything you need to build, deploy, and scale intelligent
            autonomous agents
          </p>
        </div>

        <div className="mt-16 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.id}
              className="group relative overflow-hidden rounded-2xl border border-gray-700 bg-gray-800/50 p-8 transition-all hover:border-gray-600 hover:bg-gray-800"
            >
              {/* Gradient Background */}
              <div
                className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 transition-opacity group-hover:opacity-5`}
              ></div>

              {/* Icon */}
              <div
                className={`inline-flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-r ${feature.gradient} mb-6 text-white`}
              >
                {feature.icon}
              </div>

              {/* Content */}
              <div className="relative">
                <h3 className="mb-3 text-xl font-semibold text-white">
                  {feature.title}
                </h3>
                <p className="mb-6 leading-relaxed text-gray-300">
                  {feature.description}
                </p>
                <button
                  onClick={() => onNavigate(feature.id)}
                  className={`inline-flex items-center bg-gradient-to-r text-sm font-medium ${feature.gradient} group bg-clip-text text-transparent transition-colors hover:text-white`}
                >
                  {feature.action}
                  <svg
                    className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1"
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
              </div>
            </div>
          ))}
        </div>

        {/* Additional Features Grid */}
        <div className="mt-20">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-600/10">
                <svg
                  className="h-6 w-6 text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-white">
                Lightning Fast
              </h4>
              <p className="text-sm text-gray-400">
                Powered by Internet Computer for instant response times
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-600/10">
                <svg
                  className="h-6 w-6 text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-white">
                Secure & Reliable
              </h4>
              <p className="text-sm text-gray-400">
                Built on blockchain technology for maximum security
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-purple-600/10">
                <svg
                  className="h-6 w-6 text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-white">
                Scalable
              </h4>
              <p className="text-sm text-gray-400">
                Handle millions of agent interactions seamlessly
              </p>
            </div>

            <div className="text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-orange-600/10">
                <svg
                  className="h-6 w-6 text-orange-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4"
                  />
                </svg>
              </div>
              <h4 className="mb-2 text-lg font-semibold text-white">
                Customizable
              </h4>
              <p className="text-sm text-gray-400">
                Build and configure agents for any use case
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
