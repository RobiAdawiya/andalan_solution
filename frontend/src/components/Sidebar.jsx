import { Home, Monitor, Users, Wrench, ClipboardList, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom"; // 1. Import useNavigate
import "../styles/sidebar.css";

// Remove onNavigate from props, we will use the hook instead
export default function Sidebar({ isOpen, onClose, currentPage, onLogout }) {
  
  const navigate = useNavigate(); // 2. Initialize the hook

  const handleNavigation = (path) => {
    navigate(path); // 3. Use navigate to change URL
    
    // Jika di mobile, tutup sidebar setelah klik menu
    if (window.innerWidth <= 768) {
      onClose();
    }
  };

  return (
    <div className={`sidebar ${isOpen ? "open" : ""}`}>
      <div className="sidebar-content">
        {/* SECTION: DASHBOARD */}
        <div className="sidebar-section">
          <button 
            // 4. Compare with the slash (/) because currentPage comes from location.pathname
            className={`sidebar-item ${currentPage === "/dashboard" ? "active" : ""}`}
            onClick={() => handleNavigation("/dashboard")}
          >
            <Home size={20} />
            <span>Dashboard</span>
          </button>
        </div>

        {/* SECTION: DATA */}
        <div className="sidebar-section">
          <h3 className="sidebar-label">DATA</h3>
          <button 
            className={`sidebar-item ${currentPage === "/device" ? "active" : ""}`}
            onClick={() => handleNavigation("/device")}
          >
            <Monitor size={20} />
            <span>Device</span>
          </button>
          <button 
            className={`sidebar-item ${currentPage === "/manpower" ? "active" : ""}`}
            onClick={() => handleNavigation("/manpower")}
          >
            <Users size={20} />
            <span>Man Power</span>
          </button>
        </div>

        {/* SECTION: WORK */}
        <div className="sidebar-section">
          <h3 className="sidebar-label">WORK</h3>
          <button 
            className={`sidebar-item ${currentPage === "/parts" ? "active" : ""}`}
            onClick={() => handleNavigation("/parts")}
          >
            <Wrench size={20} />
            <span>Parts</span>
          </button>
          <button 
            className={`sidebar-item ${currentPage === "/workorder" ? "active" : ""}`}
            onClick={() => handleNavigation("/workorder")}
          >
            <ClipboardList size={20} />
            <span>Work Order</span>
          </button>
        </div>
      </div>

      {/* FOOTER: LOGOUT */}
      <div className="sidebar-footer">
        <button className="sidebar-item logout-sidebar-btn" onClick={onLogout}>
          <LogOut size={20} color="#ff4d4d" />
          <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>Log Out</span>
        </button>
      </div>
    </div>
  );
}