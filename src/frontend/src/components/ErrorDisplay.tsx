/**
 * Component for displaying error messages
 */
interface ErrorDisplayProps {
  message: string;
  onDismiss?: () => void;
}

export function ErrorDisplay({ message, onDismiss }: ErrorDisplayProps) {
  return (
    <div className="rounded border border-red-200 bg-red-50 p-3 text-left text-red-500">
      <div className="flex items-start justify-between">
        <pre className="flex-1 text-red-500">{message}</pre>
        {onDismiss && (
          <button
            onClick={onDismiss}
            className="ml-2 text-lg leading-none text-red-400 hover:text-red-600"
            title="Dismiss error"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
