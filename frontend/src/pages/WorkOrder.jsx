import React, { useState, useEffect } from "react";
import { Search, X, HardDrive, Box, Filter, Clock, Download } from "lucide-react"; // <-- TAMBAH Download
import Swal from "sweetalert2";
import "../styles/workorder.css";
import BASE_URL from "../services/api";
import { formatToLocalTime } from "../utils/formatDate";

// --- MUI IMPORTS ---
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import dayjs from 'dayjs';

// --- CONFIG & HELPERS ---
const STATUS_CONFIG = {
  "WORKING": { label: "WORKING", color: "#2e7d32" },    
  "NO WORKING": { label: "NO WORKING", color: "#c62828" }, 
  "PENDING": { label: "NO DATA", color: "#E5E7EB" }, 
  "NO_DATA": { label: "NO DATA", color: "#E5E7EB" }
};

const formatTime = (seconds) => {
  if (seconds < 0) seconds = 0;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

const generateDynamicTimeLabels = (startStr, endStr) => {
  const startObj = new Date(startStr);
  const endObj = new Date(endStr);
  if (isNaN(startObj) || isNaN(endObj)) return [];

  const isSameDay = startObj.toDateString() === endObj.toDateString();
  const totalDurationMs = endObj - startObj;
  const labels = [];
  const steps = 4; 
  const interval = totalDurationMs / steps;

  for (let i = 0; i <= steps; i++) {
    const currentMs = startObj.getTime() + (interval * i);
    const dateObj = new Date(currentMs);
    const timeStr = dateObj.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false });
    
    if (isSameDay) {
        labels.push(timeStr);
    } else {
        const dateStr = dateObj.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
        labels.push(`${dateStr} ${timeStr}`);
    }
  }
  return labels;
};

const groupPartsByProduct = (parts) => {
  const grouped = {};
  if (!parts) return grouped;
  parts.forEach(p => {
      const prodName = p.name || "Unknown Product";
      if (!grouped[prodName]) grouped[prodName] = [];
      grouped[prodName].push(p); 
  });
  return grouped;
};

const parseUTC = (dateString) => {
  if (!dateString) return new Date();
  return new Date(dateString.endsWith("Z") ? dateString : dateString + "Z");
};

// --- COMPONENT TOOLTIP ---
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
      borderRadius: '6px',
      boxShadow: '0 4px 15px rgba(0, 0, 0, 0.15)',
      border: '1px solid #e5e7eb',
      pointerEvents: 'none',
      minWidth: '200px',
      fontFamily: 'sans-serif',
      fontSize: '12px',
      color: '#333'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 'bold', fontSize: '13px' }}>
          <span style={{ display: 'block', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: data.color }}></span>
          <span style={{ textTransform: 'uppercase' }}>{data.status}</span>
      </div>

      <div style={{ borderTop: '1px solid #eee', paddingTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
           <span style={{ color: '#666' }}>Start:</span>
           <span style={{ fontFamily: 'monospace' }}>{data.startFmt}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
           <span style={{ color: '#666' }}>End:</span>
           <span style={{ fontFamily: 'monospace' }}>{data.endFmt}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontWeight: '600', color: '#0b4a8b' }}>
           <span>Duration:</span>
           <span style={{ fontFamily: 'monospace' }}>{formatTime(data.duration)}</span>
        </div>
      </div>

      <div style={{ position: 'absolute', bottom: '-6px', left: '50%', transform: 'translateX(-50%) rotate(45deg)', width: '12px', height: '12px', backgroundColor: 'white', borderRight: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}></div>
    </div>
  );
};

export default function WorkOrder() {
  // --- STATES ---
  const [workOrders, setWorkOrders] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);

  // Modal State (Pastikan ini ada!)
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedWO, setSelectedWO] = useState(null);

  // Tooltip State
  const [tooltipData, setTooltipData] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const [isTooltipVisible, setIsTooltipVisible] = useState(false);

  // Detail View State
  const [filterDate, setFilterDate] = useState({ start: "", end: "" });
  const [tempFilterDate, setTempFilterDate] = useState({ start: "", end: "" });
  const [partLogs, setPartLogs] = useState({});

  const API_URL = `${BASE_URL}/work-orders`;

  // --- FETCH DATA ---
  useEffect(() => { fetchWorkOrders(); }, []);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const token = sessionStorage.getItem("token");
      const res = await fetch(API_URL, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed");
      const data = await res.json();
      setWorkOrders(data);
    } catch (error) { console.error(error); } 
    finally { setLoading(false); }
  };

  const handleMouseEnterSegment = (e, segment) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top });
    setTooltipData(segment);
    setIsTooltipVisible(true);
  };
  const handleMouseLeaveSegment = () => { setIsTooltipVisible(false); };

