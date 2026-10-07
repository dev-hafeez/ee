# Entangled Echo — AI Service Dockerfile
# Build: docker build -t ee-ai-service .
# Run:   docker run -p 8000:8000 --env-file .env ee-ai-service

FROM python:3.12-slim

WORKDIR /app

# Install system deps for scientific packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Non-root user for security
RUN useradd -m appuser && chown -R appuser /app
USER appuser

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
