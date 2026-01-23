const BASE_URL = "http://127.0.0.1:8000"; 

export const validateManpower = async (nik, nama) => {
  // Mengirim ke: http://127.0.0.1:8000/validate/manpower?nik=337&nama=syafina
  const response = await fetch(`${BASE_URL}/validate/manpower?nik=${nik}&nama=${nama}`);
  return await response.json();
};

export const validateProduct = async (machine, product) => {
  const response = await fetch(`${BASE_URL}/validate/product?machine_name=${machine}&name_product=${product}`);
  return await response.json();
};