// --- DETAIL HANDLERS ---
  const openDetailModal = async (wo) => {
    setSelectedWO(wo);
    const now = new Date();
    const toLocalISO = (d) => {
        const offset = d.getTimezoneOffset() * 60000;
        return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };
    
    // Set logika default: dari waktu WO dibuat sampai saat ini
    const startVal = wo.date ? toLocalISO(new Date(wo.date)) : toLocalISO(now);
    const endVal = toLocalISO(now);

    // 1. filterDate diisi (agar chart langsung merender data default)
    setFilterDate({ start: startVal, end: endVal });
    
    // 2. tempFilterDate dikosongkan (agar UI kalender terlihat kosong/placeholder)
    setTempFilterDate({ start: "", end: "" });
    
    try {
        const token = sessionStorage.getItem("token");
        const res = await fetch(`${API_URL}/${wo.woNumber}/logs`, {
           headers: { "Authorization": `Bearer ${token}` }
        });
        if (res.ok) { setPartLogs(await res.json()); }
    } catch (e) { console.error(e); }
    setShowDetailModal(true); 
  };
  
  const handleApplyFilter = () => {
      // Validasi: pastikan user sudah mengisi kedua tanggal sebelum klik Apply
      if (!tempFilterDate.start || !tempFilterDate.end) {
          Swal.fire({ icon: 'warning', title: 'Flter is incomplete', text: 'Please fill in the Start Date and End Date first.' });
          return;
      }
      setFilterDate({ ...tempFilterDate });
  };

  const handleClearFilter = () => {
      if (!selectedWO) return;
      
      const now = new Date();
      const toLocalISO = (d) => {
          const offset = d.getTimezoneOffset() * 60000;
          return new Date(d.getTime() - offset).toISOString().slice(0, 16);
      };
      
      // Kembalikan start ke waktu pembuatan WO, dan end ke waktu SAAT INI
      const startVal = selectedWO.date ? toLocalISO(new Date(selectedWO.date)) : toLocalISO(now);
      const endVal = toLocalISO(now);

      // Kembalikan chart ke default
      setFilterDate({ start: startVal, end: endVal });
      
      // Kosongkan kembali UI Kalender
      setTempFilterDate({ start: "", end: "" });
  };

  // --- FUNGSI EXPORT CSV ---
  const handleExportCSV = () => {
    if (!selectedWO || !selectedWO.parts || selectedWO.parts.length === 0) {
      Swal.fire({ icon: 'warning', title: 'No Parts', text: 'There is no history data to export.'});
      return;
    }

    // Siapkan Header
    const csvRows = [
      ["WO Number", "Machine Name", "Product Name", "Status", "Start Time", "End Time", "Duration (HH:MM:SS)"]
    ];

    let exportData = [];

    // Loop data dan kumpulkan ke dalam array sebelum di-sort
    selectedWO.parts.forEach(p => {
      const key = `${p.machine}||${p.name}`;
      const logs = partLogs[key] || [];
      const timelineSegments = generatePartTimeline(p.machine, p.name, logs, filterDate.start, filterDate.end);

      timelineSegments.forEach(seg => {
        exportData.push({
          woNumber: selectedWO.woNumber,
          machine: p.machine,
          name: p.name,
          status: seg.status,
          startFmt: seg.startFmt.replace(/,/g, ''),
          endFmt: seg.endFmt.replace(/,/g, ''),
          duration: formatTime(seg.duration),
          rawStartMs: seg.rawStartMs // Digunakan untuk sorting
        });
      });
    });

    if (exportData.length === 0) {
      Swal.fire({ icon: 'info', title: 'No Data', text: 'No Activity'});
      return;
    }

    // SORTING DESCENDING berdasarkan waktu mulai (Start Time)
    exportData.sort((a, b) => b.rawStartMs - a.rawStartMs);

    // Masukkan data yang sudah di-sort ke CSV rows
    exportData.forEach(data => {
      csvRows.push([
        data.woNumber,
        data.machine,
        data.name,
        data.status,
        data.startFmt,
        data.endFmt,
        data.duration
      ]);
    });

    // Proses Download
    const csvContent = csvRows.map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));

    const startStr = dayjs(filterDate.start).format('YYYY-MM-DD_HH-mm');
    const endStr = dayjs(filterDate.end).format('YYYY-MM-DD_HH-mm');
    link.setAttribute("download", `Data_${selectedWO.woNumber}_${startStr}_to_${endStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- TIMELINE GENERATOR ---
  const generatePartTimeline = (machine, partName, rawLogs, filterStartStr, filterEndStr) => {
      if (!filterStartStr || !filterEndStr) return [];
      
      const filterStart = new Date(filterStartStr).getTime();
      let filterEnd = new Date(filterEndStr).getTime();
      const now = new Date().getTime();
      
      if (filterEnd > now) filterEnd = now; 

      const totalDuration = (new Date(filterEndStr).getTime() - filterStart) / 1000;
      if (totalDuration <= 0) return [];

      // Use safe UTC parser for sorting logs
      const logs = (rawLogs || []).sort((a, b) => parseUTC(a.time).getTime() - parseUTC(b.time).getTime());
      
      const mapStatus = (action) => action?.toLowerCase() === 'start' ? 'WORKING' : 'NO WORKING';

      let currentTime = filterStart;
      
      let currentAction = null; 
      const prevLogs = logs.filter(l => parseUTC(l.time).getTime() <= filterStart);
      if (prevLogs.length > 0) {
          currentAction = prevLogs[prevLogs.length - 1].action;
      }
      
      let currentState = currentAction ? mapStatus(currentAction) : "NO_DATA";

      const relevantLogs = logs.filter(l => {
          const t = parseUTC(l.time).getTime();
          return t > filterStart && t <= filterEnd;
      });

      const segments = [];

      const pushSegment = (start, end, state) => {
          if (end <= start) return;
          const duration = (end - start) / 1000;
          const fmt = (ms) => new Date(ms).toLocaleString('id-ID', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
          });

          segments.push({
              status: state,
              startFmt: fmt(start),
              endFmt: fmt(end),
              duration: duration,
              flex: duration / totalDuration,
              color: (STATUS_CONFIG[state] || STATUS_CONFIG["NO_DATA"]).color,
              rawStartMs: start // <--- ADDED FOR DESCENDING CSV SORT
          });
      };

      relevantLogs.forEach(log => {
          const logTime = parseUTC(log.time).getTime();
          pushSegment(currentTime, logTime, currentState);
          currentTime = logTime;
          currentState = mapStatus(log.action); 
      });

      pushSegment(currentTime, filterEnd, currentState);

      const originalFilterEnd = new Date(filterEndStr).getTime();
      if (originalFilterEnd > filterEnd) {
           pushSegment(filterEnd, originalFilterEnd, "NO_DATA");
      }

      const mergedSegments = [];
      segments.forEach(seg => {
          if (mergedSegments.length > 0 && mergedSegments[mergedSegments.length - 1].status === seg.status) {
              const last = mergedSegments[mergedSegments.length - 1];
              last.endFmt = seg.endFmt;
              last.duration += seg.duration;
              last.flex += seg.flex;
          } else {
              mergedSegments.push(seg);
          }
      });

      return mergedSegments;
  };

  const filteredData = workOrders.filter(wo => {
    const searchStr = searchQuery.toLowerCase();
    const isWoMatch = wo.woNumber && wo.woNumber.toLowerCase().includes(searchStr);
    const isPartMatch = wo.parts && wo.parts.some(p => p.name && p.name.toLowerCase().includes(searchStr));

    return isWoMatch || isPartMatch;
  });

  return (
    <div className="workorder-page">
      <TimelineTooltip visible={isTooltipVisible} data={tooltipData} position={tooltipPos} />

      {/* HEADER */}
      <div className="page-header">
        <h1 className="page-title">WORK ORDER</h1>
        <div className="header-controls">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input type="text" placeholder="Search Work Order" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
          </div>
        </div>
      </div>

      {/* GRID */}
      <div className="wo-grid-container">
        {loading ? (
          <div className="loading-state">Loading...</div>
        ) : filteredData.length === 0 ? (
          /* --- TAMBAHAN TEKS JIKA KOSONG --- */
          <div style={{ 
            textAlign: "center", 
            color: "#999", 
            fontStyle: "italic", 
            gridColumn: "1 / -1",
            padding: "50px 0",
            fontSize: "14px"
          }}>
            There is no Work Order available yet.
          </div>
        ) : (
          filteredData.map((wo) => (
            <div className="wo-card" key={wo.woNumber}>
              <div className="wo-card-header">
                <span className="wo-id">{wo.woNumber}</span>
              </div>
              {/* BODY CARD */}
              <div className="wo-card-body">
                <div className="info-item">
                    <Clock size={16} />
                    <span className="info-text">
                        {wo.date ? formatToLocalTime(wo.date).slice(0, 16) : "-"}
                    </span>
                </div>
                
                {/* LIST PARTS */}
                <div className="parts-vertical-list">
                  {wo.parts && wo.parts.length > 0 ? (
                    wo.parts.map((p, i) => {

                      // JIKA PART MASIH OPEN
                      const isWorking = p.status?.toLowerCase() === 'start';
                      const badgeStyle = {
                          backgroundColor: isWorking ? '#e8f5e9' : '#ffebee', 
                          color: isWorking ? '#2e7d32' : '#c62828',           
                          border: `1px solid ${isWorking ? '#c8e6c9' : '#ffcdd2'}`,
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          marginBottom: '4px'
                      };

                      return (
                        <div key={i} style={badgeStyle}>
                          <span style={{flex:1}}>{p.name}</span>
                          <span style={{fontSize:'9px', opacity:0.8}}>
                              {isWorking ? 'WORKING' : 'NO WORKING'}
                          </span>
                        </div>
                      )
                    })
                  ) : <span className="no-parts">- No Parts -</span>}
                </div>
              </div>
              <div className="wo-card-footer" style={{justifyContent:'center', padding:'10px'}}>
                 <button className="btn-view-details" onClick={() => openDetailModal(wo)}>View Details</button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- DETAIL MODAL --- */}
      {showDetailModal && selectedWO && (
        <div className="modal-overlay" onClick={() => setShowDetailModal(false)}>
          <div className="modal-content detail-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Work Order Details</h2>
              <button className="btn-close" onClick={() => setShowDetailModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              {/* Header Info */}
              <div className="detail-grid" style={{gridTemplateColumns:'1fr 1fr'}}>
                 <div className="detail-item"><span className="label">WO Number</span><span className="value bold">{selectedWO.woNumber}</span></div>
                 <div className="detail-item"><span className="label">Created Date</span><span className="value">
                    {selectedWO.date ? formatToLocalTime(selectedWO.date) : "-"}
                 </span></div>
              </div>
              <div className="separator"></div>

              {/* Filter */}
              <div className="filter-section" style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <div className="filter-group">
                        <DateTimePicker 
                            label="START DATE & TIME"
                            format="DD/MM/YYYY HH:mm" 
                            ampm={false} 
                            value={tempFilterDate.start ? dayjs(tempFilterDate.start) : null} 
                            onChange={(v) => setTempFilterDate(p=>({...p, start:v?v.format('YYYY-MM-DDTHH:mm:ss'):""}))} 
                            slotProps={{ textField: { size: 'medium', style: { backgroundColor: 'white', width: '220px' } } }} 
                            viewRenderers={{ hours: renderTimeViewClock, minutes: renderTimeViewClock }} 
                        />
                    </div>
                    <div className="filter-group">
                        <DateTimePicker 
                            label="END DATE & TIME"
                            format="DD/MM/YYYY HH:mm" 
                            ampm={false} 
                            value={tempFilterDate.end ? dayjs(tempFilterDate.end) : null} 
                            onChange={(v) => setTempFilterDate(p=>({...p, end:v?v.format('YYYY-MM-DDTHH:mm:ss'):""}))} 
                            slotProps={{ textField: { size: 'medium', style: { backgroundColor: 'white', width: '220px' } } }} 
                            viewRenderers={{ hours: renderTimeViewClock, minutes: renderTimeViewClock }} 
                        />
                    </div>
                </LocalizationProvider>
                
                {/* BUTTON GROUP */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                      onClick={handleApplyFilter} 
                      style={{ background: '#0b4a8b', color:'white', fontWeight: 'bold', border:'none', padding:'8px 16px', borderRadius:'4px', cursor:'pointer', height: '40px' }}
                  >
                    Apply Filter
                  </button>
                  <button 
                      onClick={handleClearFilter} 
                      style={{ padding: '8px 16px', background: '#fff', fontWeight: 'bold', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', height: '40px' }}
                  >
                    Clear
                  </button>
                  <button 
                    onClick={handleExportCSV} 
                    style={{ padding: '8px 16px', background: '#28a745', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', height: '40px' }}
                  >
                    <Download size={18} /> Export Data
                  </button>
                </div>
              </div>
              {/* CHARTS */}
              <div className="parts-timeline-container">
                 {selectedWO.parts && selectedWO.parts.length > 0 ? (
                    Object.entries(groupPartsByProduct(selectedWO.parts)).map(([productName, machineParts]) => (
                       <div key={productName} className="machine-box-container">
                          <div className="machine-box-header"><Box size={16} /> <span>{productName}</span></div>
                            <div className="machine-box-content">
                             {machineParts.map((p, idx) => {

                                // JIKA NORMAL / OPEN (RENDER CHART SEPERTI BIASA)
                                const key = `${p.machine}||${p.name}`;
                                const logs = partLogs[key] || [];
                                const timelineSegments = generatePartTimeline(p.machine, p.name, logs, filterDate.start, filterDate.end);
                                
                                const stats = timelineSegments.reduce((acc, seg) => {
                                    if(seg.status==="WORKING") acc.start += seg.duration; 
                                    if(seg.status==="NO WORKING") acc.stop += seg.duration;
                                    return acc;
                                }, {start:0, stop:0});
                                stats.total = stats.start + stats.stop;

                                return (
                                   <div key={idx} style={{marginBottom:'20px'}}>
                                      <div className="timeline-header" style={{marginBottom:'5px', fontSize:'12px', fontWeight:'bold', color:'#555', display:'flex', alignItems:'center', gap:'5px'}}>
                                         <HardDrive size={12}/> {p.machine}
                                      </div>
                                      <div style={{display:'flex', gap:'20px', fontSize:'11px', marginBottom:'5px', borderBottom:'1px dashed #eee', paddingBottom:'5px'}}>
                                         <span style={{color: STATUS_CONFIG["WORKING"].color, fontWeight:'bold'}}>WORKING: {formatTime(stats.start)}</span>
                                         <span style={{color: STATUS_CONFIG["NO WORKING"].color, fontWeight:'bold'}}>NO WORKING: {formatTime(stats.stop)}</span>
                                         <span style={{color: '#666', fontWeight:'bold'}}>TOTAL: {formatTime(stats.total)}</span>
                                      </div>
                                      <div className="timeline-track">
                                        {timelineSegments.length > 0 ? timelineSegments.map((seg, sIdx) => (
                                            <div key={sIdx} className="timeline-segment" style={{flex: seg.flex, backgroundColor: seg.color}} 
                                                onMouseEnter={(e)=>handleMouseEnterSegment(e, {...seg, productName: p.name, machineName: p.machine, stats: stats})} 
                                                onMouseLeave={()=>setIsTooltipVisible(false)} />
                                        )) : <div style={{width:'100%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'10px', color:'#999'}}>No Data</div>}
                                      </div>
                                      <div className="timeline-labels">{generateDynamicTimeLabels(filterDate.start, filterDate.end).map((lbl, li)=><span key={li}>{lbl}</span>)}</div>
                                   </div>
                                )
                             })}
                          </div>
                       </div>
                    ))
                 ) : <div className="no-data">No Parts Configured</div>}
              </div>
            </div>
            <div className="modal-footer"><button className="btn-cancel" onClick={() => setShowDetailModal(false)}>Close</button></div>
          </div>
        </div>
      )}
    </div>
  );
}
