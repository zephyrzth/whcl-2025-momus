import { GreetingView, CounterView, LlmPromptView } from ".";

interface HomeViewProps {
  onError: (error: string) => void;
  setLoading: (loading: boolean) => void;
}

/**
 * HomeView component that displays all views together
 */
export function HomeView({ onError, setLoading }: HomeViewProps) {
  return (
    <div className="space-y-6">
      {/* Greeting Section */}
      <GreetingView onError={onError} setLoading={setLoading} />

      {/* Counter Section */}
      <CounterView onError={onError} setLoading={setLoading} />

      {/* LLM Prompt Section */}
      <LlmPromptView onError={onError} setLoading={setLoading} />
    </div>
  );
}
