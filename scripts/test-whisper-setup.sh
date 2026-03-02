#!/bin/bash
# Test script to verify Whisper AI backend setup

echo "🔍 Checking Whisper AI Backend Setup..."
echo ""

# Check Python files exist
echo "✅ Checking files..."
files=(
    "backend/audio_utils.py"
    "backend/whisper_client.py"
    "backend/credit_manager.py"
    "backend/main.py"
    "backend/.env"
)

for file in "${files[@]}"; do
    if [ -f "$file" ]; then
        echo "  ✓ $file"
    else
        echo "  ✗ $file (MISSING)"
    fi
done

echo ""
echo "✅ Checking virtual environment..."
if [ -d "backend/venv" ]; then
    echo "  ✓ Virtual environment exists"
    
    # Activate and check dependencies
    source backend/venv/bin/activate
    echo ""
    echo "✅ Checking Python dependencies..."
    
    deps=("httpx" "pydub" "supabase" "ffmpeg-python" "python-multipart")
    for dep in "${deps[@]}"; do
        if python -c "import $dep" 2>/dev/null; then
            echo "  ✓ $dep"
        else
            echo "  ✗ $dep (NOT INSTALLED)"
        fi
    done
    
    deactivate
else
    echo "  ✗ Virtual environment not found"
fi

echo ""
echo "✅ Checking system dependencies..."
if command -v ffmpeg &> /dev/null; then
    echo "  ✓ ffmpeg installed"
else
    echo "  ✗ ffmpeg (NOT INSTALLED)"
fi

echo ""
echo "✅ Checking environment variables..."
if [ -f "backend/.env" ]; then
    if grep -q "OPENAI_API_KEY=sk-" backend/.env; then
        echo "  ✓ OPENAI_API_KEY configured"
    else
        echo "  ✗ OPENAI_API_KEY not set"
    fi
    
    if grep -q "SUPABASE_URL=" backend/.env; then
        echo "  ✓ SUPABASE_URL configured"
    else
        echo "  ✗ SUPABASE_URL not set"
    fi
fi

echo ""
echo "🎯 Setup Status:"
echo "   Run 'cd backend && source venv/bin/activate && python main.py' to start the server"
