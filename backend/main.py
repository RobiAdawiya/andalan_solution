import json
import psycopg2
import paho.mqtt.client as mqtt
from psycopg2.extras import RealDictCursor
from contextlib import contextmanager
import time

# DATABASE CONFIG
DB_CONFIG = {
    "host": "localhost",
    "dbname": "database_barcode",
    "user": "postgres",
    "password": "a",
    "port": 5432
}

MQTT_BROKER = "192.168.1.205"
MQTT_PORT = 1883
TOPIC_MANPOWER = "data/manpower"
TOPIC_PRODUCT = "data/product"

# DATABASE HELPERS
@contextmanager
def db_session():
    conn = psycopg2.connect(**DB_CONFIG)
    try:
        yield conn
    except Exception as e:
        print(f"DATABASE ERROR: {e}")
        raise
    finally:
        conn.close()

def fetch_one(query, params=None):
    with db_session() as conn:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchone()

def execute_query(query, params=None):
    with db_session() as conn:
        with conn.cursor() as cur:
            cur.execute(query, params)
            conn.commit()

# ==============================
# MANPOWER LOGIC (UPDATED)
# ==============================
def handle_manpower(data):
    nik = data.get("nik")
    name = data.get("name")

    if not nik or not name:
        return False, "Field nik / name kosong"

    # 1. Validasi manpower
    row = fetch_one("SELECT nik, name FROM manpower WHERE nik=%s", (nik,))
    if not row or row["name"].lower() != name.lower():
        return False, "Manpower tidak valid"

    # 2. [LOGIKA BARU] Ambil status mesin sesuai permintaan
    # Jika 1 = Status Login (Mesin ON)
    # Jika 0 = Status Logout (Mesin OFF)
    machine_log = fetch_one("""
        SELECT * FROM log_machine
        WHERE tag_name='WISE4050:PB_EMG'
        ORDER BY created_at DESC
        LIMIT 1
    """)
    
    # Default ke 0 jika data belum ada
    machine_status = int(machine_log["tag_value"]) if machine_log else 0

    # 3. Ambil status PRODUK TERAKHIR
    last_product = fetch_one("""
        SELECT machine_name, name_product, action, name_manpower 
        FROM log_product 
        ORDER BY created_at DESC LIMIT 1
    """)

    # 4. Ambil login terakhir manpower
    last_login = fetch_one("""
        SELECT nik, name, status FROM log_manpower 
        ORDER BY created_at DESC LIMIT 1
    """)

    # --- KONDISI 1: MANPOWER INGIN LOGIN ---
    if not last_login or last_login["status"] == "logout":
        
        # ATURAN: Jika tag_value bernilai 1 (Login), manpower TIDAK boleh login.
        # Manpower hanya boleh login jika tag_value 0 (Logout).
        if machine_status == 1:
            return False, "Gagal Login: WISE4050:PB_EMG (1). Harap matikan WISE4050:PB_EMG dulu."
        
        execute_query("""
            INSERT INTO log_manpower (created_at, nik, name, status)
            VALUES (NOW(), %s, %s, 'login')
        """, (nik, name))
        return True, "Login berhasil"

    # --- KONDISI 2: MANPOWER INGIN LOGOUT ---
    if last_login["status"] == "login":
        if str(last_login["nik"]) != str(nik):
            return False, f"Gagal: {last_login['name']} sedang login"
        if machine_status == 0:
            return False, "Gagal Logout: WISE4050:PB_EMG (0). Harap matikan WISE4050:PB_EMG dulu."

        status_msg = "Logout berhasil"

        # Cek apakah perlu Auto-Stop Product (Jika produk masih Start)
        if last_product and last_product["action"].strip().lower() == "start":
            execute_query("""
                INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
                VALUES (NOW(), %s, %s, 'stop', %s)
            """, (
                last_product['machine_name'], 
                last_product['name_product'], 
                last_product['name_manpower']
            ))
            status_msg += " & Product Auto-Stop tercatat"

        # Eksekusi Logout Manpower
        execute_query("""
            INSERT INTO log_manpower (created_at, nik, name, status)
            VALUES (NOW(), %s, %s, 'logout')
        """, (nik, name))
        
        return True, status_msg

    return False, "Status logic tidak dikenal"

