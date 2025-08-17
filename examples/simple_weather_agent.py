"""
Simple Weather Agent Example
A basic Python agent that provides weather information and recommendations.
"""

class WeatherAgent:
    def __init__(self):
        self.name = "Simple Weather Agent"
        self.description = "Provides basic weather information and clothing recommendations"
        self.version = "1.0.0"
        self.agent_type = "weather"
    
    def get_metadata(self):
        """Return agent metadata following the AgentInterface standard"""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "agent_type": self.agent_type,
            "capabilities": ["weather_info", "clothing_advice", "temperature_analysis"]
        }
    
    def execute_task(self, task_input):
        """Execute a task based on the input"""
        try:
            # Simple task processing
            task_lower = task_input.lower()
            
            if "weather" in task_lower and "london" in task_lower:
                return self._get_london_weather()
            elif "weather" in task_lower and "tokyo" in task_lower:
                return self._get_tokyo_weather()
            elif "clothing" in task_lower or "wear" in task_lower:
                return self._get_clothing_advice(task_input)
            elif "temperature" in task_lower:
                return self._analyze_temperature(task_input)
            else:
                return f"Weather Agent: I can help with weather information, clothing advice, and temperature analysis. You asked: {task_input}"
                
        except Exception as e:
            return f"Error processing task: {str(e)}"
    
    def _get_london_weather(self):
        """Mock London weather data"""
        return {
            "location": "London, UK",
            "temperature": "15°C",
            "condition": "Partly Cloudy",
            "humidity": "65%",
            "wind": "12 km/h",
            "recommendation": "Light jacket recommended, umbrella might be useful"
        }
    
    def _get_tokyo_weather(self):
        """Mock Tokyo weather data"""
        return {
            "location": "Tokyo, Japan", 
            "temperature": "22°C",
            "condition": "Sunny",
            "humidity": "45%",
            "wind": "8 km/h",
            "recommendation": "Perfect weather for outdoor activities!"
        }
    
    def _get_clothing_advice(self, context):
        """Provide clothing recommendations"""
        advice = [
            "For temperatures below 10°C: Heavy coat, warm layers, gloves",
            "For 10-20°C: Light jacket or sweater",
            "For 20-25°C: T-shirt or light shirt",
            "For above 25°C: Light, breathable clothing"
        ]
        return {
            "clothing_advice": advice,
            "context": context,
            "note": "Always check local weather conditions before going out!"
        }
    
    def _analyze_temperature(self, input_text):
        """Analyze temperature mentions in text"""
        import re
        
        # Simple temperature extraction
        temp_pattern = r'(-?\d+(?:\.\d+)?)\s*[°]?[CcFf]?'
        matches = re.findall(temp_pattern, input_text)
        
        if matches:
            temps = [float(match) for match in matches]
            avg_temp = sum(temps) / len(temps)
            
            return {
                "found_temperatures": temps,
                "average": avg_temp,
                "analysis": f"Found {len(temps)} temperature values with average {avg_temp:.1f}°C"
            }
        else:
            return {
                "found_temperatures": [],
                "analysis": "No temperature values found in the input"
            }

# Agent instance
agent = WeatherAgent()

# Main execution function that will be called by the system
def main(task_input=""):
    """Main entry point for the agent"""
    if not task_input:
        return agent.get_metadata()
    else:
        return agent.execute_task(task_input)

# For testing
if __name__ == "__main__":
    # Test the agent
    print("=== Weather Agent Test ===")
    print("Metadata:", agent.get_metadata())
    print("\nWeather London:", agent.execute_task("What's the weather in London?"))
    print("\nClothing advice:", agent.execute_task("What should I wear today?"))
    print("\nTemperature analysis:", agent.execute_task("The temperature is 18°C and feels nice"))
