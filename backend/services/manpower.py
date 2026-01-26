# services/manpower.py
from db_connection import fetch_one, insert_log_manpower

def handle_manpower(data):
    nik = data.get("nik")
    name = data.get("name")

    if not nik or not name:
        return False, "Field nik / name kosong"

    row = fetch_one("SELECT nik, name FROM manpower WHERE nik=%s", (nik,))
    if not row or row["name"].lower() != name.lower():
        return False, "Manpower tidak valid"

    last_login = fetch_one("""
        SELECT nik, name, action 
        FROM log_manpower 
        ORDER BY created_at DESC 
        LIMIT 1
    """)

    if not last_login or last_login["action"] == "logout":
        insert_log_manpower(nik, name, "login")
        return True, "Login berhasil"

    if last_login["action"] == "login":
        if last_login["nik"] == nik and last_login["name"].lower() == name.lower():
            insert_log_manpower(nik, name, "logout")
            return True, "Logout berhasil"
        return False, f"{last_login['name']} masih login, logout dulu"