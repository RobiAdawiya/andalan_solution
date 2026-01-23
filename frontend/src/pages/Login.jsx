import { useEffect, useRef, useState } from "react";
import "../styles/login.css";
// 1. Import fungsi dari api.js
import { validateManpower } from "../services/api.js"; 

export default function Login({ onLogin }) { // Tambahkan prop onLogin dari App.jsx
  const [isRegister, setIsRegister] = useState(false);

  // username akan dikirim sebagai 'nama', password akan dikirim sebagai 'nik'
  const [username, setUsername] = useState(""); 
  const [password, setPassword] = useState(""); 
  const [confirmPassword, setConfirmPassword] = useState("");

  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [registerSuccess, setRegisterSuccess] = useState("");

  const pollRef = useRef(null);

  // Fungsi navigasi yang disesuaikan dengan state App.jsx
  const goDashboard = () => {
    localStorage.setItem("auth", "true");
    onLogin(); // Memanggil handleLogin di App.jsx untuk merubah state isAuth
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  };

  // ===== LOGIN (MENGGUNAKAN API.JS) =====
  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setRegisterSuccess("");

    if (!username || !password) {
      setError("Username (Nama) dan Password (NIK) harus diisi");
      return;
    }
    try {
      // Pastikan urutan: (nik, nama) sesuai definisi di api.js
      const result = await validateManpower(password, username); 
    
      if (result.success) { // Cek "success" sesuai output JSON backend Anda
        stopPolling();
        setSuccessMsg("Login Berhasil!");
        setTimeout(() => {
          goDashboard();
        }, 1000);
      } else {
        setError(result.message || "Login Gagal");
      }
    } catch (err) {
      setError("Gagal terhubung ke server. Pastikan Backend sudah jalan & CORS aktif.");
    }
  };

  // ===== REGISTER & QR POLLING (Placeholder / Tetap) =====
  // Note: Karena backend saat ini hanya mendukung validasi, 
  // bagian ini tetap dibiarkan atau bisa Anda sesuaikan nanti.
  
  const handleRegister = async (e) => {
    e.preventDefault();
    setError("Fitur Register belum tersambung ke Database.");
  };

  const startListeningQr = () => {
    // Polling QR tetap berjalan jika backend mendukung endpoint /qr/status
    // Jika tidak ada, fungsi ini bisa dikosongkan untuk testing login saja
  };

  useEffect(() => {
    startListeningQr();
    return () => stopPolling();
  }, []);

  return (
    <div className="login-container">
      <h1 className="brand-title">ANDALAN SYSTEM</h1>
      <p className="subtitle">
        {isRegister ? "Create your account" : "Sign in with your Name and NIK"}
      </p>

      {successMsg && <p className="success-text" style={{ textAlign: "center", color: "green" }}>{successMsg}</p>}

      {!isRegister ? (
        <form className="form" onSubmit={handleLogin}>
          <label>Username (Nama Lengkap)</label>
          <input
            type="text"
            placeholder="Masukkan Nama"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
          />

          <label>Password (NIK)</label>
          <input
            type="password"
            placeholder="Masukkan NIK"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />

          {error && <p className="error-text">{error}</p>}

          <button type="submit" className="login-btn">Login</button>

          <button
            type="button"
            className="signin-btn"
            onClick={() => setIsRegister(true)}
          >
            Sign Up / Register
          </button>
        </form>
      ) : (
        <form className="form" onSubmit={handleRegister}>
          {/* Form Register tetap seperti kode asli Anda */}
          <label>Username</label>
          <input type="text" placeholder="Enter username" />
          <label>Password</label>
          <input type="password" placeholder="Enter password" />
          {error && <p className="error-text">{error}</p>}
          <button type="submit" className="login-btn">Create Account</button>
          <button type="button" className="signin-btn" onClick={() => setIsRegister(false)}>
            Back to Login
          </button>
        </form>
      )}
    </div>
  );
}