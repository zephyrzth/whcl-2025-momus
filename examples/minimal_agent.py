"""
Minimal Agent Template
The simplest possible Python agent for testing basic functionality.
"""

class MinimalAgent:
    def __init__(self):
        self.name = "Minimal Test Agent"
        self.description = "A minimal agent for testing the upload and compilation system"
        self.version = "1.0.0"
        self.agent_type = "minimal"
    
    def get_metadata(self):
        """Return agent metadata"""
        return {
            "name": self.name,
            "description": self.description, 
            "version": self.version,
            "agent_type": self.agent_type,
            "capabilities": ["basic_response"]
        }
    
    def execute_task(self, task_input):
        """Execute a simple task"""
        return f"Minimal Agent received: {task_input}"

# Agent instance
agent = MinimalAgent()

# Main function
def main(task_input=""):
    if not task_input:
        return agent.get_metadata()
    else:
        return agent.execute_task(task_input)
