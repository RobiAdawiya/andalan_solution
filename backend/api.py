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

# KONFIGURASI DATABASE
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
        query = """
            SELECT id, machine_name, name_product, action, name_manpower, created_at 
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
        query = """
            SELECT machine_id, tag_name, tag_value, created_at 
            FROM log_machine 
            ORDER BY created_at DESC
            LIMIT 100
        """
        cur.execute(query)
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# 4. MASTER DATA MANPOWER
@app.get("/manpower")
def get_all_manpower():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        query = "SELECT name, nik, position, department FROM manpower ORDER BY name ASC"
        cur.execute(query)
        data = cur.fetchall()
        cur.close()
        conn.close()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengambil master data manpower: {str(e)}")
    
# 5. GET PRODUCT LIST (MASTER DATA PRODUCT)
@app.get("/product")
def get_all_products():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        
        # Mengambil data dari tabel master product (asumsi nama tabel: product)
        query = "SELECT machine_name, name_product FROM product ORDER BY name_product ASC"
        cur.execute(query)
        data = cur.fetchall()
        
        cur.close()
        conn.close()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Gagal mengambil master data produk: {str(e)}")


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