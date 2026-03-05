import { useState, useEffect } from "react";
import { Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import { Expand, Shrink } from "lucide-react";
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
import Swal from "sweetalert2";
import { logoutUserAPI} from "./services/api";
import efortech_logo from "../efortech_logo.png"

function App() {
  const [isAuth, setIsAuth] = useState(() => sessionStorage.getItem("token") !== null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [time, setTime] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [username, setUsername] = useState("user");

  // NEW: State for change password
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // --- NEW: State for Fullscreen ---
  const [isFullscreen, setIsFullscreen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();

  // --- NEW: Fullscreen Logic ---
  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.error(`Error attempting to enable fullscreen: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const handleKeyDown = (e) => {
      if (e.key === "F11") {
        e.preventDefault(); 
        toggleFullScreen();
      }

      if (e.key === "Escape") {
        setShowUserMenu(false);

        const closeButton = document.querySelector('.modal-close, .btn-cancel');
        if (closeButton) {
          closeButton.click(); 
        }
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    // We keep this to ensure state stays in sync
    const hasToken = sessionStorage.getItem("token") !== null;
    setIsAuth(hasToken);

    const savedUser = sessionStorage.getItem("username");
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
    sessionStorage.setItem("username", name || "admin");
    setIsAuth(true);
    setUsername(name || "admin");
    navigate("/dashboard"); // Redirect after login
  };

 const handleLogout = async () => {
    const result = await Swal.fire({
      title: 'Exit Andalan Fluid System?',
      text: "Are you sure you want to logout?",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Logout',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    });

    if (result.isConfirmed) {
      try {
        await logoutUserAPI();
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("username");
        setIsAuth(false);
        setSidebarOpen(false);
        navigate("/login");
      } catch (error) {
        console.error("Logout failed:", error);
      }
    }
  };

  // Handle change password
  const handleChangePassword = async () => {
    setPasswordError("");

    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError("Error! All fields must be filled");
      return;
    }

    if (!newPassword || !confirmPassword) {
      setPasswordError("Error! Both fields must be filled");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Error! Passwords do not match");
      return;
    }

    if (oldPassword.trim() === newPassword.trim()) {
      setPasswordError("Error! New password cannot be the same as the old password");
      return; 
    }

    try {
      const result = await changePassword(username, oldPassword, newPassword);
      
      if (result.status === "success") {
        Swal.fire({
          title: 'Success!',
          text: 'Password changed successfully. Please log in again.',
          icon: 'success',
          confirmButtonText: 'OK'
        }).then(() => {
          sessionStorage.removeItem("token");
          sessionStorage.removeItem("username");
          setIsAuth(false);
          setSidebarOpen(false);
          setShowUserMenu(false);
          
          setOldPassword(""); 
          setNewPassword("");
          setConfirmPassword("");
        });
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
        <div 
          className="user-menu-overlay" 
          onClick={() => setShowUserMenu(false)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            zIndex: 998,
            cursor: "default"
          }}
        ></div>
      )}

      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={() => setSidebarOpen(!sidebarOpen)}>
            <img src={menuIcon} alt="Menu" />
          </button>
          <img src={logo2} alt="Company Logo" className="topbar-logo" />
        </div>
        
        <div className="topbar-right">
          {/* Add position: relative to the container */}
          <div className="user-profile-container" style={{ position: "relative" }}>
            <span>Welcome, 
              <strong className="interactive-user" onClick={() => setShowUserMenu(!showUserMenu)}> 
                {username}!
              </strong>
            </span>
            {showUserMenu && (
              <div 
                className="user-dropdown-message"
                style={{
                  position: "absolute",
                  top: "100%", // Pushes it right below the text
                  right: 0,    // Aligns it to the right edge
                  marginTop: "10px",
                  zIndex: 999, // Keeps it on top of everything
                  backgroundColor: "white",
                  boxShadow: "0px 4px 10px rgba(0,0,0,0.1)",
                  padding: "15px",
                  borderRadius: "8px"
                }}
              >
                <h4 className="password-title">Change Password</h4>
                <input 
                  type="text" 
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
          <button 
            onClick={toggleFullScreen}
            title={isFullscreen ? "Exit Fullscreen (Esc)" : "Fullscreen (F11)"}
            style={{ 
              background: 'none', 
              border: 'none', 
              cursor: 'pointer', 
              display: 'flex',
              alignItems: 'center',
              marginLeft: '15px', 
              color: '#333'
            }}
          >
            {isFullscreen ? <Shrink size={22} /> : <Expand size={22} />}
          </button>
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
        <main 
          className={`main-content ${sidebarOpen ? "shifted" : ""}`}
          style={{
            display: "flex",
            flexDirection: "column",
            minHeight: "calc(100vh - 60px)", 
            paddingBottom: "0" 
          }}
        >
          {/* wrap the Routes in a div with flex: 1. This forces the content area to grow and push the footer down! */}
          <div style={{ flex: 1 }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" />} />
              <Route path="/login" element={<Navigate to="/dashboard" />} />
              <Route path="/dashboard" element={<Dashboard username={username} />} />
              <Route path="/device" element={<Device />} />
              <Route path="/manpower" element={<ManPower />} />
              <Route path="/parts" element={<Parts />} />
              <Route path="/workorder" element={<WorkOrder />} />
              <Route path="*" element={<div>Page Not Found</div>} />
            </Routes>
          </div>

          {/* --- FOOTER --- */}
          <footer style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            height: "60px",       
            padding: "0 30px",        
            borderTop: "1px solid #e2e8f0",
            backgroundColor: "transparent",
            width: "100%",
            boxSizing: "border-box"   
          }}>
            <span style={{ color: "#64748b", fontSize: "16px", fontWeight: "700" }}>
              Andalan Fluid System By <strong>EFORTECH SOLUTION</strong>
            </span>
            
            <img 
               src={efortech_logo} 
              alt="efortech Logo" 
              style={{ 
                height: "28px", 
              }} 
            />
          </footer>
          {/* --- END FOOTER --- */}

        </main>
      </div>  
    </div>
  );
}

export default App;
