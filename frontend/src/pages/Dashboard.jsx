import { useState, useEffect } from "react";
import { 
  Monitor, Users, Wrench, ClipboardList, Calendar, Activity, X, 
  Download, Zap, Thermometer, Gauge, Battery, TrendingUp, Cpu 
} from "lucide-react";
import StatCard from "../components/StatCard";
import "../styles/dashboard.css";
// API Imports
import { getMachineLogs, getProductList, getManpowerList } from "../services/api"; 

export default function Dashboard() {
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [startDate, setStartDate] = useState("2025-08-05");
  const [endDate, setEndDate] = useState("2026-01-27");
  const [latestData, setLatestData] = useState({});
  const [counts, setCounts] = useState({ manpower: 0, parts: 0 });

  // --- 1. DATA FETCHING & SYNC ---
  const fetchDashboardData = async () => {
    try {
      const [machineLogs, manpowerData, partsData] = await Promise.all([
        getMachineLogs(),
        getManpowerList(),
        getProductList()
      ]);

      // Pivot database logs ke format Key-Value
      const pivot = {};
      machineLogs.forEach((log) => {
        if (!(log.tag_name in pivot)) {
          pivot[log.tag_name] = log.tag_value;
        }
      });
      
      setLatestData(pivot);
      setCounts({
        manpower: manpowerData.length,
        parts: partsData.length
      });
      setLoading(false);
    } catch (error) {
      console.error("Sync Error:", error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  // --- 2. DYNAMIC MAPPING (Mengembalikan Fitur Lengkap) ---
  const devices = [
    {
      id: 1,
      name: "Machine 01",
      deviceName: latestData["machine_id"] || "Channe-Test1",
      status: latestData["WISE4010:Green_Lamp"] === "1" ? "Active" : "Warning",
      deviceStatus: latestData["Machine_Status"] || "OFFLINE",
      lastMaintenance: "2026-01-20",
      uptime: "98.5%",
      // Power Meter Parameters dari DB
      voltage: `${latestData["PA330:Voltage"] || 0} V`,
      current: `${latestData["PA330:Current"] || 0} A`,
      power: `${latestData["PA330:Real_Power"] || 0} kW`,
      kwh: `${latestData["PA330:Energy"] || 0} kWh`,
      powerFactor: latestData["PA330:Power_Factor"] || "0.95",
      frequency: "50 Hz",
      temperature: `${latestData["WISE4010:Temperature"] || 0}°C`,
      pressure: "2.5 Bar",
      runtime: "2,340 hrs",
      
      // Validation & Assignment
      assignedManPower: latestData["ManPower_Validation"] || "No Operator",
      assignedWorkOrder: latestData["Product_Validation"] || "No WO",
      assignedParts: "Belt",
      
      // UI Features: Timeline & History (Bisa di-map dari DB jika ada table status_history)
      statusSummary: {
        running: "03:05:17",
        standby: "00:15:21",
        total: "04:06:38"
      },
      chartTimeline: [
        { start: "08:00", end: "10:00", status: "RUNNING", color: "#00BCD4" },
        { start: "10:00", end: "11:00", status: "STOP", color: "#FF5252" },
        { start: "11:00", end: "15:00", status: "RUNNING", color: "#00BCD4" },
      ],
      historyTable: [
        { no: 1, status: "RUNNING", from: "2025-08-05 05:00:00", until: "2026-01-27 10:00:00", manPower: latestData["ManPower_Validation"], workOrder: latestData["Product_Validation"], part: "Belt" },
      ]
    }
  ];

  const stats = [
    { label: "Device Active", count: devices.length, icon: <Monitor size={32} /> },
    { label: "Man Power", count: counts.manpower, icon: <Users size={32} /> },
    { label: "Parts Linked", count: counts.parts, icon: <Wrench size={32} /> },
    { label: "Work Order", count: 6, icon: <ClipboardList size={32} /> },
  ];

  // --- 3. HANDLERS ---
  const handleViewDetails = (device) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
  };

  const handleExportData = () => {
    alert(`Exporting data for ${selectedDevice.name}...`);
  };

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
          devices.map((device) => (
            <div key={device.id} className="device-card-dashboard">
              <div className="device-card-header">
                <h3>{device.name}</h3>
                <span className={`device-badge status-${device.status.toLowerCase()}`}>
                  {device.deviceStatus}
                </span>
              </div>

              <div className="device-card-info">
                <div className="info-row"><Activity size={16} /> <span>Uptime: {device.uptime}</span></div>
                <div className="info-row"><Zap size={16} /> <span>Voltage: {device.voltage}</span></div>
                <div className="info-row"><TrendingUp size={16} /> <span>Power: {device.power}</span></div>
                <div className="info-row"><Thermometer size={16} /> <span>Temp: {device.temperature}</span></div>
                <div className="info-row"><Gauge size={16} /> <span>Pressure: {device.pressure}</span></div>
              </div>

              <button className="btn-view-details" onClick={() => handleViewDetails(device)}>
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETAIL (FITUR LENGKAP) */}
      {showDetailModal && selectedDevice && (
        <>
          <div className="modal-overlay" onClick={() => setShowDetailModal(false)}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Detail Analysis: {selectedDevice.name}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="history-section">
                <div className="date-range-container">
                  <div className="date-input-group">
                    <label>Start</label>
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                  </div>
                  <div className="date-input-group">
                    <label>End</label>
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                  </div>
                  <button className="btn-export" onClick={handleExportData}>
                    <Download size={18} /> Export Data
                  </button>
                </div>
              </div>

              <div className="content-grid">
                {/* Timeline Section */}
                <div className="chart-section">
                  <h3>Operation Timeline</h3>
                  <div className="status-summary">
                    <div className="status-box status-running-active">
                      <span className="status-label">● RUNNING</span>
                      <span className="status-time">{selectedDevice.statusSummary.running}</span>
                    </div>
                    <div className="status-box status-total">
                      <span className="status-label">● TOTAL</span>
                      <span className="status-time">{selectedDevice.statusSummary.total}</span>
                    </div>
                  </div>

                  <div className="timeline-chart">
                    <div className="timeline-bar">
                      {selectedDevice.chartTimeline.map((segment, idx) => (
                        <div
                          key={idx}
                          className="timeline-segment"
                          style={{ backgroundColor: segment.color, flex: 1 }}
                          title={`${segment.status}: ${segment.start} - ${segment.end}`}
                        />
                      ))}
                    </div>
                    <div className="timeline-labels">
                      <span>08:00</span><span>12:00</span><span>16:00</span><span>20:00</span>
                    </div>
                  </div>
                </div>

                {/* Info Section */}
                <div className="detail-section">
                  <h3>Validation & Sensor Data</h3>
                  <div className="detail-item-simple">
                    <span className="label">Operator</span>
                    <span className="value">{selectedDevice.assignedManPower}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Work Order</span>
                    <span className="value">{selectedDevice.assignedWorkOrder}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Voltage</span>
                    <span className="value">{selectedDevice.voltage}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Energy (Accumulated)</span>
                    <span className="value">{selectedDevice.kwh}</span>
                  </div>
                </div>
              </div>

              {/* History Table */}
              <div className="history-table-section">
                <h3>Tabel Aranged By Hour</h3>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>From</th>
                      <th>Until</th>
                      <th>Man Power</th>
                      <th>Work Order</th>
                      <th>Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDevice.historyTable.map((row, i) => (
                      <tr key={i}>
                        <td><span className={`table-status-badge ${row.status.toLowerCase()}`}>{row.status}</span></td>
                        <td>{row.from}</td>
                        <td>{row.until}</td>
                        <td>{row.manPower}</td>
                        <td>{row.workOrder}</td>
                        <td>{row.part}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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