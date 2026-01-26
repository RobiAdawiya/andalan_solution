# andalan_solution/backend/Dockerfile
FROM python:3.10-sli

# Set working directory
WORKDIR /app

# Install dependencies sistem
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements dan install
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy seluruh source code ke dalam container
COPY . .

# Expose port API
EXPOSE 8000

# JALANKAN DUA PROSES SEKALIGUS (MQTT Client & API Server)
# "python main.py &" -> jalan di background
# "uvicorn ..." -> jalan di foreground agar container tidak exit
CMD ["sh", "-c", "python main.py & uvicorn api:app --host 0.0.0.0 --port 8000"]