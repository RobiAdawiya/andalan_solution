import { useState, useEffect } from "react";
import { Monitor, Users, Wrench, ClipboardList, Activity, X, Zap, Thermometer, Gauge, Cpu } from "lucide-react";
import StatCard from "../components/StatCard";
import "../styles/dashboard.css";
// Import API yang dibutuhkan untuk menghitung jumlah data
import { getMachineLogs, getProductLogs,getProductList, getManpowerList } from "../services/api"; 

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [latestData, setLatestData] = useState({});
  const [showDetailModal, setShowDetailModal] = useState(false);
  
  // State untuk menyimpan jumlah (count) dari page lain
  const [counts, setCounts] = useState({
    manpower: 0,
    parts: 0
  });

  // --- 1. SINKRONISASI DATA (LOG MACHINE & COUNTS) ---
  const fetchData = async () => {
    try {
      // Ambil data log machine untuk box detail
      const machineLogs = await getMachineLogs(); 
      
      // Pivot data log machine (ambil data terbaru)
      const pivot = {};
      machineLogs.forEach((log) => {
        if (!(log.tag_name in pivot)) {
          pivot[log.tag_name] = log.tag_value;
        }
      });
      setLatestData(pivot);

      // Ambil data Man Power untuk menghitung jumlahnya
      const manpowerData = await getManpowerList();
      
      // Ambil data Parts (Product Logs) untuk menghitung jumlahnya
      const partsData = await getProductList();

      setCounts({
        manpower: manpowerData.length,
        parts: partsData.length
      });

      setLoading(false);
    } catch (error) {
      console.error("Gagal sinkronisasi data dashboard:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh otomatis setiap 5 detik
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. MAPPING DYNAMICS (IoT Tags) ---
  const machine01 = {
    name: "Machine 01",
    status: latestData["Machine_Status"] || "OFFLINE",
    validation: latestData["Validation_Status"] || "N/A",
    manpower: latestData["ManPower_Validation"] || "No Operator",
    product: latestData["Product_Validation"] || "No Work Order",
    energy: latestData["PA330:Energy"] ? `${latestData["PA330:Energy"]} kWh` : "0 kWh",
    temp: latestData["WISE4010:Temperature"] ? `${latestData["WISE4010:Temperature"]}°C` : "0°C",
    power: latestData["PA330:Real_Power"] ? `${latestData["PA330:Real_Power"]} W` : "0 W",
    voltage: latestData["PA330:Voltage"] || "0",
    current: latestData["PA330:Current"] || "0",
    isGreen: latestData["WISE4010:Green_Lamp"] === "1",
    isRed: latestData["WISE4010:Red_Lamp"] === "1",
    isEmergency: latestData["WISE4050:PB_EMG"] === "1"
  };

  // --- 3. STATISTIK (Dinamis dari Page Manpower & Parts) ---
  const stats = [
    { label: "Device Active", count: 1, icon: <Monitor size={32} /> },
    { 
      label: "Man Power", 
      count: counts.manpower, // Diambil dari jumlah data di page Manpower
      icon: <Users size={32} /> 
    },
    { 
      label: "Parts Linked", 
      count: counts.parts, // Diambil dari jumlah data di page Parts
      icon: <Wrench size={32} /> 
    },
    { 
      label: "Current WO", 
      count: 6, // Statis sesuai permintaan
      icon: <ClipboardList size={32} /> 
    },
  ];

  return (
    <>
      <div className="stat-row">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <div className="device-grid">
        {loading ? (
          <div className="loading-state">Syncing with PostgreSQL...</div>
        ) : (
          <div className="device-card-dashboard">
            <div className="device-card-header">
              <h3>{machine01.name}</h3>
              <span className={`device-badge status-${machine01.isGreen ? "active" : machine01.isRed ? "stop" : "offline"}`}>
                {machine01.status}
              </span>
            </div>

            <div className="device-card-info">
              <div className="info-row">
                <Cpu size={18} color="#3b82f6" />
                <span>ID: {latestData["machine_id"] || "machine_01"}</span>
              </div>

              <div className="info-row">
                <Activity size={18} color="#3b82f6" />
                <span>Validation: <strong>{machine01.validation}</strong></span>
              </div>

              <div className="info-row">
                <Zap size={18} color="#3b82f6" />
                <span>Energy: {machine01.energy}</span>
              </div>

              <div className="info-row">
                <Thermometer size={18} color="#3b82f6" />
                <span>Temp: {machine01.temp}</span>
              </div>

              <div className="info-row">
                <Gauge size={18} color="#3b82f6" />
                <span>Real Power: {machine01.power}</span>
              </div>
            </div>

            <button className="btn-view-details" onClick={() => setShowDetailModal(true)}>
              View Details
            </button>
          </div>
        )}
      </div>

      {/* MODAL DETAIL */}
      {showDetailModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Machine Sensor Logs (Live)</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="content-grid">
                <div className="chart-section">
                  <h3>Hardware Status</h3>
                  <div className="status-summary">
                    <div className={`status-box ${machine01.isRed ? "status-running" : ""}`}>
                      <span className="status-label">● RED LAMP</span>
                    </div>
                    <div className={`status-box ${machine01.isGreen ? "status-running-active" : ""}`}>
                      <span className="status-label">● GREEN LAMP</span>
                    </div>
                  </div>

                  <div className="electrical-data" style={{ marginTop: '20px' }}>
                    <div className="detail-item-simple">
                      <span className="label">Voltage</span>
                      <span className="value">{machine01.voltage} V</span>
                    </div>
                    <div className="detail-item-simple">
                      <span className="label">Current</span>
                      <span className="value">{machine01.current} A</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Validation Details</h3>
                  <div className="detail-item-simple">
                    <span className="label">Operator</span>
                    <span className="value">{machine01.manpower}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Active WO</span>
                    <span className="value">{machine01.product}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Contactor</span>
                    <span className="value">{latestData["WISE4010:Contactor"] === "1" ? "ON" : "OFF"}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Emergency</span>
                    <span className="value" style={{ color: machine01.isEmergency ? "red" : "green" }}>
                      {machine01.isEmergency ? "⚠️ PRESSED" : "NORMAL"}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowDetailModal(false)}>Close</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}