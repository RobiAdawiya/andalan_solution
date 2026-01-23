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

function App() {
  const [isAuth, setIsAuth] = useState(false);
  const [currentPage, setCurrentPage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const auth = localStorage.getItem("auth") === "true";
    setIsAuth(auth);
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

  const renderPage = () => {
    switch(currentPage) {
      case "dashboard":
        return <Dashboard />;
      case "device":
        return <Device />;
      case "manpower":
        return <ManPower />;
      case "parts":
        return <Parts />;
      case "workorder":
        return <WorkOrder />;
      default:
        return <Dashboard />;
    }
  };

  if (!isAuth) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="app-layout">
      {/* ===== TOPBAR ===== */}
      <header className="topbar">
        <button className="menu-btn" onClick={() => setSidebarOpen(true)}>
          <img src={menuIcon} alt="Menu" />
        </button>

        <h1 className="topbar-title">
          {currentPage.toUpperCase()}
        </h1>

        <div className="topbar-right">
          <span>Welcome, user!</span>
          <button className="logout-btn" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </header>

      {/* ===== SIDEBAR ===== */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={setCurrentPage}
        currentPage={currentPage}
      />

      {/* ===== PAGE CONTENT ===== */}
      <main className="page-content">
        {renderPage()}
      </main>
    </div>
  );
}

export default App;