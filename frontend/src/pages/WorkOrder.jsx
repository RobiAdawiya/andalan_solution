import React, { useState, useEffect } from "react";
import { Search, X, HardDrive, Box, Filter, Clock } from "lucide-react";
import "../styles/workorder.css"; 
import BASE_URL from "../services/api";

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

  const API_URL = `${BASE_URL}/api/work-orders`;

  // --- FETCH DATA ---
  useEffect(() => { fetchWorkOrders(); }, []);

  const fetchWorkOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(API_URL);
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
    
    const startVal = wo.date ? toLocalISO(new Date(wo.date)) : toLocalISO(now);
    let endValRaw = now;
    if (wo.status === 'Completed' && wo.end_date) endValRaw = new Date(wo.end_date);
    const endVal = toLocalISO(endValRaw);

    const initialRange = { start: startVal, end: endVal };
    setFilterDate(initialRange);
    setTempFilterDate(initialRange);
    
    try {
        const res = await fetch(`${API_URL}/${wo.woNumber}/logs`);
        if (res.ok) { setPartLogs(await res.json()); }
    } catch (e) { console.error(e); }
    setShowDetailModal(true); // <--- State ini yang tadi error
  };

  const handleApplyFilter = () => {
      setFilterDate({ ...tempFilterDate });
  };

  // --- TIMELINE GENERATOR ---
  const generatePartTimeline = (machine, partName, rawLogs, filterStartStr, filterEndStr, woCreatedDate) => {
      if (!filterStartStr || !filterEndStr) return [];
      
      const filterStart = new Date(filterStartStr).getTime();
      let filterEnd = new Date(filterEndStr).getTime();
      const now = new Date().getTime();
      if (filterEnd > now) filterEnd = now; 

      const woStart = new Date(woCreatedDate).getTime();

      const totalDuration = (new Date(filterEndStr).getTime() - filterStart) / 1000;
      if (totalDuration <= 0) return [];

      const logs = rawLogs || [];
      const segments = [];
      let currentTime = filterStart;
      
      const mapStatus = (action) => action?.toLowerCase() === 'start' ? 'WORKING' : 'NO WORKING';

      let currentAction = "stop"; 
      const prevLogs = logs.filter(l => new Date(l.time).getTime() < filterStart);
      if (prevLogs.length > 0) {
          currentAction = prevLogs[prevLogs.length - 1].action;
      }
      let currentState = mapStatus(currentAction);

      const relevantLogs = logs.filter(l => {
          const t = new Date(l.time).getTime();
          return t >= filterStart && t <= filterEnd;
      });

      const pushSegment = (start, end, state) => {
          if (end <= start) return;
          
          let effectiveState = state;
          
          if (end <= woStart) {
              effectiveState = "NO_DATA";
          }
          else if (start < woStart && end > woStart) {
              segments.push({
                  status: "NO DATA",
                  startFmt: new Date(start).toLocaleString('id-ID'), 
                  endFmt: new Date(woStart).toLocaleString('id-ID'),
                  duration: (woStart - start) / 1000,
                  flex: ((woStart - start) / 1000) / totalDuration,
                  color: STATUS_CONFIG["NO_DATA"].color
              });
              segments.push({
                  status: state,
                  startFmt: new Date(woStart).toLocaleString('id-ID'),
                  endFmt: new Date(end).toLocaleString('id-ID'),
                  duration: (end - woStart) / 1000,
                  flex: ((end - woStart) / 1000) / totalDuration,
                  color: (STATUS_CONFIG[state] || STATUS_CONFIG.PENDING).color
              });
              return; 
          }

          const duration = (end - start) / 1000;
          const fmt = (ms) => new Date(ms).toLocaleString('id-ID', { 
            day: '2-digit', month: '2-digit', year: 'numeric', 
            hour: '2-digit', minute: '2-digit' 
          });

          segments.push({
              status: effectiveState,
              startFmt: fmt(start),
              endFmt: fmt(end),
              duration: duration,
              flex: duration / totalDuration,
              color: (STATUS_CONFIG[effectiveState] || STATUS_CONFIG.PENDING).color
          });
      };

      const consolidatedLogs = [];
      let tempState = currentState;
      
      relevantLogs.forEach(log => {
          const nextState = mapStatus(log.action);
          if (nextState !== tempState) {
              consolidatedLogs.push(log);
              tempState = nextState;
          }
      });

      consolidatedLogs.forEach(log => {
          const logTime = new Date(log.time).getTime();
          pushSegment(currentTime, logTime, currentState);
          currentTime = logTime;
          currentState = mapStatus(log.action);
      });

      const originalFilterEnd = new Date(filterEndStr).getTime();
      pushSegment(currentTime, filterEnd, currentState);

      if (originalFilterEnd > filterEnd) {
           segments.push({
              status: "NO DATA",
              startFmt: new Date(filterEnd).toLocaleString('id-ID'),
              endFmt: new Date(originalFilterEnd).toLocaleString('id-ID'),
              duration: (originalFilterEnd - filterEnd) / 1000,
              flex: ((originalFilterEnd - filterEnd) / 1000) / totalDuration,
              color: STATUS_CONFIG["NO_DATA"].color
          });
      }

      return segments;
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
            <input type="text" placeholder="Search WO..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="search-input" />
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
                        {wo.date ? new Date(wo.date).toLocaleString('id-ID', { year:'numeric', month:'2-digit', day:'2-digit', hour:'2-digit', minute:'2-digit' }) : "-"}
                    </span>
                </div>
                
                {/* LIST PARTS */}
                <div className="parts-vertical-list">
                  {wo.parts && wo.parts.length > 0 ? (
                    wo.parts.map((p, i) => {
                      // 1. JIKA PART SUDAH CLOSED
                      if (p.closed) {
                         return (
                           <div key={i} style={{backgroundColor: '#f5f5f5', color: '#666', border: '1px solid #ddd', padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px'}}>
                              <span style={{flex:1}}>{p.name}</span>
                              <span style={{fontSize:'9px', color:'#dc3545'}}>CLOSED</span>
                           </div>
                         )
                      }

                      // 2. JIKA PART MASIH OPEN
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
                    {selectedWO.date ? new Date(selectedWO.date).toLocaleString('id-ID') : "-"}
                 </span></div>
              </div>
              <div className="separator"></div>

              {/* Filter */}
              <div className="filter-section">
                <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <div className="filter-group" style={{flex:1}}>
                        <label style={{fontSize:'12px'}}>Start</label>
                        <DateTimePicker format="DD/MM/YYYY HH:mm" ampm={false} value={dayjs(tempFilterDate.start)} onChange={(v) => setTempFilterDate(p=>({...p, start:v?v.format('YYYY-MM-DDTHH:mm:ss'):""}))} slotProps={{ textField: { size: 'small' } }} viewRenderers={{ hours: renderTimeViewClock, minutes: renderTimeViewClock }} />
                    </div>
                    <div className="filter-group" style={{flex:1}}>
                        <label style={{fontSize:'12px'}}>End</label>
                        <DateTimePicker format="DD/MM/YYYY HH:mm" ampm={false} value={dayjs(tempFilterDate.end)} onChange={(v) => setTempFilterDate(p=>({...p, end:v?v.format('YYYY-MM-DDTHH:mm:ss'):""}))} slotProps={{ textField: { size: 'small' } }} viewRenderers={{ hours: renderTimeViewClock, minutes: renderTimeViewClock }} />
                    </div>
                </LocalizationProvider>
                <button className="btn-filter" onClick={handleApplyFilter}><Filter size={14}/> Apply Filter</button>
              </div>

              {/* CHARTS */}
              <div className="parts-timeline-container">
                 {selectedWO.parts && selectedWO.parts.length > 0 ? (
                    Object.entries(groupPartsByProduct(selectedWO.parts)).map(([productName, machineParts]) => (
                       <div key={productName} className="machine-box-container">
                          <div className="machine-box-header"><Box size={16} /> <span>{productName}</span></div>
                            <div className="machine-box-content">
                             {machineParts.map((p, idx) => {
                                // 1. JIKA PART CLOSED (TAMPILKAN TEKS SAJA, TANPA CHART)
                                if (p.closed) {
                                   return (
                                     <div key={idx} style={{marginBottom:'20px'}}>
                                        <div className="timeline-header" style={{marginBottom:'5px', fontSize:'12px', fontWeight:'bold', color:'#555', display:'flex', alignItems:'center', gap:'8px'}}>
                                           <span style={{display:'flex', alignItems:'center', gap:'4px'}}><HardDrive size={12}/> {p.machine}</span>
                                        </div>
                                        <div style={{ padding: '12px', background: '#ffebee', color: '#c62828', borderRadius: '6px', textAlign: 'center', fontWeight: 'bold', fontSize: '12px', border: '1px dashed #ffcdd2' }}>
                                           {p.name} = CLOSED
                                        </div>
                                     </div>
                                   );
                                }

                                // 2. JIKA NORMAL / OPEN (RENDER CHART SEPERTI BIASA)
                                const key = `${p.machine}||${p.name}`;
                                const logs = partLogs[key] || [];
                                const timelineSegments = generatePartTimeline(p.machine, p.name, logs, filterDate.start, filterDate.end, selectedWO.date);
                                
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