/**
 * Loading indicator component - Circular spinner with smooth animation
 */
export function Loader() {
  return (
    <>
      <style>
        {`
          @keyframes spin {
            0% {
              transform: rotate(0deg);
            }
            100% {
              transform: rotate(360deg);
            }
          }
        `}
      </style>
      <div
        className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-gray-600 border-t-blue-500"
        style={{ animation: "spin 1s linear infinite" }}
      />
    </>
  );
}
