FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
# nodejs via NodeSource: yt-dlp 2026.06.09 vereist Node v22+ (Debian Bookworm apt levert v18)
RUN apt-get update && apt-get install -y ffmpeg wget curl && \
    curl -fsSL https://deb.nodesource.com/setup_22.x | bash - && \
    apt-get install -y nodejs && \
    rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