# ==============================
# PRODUCT LOGIC (ORIGINAL)
# ==============================
def handle_product(data):
    machine = data.get("machine_name")
    product = data.get("name_product")

    if not machine or not product:
        return False, "Data product tidak lengkap"

    # Validasi machine & product
    row = fetch_one("SELECT name_product FROM product WHERE machine_name=%s", (machine,))
    if not row:
        return False, "Machine tidak terdaftar"

    if row["name_product"].lower() != product.lower():
        return False, "Produk tidak sesuai mesin"

    # Ambil manpower yang MASIH LOGIN
    manpower = fetch_one("""
        SELECT nik, name
        FROM log_manpower lm
        WHERE lm.status = 'login'
        AND NOT EXISTS (
            SELECT 1 FROM log_manpower lo
            WHERE lo.nik = lm.nik
            AND lo.status = 'logout'
            AND lo.created_at > lm.created_at
        )
        ORDER BY lm.created_at DESC
        LIMIT 1
    """)
    
    if not manpower:
        return False, "Tidak ada manpower login aktif"

    name_manpower = manpower["name"]

    # Cek status terakhir product
    last_product = fetch_one("""
        SELECT action 
        FROM log_product
        WHERE machine_name=%s
        ORDER BY created_at DESC
        LIMIT 1
    """, (machine,))

    action = "start" if not last_product or last_product["action"].lower() == "stop" else "stop"

    execute_query("""
        INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
        VALUES (NOW(), %s, %s, %s, %s)
    """, (machine, product, action, name_manpower))

    return True, f"Product valid, action: {action}, manpower: {name_manpower}"

# ==============================
# MQTT CALLBACKS
# ==============================
def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("✅ Server terhubung ke Broker!")
        client.subscribe([(TOPIC_MANPOWER, 1), (TOPIC_PRODUCT, 1)])
    else:
        print(f"❌ Gagal konek, kode: {rc}")

def on_message(client, userdata, msg):
    print(f"\n📩 TOPIC : {msg.topic}")

    try:
        payload = json.loads(msg.payload.decode())
    except:
        print("Payload bukan JSON")
        return

    success = False
    message = ""

    # ---------- HANDLE MANPOWER ----------
    if msg.topic == TOPIC_MANPOWER:
        success, message = handle_manpower(payload)

        if success:
            # 1. Kirim Sinyal Manpower (Login=1, Logout=0)
            val = 1 if "Login berhasil" in message else 0
            client.publish(
                "machine_01/cmd",
                json.dumps({"w": [{"tag": "ManPower_Validation", "value": val}]}),
                qos=1
            )

            # 2. [AUTO-STOP] Jika terjadi Auto-Stop, kirim sinyal matikan produk
            if "Auto-Stop" in message:
                client.publish(
                    "machine_01/cmd",
                    json.dumps({"w": [{"tag": "Product_Validation", "value": 0}]}),
                    qos=1
                )
                print("⚠️ Command sent: Force Stop Product (Auto-Stop)")

        # Feedback Dashboard
        client.publish(
            "data/feedback/manpower",
            json.dumps({
                "nik": payload.get("nik"),
                "name": payload.get("name"),
                "success": success,
                "message": message
            }),
            qos=1
        )
        print(f"Feedback Manpower: {message}")

    # ---------- HANDLE PRODUCT ----------
    elif msg.topic == TOPIC_PRODUCT:
        success, message = handle_product(payload)

        if success:
            val_prod = 1 if "action: start" in message.lower() else 0
            client.publish(
                "machine_01/cmd",
                json.dumps({"w": [{"tag": "Product_Validation", "value": val_prod}]}),
                qos=1
            )

        product_info = fetch_one("SELECT machine_name, name_product FROM log_product ORDER BY created_at DESC LIMIT 1")
        
        client.publish(
            "data/feedback/product",
            json.dumps({
                "machine_name": product_info["machine_name"] if product_info else None,
                "name_product": product_info["name_product"] if product_info else None,
                "success": success,
                "message": message
            }),
            qos=1
        )
        print(f"Feedback Product: {message}")

# ==============================
# MAIN PROGRAM
# ==============================
if __name__ == "__main__":
    client = mqtt.Client()
    client.on_connect = on_connect
    client.on_message = on_message

    # Auto-reconnect setup
    client.reconnect_delay_set(min_delay=1, max_delay=120)

    try:
        print(f"🚀 Menghubungkan ke {MQTT_BROKER}...")
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_forever()

    except KeyboardInterrupt:
        print("\n🛑 Server dihentikan secara manual (Ctrl+C)")
        client.disconnect()
    except Exception as e:
        print(f"💥 Fatal Error: {e}")