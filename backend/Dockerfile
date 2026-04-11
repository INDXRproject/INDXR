FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y ffmpeg wget nodejs npm && rm -rf /var/lib/apt/lists/*

# Bundle bgutil-pot Rust binary (pre-downloaded to avoid Railway wget failures)
COPY bin/bgutil-pot-linux-x86_64 /usr/local/bin/bgutil-pot
RUN chmod +x /usr/local/bin/bgutil-pot

# Keep bgutil plugin zip intact — yt-dlp loads plugins directly from zips in plugin_dirs
RUN wget -q https://github.com/jim60105/bgutil-ytdlp-pot-provider-rs/releases/latest/download/bgutil-ytdlp-pot-provider-rs.zip \
    && mkdir -p /root/yt-dlp-plugins \
    && mv bgutil-ytdlp-pot-provider-rs.zip /root/yt-dlp-plugins/

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
