const BASE_URL = import.meta.env.VITE_API_URL;

export default BASE_URL;

// 1. FUNGSI PEMBANTU UNTUK AUTHORIZATION
const fetchWithAuth = async (url, options = {}) => {
  const token = localStorage.getItem("token"); // Ambil token dari storage
  
  // Gabungkan header bawaan dengan header Token
  const headers = {
    ...options.headers,
    "Authorization": `Bearer ${token}`
  };

  const response = await fetchWithAuth(url, { ...options, headers });

  // JIKA BACKEND MENOLAK TOKEN (Token kedaluwarsa atau palsu)
  if (response.status === 401) {
    localStorage.clear();
    
    if (window.location.pathname !== "/login") {
        window.location.href = "/login"; 
    }
    
    throw new Error("Sesi tidak valid, silakan login kembali.");
  }

  return response;
};

export const getManpowerList = async () => {
  const response = await fetchWithAuth(`${BASE_URL}/manpower`);
  return await response.json();
};

export const getProductList = async () => {
    const response = await fetchWithAuth(`${BASE_URL}/product`);
    return await response.json();
};
export const getManpowerLogs = async () => {
  const response = await fetchWithAuth(`${BASE_URL}/manpower/logs`);
  return await response.json();
};

export const getWorkOrders = async () => {
  const response = await fetchWithAuth(`${BASE_URL}/work-orders`);
  return await response.json();
};

export const getProductLogs = async () => {
  // Kita tambahkan "?t=" + waktu sekarang.
  // Ini trik supaya browser & server merasa ini adalah permintaan "baru" 
  // dan terpaksa memberikan data paling update (Real-time).
  const timestamp = new Date().getTime();
  const response = await fetchWithAuth(`${BASE_URL}/product/logs?t=${timestamp}`, {
    headers: {
      "Cache-Control": "no-cache",
      "Pragma": "no-cache"
    }
  });
  return await response.json();
};

// Get filtered machine logs for export
export const getFilteredMachineLogs = async (startDate, endDate, machineId) => {
  const response = await fetchWithAuth(`${BASE_URL}/machine/logs/filtered?start_date=${startDate}&end_date=${endDate}&machine_id=${machineId}`);
  return await response.json();
};

export const getMachineLogs = async () => {
  const response = await fetchWithAuth(`${BASE_URL}/machine/logs`);
  return await response.json();
};

export const getDeviceList = async () => {
    const response = await fetchWithAuth(`${BASE_URL}/devices`);
    return await response.json();
};

export const addDevice = async (deviceData) => {
    const response = await fetchWithAuth(`${BASE_URL}/add_device`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceData)
    });
    return await response.json();
};

export const deleteDevice = async (machineName) => {
    const response = await fetchWithAuth(`${BASE_URL}/delete_device/${machineName}`, {
        method: "DELETE"
    });
    return await response.json();
};

// Tambahkan di api.js
export const updateDevice = async (deviceData) => {
    const response = await fetchWithAuth(`${BASE_URL}/edit_device`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(deviceData)
    });
    return await response.json();
};

// Login check
export const loginCheck = async (username, password) => {
  const response = await fetchWithAuth(`${BASE_URL}/login`, {
    method: 'POST', 
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }) 
  });
  return await response.json();
};

// Change password

export const changePassword = async (username, oldPassword, newPassword) => {
  const response = await fetchWithAuth(`${BASE_URL}/change-password`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      username: username, 
      old_password: oldPassword, 
      new_password: newPassword 
    })
  });
  return await response.json();
};

export const getMachineStatusEvents = async (machineId) => {
  const res = await fetchWithAuth(`${BASE_URL}/machine/status?machine_id=${machineId}`);
  return res.json();
};

export const validateManpower = async (nik, nama) => {
  const response = await fetch(`${BASE_URL}/validate/manpower?nik=${nik}&nama=${nama}`);
  return await response.json();
};

export const validateProduct = async (machine, product) => {
  const response = await fetch(`${BASE_URL}/validate/product?machine_name=${machine}&name_product=${product}`);
  return await response.json();
};


