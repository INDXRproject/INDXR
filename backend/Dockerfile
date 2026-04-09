FROM python:3.12-slim

WORKDIR /app

# Install system dependencies + curl voor Deno
RUN apt-get update && apt-get install -y curl ffmpeg unzip && rm -rf /var/lib/apt/lists/*

# Installeer Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL=/root/.deno
ENV PATH=$DENO_INSTALL/bin:$PATH

# Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
