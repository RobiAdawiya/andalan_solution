from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import psycopg2
from psycopg2.extras import RealDictCursor

# Import logic dari main.py
from backend.main import handle_manpower, handle_product

app = FastAPI(
    title="API Monitoring Produksi & Manpower",
    version="1.1.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- KONFIGURASI DATABASE ---
DB_CONFIG = {
    "host": "localhost",
    "database": "database_barcode",
    "user": "postgres",
    "password": "a",
    "port": "5432"
}

def get_db_connection():
    return psycopg2.connect(**DB_CONFIG)

# --- ENDPOINTS LOGS ---

# 1. LOG MANPOWER
@app.get("/manpower/logs")
def get_manpower_logs():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name, nik, action, created_at FROM log_manpower ORDER BY created_at DESC")
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 2. LOG PRODUCT
@app.get("/product/logs")
def get_product_logs():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Mengambil machine_name, name_product, action, name_manpower
        query = """
            SELECT machine_name, name_product, action, name_manpower, created_at 
            FROM log_product 
            ORDER BY created_at DESC
        """
        cur.execute(query)
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 3. LOG MACHINE (IoT/Sensor Data)
@app.get("/machine/logs")
def get_machine_logs():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        # Mengambil machine_id, tag_name, tag_value
        query = """
            SELECT machine_id, tag_name, tag_value, created_at 
            FROM log_machine 
            ORDER BY created_at DESC
        """
        cur.execute(query)
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- ENDPOINTS VALIDATION (EXISTING) ---

@app.get("/validate/manpower")
def api_validate_manpower(nik: str, name: str):
    payload = {"nik": nik, "name": name}
    success, message = handle_manpower(payload)
    return {"success": success, "message": message, "data": payload}

@app.get("/validate/product")
def api_validate_product(machine_name: str, name_product: str):
    payload = {"machine_name": machine_name, "name_product": name_product}
    success, message = handle_product(payload)
    return {"success": success, "message": message}