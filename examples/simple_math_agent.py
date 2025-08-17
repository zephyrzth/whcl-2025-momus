"""
Simple Math Agent Example
A Python agent that performs mathematical calculations and analysis.
"""

import math
import json

class MathAgent:
    def __init__(self):
        self.name = "Simple Math Agent"
        self.description = "Performs mathematical calculations, statistics, and data analysis"
        self.version = "1.0.0"
        self.agent_type = "math"
    
    def get_metadata(self):
        """Return agent metadata following the AgentInterface standard"""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "agent_type": self.agent_type,
            "capabilities": ["arithmetic", "statistics", "geometry", "data_analysis"]
        }
    
    def execute_task(self, task_input):
        """Execute a mathematical task based on the input"""
        try:
            task_lower = task_input.lower()
            
            # Parse different types of math requests
            if "calculate" in task_lower or "compute" in task_lower:
                return self._calculate_expression(task_input)
            elif "average" in task_lower or "mean" in task_lower:
                return self._calculate_statistics(task_input)
            elif "circle" in task_lower and "area" in task_lower:
                return self._circle_area(task_input)
            elif "fibonacci" in task_lower:
                return self._fibonacci_sequence(task_input)
            elif "prime" in task_lower:
                return self._check_prime(task_input)
            else:
                return f"Math Agent: I can help with calculations, statistics, geometry, and number analysis. You asked: {task_input}"
                
        except Exception as e:
            return f"Error in mathematical processing: {str(e)}"
    
    def _calculate_expression(self, input_text):
        """Simple expression calculator"""
        import re
        
        # Extract simple mathematical expressions (basic safety)
        expression_pattern = r'[\d+\-*/().() ]+' 
        matches = re.findall(expression_pattern, input_text)
        
        results = []
        for expr in matches:
            try:
                # Basic safety check
                if any(char in expr for char in ['import', 'exec', 'eval', '__']):
                    continue
                    
                result = eval(expr.strip())
                results.append(f"{expr.strip()} = {result}")
            except:
                continue
        
        return {
            "calculations": results if results else ["No valid expressions found"],
            "note": "Basic arithmetic operations supported: +, -, *, /, (), numbers"
        }
    
    def _calculate_statistics(self, input_text):
        """Calculate basic statistics from numbers in text"""
        import re
        
        # Extract numbers from text
        numbers = [float(x) for x in re.findall(r'-?\d+(?:\.\d+)?', input_text)]
        
        if not numbers:
            return {"error": "No numbers found in input"}
        
        return {
            "data": numbers,
            "count": len(numbers),
            "sum": sum(numbers),
            "average": sum(numbers) / len(numbers),
            "min": min(numbers),
            "max": max(numbers),
            "range": max(numbers) - min(numbers)
        }
    
    def _circle_area(self, input_text):
        """Calculate circle area from radius"""
        import re
        
        # Extract radius from text
        radius_match = re.search(r'radius\s*(?:is|=)?\s*(\d+(?:\.\d+)?)', input_text)
        
        if radius_match:
            radius = float(radius_match.group(1))
            area = math.pi * radius * radius
            circumference = 2 * math.pi * radius
            
            return {
                "radius": radius,
                "area": round(area, 2),
                "circumference": round(circumference, 2),
                "formula": "Area = π × r²"
            }
        else:
            return {"error": "Could not find radius value in input"}
    
    def _fibonacci_sequence(self, input_text):
        """Generate Fibonacci sequence"""
        import re
        
        # Extract number of terms
        num_match = re.search(r'(\d+)', input_text)
        n = int(num_match.group(1)) if num_match else 10
        n = min(n, 20)  # Limit to prevent large sequences
        
        fib_sequence = []
        a, b = 0, 1
        
        for i in range(n):
            fib_sequence.append(a)
            a, b = b, a + b
        
        return {
            "sequence": fib_sequence,
            "length": n,
            "note": f"Fibonacci sequence with {n} terms"
        }
    
    def _check_prime(self, input_text):
        """Check if numbers are prime"""
        import re
        
        numbers = [int(x) for x in re.findall(r'\d+', input_text)]
        results = []
        
        for num in numbers[:5]:  # Limit to first 5 numbers
            if num < 2:
                is_prime = False
            else:
                is_prime = all(num % i != 0 for i in range(2, int(num**0.5) + 1))
            
            results.append({
                "number": num,
                "is_prime": is_prime,
                "factors": self._get_factors(num) if not is_prime and num > 1 else []
            })
        
        return {"prime_analysis": results}
    
    def _get_factors(self, n):
        """Get factors of a number"""
        factors = []
        for i in range(2, min(n, 100)):  # Limit search range
            if n % i == 0:
                factors.append(i)
                if len(factors) >= 5:  # Limit number of factors shown
                    break
        return factors

# Agent instance
agent = MathAgent()

# Main execution function
def main(task_input=""):
    """Main entry point for the agent"""
    if not task_input:
        return agent.get_metadata()
    else:
        return agent.execute_task(task_input)

# For testing
if __name__ == "__main__":
    print("=== Math Agent Test ===")
    print("Metadata:", agent.get_metadata())
    print("\nCalculation:", agent.execute_task("Calculate 25 * 4 + 10"))
    print("\nStatistics:", agent.execute_task("Find average of 10, 20, 30, 40"))
    print("\nFibonacci:", agent.execute_task("Generate 8 Fibonacci numbers"))
