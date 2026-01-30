import { useState, useEffect } from "react";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Device from "./pages/Device";
import ManPower from "./pages/ManPower";
import Parts from "./pages/Parts";
import WorkOrder from "./pages/WorkOrder";
import Sidebar from "./components/Sidebar";
import menuIcon from "./assets/menu.png";
import "./App.css";
import logo2 from "./assets/logo2.png";

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Updated Timestamp Logic
  const [time, setTime] = useState("");
  const [showUserMenu, setShowUserMenu] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("auth") === "true";
    setIsAuth(auth);

    const updateDateTime = () => {
      const now = new Date();
      const options = { 
        weekday: 'short', 
        day: '2-digit', 
        month: 'short', 
        year: 'numeric',
        hour: '2-digit', 
        minute: '2-digit', 
        second: '2-digit',
        hour12: false 
      };
      // Result: "Fri, 30 Jan 2026 15:30:05"
      setTime(now.toLocaleString('en-GB', options).replace(',', ''));
    };

    updateDateTime();
    const timer = setInterval(updateDateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLogin = () => {
    localStorage.setItem("auth", "true");
    setIsAuth(true);
  };

  const handleLogout = () => {
    localStorage.removeItem("auth");
    setIsAuth(false);
    setCurrentPage("dashboard");
  };

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const renderPage = () => {
    switch(currentPage) {
      case "dashboard": return <Dashboard />;
      case "device": return <Device />;
      case "manpower": return <ManPower />;
      case "parts": return <Parts />;
      case "workorder": return <WorkOrder />;
      default: return <Dashboard />;
    }
  };

  if (!isAuth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      <header className="topbar">
        <div className="topbar-left">
          <button className="menu-btn" onClick={toggleSidebar}>
            <img src={menuIcon} alt="Menu" />
          </button>
          <img src={logo2} alt="Company Logo" className="topbar-logo" />
        </div>
        
        <div className="topbar-right">
          <div className="user-profile-container">
            <span>Welcome, 
              <strong 
                className="interactive-user" 
                onClick={() => setShowUserMenu(!showUserMenu)}
              > user!</strong>
            </span>
            
            {showUserMenu && (
              <div className="user-dropdown-message">
                <input type="password" placeholder="New Password" />
                <input type="password" placeholder="Confirm Password" />
                <button className="save-btn" onClick={() => setShowUserMenu(false)}>Save</button>
              </div>
            )}
          </div>

          {/* This button still triggers logout */}
          <button className="logout-btn" onClick={handleLogout}>
            {time}
          </button>
        </div>
      </header>

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
        onLogout={handleLogout} // ADD THIS PROP
      />

      <main className="page-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;