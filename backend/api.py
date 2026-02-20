from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel  # Ditambahkan untuk menangani skema data
import psycopg2
from psycopg2.extras import RealDictCursor
from datetime import datetime
from zoneinfo import ZoneInfo
from typing import List, Dict, Optional

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
    "host": "postgres-db",
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
            LIMIT 20000
        """
        cur.execute(query)
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
# 3.1. MACHINE STATUS
@app.get("/machine/status")
def get_machine_status_events(machine_id: str):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        query = """
        WITH ordered AS (
          SELECT
            created_at,
            tag_value::text AS status,
            LAG(tag_value::text) OVER (ORDER BY created_at) AS prev_status
          FROM log_machine
          WHERE
            machine_id = %s
            AND tag_name = 'Machine_Status'
        )
        SELECT created_at, status
        FROM ordered
        WHERE prev_status IS DISTINCT FROM status
        ORDER BY created_at;
        """

        cur.execute(query, (machine_id,))
        data = cur.fetchall()
        cur.close()
        conn.close()
        return data

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
    wo_number: str
    machine_name: str
    name_product: str
    closed: bool = True

@app.post("/addproduct")
async def post_addproduct(data: addproduct):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        current_time = datetime.now(ZoneInfo("Asia/Jakarta"))

        # 1. Cek & Insert ke table product (Master)
        cur.execute("SELECT 1 FROM product WHERE machine_name=%s AND name_product=%s", (data.machine_name, data.name_product))
        if not cur.fetchone():
            cur.execute("INSERT INTO product (machine_name, name_product) VALUES (%s, %s)", (data.machine_name, data.name_product))

        # 2. Tangani Work Order
        wo_num = data.wo_number.strip()
        if wo_num:
            cur.execute("SELECT 1 FROM work_orders WHERE wo_number = %s", (wo_num,))
            if not cur.fetchone():
                cur.execute("INSERT INTO work_orders (wo_number, created_at) VALUES (%s, %s)", (wo_num, current_time))
                
            cur.execute("SELECT 1 FROM work_order_details WHERE wo_number=%s AND machine_name=%s AND product_name=%s", 
                        (wo_num, data.machine_name, data.name_product))
            if not cur.fetchone():
                cur.execute("""
                    INSERT INTO work_order_details (wo_number, machine_name, product_name, closed)
                    VALUES (%s, %s, %s, %s)
                """, (wo_num, data.machine_name, data.name_product, data.closed))
            else:
                 cur.execute("""
                    UPDATE work_order_details SET closed = %s
                    WHERE wo_number=%s AND machine_name=%s AND product_name=%s
                """, (data.closed, wo_num, data.machine_name, data.name_product))

        # 3. Insert ke table log_product
        cur.execute("""
            INSERT INTO log_product (machine_name, name_product, name_manpower, created_at, action) 
            VALUES (%s, %s, %s, %s, %s)
        """, (data.machine_name, data.name_product, "admin", current_time, "stop"))

        conn.commit()
        return {"status": "success", "message": "Product & log berhasil ditambahkan"}

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
    old_machine_name: str
    old_name_product: str
    new_machine_name: str
    new_name_product: str
    new_wo_number: str
    new_closed: bool

@app.put("/editproduct")
async def put_editproduct(data: EditProduct):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # 1. Update Master Product
        cur.execute(
            "UPDATE product SET machine_name = %s, name_product = %s WHERE machine_name = %s AND name_product = %s",
            (data.new_machine_name, data.new_name_product, data.old_machine_name, data.old_name_product)
        )
        
        # 2. Hapus dari detail WO lama
        cur.execute("DELETE FROM work_order_details WHERE machine_name = %s AND product_name = %s", 
                    (data.old_machine_name, data.old_name_product))
        
        # 3. Jika ada WO baru, masukkan ke detail
        wo_num = data.new_wo_number.strip() if data.new_wo_number else ""
        if wo_num != "":
            cur.execute("SELECT 1 FROM work_orders WHERE wo_number = %s", (wo_num,))
            if not cur.fetchone():
                cur.execute("INSERT INTO work_orders (wo_number, created_at) VALUES (%s, NOW())", (wo_num,))
                
            cur.execute("""
                INSERT INTO work_order_details (wo_number, machine_name, product_name, closed)
                VALUES (%s, %s, %s, %s)
            """, (wo_num, data.new_machine_name, data.new_name_product, data.new_closed))

        # 4. CLEANUP WO (MENGGUNAKAN 'NOT EXISTS' AGAR LEBIH AMAN DAN TIDAK ERROR 500)
        cur.execute("""
            DELETE FROM work_orders w 
            WHERE NOT EXISTS (
                SELECT 1 FROM work_order_details wd WHERE wd.wo_number = w.wo_number
            )
        """)

        # 5. Insert LOG
        cur.execute(
            "INSERT INTO log_product (machine_name, name_product, action, name_manpower, created_at) VALUES (%s, %s, %s, %s, NOW())",
            (data.new_machine_name, data.new_name_product, "stop", "admin")
        )

        conn.commit()
        return {"status": "success", "message": "Product berhasil diperbarui"}

    except Exception as e:
        conn.rollback()
        print(f"DATABASE ERROR (EDIT PRODUCT): {str(e)}")
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
    finally:
        cur.close()
        conn.close()

# 12. Get data from device (machine_name, serial number)
class DeviceSchema(BaseModel):
    machine_name: str
    serial_number: str


@app.get("/devices")
def get_all_devices():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT machine_name, serial_number FROM devices ORDER BY machine_name ASC")
        data = cur.fetchall()
        cur.close()
        conn.close()
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# 13. POST ADD DEVICE
@app.post("/add_device")
async def post_add_device(data: DeviceSchema):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("INSERT INTO devices (machine_name, serial_number) VALUES (%s, %s)", 
                    (data.machine_name, data.serial_number))
        conn.commit()
        return {"status": "success", "message": "Device added"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 14. DELETE DEVICE
@app.delete("/delete_device/{machine_name}")
async def delete_device(machine_name: str):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        cur.execute("DELETE FROM devices WHERE machine_name = %s", (machine_name,))
        conn.commit()
        return {"status": "success", "message": "Device deleted"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()
# Tambahkan Skema baru untuk Update
class DeviceUpdate(BaseModel):
    machine_name: str
    serial_number: str

# 15. PUT EDIT DEVICE
@app.put("/edit_device")
async def edit_device(data: DeviceUpdate):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Cek apakah device ada
        cur.execute("SELECT 1 FROM devices WHERE machine_name = %s", (data.machine_name,))
        if not cur.fetchone():
            raise HTTPException(status_code=404, detail="Device tidak ditemukan")

        # Update serial_number berdasarkan machine_name
        cur.execute("""
            UPDATE devices 
            SET serial_number = %s 
            WHERE machine_name = %s
        """, (data.serial_number, data.machine_name))
        
        conn.commit()
        return {"status": "success", "message": "Serial number updated"}
    except Exception as e:
        conn.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        cur.close()
        conn.close()

# 16. Login
class LoginRequest(BaseModel):
    username: str
    password: str

@app.post("/login")
def login(data: LoginRequest):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # 1. Cek database
    query = """
        SELECT username 
        FROM accounts 
        WHERE username = %s AND passwords = %s
    """

    cursor.execute(query, (data.username, data.password))
    user = cursor.fetchone()

    cursor.close()
    conn.close()

    if user:
        return {
            "status": "success",
            "message": "Login berhasil",
            "username": user[0]
        }
    else:
        raise HTTPException(status_code=401, detail="Username atau password salah")

# 17. change password
class ChangePasswordRequest(BaseModel):
    username: str
    old_password: str
    new_password: str

@app.put("/change-password")
def change_password(data: ChangePasswordRequest):
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. cek old password
    check_query = """
        SELECT username 
        FROM accounts
        WHERE username = %s AND passwords = %s
    """
    cursor.execute(check_query, (data.username, data.old_password))
    user = cursor.fetchone()

    if not user:
        cursor.close()
        conn.close()
        raise HTTPException(status_code=401, detail="Password lama salah")

    # 2. update password
    update_query = """
        UPDATE accounts
        SET passwords = %s
        WHERE username = %s
    """
    cursor.execute(update_query, (data.new_password, data.username))
    conn.commit()

    cursor.close()
    conn.close()

    return {
        "status": "success",
        "message": "Password berhasil diubah"
    }

# 18. Machine log filter
@app.get("/machine/logs/filtered")
def get_filtered_machine_logs(start_date: str = None, end_date: str = None, machine_id: str = None):
    try:
        if not start_date or not end_date or not machine_id:
            raise HTTPException(status_code=400, detail="start_date, end_date, and machine_id are required")
        
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        query = """
            SELECT created_at, machine_id, tag_name, tag_value, recorded_at 
            FROM log_machine 
            WHERE DATE(created_at) >= %s AND DATE(created_at) <= %s AND machine_id = %s
            ORDER BY created_at ASC
        """
        cur.execute(query, (start_date, end_date, machine_id))
        logs = cur.fetchall()
        cur.close()
        conn.close()
        return logs
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    

# 19. work order
def get_wib_now():
    return datetime.now(ZoneInfo("Asia/Jakarta"))

class DetailItemSchema(BaseModel):
    machine: str
    product: str

class WorkOrderSchema(BaseModel):
    woNumber: str
    device: str
    details: List[DetailItemSchema]
    status: str
    date: str

class WorkOrderResponse(BaseModel):
    no: int
    woNumber: str
    date: Optional[str]
    parts: List[Dict]

# 19.1. GET ALL WORK ORDERS
@app.get("/api/work-orders", response_model=List[WorkOrderResponse])
def get_work_orders():
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # UBAH wo.start_date dan wo.end_date menjadi wo.created_at
    query = """
        SELECT 
            wo.id,
            wo.wo_number,
            wo.created_at, 
            COALESCE(json_agg(
                json_build_object(
                    'machine', wod.machine_name,
                    'name', wod.product_name,
                    'closed', wod.closed,
                    'status', COALESCE(lp.action, 'Pending')
                )
            ) FILTER (WHERE wod.product_name IS NOT NULL), '[]') AS parts
        FROM work_orders wo
        LEFT JOIN work_order_details wod ON wod.wo_number = wo.wo_number
        LEFT JOIN LATERAL (
            SELECT action
            FROM log_product
            WHERE name_product = wod.product_name 
              AND machine_name = wod.machine_name
            ORDER BY created_at DESC
            LIMIT 1
        ) lp ON TRUE
        GROUP BY wo.id
        ORDER BY wo.id DESC
    """

    cur.execute(query)
    rows = cur.fetchall()

    result = []
    for r in rows:
        result.append({
            "no": r["id"],
            "woNumber": r["wo_number"],
            "date": r["created_at"].isoformat() if r["created_at"] else None,
            "end_date": None,
            "parts": r["parts"]
        })

    cur.close()
    conn.close()
    return result

# 19.2. GET LOGS SPECIFIC WO
@app.get("/api/work-orders/{wo_number}/logs")
def get_work_order_logs(wo_number: str):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Ambil logs berdasarkan WO number -> Detail (Machine+Product) -> Log Product
    query = """
        SELECT lp.machine_name, lp.name_product, lp.action, lp.created_at
        FROM log_product lp
        JOIN work_order_details wod 
          ON lp.name_product = wod.product_name 
          AND lp.machine_name = wod.machine_name
        WHERE wod.wo_number = %s
        ORDER BY lp.created_at ASC
    """

    cur.execute(query, (wo_number,))
    rows = cur.fetchall()
    
    logs = {}

    for r in rows:
        key = f"{r['machine_name']}||{r['name_product']}"
        logs.setdefault(key, []).append({
            "action": r["action"],
            "time": r["created_at"].isoformat() if r["created_at"] else None
        })

    cur.close()
    conn.close()
    return logs

# 20. TOGGLE CLOSED
class ToggleClosed(BaseModel):
    machine_name: str
    name_product: str
    closed: bool

@app.put("/toggle_closed")
async def toggle_closed(data: ToggleClosed):
    conn = get_db_connection()
    cur = conn.cursor()
    try:
        # Update langsung status closed di database
        cur.execute("""
            UPDATE work_order_details 
            SET closed = %s 
            WHERE machine_name = %s AND product_name = %s
        """, (data.closed, data.machine_name, data.name_product))
        conn.commit()
        return {"status": "success", "message": "Status closed updated"}
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