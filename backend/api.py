from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

# import LANGSUNG dari main.py
from main import handle_manpower, handle_product

app = FastAPI(
    title="API Monitoring Produksi & Manpower",
    version="1.0.0"
)

# CORS (WAJIB UNTUK FRONTEND)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ROOT
@app.get("/")
def home():
    return {"status": "Online", "message": "API Validasi berjalan"}

# MANPOWER API
@app.get("/validate/manpower")
def api_validate_manpower(nik: str, name: str):
    payload = {
        "nik": nik,
        "name": name
    }

    success, message = handle_manpower(payload)

    return {
        "success": success,
        "message": message,
        "data": payload
    }

# PRODUCT API
@app.get("/validate/product")
def api_validate_product(machine_name: str, name_product: str):
    payload = {
        "machine_name": machine_name,
        "name_product": name_product
    }

    success, message = handle_product(payload)

    return {
        "success": success,
        "message": message
    }