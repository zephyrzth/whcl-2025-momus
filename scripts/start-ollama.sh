#!/bin/bash

# Export timeout environment variable
echo "   🚀 Starting Ollama server..."
export OLLAMA_TIMEOUT=900;  # 15 minutes timeout
export OLLAMA_KEEP_ALIVE=30m;                  # Keep model loaded for 30 minutes
export OLLAMA_NUM_PARALLEL=1;                  # Reduce parallel requests to avoid overload
export OLLAMA_MAX_LOADED_MODELS=1;             # Only keep one model loaded
export OLLAMA_FLASH_ATTENTION=1;    
ollama serve;