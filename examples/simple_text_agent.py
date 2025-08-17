"""
Simple Text Processing Agent Example
A Python agent that performs text analysis and processing tasks.
"""

class TextAgent:
    def __init__(self):
        self.name = "Simple Text Agent"
        self.description = "Performs text analysis, processing, and natural language tasks"
        self.version = "1.0.0"
        self.agent_type = "text"
    
    def get_metadata(self):
        """Return agent metadata following the AgentInterface standard"""
        return {
            "name": self.name,
            "description": self.description,
            "version": self.version,
            "agent_type": self.agent_type,
            "capabilities": ["text_analysis", "word_count", "sentiment", "summarization"]
        }
    
    def execute_task(self, task_input):
        """Execute a text processing task"""
        try:
            task_lower = task_input.lower()
            
            if "analyze" in task_lower or "analysis" in task_lower:
                return self._analyze_text(task_input)
            elif "count" in task_lower and ("word" in task_lower or "character" in task_lower):
                return self._count_text(task_input)
            elif "sentiment" in task_lower:
                return self._simple_sentiment(task_input)
            elif "summarize" in task_lower or "summary" in task_lower:
                return self._simple_summary(task_input)
            elif "reverse" in task_lower:
                return self._reverse_text(task_input)
            else:
                return f"Text Agent: I can analyze text, count words/characters, detect sentiment, and more. You asked: {task_input}"
                
        except Exception as e:
            return f"Error in text processing: {str(e)}"
    
    def _analyze_text(self, text):
        """Comprehensive text analysis"""
        import re
        
        # Clean text for analysis (remove the command part)
        clean_text = re.sub(r'^.*?analyze\s+', '', text, flags=re.IGNORECASE)
        
        if not clean_text.strip():
            return {"error": "No text provided for analysis"}
        
        words = clean_text.split()
        sentences = len([s for s in re.split(r'[.!?]+', clean_text) if s.strip()])
        paragraphs = len([p for p in clean_text.split('\n\n') if p.strip()])
        
        # Character frequency
        char_freq = {}
        for char in clean_text.lower():
            if char.isalpha():
                char_freq[char] = char_freq.get(char, 0) + 1
        
        # Most common words (simple implementation)
        word_freq = {}
        for word in words:
            clean_word = re.sub(r'[^\w]', '', word.lower())
            if clean_word and len(clean_word) > 2:
                word_freq[clean_word] = word_freq.get(clean_word, 0) + 1
        
        common_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
        
        return {
            "text_length": len(clean_text),
            "word_count": len(words),
            "sentence_count": sentences,
            "paragraph_count": paragraphs,
            "average_word_length": sum(len(word) for word in words) / len(words) if words else 0,
            "most_common_words": common_words,
            "character_frequency": dict(sorted(char_freq.items(), key=lambda x: x[1], reverse=True)[:10])
        }
    
    def _count_text(self, text):
        """Count words and characters in text"""
        import re
        
        # Extract the text to count (remove command part)
        clean_text = re.sub(r'^.*?count\s+', '', text, flags=re.IGNORECASE)
        
        words = clean_text.split()
        characters = len(clean_text)
        characters_no_spaces = len(clean_text.replace(' ', ''))
        lines = len(clean_text.split('\n'))
        
        return {
            "text": clean_text,
            "word_count": len(words),
            "character_count": characters,
            "character_count_no_spaces": characters_no_spaces,
            "line_count": lines,
            "average_words_per_line": len(words) / lines if lines > 0 else 0
        }
    
    def _simple_sentiment(self, text):
        """Simple sentiment analysis using word lists"""
        positive_words = [
            'good', 'great', 'excellent', 'amazing', 'wonderful', 'fantastic',
            'awesome', 'brilliant', 'superb', 'outstanding', 'perfect', 'love',
            'like', 'enjoy', 'happy', 'pleased', 'satisfied', 'delighted'
        ]
        
        negative_words = [
            'bad', 'terrible', 'awful', 'horrible', 'disgusting', 'hate',
            'dislike', 'angry', 'frustrated', 'disappointed', 'sad', 'annoyed',
            'upset', 'worried', 'concerned', 'problem', 'issue', 'wrong'
        ]
        
        text_lower = text.lower()
        positive_score = sum(1 for word in positive_words if word in text_lower)
        negative_score = sum(1 for word in negative_words if word in text_lower)
        
        if positive_score > negative_score:
            sentiment = "positive"
        elif negative_score > positive_score:
            sentiment = "negative"
        else:
            sentiment = "neutral"
        
        return {
            "sentiment": sentiment,
            "positive_score": positive_score,
            "negative_score": negative_score,
            "confidence": abs(positive_score - negative_score) / (positive_score + negative_score + 1),
            "analysis": f"Found {positive_score} positive and {negative_score} negative indicators"
        }
    
    def _simple_summary(self, text):
        """Create a simple summary by extracting key sentences"""
        import re
        
        # Extract the text to summarize
        clean_text = re.sub(r'^.*?summari[ze|se]\s+', '', text, flags=re.IGNORECASE)
        
        if not clean_text.strip():
            return {"error": "No text provided for summarization"}
        
        sentences = [s.strip() for s in re.split(r'[.!?]+', clean_text) if s.strip()]
        
        if len(sentences) <= 2:
            return {
                "summary": clean_text,
                "original_sentences": len(sentences),
                "note": "Text is already quite short"
            }
        
        # Simple extractive summarization - take first and last sentences
        # In a real implementation, you'd use more sophisticated techniques
        key_sentences = [sentences[0]]
        if len(sentences) > 2:
            key_sentences.append(sentences[-1])
        
        return {
            "summary": '. '.join(key_sentences) + '.',
            "original_sentences": len(sentences),
            "summary_sentences": len(key_sentences),
            "compression_ratio": f"{len(key_sentences)}/{len(sentences)}"
        }
    
    def _reverse_text(self, text):
        """Reverse text in various ways"""
        import re
        
        # Extract the text to reverse
        clean_text = re.sub(r'^.*?reverse\s+', '', text, flags=re.IGNORECASE)
        
        if not clean_text.strip():
            return {"error": "No text provided to reverse"}
        
        return {
            "original": clean_text,
            "character_reverse": clean_text[::-1],
            "word_reverse": ' '.join(clean_text.split()[::-1]),
            "line_reverse": '\n'.join(clean_text.split('\n')[::-1])
        }

# Agent instance
agent = TextAgent()

# Main execution function
def main(task_input=""):
    """Main entry point for the agent"""
    if not task_input:
        return agent.get_metadata()
    else:
        return agent.execute_task(task_input)

# For testing
if __name__ == "__main__":
    print("=== Text Agent Test ===")
    print("Metadata:", agent.get_metadata())
    print("\nAnalysis:", agent.execute_task("Analyze this sample text for processing"))
    print("\nSentiment:", agent.execute_task("This is a wonderful and amazing day!"))
    print("\nReverse:", agent.execute_task("Reverse hello world"))
