const BASE_URL = "http://192.168.1.43:8000"; 

export const getManpowerList = async () => {
  const response = await fetch(`${BASE_URL}/manpower`);
  return await response.json();
};

export const getProductList = async () => {
    const response = await fetch(`${BASE_URL}/product`);
    return await response.json();
};
export const getManpowerLogs = async () => {
  const response = await fetch(`${BASE_URL}/manpower/logs`);
  return await response.json();
};

export const getProductLogs = async () => {
  const response = await fetch(`${BASE_URL}/product/logs`);
  return await response.json();
};

export const getMachineLogs = async () => {
  const response = await fetch(`${BASE_URL}/machine/logs`);
  return await response.json();
};

export const validateManpower = async (nik, nama) => {
  const response = await fetch(`${BASE_URL}/validate/manpower?nik=${nik}&nama=${nama}`);
  return await response.json();
};

export const validateProduct = async (machine, product) => {
  const response = await fetch(`${BASE_URL}/validate/product?machine_name=${machine}&name_product=${product}`);
  return await response.json();
};
