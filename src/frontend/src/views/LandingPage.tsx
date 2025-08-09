import { HeroSection, FeaturesSection } from "../components";

interface LandingPageProps {
  onNavigate: (page: string) => void;
}

export function LandingPage({ onNavigate }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-gray-900">
      <HeroSection onNavigate={onNavigate} />
      <FeaturesSection onNavigate={onNavigate} />

      {/* Call to Action Section */}
      <section className="bg-gradient-to-r from-blue-600 to-purple-600 py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="mb-6 text-3xl font-bold text-white sm:text-4xl">
            Ready to Build Intelligent Agents?
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-blue-100">
            Join thousands of developers building the future of AI on the
            Internet Computer
          </p>
          <div className="flex flex-col justify-center gap-4 sm:flex-row">
            <button
              onClick={() => onNavigate("marketplace")}
              className="rounded-lg bg-white px-8 py-3 font-semibold text-blue-600 transition-colors hover:bg-gray-100"
            >
              Start Building
            </button>
            <button
              onClick={() => onNavigate("features")}
              className="rounded-lg border-2 border-white px-8 py-3 font-semibold text-white transition-colors hover:bg-white hover:text-blue-600"
            >
              Learn More
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
