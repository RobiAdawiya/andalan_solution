import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Device from "./pages/Device";
import ManPower from "./pages/ManPower";
import Parts from "./pages/Parts";
import WorkOrder from "./pages/WorkOrder";
import Sidebar from "./components/Sidebar";
import menuIcon from "./assets/menu.png";
import logo2 from "./assets/logo2.png";
import "./App.css";
import { changePassword } from "./services/api";

function App() {
  // MODIFIED: Check localStorage immediately to prevent "flash" of unauthenticated state
  const [isAuth, setIsAuth] = useState(() => localStorage.getItem("auth") === "true");
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [username, setUsername] = useState("user");

    // NEW: State for change password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // We keep this to ensure state stays in sync
    const auth = localStorage.getItem("auth") === "true";
    setIsAuth(auth);

    const savedUser = localStorage.getItem("username");
    if (savedUser) setUsername(savedUser);

    const updateDateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'short', day: '2-digit', month: 'short', 
        year: 'numeric', hour: '2-digit', minute: '2-digit', 
        second: '2-digit', hour12: false 
      };
      setTime(now.toLocaleString('en-GB', options).replace(',', ''));
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = (name) => {
    localStorage.setItem("auth", "true");
    localStorage.setItem("username", name || "admin");
    setIsAuth(true);
    setUsername(name || "admin");
    navigate("/dashboard"); // Redirect after login
  };

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to exit?")) {
      localStorage.removeItem("auth");
      localStorage.removeItem("username");
      setIsAuth(false);
      setSidebarOpen(false);
      navigate("/login");
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    setPasswordError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("All fields must be filled");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordError("Both fields must be filled");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match");
      return;
    }

    try {
      const result = await changePassword(username, oldPassword, newPassword);
      // Check for "status" === "success" (not result.success)
      if (result.status === "success") {
        alert("Password changed successfully, please log in again!");

        localStorage.removeItem("auth");
        localStorage.removeItem("username");
        setIsAuth(false);
        setSidebarOpen(false);
        setShowUserMenu(false);

        setShowUserMenu(false);
        setOldPassword(""); // Reset field
        setNewPassword("");
        setConfirmPassword("");
      } else {
        // If API returns an error message, show it
        setPasswordError(result.detail || "Failed to change password");
      }
    } catch (error) {
      console.error("Change Password Error:", error);
      setPasswordError("Failed to change password. Please try again.");
    }
  };

  if (!isAuth) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <div className="app-layout">
      {showUserMenu && (
        <div className="user-menu-overlay" onClick={() => setShowUserMenu(false)}></div>
      )}

      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <img src={menuIcon} alt="Menu" />
          </button>
          <img src={logo2} alt="Company Logo" className="topbar-logo" />
        </div>
        
        <div className="topbar-right">
          <div className="user-profile-container">
            <span>Welcome, 
              <strong className="interactive-user" onClick={() => setShowUserMenu(!showUserMenu)}> 
                {username}!
              </strong>
            </span>
            {showUserMenu && (
              <div className="user-dropdown-message">
                <h4 className="password-title">Change Password</h4>
                <input 
                  type="text" // Use type="password" for security
                  placeholder="Old Password" 
                  value={oldPassword} 
                  onChange={(e) => setOldPassword(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="New Password" 
                  value={newPassword} 
                  onChange={(e) => setNewPassword(e.target.value)} 
                />
                <input 
                  type="text" 
                  placeholder="Confirm Password" 
                  value={confirmPassword} 
                  onChange={(e) => setConfirmPassword(e.target.value)} 
                />
                {passwordError && <p className="error-text">{passwordError}</p>}
                <div className="dropdown-actions">
                  <button className="save-btn" onClick={handleChangePassword}>Save</button>
                </div>
              </div>
            )}
          </div>
          <div className="topbar-time">{time}</div>
        </div>
      </header>

      <div className={`main-container ${sidebarOpen ? 'sidebar-open' : ''}`}>
        <Sidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          // Sidebar will now use Links/NavLinks instead of onNavigate
          currentPage={location.pathname} 
          onLogout={handleLogout} 
        />

        <main className={`main-content ${sidebarOpen ? "shifted" : ""}`}>
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" />} />
            
            {/* ADDED: If logged in user hits /login manually, send to dashboard */}
            <Route path="/login" element={<Navigate to="/dashboard" />} />

            <Route path="/dashboard" element={<Dashboard username={username} />} />
            <Route path="/device" element={<Device />} />
            <Route path="/manpower" element={<ManPower />} />
            <Route path="/parts" element={<Parts />} />
            <Route path="/workorder" element={<WorkOrder />} />
            {/* Fallback route */}
            <Route path="*" element={<div>Page Not Found</div>} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default App;