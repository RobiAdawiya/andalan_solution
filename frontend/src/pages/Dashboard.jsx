import { useState, useEffect } from "react";
import { 
  Monitor, Users, Wrench, ClipboardList, Calendar, Activity, X, 
  Download, Zap, Thermometer, Gauge, Battery, TrendingUp, Cpu 
} from "lucide-react";
import StatCard from "../components/StatCard";
import "../styles/dashboard.css";

// API Imports
import { getMachineLogs, getProductList, getManpowerList, getProductLogs } from "../services/api";

export default function Dashboard() {
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [startDate, setStartDate] = useState("2025-08-05");
  const [endDate, setEndDate] = useState("2026-01-27");
  const [latestData, setLatestData] = useState({});
  const [counts, setCounts] = useState({ manpower: 0, parts: 0 });
  const [activePart, setActivePart] = useState("Scanning...");

  // --- 1. DATA FETCHING & SYNC ---
  const fetchDashboardData = async () => {
    try {
      const [machineLogs, manpowerData, partsData, productLogs] = await Promise.all([
        getMachineLogs(),
        getManpowerList(),
        getProductList(),
        getProductLogs()
      ]);

      // Pivot database logs ke format Key-Value untuk akses mudah
      const pivot = {};
      machineLogs.forEach((log) => {
        if (!(log.tag_name in pivot)) {
          pivot[log.tag_name] = log.tag_value;
        }
      });
      setLatestData(pivot);

      // Menentukan Active Part dari Product Logs
      const currentMachineId = pivot["machine_id"] || "Channe-Test1";
      const latestLog = productLogs.find(log => log.machine_name === currentMachineId);
      
      let currentPartName = "No Part Active";
      if (latestLog && (latestLog.action === 'start' || latestLog.action === 'Working')) {
          currentPartName = latestLog.name_product;
      }
      setActivePart(currentPartName);

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
    const interval = setInterval(fetchDashboardData, 5000); // Auto refresh setiap 5 detik
    return () => clearInterval(interval);
  }, []);

  // --- 2. DYNAMIC MAPPING (Merging UI & API Data) ---
  const devices = [
    {
      id: 1,
      name: "Machine 01",
      deviceName: latestData["machine_id"] || "Channe-Test1",
      status: latestData["WISE4010:Green_Lamp"] === "1" ? "Active" : "Warning",
      deviceStatus: latestData["Machine_Status"] || "OFFLINE",
      lastMaintenance: "2026-01-20", // Static/Placeholder
      uptime: "98.5%",
      
      // Power Meter Parameters (Fetched from API)
      voltage: `${latestData["PA330:Voltage"] || 0} V`,
      current: `${latestData["PA330:Current"] || 0} A`,
      power: `${latestData["PA330:Real_Power"] || 0} kW`,
      kwh: `${latestData["PA330:Energy"] || 0} kWh`,
      powerFactor: latestData["PA330:Power_Factor"] || "0.95",
      frequency: "50 Hz",
      temperature: `${latestData["WISE4010:Temperature"] || 0}°C`,
      pressure: "2.5 Bar",
      
      // Assignment Data
      assignedManPower: latestData["ManPower_Validation"] || "No Operator",
      assignedWorkOrder: latestData["Product_Validation"] || "No WO",
      assignedParts: activePart, 
      
      // UI Features: Timeline & History
      statusSummary: {
        running: "03:05:17", // Placeholder, idealnya dari kalkulasi log
        standby: "00:15:21",
        total: "04:06:38"
      },
      chartTimeline: [
        { start: "08:00", end: "10:00", status: "RUNNING", color: "#00BCD4" },
        { start: "10:00", end: "11:00", status: "STOP", color: "#FF5252" },
        { start: "11:00", end: "15:00", status: "RUNNING", color: "#00BCD4" },
        { start: "15:00", end: "18:00", status: "STAND BY", color: "#FFC107" },
      ],
      historyTable: [
        { 
            no: 1, 
            status: latestData["Machine_Status"] || "RUNNING", 
            from: "2025-08-05 05:00:00", 
            until: new Date().toLocaleString(), 
            manPower: latestData["ManPower_Validation"] || "N/A", 
            workOrder: latestData["Product_Validation"] || "N/A", 
            part: activePart 
        },
      ]
    }
  ];

  const stats = [
    { label: "Machine", count: devices.length, icon: <Monitor size={32} /> },
    { label: "Man Power", count: counts.manpower, icon: <Users size={32} /> },
    { label: "Parts Linked", count: counts.parts, icon: <Wrench size={32} /> },
    { label: "Work Order", count: 6, icon: <ClipboardList size={32} /> },
  ];

  // --- 3. HANDLERS ---
  const handleViewDetails = (device) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedDevice(null);
  };

  const handleExportData = () => {
    alert(`Exporting logs for ${selectedDevice.deviceName} from ${startDate} to ${endDate}`);
  };

  return (
    <>
      {/* Top Stats Cards */}
      <div className="stat-row">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* Main Grid Devices */}
      <div className="device-grid">
        {loading ? (
          <div className="loading-state">Syncing with IoT Gateway...</div>
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
                <div className="info-row"><Battery size={16} /> <span>Current: {device.current}</span></div>
                <div className="info-row"><TrendingUp size={16} /> <span>Power: {device.power}</span></div>
                <div className="info-row"><Thermometer size={16} /> <span>Temp: {device.temperature}</span></div>
                <div className="info-row"><Users size={16} /> <span>Operator: {device.assignedManPower}</span></div>
              </div>

              <button className="btn-view-details" onClick={() => handleViewDetails(device)}>
                View Details
              </button>
            </div>
          ))
        )}
      </div>

      {/* MODAL DETAIL (FULL FEATURES) */}
      {showDetailModal && selectedDevice && (
        <>
          <div className="modal-overlay" onClick={handleCloseModal}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Detail Analysis: {selectedDevice.deviceName}</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {/* Date Filter & Export */}
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
                {/* Left Side: Chart & Timeline */}
                <div className="chart-section">
                  <h3>Operation Timeline</h3>
                  <div className="status-summary">
                    <div className="status-box status-running-active">
                      <span className="status-label">● RUNNING</span>
                      <span className="status-time">{selectedDevice.statusSummary.running}</span>
                    </div>
                    <div className="status-box status-standby">
                      <span className="status-label">● STANDBY</span>
                      <span className="status-time">{selectedDevice.statusSummary.standby}</span>
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

                {/* Right Side: Detailed Sensor Info */}
                <div className="detail-section">
                  <h3>Validation & Sensor Data</h3>
                  <div className="detail-item-simple">
                    <span className="label">Operator Name</span>
                    <span className="value">{selectedDevice.assignedManPower}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Work Order (WO)</span>
                    <span className="value">{selectedDevice.assignedWorkOrder}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Active Part</span>
                    <span className="value" style={{fontWeight:'bold', color: '#007bff'}}>{selectedDevice.assignedParts}</span>
                  </div>

                  <h4 style={{ marginTop: '20px', color: '#0b4a8b' }}>Power Meter Data</h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="detail-item-simple">
                        <span className="label"><Zap size={14}/> Voltage</span>
                        <span className="value">{selectedDevice.voltage}</span>
                    </div>
                    <div className="detail-item-simple">
                        <span className="label"><Battery size={14}/> Current</span>
                        <span className="value">{selectedDevice.current}</span>
                    </div>
                    <div className="detail-item-simple">
                        <span className="label"><TrendingUp size={14}/> Power</span>
                        <span className="value">{selectedDevice.power}</span>
                    </div>
                    <div className="detail-item-simple">
                        <span className="label"><Zap size={14}/> Energy</span>
                        <span className="value">{selectedDevice.kwh}</span>
                    </div>
                    <div className="detail-item-simple">
                        <span className="label"><Activity size={14}/> PF</span>
                        <span className="value">{selectedDevice.powerFactor}</span>
                    </div>
                    <div className="detail-item-simple">
                        <span className="label"><Thermometer size={14}/> Temp</span>
                        <span className="value">{selectedDevice.temperature}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom: History Table */}
              <div className="history-table-section">
                <h3>Tabel History Status</h3>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>From</th>
                      <th>Until</th>
                      <th>Man Power</th>
                      <th>Work Order</th>
                      <th>RPO Number</th>
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
                        <td>WO-2387/I</td>
                        <td>{row.part}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseModal}>Close</button>
            </div>
          </div>
        </>
      )}
    </>
  );
}