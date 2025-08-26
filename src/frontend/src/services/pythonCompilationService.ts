import { loadPyodide } from "pyodide";

type PyodideInterface = any; // TODO: Use proper Pyodide types when available

export interface PythonCompilationResult {
  success: boolean;
  wasmData?: Uint8Array;
  metadata?: {
    functionNames: string[];
    imports: string[];
    errors: string[];
  };
  error?: string;
}

export interface AgentInterface {
  get_metadata(): Promise<{
    name: string;
    description: string;
    version: string;
  }>;
  // execute_task removed from frontend validation path
}

class PythonCompilationService {
  private pyodide: PyodideInterface | null = null;
  private isInitialized = false;
  private initializationPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (this.initializationPromise) {
      return this.initializationPromise;
    }

    this.initializationPromise = this.doInitialize();
    return this.initializationPromise;
  }

  private async doInitialize(): Promise<void> {
    try {
      console.log("Loading Pyodide...");
      this.pyodide = await loadPyodide({
        indexURL: "https://cdn.jsdelivr.net/pyodide/v0.28.1/full/",
      });

      // Install commonly used packages for ML/AI
      console.log("Installing Python packages...");
      await this.pyodide.loadPackage([
        "numpy",
        "pandas",
        "scipy",
        "scikit-learn",
        "micropip",
      ]);

      // Install additional packages via micropip
      //   await this.pyodide.runPython(`
      //     import micropip
      //     await micropip.install(['requests', 'json', 'base64'])
      //   `);

      this.isInitialized = true;
      console.log("Pyodide initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Pyodide:", error);
      this.initializationPromise = null;
      throw new Error(
        `Pyodide initialization failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async validatePythonCode(
    pythonCode: string,
  ): Promise<{ valid: boolean; errors: string[] }> {
    await this.initialize();
    if (!this.pyodide) {
      return { valid: false, errors: ["Pyodide not initialized"] };
    }

    const errors: string[] = [];

    try {
      // Try to parse the Python code
      await this.pyodide.runPython(`
import ast
import sys
from io import StringIO

code = """${pythonCode.replace(/"/g, '\\"')}"""

try:
    tree = ast.parse(code)
    
    # Check for required agent interface functions
    has_get_metadata = False
  has_execute_task = False
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            if node.name == 'get_metadata':
                has_get_metadata = True
            elif node.name == 'execute_task':
                has_execute_task = True
    
    validation_errors = []
    if not has_get_metadata:
        validation_errors.append("Missing required function: get_metadata()")
  # execute_task check removed from frontend validation
        
    print("VALIDATION_RESULT:", "valid" if len(validation_errors) == 0 else "invalid")
    for error in validation_errors:
        print("VALIDATION_ERROR:", error)
        
except SyntaxError as e:
    print("SYNTAX_ERROR:", str(e))
except Exception as e:
    print("PARSE_ERROR:", str(e))
      `);

      // Capture the output
      const output = await this.pyodide.runPython(`
import sys
from io import StringIO

old_stdout = sys.stdout
sys.stdout = mystdout = StringIO()

# Re-run validation to capture output
exec("""
import ast

code = '''${pythonCode.replace(/"/g, '\\"')}'''

try:
    tree = ast.parse(code)
    
    has_get_metadata = False
  has_execute_task = False
    
    for node in ast.walk(tree):
        if isinstance(node, ast.FunctionDef):
            if node.name == 'get_metadata':
                has_get_metadata = True
            elif node.name == 'execute_task':
                has_execute_task = True
    
    validation_errors = []
    if not has_get_metadata:
        validation_errors.append("Missing required function: get_metadata()")
  # execute_task check removed from frontend validation
        
    print("VALIDATION_RESULT:", "valid" if len(validation_errors) == 0 else "invalid")
    for error in validation_errors:
        print("VALIDATION_ERROR:", error)
        
except SyntaxError as e:
    print("SYNTAX_ERROR:", str(e))
except Exception as e:
    print("PARSE_ERROR:", str(e))
""")
        
sys.stdout = old_stdout
mystdout.getvalue()
      `);

      const outputLines = output.split("\n");
      let isValid = false;

      for (const line of outputLines) {
        if (line.startsWith("VALIDATION_RESULT:")) {
          isValid = line.includes("valid");
        } else if (
          line.startsWith("VALIDATION_ERROR:") ||
          line.startsWith("SYNTAX_ERROR:") ||
          line.startsWith("PARSE_ERROR:")
        ) {
          errors.push(line.substring(line.indexOf(":") + 1).trim());
        }
      }

      return { valid: isValid && errors.length === 0, errors };
    } catch (error) {
      return {
        valid: false,
        errors: [
          `Validation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        ],
      };
    }
  }

  async compilePythonToWasm(
    pythonCode: string,
    agentName: string,
  ): Promise<PythonCompilationResult> {
    await this.initialize();
    if (!this.pyodide) {
      return {
        success: false,
        error: "Pyodide not initialized",
      };
    }

    try {
      // First validate the code
      const validation = await this.validatePythonCode(pythonCode);
      if (!validation.valid) {
        return {
          success: false,
          error: `Code validation failed: ${validation.errors.join(", ")}`,
        };
      }

      // Create a wrapper that implements the AgentInterface
      const wrappedCode = `
# Agent: ${agentName}
${pythonCode}

# Agent Interface Wrapper
class AgentWrapper:
    def __init__(self):
        pass
    
    def get_metadata(self):
        """Get agent metadata - should be overridden by user code"""
        if 'get_metadata' in globals():
            return get_metadata()
        else:
            return {
                "name": "${agentName}",
                "description": "Python-based agent",
                "version": "1.0.0"
            }
    
    def execute_task(self, task):
        """Execute a task - should be overridden by user code"""
        if 'execute_task' in globals():
            return execute_task(task)
        else:
            return f"Task executed: {task}"

# Create global agent instance
agent = AgentWrapper()
`;

      // Execute the Python code in Pyodide
      await this.pyodide.runPython(wrappedCode);

  // Test the agent metadata function only
  const metadata = await this.pyodide.runPython(`
import json

output = ""

try:
    result = agent.get_metadata()
    output = json.dumps(result) if isinstance(result, dict) else str(result)
except Exception as e:
    output = json.dumps({"error": str(e)})

output
      `);

  // Removed execute_task test
  const testTask = "execute_task test removed";

      console.log("[DEBUG] metadata: ", metadata);
      // For now, we'll create a mock WASM representation since actual WASM compilation
      // from Python is complex. This would be replaced with proper WASM compilation.
      const mockWasmData = new TextEncoder().encode(
        JSON.stringify({
          pythonCode: wrappedCode,
          agentName,
          metadata: JSON.parse(metadata),
          testResult: testTask,
          timestamp: Date.now(),
        }),
      );

      // Extract metadata about the code
      const codeAnalysis = await this.pyodide.runPython(`
import ast
import json

code = """${pythonCode.replace(/"/g, '\\"')}"""
tree = ast.parse(code)

function_names = []
imports = []

for node in ast.walk(tree):
    if isinstance(node, ast.FunctionDef):
        function_names.append(node.name)
    elif isinstance(node, ast.Import):
        for alias in node.names:
            imports.append(alias.name)
    elif isinstance(node, ast.ImportFrom):
        if node.module:
            imports.append(node.module)

json.dumps({
    "functionNames": function_names,
    "imports": imports,
    "errors": []
})
      `);

      return {
        success: true,
        wasmData: mockWasmData,
        metadata: JSON.parse(codeAnalysis),
      };
    } catch (error) {
      console.error("Python compilation failed:", error);
      return {
        success: false,
        error: `Compilation failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      };
    }
  }

  // testAgent removed as execute path is no longer validated from frontend
}

export const pythonCompilationService = new PythonCompilationService();
