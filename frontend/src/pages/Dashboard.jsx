import { useState, useEffect } from "react";
import { Monitor, Users, Wrench, ClipboardList, Calendar, MapPin, Activity, X, Download, Zap, Thermometer, Gauge } from "lucide-react";
import StatCard from "../components/StatCard";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [startDate, setStartDate] = useState("2025-08-05");
  const [endDate, setEndDate] = useState("2025-08-05");
  const [chartData, setChartData] = useState([]);

  const stats = [
    { label: "Device", count: 6, icon: <Monitor size={32} /> },
    { label: "Man Power", count: 6, icon: <Users size={32} /> },
    { label: "Parts", count: 6, icon: <Wrench size={32} /> },
    { label: "Work Order", count: 6, icon: <ClipboardList size={32} /> },
  ];

  const devices = [
    {
      id: 1,
      name: "Device 1",
      status: "Active",
      location: "Area A",
      lastMaintenance: "2026-01-20",
      uptime: "98.5%",
      kwh: "1,245 kWh",
      temperature: "45°C",
      pressure: "2.5 Bar",
      runtime: "2,340 hrs",
      workOrders: 12,
      trend: [65, 70, 68, 75, 72, 78, 80],
      deviceName: "Channe-Test1",
      deviceStatus: "RUNNING",
      assignedManPower: "Erwin Mujiana",
      assignedWorkOrder: "WO-2024-001",
      assignedParts: "Belt",
      statusSummary: {
        running: "03:05:17",
        standby: "00:15:21",
        total: "04:06:38"
      },
      chartTimeline: [
        { start: "6 Aug", end: "03:05", status: "RUNNING", color: "#00BCD4" },
        { start: "03:05", end: "05:00", status: "STOP", color: "#FF5252" },
        { start: "05:00", end: "09:09", status: "RUNNING", color: "#00BCD4" },
        { start: "09:09", end: "12:09", status: "STAND BY", color: "#FFC107" },
        { start: "12:09", end: "15:09", status: "BYPASS", color: "#9E9E9E" },
        { start: "15:09", end: "18:09", status: "RUNNING", color: "#00BCD4" },
        { start: "18:09", end: "21:09", status: "RUNNING", color: "#00BCD4" },
        { start: "21:09", end: "6 Aug", status: "RUNNING", color: "#00BCD4" },
      ],
      historyTable: [
        { no: 1, status: "RUNNING", from: "2025-08-05 05:00:00", until: "2026-08-06 02:07:00", manPower: "Erwin Mujiana", workOrder: "WO-2024-001", part: "Belt" },
        { no: 2, status: "STANDBY", from: "2026-08-06 02:07:00", until: "2026-08-06 02:08:36", manPower: "Erwin Mujiana", workOrder: "N/A", part: "Belt" },
      ]
    },
    {
      id: 2,
      name: "Device 2",
      status: "Active",
      location: "Area B",
      lastMaintenance: "2026-01-18",
      uptime: "95.2%",
      kwh: "980 kWh",
      temperature: "42°C",
      pressure: "2.2 Bar",
      runtime: "1,890 hrs",
      workOrders: 8,
      trend: [60, 65, 63, 68, 70, 72, 75],
      deviceName: "Device 2",
      deviceStatus: "STANDBY",
      assignedManPower: "Jane Smith",
      assignedWorkOrder: "WO-2024-002",
      assignedParts: "Gasket",
      statusSummary: {
        running: "02:30:00",
        standby: "01:00:00",
        total: "03:30:00"
      },
      chartTimeline: [
        { start: "6 Aug", end: "09:00", status: "RUNNING", color: "#00BCD4" },
        { start: "09:00", end: "12:00", status: "STANDBY", color: "#FFC107" },
        { start: "12:00", end: "18:00", status: "RUNNING", color: "#00BCD4" },
      ],
      historyTable: [
        { no: 1, status: "RUNNING", from: "2025-08-05 06:00:00", until: "2026-08-06 09:00:00", manPower: "Jane Smith", workOrder: "WO-2024-002", part: "Gasket" },
        { no: 2, status: "STANDBY", from: "2026-08-06 09:00:00", until: "2026-08-06 10:00:00", manPower: "Jane Smith", workOrder: "N/A", part: "Gasket" },
      ]
    },
    {
      id: 3,
      name: "Device 3",
      status: "Warning",
      location: "Area C",
      lastMaintenance: "2026-01-15",
      uptime: "89.7%",
      kwh: "1,567 kWh",
      temperature: "58°C",
      pressure: "1.8 Bar",
      runtime: "3,120 hrs",
      workOrders: 15,
      trend: [70, 68, 65, 62, 60, 58, 55],
      deviceName: "Device 3",
      deviceStatus: "STOP",
      assignedManPower: "Bob Johnson",
      assignedWorkOrder: "WO-2024-003",
      assignedParts: "Bearing",
      statusSummary: {
        running: "01:00:00",
        standby: "00:30:00",
        total: "01:30:00"
      },
      chartTimeline: [
        { start: "6 Aug", end: "10:00", status: "STOP", color: "#FF5252" },
        { start: "10:00", end: "15:00", status: "RUNNING", color: "#00BCD4" },
      ],
      historyTable: [
        { no: 1, status: "STOP", from: "2025-08-05 08:00:00", until: "2026-08-06 10:00:00", manPower: "Bob Johnson", workOrder: "WO-2024-003", part: "Bearing" },
      ]
    },
    {
      id: 4,
      name: "Device 4",
      status: "Active",
      location: "Area D",
      lastMaintenance: "2026-01-22",
      uptime: "99.1%",
      kwh: "765 kWh",
      temperature: "38°C",
      pressure: "2.8 Bar",
      runtime: "1,234 hrs",
      workOrders: 5,
      trend: [75, 78, 80, 82, 85, 87, 90],
      deviceName: "Device 4",
      deviceStatus: "RUNNING",
      assignedManPower: "Sarah Wilson",
      assignedWorkOrder: "WO-2024-004",
      assignedParts: "Oil Filter",
      statusSummary: {
        running: "05:00:00",
        standby: "00:00:00",
        total: "05:00:00"
      },
      chartTimeline: [
        { start: "6 Aug", end: "6 Aug", status: "RUNNING", color: "#00BCD4" },
      ],
      historyTable: [
        { no: 1, status: "RUNNING", from: "2025-08-05 00:00:00", until: "2026-08-06 05:00:00", manPower: "Sarah Wilson", workOrder: "WO-2024-004", part: "Oil Filter" },
      ]
    },
  ];

  const handleViewDetails = (device) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
    setChartData(device.chartTimeline);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedDevice(null);
  };

  const handleExportData = () => {
    console.log("Export data for:", selectedDevice);
    alert("Export functionality will be implemented");
  };

  return (
    <>
      <div className="stat-row">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <div className="device-grid">
        {devices.map((device) => (
          <div key={device.id} className="device-card-dashboard">
            <div className="device-card-header">
              <h3>{device.name}</h3>
              <span className={`device-badge status-${device.status.toLowerCase()}`}>
                {device.status}
              </span>
            </div>

            <div className="device-card-info">
              <div className="info-row">
                <MapPin size={16} />
                <span>{device.location}</span>
              </div>
              <div className="info-row">
                <Activity size={16} />
                <span>Uptime: {device.uptime}</span>
              </div>
              <div className="info-row">
                <Calendar size={16} />
                <span>Last Maintenance: {device.lastMaintenance}</span>
              </div>
              <div className="info-row">
                <Zap size={16} />
                <span>Power: {device.kwh}</span>
              </div>
              <div className="info-row">
                <Thermometer size={16} />
                <span>Temp: {device.temperature}</span>
              </div>
              <div className="info-row">
                <Gauge size={16} />
                <span>Pressure: {device.pressure}</span>
              </div>
            </div>

            <button
              className="btn-view-details"
              onClick={() => handleViewDetails(device)}
            >
              View Details
            </button>
          </div>
        ))}
      </div>

      {showDetailModal && selectedDevice && (
        <>
          <div className="modal-overlay" onClick={handleCloseModal}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Detail Device</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="history-section">
                <div className="date-range-container">
                  <div className="date-input-group">
                    <label>Start</label>
                    <input 
                      type="date" 
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                    />
                  </div>
                  <div className="date-input-group">
                    <label>End</label>
                    <input 
                      type="date" 
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                    />
                  </div>
                  <button className="btn-export" onClick={handleExportData}>
                    <Download size={18} />
                    Export Data
                  </button>
                </div>
              </div>

              <div className="content-grid">
                <div className="chart-section">
                  <h3>Chart Data</h3>
                  
                  <div className="status-summary">
                    <div className="status-box status-running">
                      <span className="status-label">● STOP</span>
                    </div>
                    <div className="status-box status-running-active">
                      <span className="status-label">● RUNNING</span>
                      <span className="status-time">{selectedDevice.statusSummary.running}</span>
                    </div>
                    <div className="status-box status-standby">
                      <span className="status-label">● STAND BY</span>
                      <span className="status-time">{selectedDevice.statusSummary.standby}</span>
                    </div>
                    <div className="status-box status-bypass">
                      <span className="status-label">● BYPASS</span>
                    </div>
                    <div className="status-box status-total">
                      <span className="status-label">● TOTAL</span>
                      <span className="status-time">{selectedDevice.statusSummary.total}</span>
                    </div>
                  </div>

                  <div className="timeline-chart">
                    <div className="chart-header">
                      <span>Channe-Test1</span>
                    </div>
                    <div className="timeline-bar">
                      {selectedDevice.chartTimeline.map((segment, idx) => (
                        <div
                          key={idx}
                          className="timeline-segment"
                          style={{
                            backgroundColor: segment.color,
                            flex: 1,
                          }}
                          title={`${segment.status}: ${segment.start} - ${segment.end}`}
                        />
                      ))}
                    </div>
                    <div className="timeline-labels">
                      <span>6 Aug</span>
                      <span>03:05</span>
                      <span>06:00</span>
                      <span>09:09</span>
                      <span>12:09</span>
                      <span>15:09</span>
                      <span>18:09</span>
                      <span>21:09</span>
                      <span>6 Aug</span>
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Detail Data Device</h3>
                  <div className="detail-item-simple">
                    <span className="label">Name Device</span>
                    <span className="value">{selectedDevice.deviceName}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Device Status</span>
                    <span className="value">{selectedDevice.deviceStatus}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Manpower</span>
                    <span className="value">{selectedDevice.assignedManPower}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Work Order</span>
                    <span className="value">{selectedDevice.assignedWorkOrder}</span>
                  </div>
                  <div className="detail-item-simple">
                    <span className="label">Part</span>
                    <span className="value">{selectedDevice.assignedParts}</span>
                  </div>
                </div>
              </div>

              <div className="history-table-section">
                <h3>Tabel Aranged By Hour</h3>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>From</th>
                      <th>Until</th>
                      <th>Man Power Name</th>
                      <th>Work Power WO</th>
                      <th>RPO Number</th>
                      <th>Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDevice.historyTable.map((row) => (
                      <tr key={row.no}>
                        <td>
                          <span className={`table-status-badge ${row.status.toLowerCase()}`}>
                            {row.status}
                          </span>
                        </td>
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
              <button className="btn-cancel" onClick={handleCloseModal}>
                Close
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
