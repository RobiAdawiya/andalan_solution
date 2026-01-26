# services/product.py
from db_connection import fetch_one, insert_log_product

def handle_product(data):
    machine = data.get("machine_name")
    product = data.get("name_product")

    if not machine or not product:
        return False, "Data product tidak lengkap"

    row = fetch_one(
        "SELECT name_product FROM product WHERE machine_name=%s",
        (machine,)
    )
    if not row:
        return False, "Machine tidak terdaftar"

    if row["name_product"].lower() != product.lower():
        return False, "Produk tidak sesuai mesin"

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

    last_product = fetch_one("""
        SELECT action 
        FROM log_product
        WHERE machine_name=%s
        ORDER BY created_at DESC
        LIMIT 1
    """, (machine,))

    action = "start" if not last_product or last_product["action"] == "stop" else "stop"

    insert_log_product(machine, product, action, name_manpower)
    return True, f"Product valid, action: {action}, manpower: {name_manpower}"