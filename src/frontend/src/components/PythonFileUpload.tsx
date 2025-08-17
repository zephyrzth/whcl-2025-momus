import { useState, useRef } from "react";

interface PythonFileUploadProps {
  onFileUpload: (file: File, content: string) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

interface FileInfo {
  name: string;
  size: number;
  content: string;
}

const MAX_FILE_SIZE = 10 * 1024; // 10KB in bytes
const ALLOWED_EXTENSIONS = [".py", ".python"];

export function PythonFileUpload({
  onFileUpload,
  onError,
  disabled = false,
}: PythonFileUploadProps) {
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = (file: File): string | null => {
    // Check file extension
    const extension = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(extension)) {
      return `Invalid file type. Please upload a Python file (${ALLOWED_EXTENSIONS.join(", ")})`;
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return `File size too large. Maximum size is ${MAX_FILE_SIZE / 1024}KB`;
    }

    // Check if file is empty
    if (file.size === 0) {
      return "File is empty. Please upload a valid Python file";
    }

    return null;
  };

  const processFile = async (file: File) => {
    const validationError = validateFile(file);
    if (validationError) {
      onError(validationError);
      return;
    }

    setIsUploading(true);

    try {
      const content = await file.text();

      // Basic Python syntax validation
      if (!content.trim()) {
        onError("Python file appears to be empty");
        return;
      }

      // Check for basic Python indicators
      const pythonIndicators = [
        "def ",
        "import ",
        "from ",
        "class ",
        "if ",
        "for ",
        "while ",
      ];
      const hasPythonSyntax = pythonIndicators.some((indicator) =>
        content.includes(indicator),
      );

      if (!hasPythonSyntax) {
        onError("File does not appear to contain valid Python code");
        return;
      }

      const info: FileInfo = {
        name: file.name,
        size: file.size,
        content,
      };

      setFileInfo(info);
      onFileUpload(file, content);
    } catch (error) {
      onError(
        `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    if (!disabled) {
      setIsDragging(true);
    }
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragging(false);

    if (disabled) return;

    const file = event.dataTransfer.files[0];
    if (file) {
      processFile(file);
    }
  };

  const handleClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const clearFile = () => {
    setFileInfo(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    return `${(bytes / 1024).toFixed(1)} KB`;
  };

  return (
    <div className="space-y-4">
      <input
        ref={fileInputRef}
        type="file"
        accept=".py,.python"
        onChange={handleFileChange}
        disabled={disabled}
        className="hidden"
      />

      {!fileInfo ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleClick}
          className={`relative cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
            isDragging
              ? "bg-opacity-10 border-blue-400 bg-blue-50"
              : "border-gray-600 hover:border-gray-500"
          } ${disabled ? "cursor-not-allowed opacity-50" : ""} ${isUploading ? "pointer-events-none" : ""} `}
        >
          {isUploading ? (
            <div className="flex flex-col items-center space-y-2">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-500 border-t-transparent"></div>
              <p className="text-sm text-gray-400">Processing file...</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="mx-auto h-12 w-12 text-gray-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 48 48">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02"
                  />
                </svg>
              </div>
              <div>
                <p className="text-white">
                  <span className="font-medium text-blue-400">
                    Click to upload
                  </span>{" "}
                  or drag and drop
                </p>
                <p className="text-sm text-gray-400">
                  Python files only (.py) • Max {MAX_FILE_SIZE / 1024}KB
                </p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-lg border border-gray-600 bg-gray-700 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 text-green-400">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <p className="font-medium text-white">{fileInfo.name}</p>
                <p className="text-sm text-gray-400">
                  {formatFileSize(fileInfo.size)} • Python file
                </p>
              </div>
            </div>
            <button
              onClick={clearFile}
              disabled={disabled}
              className="rounded p-1 text-gray-400 hover:bg-gray-600 hover:text-white disabled:opacity-50"
              title="Remove file"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <div className="mt-3 rounded bg-gray-800 p-3">
            <p className="text-sm text-gray-300">Preview:</p>
            <pre className="mt-2 max-h-32 overflow-auto text-xs text-gray-400">
              {fileInfo.content.slice(0, 300)}
              {fileInfo.content.length > 300 && "..."}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
