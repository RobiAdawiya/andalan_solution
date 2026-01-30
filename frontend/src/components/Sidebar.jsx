import { Home, Monitor, Users, Wrench, ClipboardList, LogOut, ChevronUp, ChevronDown } from "lucide-react";
import { useState } from "react";
import "../styles/sidebar.css";

export default function Sidebar({ isOpen, onClose, onNavigate, currentPage, onLogout }) {
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleNavigation = (page) => {
    onNavigate(page);
    onClose();
  };

  const handleSavePassword = () => {
    if (newPassword === confirmPassword && newPassword.length > 0) {
      alert("Password berhasil diubah!");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    } else {
      alert("Password tidak cocok atau kosong!");
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="sidebar-overlay" onClick={onClose}></div>
      <div className="sidebar">
        <div className="sidebar-content">
          <div className="sidebar-section">
            <button 
              className={`sidebar-item ${currentPage === "dashboard" ? "active" : ""}`}
              onClick={() => handleNavigation("dashboard")}
            >
              <Home size={20} />
              <span>Dashboard</span>
            </button>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-label">DATA</h3>
            <button 
              className={`sidebar-item ${currentPage === "device" ? "active" : ""}`}
              onClick={() => handleNavigation("device")}
            >
              <Monitor size={20} />
              <span>Device</span>
            </button>
            <button 
              className={`sidebar-item ${currentPage === "manpower" ? "active" : ""}`}
              onClick={() => handleNavigation("manpower")}
            >
              <Users size={20} />
              <span>Man Power</span>
            </button>
          </div>

          <div className="sidebar-section">
            <h3 className="sidebar-label">WORK</h3>
            <button 
              className={`sidebar-item ${currentPage === "parts" ? "active" : ""}`}
              onClick={() => handleNavigation("parts")}
            >
              <Wrench size={20} />
              <span>Parts</span>
            </button>
            <button 
              className={`sidebar-item ${currentPage === "workorder" ? "active" : ""}`}
              onClick={() => handleNavigation("workorder")}
            >
              <ClipboardList size={20} />
              <span>Work Order</span>
            </button>
          </div>
        </div>

        {/* Updated Sidebar Footer with Log Out */}
        <div className="sidebar-footer">
          {/* Settings / Password Toggle
          <button 
            className="sidebar-user" 
            onClick={() => setShowPasswordForm(!showPasswordForm)}
            style={{ marginBottom: '10px' }}
          >
            <span style={{ fontSize: '0.9rem' }}>Account Settings</span>
            {showPasswordForm ? <ChevronDown size={16} /> : <ChevronUp size={16} />}
          </button> */}

          {showPasswordForm && (
            <div className="password-form">
              <h4 className="password-title">Change Password</h4>
              <input
                type="password"
                placeholder="New"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="password-input"
              />
              <input
                type="password"
                placeholder="Confirm"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="password-input"
              />
              <button className="save-btn" onClick={handleSavePassword}>
                Save
              </button>
            </div>
          )}

          {/* NEW LOG OUT BUTTON */}
          <button className="sidebar-item logout-sidebar-btn" onClick={onLogout}>
            <LogOut size={20} color="#ff4d4d" />
            <span style={{ color: '#ff4d4d', fontWeight: 'bold' }}>Log Out</span>
          </button>
        </div>
      </div>
    </>
  );
}