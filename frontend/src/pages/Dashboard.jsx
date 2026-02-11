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
// TimelineCard dihapus karena kita render manual untuk fitur tooltip
// import TimelineCard from "../components/TimelineCard"; 

// API Imports
import { getMachineLogs, getProductList, getManpowerList, getProductLogs, getFilteredMachineLogs, getDeviceList, getMachineStatusEvents } from "../services/api";

const STATUS_CONFIG = {
  2.0: { label: "RUNNING", color: "#00BCD4" }, // Cyan/Teal
  1.0: { label: "STANDBY", color: "#FFC107" }, // Amber/Yellow
  0.0: { label: "STOP", color: "#FF5252" },    // Red
  "NO DATA": { label: "NO DATA", color: "#e0e0e0" } // Grey
};

const getStatusStyle = (val) => {
  const numVal = parseFloat(val);
  return STATUS_CONFIG[numVal] || STATUS_CONFIG["0.0"]; 
};

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// --- KOMPONEN TOOLTIP (CUSTOM POP-UP) ---
const TimelineTooltip = ({ data, position, visible }) => {
  if (!visible || !data) return null;

  return (
    <div style={{
      position: 'fixed',
      top: position.y,
      left: position.x,
      transform: 'translate(-50%, -100%)',
      marginTop: '-12px', 
      zIndex: 9999,
      backgroundColor: 'white',
      padding: '12px',
      borderRadius: '8px',
      boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
      border: '1px solid #e5e7eb',
      pointerEvents: 'none',
      minWidth: '220px',
      fontFamily: 'sans-serif',
      fontSize: '13px',
      color: '#374151'
    }}>
      {/* Header Status */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', paddingBottom: '8px', borderBottom: '1px solid #f3f4f6' }}>
        <span style={{ 
          display: 'block', width: '10px', height: '10px', borderRadius: '50%', 
          backgroundColor: data.color 
        }}></span>
        <span style={{ fontWeight: 'bold', color: '#111827' }}>{data.status}</span>
      </div>
      
      {/* Waktu */}
      <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '4px 12px', marginBottom: '8px' }}>
         <span style={{ color: '#6b7280', fontWeight: '500' }}>Start:</span> 
         <span style={{ textAlign: 'right', fontFamily: 'monospace' }}>{data.start.toLocaleString('id-ID')}</span>
         
         <span style={{ color: '#6b7280', fontWeight: '500' }}>End:</span> 
         <span style={{ textAlign: 'right', fontFamily: 'monospace' }}>{data.end.toLocaleString('id-ID')}</span>
      </div>

      {/* Durasi */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f9fafb', padding: '6px', borderRadius: '4px', border: '1px solid #e5e7eb' }}>
        <span style={{ fontWeight: '600', color: '#4b5563', fontSize: '12px' }}>Duration:</span>
        <span style={{ fontWeight: 'bold', color: '#2563eb', fontFamily: 'monospace' }}>{data.formattedDuration}</span>
      </div>

      {/* Panah Bawah */}
      <div style={{ 
        position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', 
        width: '12px', height: '12px', backgroundColor: 'white', 
        borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' 
      }}></div>
    </div>
  );
};

