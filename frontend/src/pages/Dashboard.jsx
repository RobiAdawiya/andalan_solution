import { useState } from "react";
import { Monitor, Users, Wrench, ClipboardList, TrendingUp, Calendar, MapPin, Activity, X } from "lucide-react";
import StatCard from "../components/StatCard";
import "../styles/dashboard.css";

export default function Dashboard() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

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
      temperature: "45°C",
      signalStrength: "Strong",
      workOrders: 12,
      trend: [65, 70, 68, 75, 72, 78, 80],
    },
    {
      id: 2,
      name: "Device 2",
      status: "Active",
      location: "Area B",
      lastMaintenance: "2026-01-18",
      uptime: "95.2%",
      temperature: "42°C",
      signalStrength: "Medium",
      workOrders: 8,
      trend: [60, 65, 63, 68, 70, 72, 75],
    },
    {
      id: 3,
      name: "Device 3",
      status: "Warning",
      location: "Area C",
      lastMaintenance: "2026-01-15",
      uptime: "89.7%",
      temperature: "52°C",
      signalStrength: "Weak",
      workOrders: 15,
      trend: [70, 68, 65, 62, 60, 58, 55],
    },
    {
      id: 4,
      name: "Device 4",
      status: "Active",
      location: "Area D",
      lastMaintenance: "2026-01-22",
      uptime: "99.1%",
      temperature: "40°C",
      signalStrength: "Strong",
      workOrders: 5,
      trend: [75, 78, 80, 82, 85, 87, 90],
    },
  ];

  const handleViewDetails = (device) => {
    setSelectedDevice(device);
    setShowDetailModal(true);
  };

  const handleCloseModal = () => {
    setShowDetailModal(false);
    setSelectedDevice(null);
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
            </div>

            <div className="device-mini-chart">
              <div className="chart-label">
                <TrendingUp size={16} />
                <span>Performance Trend</span>
              </div>
              <div className="mini-chart-bars">
                {device.trend.map((value, idx) => (
                  <div
                    key={idx}
                    className="chart-bar"
                    style={{
                      height: `${value}%`,
                      backgroundColor:
                        device.status === "Active"
                          ? "#4CAF50"
                          : device.status === "Warning"
                          ? "#FF9800"
                          : "#F44336",
                    }}
                  ></div>
                ))}
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

      {/* DETAIL MODAL */}
      {showDetailModal && selectedDevice && (
        <>
          <div className="modal-overlay" onClick={handleCloseModal}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>{selectedDevice.name} - Detailed Information</h2>
              <button className="modal-close" onClick={handleCloseModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="detail-grid">
                <div className="detail-section">
                  <h3>General Information</h3>
                  <div className="detail-item">
                    <span className="detail-label">Status:</span>
                    <span className={`device-badge status-${selectedDevice.status.toLowerCase()}`}>
                      {selectedDevice.status}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Location:</span>
                    <span className="detail-value">{selectedDevice.location}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Last Maintenance:</span>
                    <span className="detail-value">{selectedDevice.lastMaintenance}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Uptime:</span>
                    <span className="detail-value">{selectedDevice.uptime}</span>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Technical Metrics</h3>
                  <div className="detail-item">
                    <span className="detail-label">Temperature:</span>
                    <span className="detail-value">{selectedDevice.temperature}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Signal Strength:</span>
                    <span className="detail-value">{selectedDevice.signalStrength}</span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Work Orders:</span>
                    <span className="detail-value">{selectedDevice.workOrders}</span>
                  </div>
                </div>
              </div>

              <div className="detail-section full-width">
                <h3>Performance Trend (Last 7 Days)</h3>
                <div className="full-chart">
                  {selectedDevice.trend.map((value, idx) => (
                    <div key={idx} className="chart-column">
                      <div
                        className="chart-bar-large"
                        style={{
                          height: `${value}%`,
                          backgroundColor:
                            selectedDevice.status === "Active"
                              ? "#4CAF50"
                              : selectedDevice.status === "Warning"
                              ? "#FF9800"
                              : "#F44336",
                        }}
                      >
                        <span className="bar-value">{value}%</span>
                      </div>
                      <span className="chart-label-x">Day {idx + 1}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="detail-section full-width">
                <h3>Maintenance History</h3>
                <table className="maintenance-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Technician</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>2026-01-20</td>
                      <td>Preventive</td>
                      <td>John Doe</td>
                      <td><span className="status-badge completed">Completed</span></td>
                    </tr>
                    <tr>
                      <td>2026-01-15</td>
                      <td>Repair</td>
                      <td>Jane Smith</td>
                      <td><span className="status-badge completed">Completed</span></td>
                    </tr>
                    <tr>
                      <td>2026-01-10</td>
                      <td>Inspection</td>
                      <td>Bob Johnson</td>
                      <td><span className="status-badge completed">Completed</span></td>
                    </tr>
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
