# andalan_solution/backend/Dockerfile
FROM python:3.10-slim

WORKDIR /app

# Install dependensi sistem
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

CMD ["sh", "-c", "python -u main.py & uvicorn api:app --reload --host 0.0.0.0 --port 8000"]