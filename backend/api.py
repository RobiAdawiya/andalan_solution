from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel  # Ditambahkan untuk menangani skema data
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime

# Import logic dari main.py
from main import system

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

# 1. LOG MANPOWER
@app.get("/manpower/logs")
def get_manpower_logs():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT id, name, nik, status, created_at FROM log_manpower ORDER BY created_at DESC")
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
    
# 6. POST Add ManPower
class addmanpower(BaseModel):
    name: str
    nik: str
    department: str
    position: str

@app.post("/add_manpower")
async def post_add_manpower(data: addmanpower):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Cek duplikasi NIK di Database
        cur.execute(
            "SELECT nik FROM manpower WHERE nik = %s",
            (data.nik,)
        )
        if cur.fetchone():
            raise HTTPException(
                status_code=400,
                detail="NIK sudah terdaftar!"
            )

        # 2. Query Insert
        query = """
            INSERT INTO manpower (name, nik, department, position)
            VALUES (%s, %s, %s, %s)
        """
        values = (
            data.name,
            data.nik,
            data.department,
            data.position
        )

        cur.execute(query, values)
        conn.commit()

        return {
            "status": "success",
            "message": "Data berhasil ditambahkan!"
        }

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 7. Delete ManPower
class deletemanpower(BaseModel):
    nik: str

@app.delete("/delete_manpower")
async def delete_manpower(data: deletemanpower):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Cek apakah NIK ada
        cur.execute(
            "SELECT nik FROM manpower WHERE nik = %s",
            (data.nik,)
        )
        if not cur.fetchone():
            raise HTTPException(
                status_code=404,
                detail="NIK tidak ditemukan!"
            )

        # 2. Query DELETE
        cur.execute(
            "DELETE FROM manpower WHERE nik = %s",
            (data.nik,)
        )
        conn.commit()

        return {
            "status": "success",
            "message": "Data manpower berhasil dihapus"
        }

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 8. PUT Edit ManPower
class EditManpower(BaseModel):
    nik: str
    name: str
    department: str
    position: str

@app.put("/editmanpower")
async def put_editmanpower(data: EditManpower):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Pastikan manpower ada
        cur.execute(
            "SELECT nik FROM manpower WHERE nik = %s",
            (data.nik,)
        )
        if not cur.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Manpower tidak ditemukan"
            )

        # 2. Update master data
        cur.execute(
            """
            UPDATE manpower
            SET name = %s,
                department = %s,
                position = %s
            WHERE nik = %s
            """,
            (
                data.name,
                data.department,
                data.position,
                data.nik
            )
        )

        # 3. Insert log logout (FORCE LOGOUT)
        cur.execute(
            """
            INSERT INTO log_manpower (nik, name, status)
            VALUES (%s, %s, %s)
            """,
            (
                data.nik,
                data.name,
                "logout"
            )
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Manpower diperbarui & status logout dicatat"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 9. POST Add Part/Product
class addproduct(BaseModel):
    machine_name: str
    name_product: str
    start_date: datetime

@app.post("/addproduct")
async def post_addproduct(data: addproduct):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute(
            "SELECT 1 FROM product WHERE machine_name=%s AND name_product=%s",
            (data.machine_name, data.name_product)
        )
        if cur.fetchone():
            return {"status": "error", "message": "Product already exists"}

        # 1. Insert ke table product
        cur.execute(
            """
            INSERT INTO product (machine_name, name_product)
            VALUES (%s, %s)
            """,
            (data.machine_name, data.name_product)
        )

        # 2. Insert ke table log_product
        cur.execute(
            """
            INSERT INTO log_product
            (machine_name, name_product, name_manpower, created_at, action)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                data.machine_name,
                data.name_product,
                "admin",
                data.start_date,
                "stop"
            )
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Product & log berhasil ditambahkan"
        }

    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 10. DELETE Product (Hanya hapus current product, log tetap)
class DeleteProduct(BaseModel):
    machine_name: str
    name_product: str


@app.delete("/delete_product")
async def delete_product(data: DeleteProduct):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Cek apakah product ada
        cur.execute(
            """
            SELECT 1 FROM product
            WHERE machine_name = %s AND name_product = %s
            """,
            (data.machine_name, data.name_product)
        )

        if not cur.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Product tidak ditemukan"
            )

        # 2. Delete hanya dari tabel product
        cur.execute(
            """
            DELETE FROM product
            WHERE machine_name = %s AND name_product = %s
            """,
            (data.machine_name, data.name_product)
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Product berhasil dihapus (log tetap tersimpan)"
        }

    except HTTPException as http_exc:
        raise http_exc
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 11. PUT Edit Parts/Product
class EditProduct(BaseModel):
    machine_name: str
    name_product: str


@app.put("/editproduct")
async def put_editproduct(data: EditProduct):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Cek product
        cur.execute(
            "SELECT machine_name FROM product WHERE machine_name = %s AND name_product = %s",
            (data.machine_name, data.name_product)
        )
        if not cur.fetchone():
            raise HTTPException(
                status_code=404,
                detail="Product tidak ditemukan"
            )

        # 2. Update MASTER product
        cur.execute(
            """
            UPDATE product
            SET name_product = %s
            WHERE machine_name = %s
            """,
            (
                data.name_product,
                data.machine_name
            )
        )

        # 3. Insert LOG (PASTI STOP)
        cur.execute(
            """
            INSERT INTO log_product
            (machine_name, name_product, action, name_manpower, created_at)
            VALUES (%s, %s, %s, %s, NOW())
            """,
            (
                data.machine_name,
                data.name_product,
                "stop",
                "admin"
            )
        )

        conn.commit()

        return {
            "status": "success",
            "message": "Product diperbarui & status stop dicatat"
        }

    except HTTPException:
        raise
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# --- ENDPOINTS VALIDATION (EXISTING) ---
@app.get("/validate/manpower")
def api_validate_manpower(nik: str, name: str):
    payload = {"nik": nik, "name": name}
    success, message = system.handle_manpower(payload)
    return {"success": success, "message": message, "data": payload}

@app.get("/validate/product")
def api_validate_product(machine_name: str, name_product: str):
    payload = {"machine_name": machine_name, "name_product": name_product}
    success, message = system.handle_product(payload)
    return {"success": success, "message": message}