export default function Dashboard() {
  // --- STATE MANAGEMENT ---
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]); 

  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
    
  const [startDate, setStartDate] = useState(getTodayDate());
  const [endDate, setEndDate] = useState(getTodayDate());

  const [comparisonStartDate, setComparisonStartDate] = useState(getTodayDate());
  const [comparisonEndDate, setComparisonEndDate] = useState(getTodayDate());
  const [showComparisonFilter, setShowComparisonFilter] = useState(false);
    
  const [counts, setCounts] = useState({ manpower: 0, parts: 0, machines: 0 });
  const [scrollPosition, setScrollPosition] = useState(0);
  const [maxScroll, setMaxScroll] = useState(0);

  // --- NEW STATE FOR TOOLTIP ---
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  // Helper: Parse UTC safely
  const parseUTC = (dateString) => {
    if (!dateString) return new Date();
    return new Date(dateString.endsWith("Z") ? dateString : dateString + "Z");
  };

  // Helper: Format Seconds to HH:MM:SS
  const formatTime = (seconds) => {
    if (seconds < 0) seconds = 0;
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // --- TOOLTIP HANDLERS ---
  const handleMouseEnterSegment = (e, segment) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    
    setTooltipData({
      ...segment,
      formattedDuration: formatTime(segment.duration)
    });
    
    setIsTooltipVisible(true);
  };

  const handleMouseLeaveSegment = () => {
    setIsTooltipVisible(false);
  };

  // Helper: Generate Labels
  // --- REVISI LOGIKA LABEL: Agar selalu mentok ke ujung waktu yang diminta (NOW) ---
  const generateDynamicTimeLabels = (timeline) => {
    let startObj, endObj;

    if (!timeline || timeline.length === 0) {
        startObj = new Date(startDate);
        endObj = new Date(endDate);
        if (startDate === endDate) endObj.setHours(23, 59, 59, 999);
    } else {
        // PERUBAHAN: Jangan filter "NO DATA". Ambil elemen pertama dan terakhir dari array
        // Fungsi 'calculateTimelineFromEvents' sudah menjamin timeline terisi penuh
        // dari jam 00:00 (atau start filter) sampai NOW (atau end filter)
        startObj = timeline[0].start;
        endObj = timeline[timeline.length - 1].end;
    }

    const totalDurationMs = endObj - startObj;
    const labels = [];
    const steps = 4; // Menghasilkan 5 label
    const interval = totalDurationMs / steps;

    for (let i = 0; i <= steps; i++) {
      const currentMs = startObj.getTime() + (interval * i);
      const dateObj = new Date(currentMs);
      
      const timeStr = `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
      const dateStr = `${dateObj.getDate()} ${dateObj.toLocaleString('default', { month: 'short' })}`;

      if (i === 0 || i === steps) {
          // Label Ujung (Batas)
          if (totalDurationMs <= 86400000 && startObj.getDate() === endObj.getDate()) {
             labels.push(timeStr);
          } else {
             labels.push(`${dateStr} ${timeStr}`);
          }
      } else {
          // Label Tengah
          if (totalDurationMs > 172800000) { 
             labels.push(`${dateStr} ${timeStr}`);
          } else {
             labels.push(timeStr); 
          }
      }
    }
    
    return labels;
  };

  const handleScroll = (direction) => {
    const container = document.querySelector('.device-grid-wrapper');
    if (!container) return;
    
    const scrollAmount = 300;
    if (direction === 'left') {
        container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    } else {
        container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // --- CORE LOGIC: CALCULATE TIMELINE (OPTIMIZED) ---
    const calculateTimelineFromEvents = (events, startObj, endObj) => {
      let runningTime = 0;
      let standbyTime = 0;
      let stopTime = 0;
      let segments = [];

      const validEvents = events.filter(e => {
          const t = parseUTC(e.created_at);
          return t <= endObj; 
      }).sort((a, b) => parseUTC(a.created_at) - parseUTC(b.created_at));

      if (validEvents.length === 0) {
          return {
              timeline: [{
                  start: startObj, 
                  end: endObj,
                  startFmt: startObj.toTimeString().slice(0, 5),
                  endFmt: endObj.toTimeString().slice(0, 5),
                  status: "NO DATA",
                  color: STATUS_CONFIG["NO DATA"].color,
                  duration: (endObj - startObj) / 1000
              }],
              summary: { running: formatTime(0), standby: formatTime(0), stop: formatTime(0), total: formatTime(0) }
          };
      }

      // 1. Cek Gap Awal 
      const firstEventTime = parseUTC(validEvents[0].created_at);
      if (firstEventTime > startObj) {
          segments.push({
              start: startObj,
              end: firstEventTime,
              startFmt: startObj.toTimeString().slice(0, 5),
              endFmt: firstEventTime.toTimeString().slice(0, 5),
              status: "NO DATA",
              color: STATUS_CONFIG["NO DATA"].color,
              duration: (firstEventTime - startObj) / 1000
          });
      }

      // 2. Loop Events
      for (let i = 0; i < validEvents.length; i++) {
          const currentEvent = validEvents[i];
          const nextEvent = validEvents[i + 1];

          let startTime = parseUTC(currentEvent.created_at);
          if (startTime < startObj) startTime = startObj;

          let endTime;
          if (nextEvent) {
              endTime = parseUTC(nextEvent.created_at);
          } else {
              endTime = endObj; 
          }

          if (startTime >= endTime) continue;

          const duration = (endTime - startTime) / 1000;
          const statusVal = parseFloat(currentEvent.machine_status || currentEvent.status);
          const style = getStatusStyle(statusVal);

          if (statusVal === 2.0) runningTime += duration;
          else if (statusVal === 1.0) standbyTime += duration;
          else stopTime += duration;

          segments.push({
              start: startTime,
              end: endTime,
              startFmt: startTime.toTimeString().slice(0, 5),
              endFmt: endTime.toTimeString().slice(0, 5),
              status: style.label,
              color: style.color,
              duration: duration
          });
      }

      return {
          timeline: segments,
          summary: {
              running: formatTime(runningTime),
              standby: formatTime(standbyTime),
              stop: formatTime(stopTime),
              total: formatTime(runningTime + standbyTime + stopTime)
          }
      };
    };

  useEffect(() => {
    const container = document.querySelector('.device-grid-wrapper');
    if (!container) return;
    
    const handleScrollUpdate = () => {
        setScrollPosition(container.scrollLeft);
        setMaxScroll(container.scrollWidth - container.clientWidth);
    };
    
    container.addEventListener('scroll', handleScrollUpdate);
    window.addEventListener('resize', handleScrollUpdate); 
    
    handleScrollUpdate();
    
    return () => {
        container.removeEventListener('scroll', handleScrollUpdate);
        window.removeEventListener('resize', handleScrollUpdate);
    };
  }, [devices]);

  // --- FETCH DATA ---
  const fetchDashboardData = async () => {
    try {
      // 1. Setup Time Main
      const startObj = new Date(startDate);
      startObj.setHours(0, 0, 0, 0);

      let endObj = new Date(endDate);
      const isTodayMain = new Date().toDateString() === endObj.toDateString();
      if (isTodayMain) endObj = new Date(); else endObj.setHours(23, 59, 59, 999);
      
      // Setup Time untuk Comparison Section
      const compStartObj = new Date(comparisonStartDate);
      compStartObj.setHours(0, 0, 0, 0);
      
      let compEndObj = new Date(comparisonEndDate);
      const isTodayComp = new Date().toDateString() === compEndObj.toDateString();
      
      // LOGIC DEFAULT: Jika hari ini (default), set akhir waktu ke SEKARANG (New Date).
      // Ini memastikan sumbu X paling kanan adalah "Jam Saat Ini"
      if (isTodayComp) {
        compEndObj = new Date(); 
      } else {
        compEndObj.setHours(23, 59, 59, 999);
      }
      
      // 2. Fetch API
      const [machineLogs, manpowerData, partsData, productLogs, registeredDevices] = await Promise.all([
              getMachineLogs(), 
              getManpowerList(),
              getProductList(),
              getProductLogs(),
              getDeviceList()
            ]);

      const timelinePromises = registeredDevices.map(device => 
          getMachineStatusEvents(device.machine_name)
      );
      const allEvents = await Promise.all(timelinePromises);
      
      const eventsByMachine = {};
      registeredDevices.forEach((dev, idx) => {
          eventsByMachine[dev.machine_name] = allEvents[idx];
      });

      const pivotByMachine = {};
      machineLogs.forEach((log) => {
        if (!pivotByMachine[log.machine_id]) pivotByMachine[log.machine_id] = {};
        pivotByMachine[log.machine_id][log.tag_name] = log.tag_value;
      });


      // 3. Map Devices
      const mappedDevices = registeredDevices.map((device, index) => {
        const machineId = device.machine_name;
        const currentData = pivotByMachine[machineId] || {};
        const rawStatus = currentData["Machine_Status"];
        const statusObj = getStatusStyle(rawStatus);
        const deviceEvents = eventsByMachine[machineId] || [];
        
        const mainTimeline = calculateTimelineFromEvents(deviceEvents, startObj, endObj);
        const compTimeline = calculateTimelineFromEvents(deviceEvents, compStartObj, compEndObj);

        // --- Active Manpower & Part Logic ---
        const deviceProductLogs = productLogs
        .filter(log => log.machine_name === machineId)
        .sort((a, b) => parseUTC(b.created_at) - parseUTC(a.created_at));
        
        let activePartName = "No Part Active";
        let activeManPowerName = "No Operator";
        
        const lastStartLog = deviceProductLogs.find(log => log.action === 'start');
        const lastStopLog = deviceProductLogs.find(log => log.action === 'stop');
        
        if (lastStartLog) {
            if (!lastStopLog || parseUTC(lastStartLog.created_at) > parseUTC(lastStopLog.created_at)) {
                activePartName = lastStartLog.name_product;
                activeManPowerName = lastStartLog.name_manpower;
            }
        }
        

        // --- HISTORY TABLE LOGIC ---
        const historyRows = [...mainTimeline.timeline]
            .reverse()
            .filter(seg => seg.status !== "NO DATA")
            .map((seg, i) => {
                let segmentManPower = "-";
                let segmentPart = "-";

                if (seg.status !== "STOP") {
                    const activeLogAtTime = deviceProductLogs.find(log => {
                        const logTime = parseUTC(log.created_at);
                        return logTime <= seg.start && log.action === "start";
                    });

                    if (activeLogAtTime) {
                          const stopLogAfterStart = deviceProductLogs.find(log => {
                            const logTime = parseUTC(log.created_at);
                            return logTime > parseUTC(activeLogAtTime.created_at) && logTime <= seg.start && log.action === "stop";
                          });

                          if (!stopLogAfterStart) {
                              segmentManPower = activeLogAtTime.name_manpower;
                              segmentPart = activeLogAtTime.name_product;
                          }
                    }
                }

                return {
                    no: i + 1,
                    status: seg.status,
                    from: seg.start.toLocaleString('id-ID'), 
                    until: seg.end.toLocaleString('id-ID'),
                    duration: formatTime(seg.duration),
                    manPower: segmentManPower,
                    part: segmentPart
                };
            });


        return {
          id: index + 1,
          name: device.machine_name.replace(/_/g, " ").toUpperCase(),
          deviceName: machineId,
          serialNumber: device.serial_number,
          
          status: currentData["WISE4010:Green_Lamp"] === "1" ? "Active" : "Warning",
          deviceStatus: statusObj.label,
          
          voltage: `${currentData["PA330:Voltage"] || 0} V`,
          current: `${currentData["PA330:Current"] || 0} A`,
          power: `${currentData["PA330:Real_Power"] || 0} kW`,
          kwh: `${currentData["PA330:Energy"] || 0} kWh`,
          powerFactor: currentData["PA330:Power_Factor"] || "0.0",
          temperature: `${currentData["WISE4010:Temperature"] || 0}°C`,
          
          assignedManPower: activeManPowerName, 
          assignedParts: activePartName,
          
          statusSummary: mainTimeline.summary,
          chartTimeline: mainTimeline.timeline,
          
          comparisonStatusSummary: compTimeline.summary,
          comparisonChartTimeline: compTimeline.timeline, 

          historyTable: historyRows 
        };
      });

      setCounts({
        manpower: manpowerData?.length || 0,
        parts: partsData?.length || 0,
        machines: registeredDevices?.length || 0
      });

      setDevices(mappedDevices);
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
  }, [startDate, endDate, comparisonStartDate, comparisonEndDate]);

  const stats = [
    { label: "Machine", count: counts.machines, icon: <Monitor size={32} /> },
    { label: "Man Power", count: counts.manpower, icon: <Users size={32} /> },
    { label: "Parts", count: counts.parts, icon: <Wrench size={32} /> },
    { label: "Work Order", count: 6, icon: <ClipboardList size={32} /> },
  ];

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
      const machineId = selectedDevice.deviceName || "machine_01";
      const logs = await getFilteredMachineLogs(startDate, endDate, machineId);
      if (!logs || logs.length === 0) {
        alert("No data found for the selected date range and machine.");
        return;
      }
      const csvHeaders = ["created_at", "machine_id", "tag_name", "tag_value", "recorded_at"];
      const csvRows = logs.map(log => [
        log.created_at,
        log.machine_id,
        log.tag_name,
        log.tag_value,
        log.recorded_at
      ]);
      const csvContent = [csvHeaders, ...csvRows]
        .map(row => row.map(field => `"${field}"`).join(",")) 
        .join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      const url = URL.createObjectURL(blob);
      link.setAttribute("href", url);
      link.setAttribute("download", `machine_logs_${machineId}_${startDate}_to_${endDate}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error("Export Error:", error);
    }
  };

  return (
    <>
      {/* --- RENDER CUSTOM TOOLTIP --- */}
      <TimelineTooltip 
        visible={isTooltipVisible} 
        data={tooltipData} 
        position={tooltipPos} 
      />

      <div className="stat-row">
        {stats.map((s, i) => (
          <StatCard key={i} {...s} />
        ))}
      </div>

      <div className="device-grid-container">
        {devices.length > 4 && scrollPosition > 0 && (
          <button className="scroll-button scroll-left" onClick={() => handleScroll('left')}><ChevronLeft size={20} /></button>
        )}
        
        <div className="device-grid-wrapper">
          <div className="device-grid">
            {loading ? (
              <div className="loading-state">Syncing with IoT Gateway...</div>
            ) : (
              devices.map((device) => (
                <DeviceCard key={device.id} device={device} onViewDetails={handleViewDetails} />
              ))
            )}
          </div>
        </div>
        
        {devices.length > 4 && scrollPosition < maxScroll && (
          <button className="scroll-button scroll-right" onClick={() => handleScroll('right')}><ChevronRight size={20} /></button>
        )}
      </div>

      {!loading && (
        <div className="timeline-comparison-section">
          <div className="comparison-header">
            <div className="comparison-controls">
              <button className="btn-filter-toggle" onClick={() => setShowComparisonFilter(!showComparisonFilter)}>
                <Calendar size={16} /> {showComparisonFilter ? 'Hide Filter' : 'Show Filter'}
              </button>
              <div className="comparison-date-display">
                <Calendar size={14} /> <span>{comparisonStartDate} to {comparisonEndDate}</span>
              </div>
            </div>
          </div>

          {showComparisonFilter && (
            <div className="comparison-filter-bar">
              <div className="filter-group">
                <label>Start Date</label>
                <input type="date" value={comparisonStartDate} onChange={(e) => setComparisonStartDate(e.target.value)} />
              </div>
              <div className="filter-group">
                <label>End Date</label>
                <input type="date" value={comparisonEndDate} onChange={(e) => setComparisonEndDate(e.target.value)} />
              </div>
            </div>
          )}

        {/* --- REVISI COMPARISON CONTAINER (Update Visual) --- */}
        <div className="comparison-container" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {devices.map((device) => (
             <div 
                key={device.id}
                style={{
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: '#F9F9F9',
                  borderRadius: '8px',
                  padding: '20px',
                  boxShadow: '0 2px 5px rgba(0, 0, 0, 0.05)',
                  borderLeft: '5px solid #00BCD4' 
                }}
             >
                {/* --- KOLOM KIRI: Identitas Mesin --- */}
                <div style={{ width: '180px', flexShrink: 0, paddingRight: '20px' }}>
                  <h3 style={{ margin: '0 0 8px 0', fontSize: '1rem', fontWeight: 'bold', color: '#333' }}>
                    {device.name}
                  </h3>
                  <span style={{ 
                    display: 'inline-block',
                    padding: '4px 12px',
                    borderRadius: '20px',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    backgroundColor: device.deviceStatus === 'RUNNING' ? '#E0F7FA' : (device.deviceStatus === 'STANDBY' ? '#FFF8E1' : '#FFEBEE'),
                    color: device.deviceStatus === 'RUNNING' ? '#006064' : (device.deviceStatus === 'STANDBY' ? '#FF6F00' : '#C62828')
                  }}>
                    {device.deviceStatus}
                  </span>
                </div>

                {/* --- KOLOM KANAN: Statistik & Timeline --- */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  
                  {/* 1. Baris Summary Statistik */}
                  <div style={{ display: 'flex', gap: '24px', marginBottom: '6px', fontSize: '11px', fontWeight: '700' }}>
                    
                    {/* RUN (Warna Teks Waktu Mengikuti Label) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ color: STATUS_CONFIG[2.0].color, marginBottom: '2px' }}>● RUN</span>
                       <span style={{ fontFamily: 'monospace', fontSize: '12px', color: STATUS_CONFIG[2.0].color }}>
                          {device.comparisonStatusSummary.running}
                       </span>
                    </div>

                    {/* STANDBY (Warna Teks Waktu Mengikuti Label) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ color: STATUS_CONFIG[1.0].color, marginBottom: '2px' }}>● STAND BY</span>
                       <span style={{ fontFamily: 'monospace', fontSize: '12px', color: STATUS_CONFIG[1.0].color }}>
                          {device.comparisonStatusSummary.standby}
                       </span>
                    </div>

                    {/* STOP (Warna Teks Waktu Mengikuti Label) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ color: STATUS_CONFIG[0.0].color, marginBottom: '2px' }}>● STOP</span>
                       <span style={{ fontFamily: 'monospace', fontSize: '12px', color: STATUS_CONFIG[0.0].color }}>
                          {device.comparisonStatusSummary.stop}
                       </span>
                    </div>

                    {/* TOTAL (Tetap Hitam/Abu Gelap untuk Pembeda) */}
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                       <span style={{ color: '#757575', marginBottom: '2px' }}>● TOTAL</span>
                       <span style={{ fontFamily: 'monospace', fontSize: '12px', color: '#757575' }}>
                          {device.comparisonStatusSummary.total}
                       </span>
                    </div>

                  </div>

                  {/* 2. Timeline Bar Visual (Lebih Kotak) */}
                  <div style={{ 
                    display: 'flex', 
                    width: '100%', 
                    height: '24px', 
                    borderRadius: '7px', 
                    overflow: 'hidden', 
                    backgroundColor: '#f8f9fa', 
                    position: 'relative'
                  }}>
                      {device.comparisonChartTimeline.map((segment, idx) => (
                        <div
                          key={idx}
                          style={{ 
                              backgroundColor: segment.color, 
                              flex: segment.duration,
                              position: 'relative',
                              opacity: segment.status === 'NO DATA' ? 0 : 1 
                          }}
                          onMouseEnter={(e) => handleMouseEnterSegment(e, segment)}
                          onMouseLeave={handleMouseLeaveSegment}
                        />
                      ))}
                  </div>

                  {/* 3. Label Waktu (Warna Hitam) */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '10px', color: '#000000', fontWeight: '500' }}>
                     {generateDynamicTimeLabels(device.comparisonChartTimeline).map((time, idx) => (
                        <span key={idx}>{time}</span>
                     ))}
                  </div>

                </div>
             </div>
          ))}
        </div>
        </div>
      )}

      {showDetailModal && selectedDevice && (
        <>
          <div className="modal-overlay" onClick={handleCloseModal}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>Detail Analysis: {selectedDevice.deviceName}</h2>
              <button className="modal-close" onClick={handleCloseModal}><X size={24} /></button>
            </div>

            <div className="modal-body">
              <div className="history-section">
                <div className="date-range-container">
                  <div className="date-input-group"><label>Start</label><input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} /></div>
                  <div className="date-input-group"><label>End</label><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></div>
                  <button className="btn-export" onClick={handleExportData}><Download size={18} /> Export Data</button>
                </div>
              </div>

              <div className="content-grid">
                <div className="chart-section">
                  <h3>Operation Timeline</h3>
                <div className="status-summary">
                  <div className="status-box" style={{color: STATUS_CONFIG[2.0].color}}>
                    <span className="status-label">● RUNNING</span><span className="status-time">{selectedDevice.statusSummary.running}</span>
                  </div>
                  <div className="status-box" style={{color: STATUS_CONFIG[1.0].color}}>
                    <span className="status-label">● STANDBY</span><span className="status-time">{selectedDevice.statusSummary.standby}</span>
                  </div>
                  <div className="status-box" style={{color: STATUS_CONFIG[0.0].color}}>
                    <span className="status-label">● STOP</span><span className="status-time">{selectedDevice.statusSummary.stop}</span>
                  </div>
                  <div className="status-box status-total">
                    <span className="status-label">● TOTAL</span><span className="status-time">{selectedDevice.statusSummary.total}</span>
                  </div>
                </div>
                  <div className="timeline-chart">
                  <div className="timeline-bar" style={{ display: 'flex', width: '100%' }}>
                    {selectedDevice.chartTimeline.map((segment, idx) => (
                      <div
                        key={idx}
                        className="timeline-segment"
                        style={{ 
                            backgroundColor: segment.color, 
                            flex: segment.duration 
                        }}
                        onMouseEnter={(e) => handleMouseEnterSegment(e, segment)}
                        onMouseLeave={handleMouseLeaveSegment}
                      />
                    ))}
                  </div>
                  <div className="timeline-labels">
                    {generateDynamicTimeLabels(selectedDevice.chartTimeline).map((time, idx) => (
                      <span key={idx}>{time}</span>
                    ))}
                  </div>
                  </div>
                </div>

                <div className="detail-section">
                   <h3>Validation & Sensor Data</h3>
                   <div className="detail-item-simple">
                      <span className="label">Active Operator</span><span className="value">{selectedDevice.assignedManPower}</span>
                   </div>
                   <div className="detail-item-simple">
                      <span className="label">Active Part</span><span className="value" style={{fontWeight:'bold', color: '#007bff'}}>{selectedDevice.assignedParts}</span>
                   </div>

                   <h4 style={{ marginTop: '20px', color: '#0b4a8b' }}>Power Meter Data</h4>
                   <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                    <div className="detail-item-simple"><span className="label"><Zap size={14}/> Voltage</span><span className="value">{selectedDevice.voltage}</span></div>
                    <div className="detail-item-simple"><span className="label"><Battery size={14}/> Current</span><span className="value">{selectedDevice.current}</span></div>
                    <div className="detail-item-simple"><span className="label"><TrendingUp size={14}/> Power</span><span className="value">{selectedDevice.power}</span></div>
                    <div className="detail-item-simple"><span className="label"><Zap size={14}/> Energy</span><span className="value">{selectedDevice.kwh}</span></div>
                    <div className="detail-item-simple"><span className="label"><Activity size={14}/> PF</span><span className="value">{selectedDevice.powerFactor}</span></div>
                    <div className="detail-item-simple"><span className="label"><Thermometer size={14}/> Temp</span><span className="value">{selectedDevice.temperature}</span></div>
                  </div>
                </div>
              </div>
              
              <div className="history-table-section">
                <h3>Tabel History Status</h3>
                <table className="history-table">
                  <thead><tr><th>No</th><th>Status</th><th>From</th><th>Until</th><th>Duration</th><th>Man Power</th><th>Part</th></tr></thead>
                  <tbody>
                    {selectedDevice.historyTable.map((row, i) => (
                      <tr key={i}>
                        <td>{row.no}</td>
                        <td><span className={`table-status-badge ${row.status === "RUNNING" ? "status-active" : "status-stop"}`}>{row.status}</span></td>
                        <td>{row.from}</td><td>{row.until}</td><td>{row.duration}</td><td>{row.manPower}</td><td>{row.part}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="modal-footer"><button className="btn-cancel" onClick={handleCloseModal}>Close</button></div>
          </div>
        </>
      )}
    </>
  );
}