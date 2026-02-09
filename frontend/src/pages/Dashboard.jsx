import { useState, useEffect } from "react";
import { 
  Monitor, Users, Wrench, ClipboardList, Calendar, 
  Activity, X, Download, Zap, Thermometer, Battery, TrendingUp, 
  ChevronLeft, ChevronRight 
} from "lucide-react";
import "../styles/dashboard.css";

// Component Imports
import StatCard from "../components/StatCard";
import DeviceCard from "../components/DeviceCard";
import TimelineCard from "../components/TimelineCard";

// API Imports
import { getMachineLogs, getProductList, getManpowerList, getProductLogs, getFilteredMachineLogs } from "../services/api";
// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0'); // Months are 0-indexed
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Dashboard() {
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());
  const [comparisonStartDate, setComparisonStartDate] = useState(getTodayDate());
  const [comparisonEndDate, setComparisonEndDate] = useState(getTodayDate());
  const [showComparisonFilter, setShowComparisonFilter] = useState(false);
  const [latestData, setLatestData] = useState({});
  const [counts, setCounts] = useState({ manpower: 0, parts: 0 });
  const [dynamicStatusSummary, setDynamicStatusSummary] = useState({
    running: "00:00:00",
    standby: "00:00:00",
    total: "00:00:00"
  });
  const [dynamicChartTimeline, setDynamicChartTimeline] = useState([]);
  
  const [comparisonStatusSummary, setComparisonStatusSummary] = useState({
    running: "00:00:00",
    standby: "00:00:00",
    total: "00:00:00"
  });
  const [comparisonChartTimeline, setComparisonChartTimeline] = useState([]);
  const [comparisonTimelineLabels, setComparisonTimelineLabels] = useState(["08:00", "12:00", "16:00", "20:00"]);

  // NEW: State for dynamic labels
  const [timelineLabels, setTimelineLabels] = useState(["08:00", "12:00", "16:00", "20:00"]);

  const [scrollPosition, setScrollPosition] = useState(0);

  const handleScroll = (direction) => {
    const container = document.querySelector('.device-grid-wrapper');
    if (!container) return;
    const containerWidth = container.offsetWidth;
    const scrollAmount = containerWidth;
    
    if (direction === 'left') {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // Helper function to format seconds to HH:MM:SS
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const container = document.querySelector('.device-grid-wrapper');
    if (!container) return;

    const handleScrollUpdate = () => {
      setScrollPosition(container.scrollLeft);
    };

    container.addEventListener('scroll', handleScrollUpdate);
    handleScrollUpdate();
    return () => container.removeEventListener('scroll', handleScrollUpdate);
  }, []);

  const fetchComparisonTimeline = async () => {
      try {
        const startFilter = new Date(comparisonStartDate);
        const endFilter = new Date(comparisonEndDate);
        endFilter.setHours(23, 59, 59, 999);

        const machineLogs = await getMachineLogs();

        const statusLogs = machineLogs
          .filter(log => log.tag_name === "Machine_Status")
          .filter(log => {
            const logDate = new Date(log.created_at);
            return logDate >= startFilter && logDate <= endFilter;
          })
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

        let runningTime = 0;
        let standbyTime = 0;
        const segments = [];

        for (let i = 0; i < statusLogs.length - 1; i++) {
          const current = statusLogs[i];
          const next = statusLogs[i + 1];
          const duration = (new Date(next.created_at) - new Date(current.created_at)) / 1000;

          const start = new Date(current.created_at).toTimeString().slice(0, 5);
          const end = new Date(next.created_at).toTimeString().slice(0, 5);
          let status, color;

          if (parseFloat(current.tag_value) === 1.0) {
            status = "RUNNING";
            color = "#00BCD4";
            runningTime += duration;
          } else {
            status = "STOP";
            color = "#FF5252";
            standbyTime += duration;
          }

          segments.push({ start, end, status, color });
        }

        // --- PERBAIKAN LOGIKA LABEL & TIMELINE ---
        if (statusLogs.length >= 1) {
          const firstTime = new Date(statusLogs[0].created_at);
          const lastTime = new Date(); 
          
          const labelCount = 5; 
          const newLabels = [];
          const intervalMs = (lastTime - firstTime) / (labelCount - 1);

          for (let i = 0; i < labelCount; i++) {
            const labelTime = new Date(firstTime.getTime() + (intervalMs * i));
            newLabels.push(labelTime.toTimeString().slice(0, 5));
          }
          setComparisonTimelineLabels(newLabels);
          
          const finalLog = statusLogs[statusLogs.length - 1];
          const finalDuration = (lastTime - new Date(finalLog.created_at)) / 1000;
          
          if (finalDuration > 0) {
            segments.push({
              start: new Date(finalLog.created_at).toTimeString().slice(0, 5),
              end: lastTime.toTimeString().slice(0, 5),
              status: parseFloat(finalLog.tag_value) === 1.0 ? "RUNNING" : "STOP",
              color: parseFloat(finalLog.tag_value) === 1.0 ? "#00BCD4" : "#FF5252"
            });
          }
        }

        const totalTime = runningTime + standbyTime;
        setComparisonStatusSummary({
          running: formatTime(runningTime),
          standby: formatTime(standbyTime),
          total: formatTime(totalTime)
        });
        setComparisonChartTimeline(segments);

      } catch (error) {
        console.error("Comparison Timeline Error:", error);
      }
    }; 

  // --- 1. DATA FETCHING & SYNC ---
  const fetchDashboardData = async () => {
    try {
      const startFilter = new Date(startDate);
      const endFilter = new Date(endDate);
      endFilter.setHours(23, 59, 59, 999);

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
          pivot["machine_id"] = log.machine_id;
        }
      });
      setLatestData(pivot);

      const currentMachineId = pivot["machine_id"] || "machine_01";
      
      
      // 2. Filter Logs for Stats/Counts (This remains dependent on Date Filter)
      const filteredProductLogs = productLogs.filter(log => {
        const logDate = new Date(log.created_at);
        return logDate >= startFilter && logDate <= endFilter;
      });

      setCounts({
        manpower: manpowerData.length,
        parts: partsData.length
      });

      // Process Machine_Status logs for dynamic statusSummary and chartTimeline with Date Filter
      const statusLogs = machineLogs
        .filter(log => log.tag_name === "Machine_Status")
        .filter(log => {
          const logDate = new Date(log.created_at);
          return logDate >= startFilter && logDate <= endFilter;
        })
        .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      let runningTime = 0;
      let standbyTime = 0; 
      const segments = [];

      for (let i = 0; i < statusLogs.length - 1; i++) {
        const current = statusLogs[i];
        const next = statusLogs[i + 1];
        const duration = (new Date(next.created_at) - new Date(current.created_at)) / 1000;

        const start = new Date(current.created_at).toTimeString().slice(0, 5);
        const end = new Date(next.created_at).toTimeString().slice(0, 5);
        let status, color;

        if (parseFloat(current.tag_value) === 1.0) {
          status = "RUNNING";
          color = "#00BCD4";
          runningTime += duration;
        } else {
          status = "STOP"; 
          color = "#FF5252";
          standbyTime += duration;
        }

        segments.push({ start, end, status, color });
      }

      // --- GENERATE DYNAMIC TIMELINE LABELS ---
      if (statusLogs.length >= 2) {
        const firstTime = new Date(statusLogs[0].created_at);
        const lastTime = new Date(statusLogs[statusLogs.length - 1].created_at);
        const labelCount = 5; 
        const newLabels = [];
        const intervalMs = (lastTime - firstTime) / (labelCount - 1);

        for (let i = 0; i < labelCount; i++) {
          const labelTime = new Date(firstTime.getTime() + (intervalMs * i));
          newLabels.push(labelTime.toTimeString().slice(0, 5));
        }
        setTimelineLabels(newLabels);
      }

      const totalTime = runningTime + standbyTime;
      setDynamicStatusSummary({
        running: formatTime(runningTime),
        standby: formatTime(standbyTime),
        total: formatTime(totalTime)
      });
      setDynamicChartTimeline(segments);

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
  }, [startDate, endDate]);

  // --- 2. DYNAMIC MAPPING (Merging UI & API Data) ---
  const devices = [
    {
      id: 1,
      name: "Machine 01",
      deviceName: latestData["machine_id"] || "Machine-01",
      status: latestData["WISE4010:Green_Lamp"] === "1" ? "Active" : "Warning",
      deviceStatus: parseFloat(latestData["Machine_Status"]) === 1.0 ? "RUNNING" : "STOP",
      lastMaintenance: "2026-01-20", 
      uptime: "98.5%",
      
      // Power Meter Parameters (Fetched from API)
      voltage: `${latestData["PA330:Voltage"] || 0} V`,
      current: `${latestData["PA330:Current"] || 0} A`,
      power: `${latestData["PA330:Real_Power"] || 0} kW`,
      kwh: `${latestData["PA330:Energy"] || 0} kWh`,
      powerFactor: latestData["PA330:Power_Factor"] || "0.95",
      temperature: `${latestData["WISE4010:Temperature"] || 0}°C`,
      
      // Assignment Data
      assignedManPower: latestData["ManPower_Validation"] || "No Operator",
      assignedParts: latestData["Product_Validation"] || "No Part Active",
      
      // UI Features: Timeline & History (Now Dynamic)
      statusSummary: dynamicStatusSummary,
      chartTimeline: dynamicChartTimeline,

      comparisonStatusSummary: comparisonStatusSummary,
      comparisonChartTimeline: comparisonChartTimeline,

      historyTable: [
        { 
            no: 1, 
            status: parseFloat(latestData["Machine_Status"]) === 1.0 ? "RUNNING" : "STOP", 
            from: startDate, 
            until: new Date().toLocaleString(), 
            manPower: latestData["ManPower_Validation"] || "N/A", 
            part: latestData["Product_Validation"] || "No Part Active" 
        },
      ]
    }
  ];

  const stats = [
    { label: "Machine", count: devices.length, icon: <Monitor size={32} /> },
    { label: "Man Power", count: counts.manpower, icon: <Users size={32} /> },
    { label: "Parts", count: counts.parts, icon: <Wrench size={32} /> },
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

  const handleExportData = async () => {
    if (!selectedDevice) return;

    try {
      // Get machine_id from selectedDevice (fallback to latestData if needed)
      const machineId = selectedDevice.deviceName || latestData["machine_id"] || "machine_01";

      // Fetch filtered logs
      const logs = await getFilteredMachineLogs(startDate, endDate, machineId);

      if (!logs || logs.length === 0) {
        alert("No data found for the selected date range and machine.");
        return;
      }

      // Convert to CSV
      const csvHeaders = ["created_at", "machine_id", "tag_name", "tag_value", "recorded_at"];
      const csvRows = logs.map(log => [
        log.created_at,
        log.machine_id,
        log.tag_name,
        log.tag_value,
        log.recorded_at
      ]);

      // Create CSV string
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(","))  // Escape commas/quotes
        .join("\n");

      // Create blob and download
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `machine_logs_${machineId}_${startDate}_to_${endDate}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      alert(`Exported ${logs.length} logs successfully!`);
    } catch (error) {
      console.error("Export Error:", error);
      alert("Failed to export data. Please try again.");
    }
  };
  return (
    <>
      {/* 1. STAT CARDS SECTION */}
      <div className="stat-row">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      {/* 2. DEVICE GRID SECTION */}
      <div className="device-grid-container">
        {scrollPosition > 0 && (
          <button 
            className="scroll-button scroll-left"
            onClick={() => handleScroll('left')}
            aria-label="Scroll Left"
          >
            <ChevronLeft size={20} />
          </button>
        )}

        <div className="device-grid-wrapper">
          <div className="device-grid">
            {loading ? (
              <div className="loading-state">Syncing with IoT Gateway...</div>
            ) : (
              devices.map((device) => (
                <DeviceCard 
                    key={device.id} 
                    device={device} 
                    onViewDetails={handleViewDetails} 
                />
              ))
            )}
          </div>
        </div>

        {(() => {
          const container = document.querySelector('.device-grid-wrapper');
          if (!container) return true;
          const maxScroll = container.scrollWidth - container.clientWidth;
          return scrollPosition < maxScroll - 10;
        })() && (
          <button 
            className="scroll-button scroll-right"
            onClick={() => handleScroll('right')}
            aria-label="Scroll Right"
          >
            <ChevronRight size={20} />
          </button>
        )}
      </div>

      {/* 3. TIMELINE COMPARISON SECTION */}
      {!loading && (
        <div className="timeline-comparison-section">
          <div className="comparison-header">
            <div className="comparison-controls">
              <button 
                className="btn-filter-toggle"
                onClick={() => setShowComparisonFilter(!showComparisonFilter)}
              >
                <Calendar size={16} />
                {showComparisonFilter ? 'Hide Filter' : 'Show Filter'}
              </button>
              <div className="comparison-date-display">
                <Calendar size={14} />
                <span>{comparisonStartDate} to {comparisonEndDate}</span>
              </div>
            </div>
          </div>

          {showComparisonFilter && (
            <div className="comparison-filter-bar">
              <div className="filter-group">
                <label>Start Date</label>
                <input 
                  type="date" 
                  value={comparisonStartDate} 
                  onChange={(e) => setComparisonStartDate(e.target.value)}
                />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input 
                  type="date" 
                  value={comparisonEndDate} 
                  onChange={(e) => setComparisonEndDate(e.target.value)}
                />
              </div>
              <button 
                className="btn-apply-filter"
                onClick={fetchComparisonTimeline}
              >
                Apply Filter
              </button>
            </div>
          )}

          <div className="comparison-container">
            {devices.map((device) => (
              <TimelineCard 
                  key={device.id} 
                  device={device} 
                  timelineLabels={comparisonTimelineLabels} 
              />
            ))}
          </div>
        </div>
      )}

      {/* 4. MODAL SECTION (Kept as is or can be components if needed later) */}
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
                      {timelineLabels.map((time, idx) => (
                        <span key={idx}>{time}</span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="detail-section">
                  <h3>Validation & Sensor Data</h3>
                  <div className="detail-item-simple">
                    <span className="label">Active Operator</span>
                    <span className="value">{selectedDevice.assignedManPower}</span>
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

              <div className="history-table-section">
                <h3>Tabel History Status</h3>
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>From</th>
                      <th>Until</th>
                      <th>Man Power</th>
                      <th>Part</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedDevice.historyTable.map((row, i) => (
                      <tr key={i}>
                        <td><span className={`table-status-badge ${row.status === "RUNNING" ? "status-active" : "status-stop"}`}>{row.status}</span></td>
                        <td>{row.from}</td>
                        <td>{row.until}</td>
                        <td>{row.manPower}</td>
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