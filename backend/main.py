import json
import psycopg2
import paho.mqtt.client as mqtt
from psycopg2.extras import RealDictCursor

# ==============================
# DATABASE CONFIG
# ==============================
DB_CONFIG = {
    "host": "localhost",
    "dbname": "database_barcode",
    "user": "postgres",
    "password": "a",
    "port": 5432
}

MACHINE_STATE = {
    "WISE4050PNG": 0  # Default 0
}
def get_connection():
    return psycopg2.connect(**DB_CONFIG)

# ==============================
# DATABASE HELPERS
# ==============================
def fetch_one(query, params=None):
    conn = get_connection()
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute(query, params)
            return cur.fetchone()
    finally:
        conn.close()

def insert_log_manpower(nik, name, action):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO log_manpower (created_at, nik, name, action)
                VALUES (NOW(), %s, %s, %s)
            """, (nik, name, action))
            conn.commit()
    finally:
        conn.close()

def insert_log_product(machine, product, action, name_manpower):
    conn = get_connection()
    try:
        with conn.cursor() as cur:
            cur.execute("""
                INSERT INTO log_product (created_at, machine_name, name_product, action, name_manpower)
                VALUES (NOW(), %s, %s, %s, %s)
            """, (machine, product, action, name_manpower))
            conn.commit()
    finally:
        conn.close()

# ==============================
# MANPOWER LOGIC
# ==============================
def handle_manpower(data):
    nik = data.get("nik")
    name = data.get("name")

    if not nik or not name:
        return False, "Field nik / name kosong"

    # Validasi manpower
    row = fetch_one("SELECT nik, name FROM manpower WHERE nik=%s", (nik,))
    if not row or row["name"].lower() != name.lower():
        return False, "Manpower tidak valid"

    # Ambil login terakhir
    last_login = fetch_one("""
        SELECT nik, name, action 
        FROM log_manpower 
        ORDER BY created_at DESC 
        LIMIT 1
    """)

    # Jika belum ada login / terakhir logout → login
    if not last_login or last_login["action"] == "logout":
        insert_log_manpower(nik, name, "login")
        return True, "Login berhasil"

    # Jika terakhir login
    if last_login["action"] == "login":
        if last_login["nik"] == nik and last_login["name"].lower() == name.lower():
            insert_log_manpower(nik, name, "logout")
            return True, "Logout berhasil"
        return False, f"{last_login['name']} masih login, logout dulu"

# ==============================
# PRODUCT LOGIC
# ==============================
def handle_product(data):
    machine = data.get("machine_name")
    product = data.get("name_product")

    if not machine or not product:
        return False, "Data product tidak lengkap"

    # Validasi machine & product
    row = fetch_one(
        "SELECT name_product FROM product WHERE machine_name=%s",
        (machine,)
    )
    if not row:
        return False, "Machine tidak terdaftar"

    if row["name_product"].lower() != product.lower():
        return False, "Produk tidak sesuai mesin"

    # Ambil manpower yang MASIH LOGIN
    manpower = fetch_one("""
        SELECT nik, name
        FROM log_manpower lm
        WHERE lm.action = 'login'
        AND NOT EXISTS (
            SELECT 1 FROM log_manpower lo
            WHERE lo.nik = lm.nik
            AND lo.action = 'logout'
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

    if not last_product or last_product["action"].lower() == "stop":
        action = "start"
    else:
        action = "stop"

    insert_log_product(machine, product, action, name_manpower)

    return True, f"Product valid, action: {action}, manpower: {name_manpower}"

# ==============================
# MQTT CALLBACK
# ==============================
# ==============================
# MQTT CALLBACK (UPDATED)
# ==============================
def on_message(client, userdata, msg):
    print("\nTOPIC :", msg.topic)

    try:
        payload = json.loads(msg.payload.decode())
    except:
        print("Payload bukan JSON")
        return

    # ---------- MANPOWER ----------
    if msg.topic == "data/manpower":
        success, message = handle_manpower(payload)

        if success:
            # Jika Login -> Kirim value 1
            if message == "Login berhasil":
                val = 1
            # Jika Logout -> Kirim value 0
            elif message == "Logout berhasil":
                val = 0
            else:
                val = None

            if val is not None:
                client.publish(
                    "machine_01/cmd",
                    json.dumps({
                        "w": [{"tag": "ManPower_Validation", "value": val}]
                    }),
                    qos=1
                )

        # Feedback ke UI/Dashboard
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
        print(f"Feedback manpower: {payload.get('name')} -> {message}")

    # ---------- PRODUCT ----------
    elif msg.topic == "data/product":
        success, message = handle_product(payload)

        if success:
            # Jika Start -> Kirim value 1
            if "action: start" in message.lower():
                val_prod = 1
            # Jika Stop -> Kirim value 0
            elif "action: stop" in message.lower():
                val_prod = 0
            else:
                val_prod = None

            if val_prod is not None:
                client.publish(
                    "machine_01/cmd",
                    json.dumps({
                        "w": [{"tag": "Product_Validation", "value": val_prod}]
                    }),
                    qos=1
                )

        # Ambil data terakhir untuk feedback
        product_info = fetch_one("""
            SELECT machine_name, name_product 
            FROM log_product 
            ORDER BY created_at DESC
            LIMIT 1
        """)

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
        print(f"Feedback product: {message}")
        
# ==============================
# MQTT START
# ==============================
MQTT_BROKER = "192.168.1.48"
MQTT_PORT = 1883
SUB_TOPICS = [("data/manpower", 1), ("data/product", 1), ("machine_01/data", 1)]

client = mqtt.Client()
client.on_message = on_message

def on_connect(client, userdata, flags, rc):
    print("Server terhubung ke Broker!")
    client.subscribe(SUB_TOPICS)

client.on_connect = on_connect

if __name__ == "__main__":
    try:
        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        print("🚀 MQTT server running, listening on data/manpower & data/product...")
        client.loop_forever()
    except Exception as e:
        print("Could not connect to MQTT:", e)