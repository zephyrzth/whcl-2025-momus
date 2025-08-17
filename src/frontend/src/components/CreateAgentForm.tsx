import { useState } from "react";
import { PythonFileUpload } from "./PythonFileUpload";

interface AgentMetadata {
  name: string;
  description: string;
  category: string;
  tags: string[];
}

interface CreateAgentFormProps {
  onSubmit: (
    metadata: AgentMetadata,
    pythonFile: File,
    pythonContent: string,
  ) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

const AGENT_CATEGORIES = [
  { value: "data_analysis", label: "Data Analysis" },
  { value: "machine_learning", label: "Machine Learning" },
  { value: "automation", label: "Automation" },
  { value: "web_scraping", label: "Web Scraping" },
  { value: "api_integration", label: "API Integration" },
  { value: "utilities", label: "Utilities" },
  { value: "other", label: "Other" },
];

export function CreateAgentForm({
  onSubmit,
  onCancel,
  isLoading = false,
}: CreateAgentFormProps) {
  console.log("CreateAgentForm component rendered");

  const [metadata, setMetadata] = useState<AgentMetadata>({
    name: "",
    description: "",
    category: "other",
    tags: [],
  });
  const [pythonFile, setPythonFile] = useState<File | null>(null);
  const [pythonContent, setPythonContent] = useState<string>("");
  const [tagInput, setTagInput] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const handleFileUpload = (file: File, content: string) => {
    setPythonFile(file);
    setPythonContent(content);
    setErrors((prev) => ({ ...prev, file: "" }));
  };

  const handleFileError = (error: string) => {
    setErrors((prev) => ({ ...prev, file: error }));
  };

  const addTag = () => {
    if (tagInput.trim() && !metadata.tags.includes(tagInput.trim())) {
      setMetadata((prev) => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setMetadata((prev) => ({
      ...prev,
      tags: prev.tags.filter((tag) => tag !== tagToRemove),
    }));
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      addTag();
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!metadata.name.trim()) {
      newErrors.name = "Agent name is required";
    } else if (metadata.name.length < 3) {
      newErrors.name = "Agent name must be at least 3 characters";
    } else if (metadata.name.length > 50) {
      newErrors.name = "Agent name must be less than 50 characters";
    }

    if (!metadata.description.trim()) {
      newErrors.description = "Description is required";
    } else if (metadata.description.length < 10) {
      newErrors.description = "Description must be at least 10 characters";
    } else if (metadata.description.length > 500) {
      newErrors.description = "Description must be less than 500 characters";
    }

    if (!pythonFile) {
      newErrors.file = "Python file is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm() || !pythonFile) {
      return;
    }

    onSubmit(metadata, pythonFile, pythonContent);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg bg-gray-700 p-6">
        <h3 className="mb-6 text-2xl font-bold text-white">
          Create New Python Agent
        </h3>

        {/* Agent Name */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Agent Name *
          </label>
          <input
            type="text"
            value={metadata.name}
            onChange={(e) =>
              setMetadata((prev) => ({ ...prev, name: e.target.value }))
            }
            placeholder="Enter agent name"
            disabled={isLoading}
            className={`w-full rounded border bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:outline-none ${
              errors.name
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-600 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-400">{errors.name}</p>
          )}
        </div>

        {/* Description */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Description *
          </label>
          <textarea
            value={metadata.description}
            onChange={(e) =>
              setMetadata((prev) => ({ ...prev, description: e.target.value }))
            }
            placeholder="Describe what your agent does"
            rows={3}
            disabled={isLoading}
            className={`w-full rounded border bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:ring-2 focus:outline-none ${
              errors.description
                ? "border-red-500 focus:ring-red-500"
                : "border-gray-600 focus:border-blue-500 focus:ring-blue-500"
            }`}
          />
          {errors.description && (
            <p className="mt-1 text-sm text-red-400">{errors.description}</p>
          )}
        </div>

        {/* Category */}
        <div className="mb-4">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Category
          </label>
          <select
            value={metadata.category}
            onChange={(e) =>
              setMetadata((prev) => ({ ...prev, category: e.target.value }))
            }
            disabled={isLoading}
            className="w-full rounded border border-gray-600 bg-gray-800 px-4 py-2 text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
          >
            {AGENT_CATEGORIES.map((category) => (
              <option key={category.value} value={category.value}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Tags
          </label>
          <div className="mb-2 flex flex-wrap gap-2">
            {metadata.tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 rounded-full bg-blue-600 px-3 py-1 text-sm text-white"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  disabled={isLoading}
                  className="text-blue-200 hover:text-white disabled:opacity-50"
                >
                  <svg
                    className="h-3 w-3"
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
              </span>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyPress={handleTagInputKeyPress}
              placeholder="Add tags (press Enter)"
              disabled={isLoading}
              className="flex-1 rounded border border-gray-600 bg-gray-800 px-4 py-2 text-white placeholder-gray-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
            <button
              type="button"
              onClick={addTag}
              disabled={isLoading || !tagInput.trim()}
              className="rounded bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add
            </button>
          </div>
        </div>

        {/* Python File Upload */}
        <div className="mb-6">
          <label className="mb-2 block text-sm font-medium text-gray-300">
            Python File *
          </label>
          <PythonFileUpload
            onFileUpload={handleFileUpload}
            onError={handleFileError}
            disabled={isLoading}
          />
          {errors.file && (
            <p className="mt-2 text-sm text-red-400">{errors.file}</p>
          )}
        </div>

        {/* Python Code Preview */}
        {pythonContent && (
          <div className="mb-6">
            <label className="mb-2 block text-sm font-medium text-gray-300">
              Python Code Preview
            </label>
            <div className="rounded bg-gray-800 p-4">
              <pre className="max-h-64 overflow-auto text-sm text-gray-300">
                <code>{pythonContent}</code>
              </pre>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex justify-end gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="rounded border border-gray-600 px-6 py-2 text-gray-300 hover:bg-gray-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isLoading || !pythonFile}
            className="flex items-center gap-2 rounded bg-blue-600 px-6 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading && (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
            )}
            {isLoading ? "Creating Agent..." : "Create Agent"}
          </button>
        </div>
      </div>
    </form>
  );
}
