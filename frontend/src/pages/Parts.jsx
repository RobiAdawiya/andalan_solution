import { useState, useEffect } from "react";
import { Search, X, Trash2, Edit, QrCode, History, ChevronLeft, ChevronRight, Save, Download } from "lucide-react"; 
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "../styles/parts.css";

// --- MUI IMPORTS FOR DATE PICKER & TIME CLOCK ---
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import dayjs from 'dayjs';

// API Imports
import { getProductList, getProductLogs } from "../services/api";
import Swal from "sweetalert2";

export default function Parts() {
  // --- 1. STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [partsData, setPartsData] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  const [devices, setDevices] = useState([]); // State untuk Dropdown Machine Name
  
  // Modals State
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // History Filter States
  const [selectedPartHistory, setSelectedPartHistory] = useState(null);
  const [historyStart, setHistoryStart] = useState(""); 
  const [historyEnd, setHistoryEnd] = useState("");     
  const [activeHistoryStart, setActiveHistoryStart] = useState(""); 
  const [activeHistoryEnd, setActiveHistoryEnd] = useState("");     
  
  // QR & Data State
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  
  const [editingPart, setEditingPart] = useState(null);

  // Form State (Untuk Add & Edit)
  const [formData, setFormData] = useState({
    wo_number: "",
    machine_name: "",
    name_product: ""
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });

  // --- 2. DATA FETCHING (API INTEGRATION) ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);

      // Ambil daftar Machine (Device) untuk Dropdown
      try {
        const devRes = await fetch("/api/devices");
        if (devRes.ok) {
          const devData = await devRes.json();
          setDevices(devData);
        }
      } catch (err) {
        console.error("Gagal mengambil data devices", err);
      }

      const [productsData, logsData] = await Promise.all([
        getProductList(),
        getProductLogs(),
      ]);

      const mappedProducts = productsData.map((item, index) => {
        const partLogs = logsData
          .filter(log => log.machine_name === item.machine_name && log.name_product === item.name_product)
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return {
          ...item,
          no: index + 1,
          status: partLogs.length > 0 ? partLogs[0].action : "not working",
        };
      });

      setPartsData(mappedProducts);
      setAllLogs(logsData);
    } catch (error) {
      console.error("Error fetching data:", error);
      Swal.fire('Error', 'Failed to fetch data from server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FILTER, SORT & PAGINATION ---
  const handleSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortedData = (data) => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      const aValue = a[sortConfig.key] ? a[sortConfig.key].toLowerCase() : "";
      const bValue = b[sortConfig.key] ? b[sortConfig.key].toLowerCase() : "";
      
      if (aValue < bValue) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'ascending' ? 1 : -1;
      return 0;
    });
  };

  const filteredData = partsData.filter((part) =>
    part.name_product.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (part.wo_number && part.wo_number.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const sortedData = getSortedData(filteredData);
  const totalPages = Math.ceil(sortedData.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = sortedData.slice(startIndex, endIndex);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- 4. CRUD HANDLERS ---

  // --- HANDLE ADD ---
  const handleAddPart = () => {
    setFormData({ wo_number: "", machine_name: "", name_product: "" }); 
    setShowAddModal(true);
  };

  const submitAddPart = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/addproduct", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'Success!', text: 'Part added successfully!', timer: 2000, showConfirmButton: false });
        setShowAddModal(false);
        fetchInitialData(); 
      } else {
        Swal.fire('Error', 'Failed to add part.', 'error');
      }
    } catch (error) {
      Swal.fire('Error', 'Error connecting to server.', 'error');
    }
  };

  // --- HANDLE EDIT ---
  const handleEdit = (part) => {
    setEditingPart(part);
    setFormData({
      wo_number: part.wo_number || "",
      machine_name: part.machine_name,
      name_product: part.name_product
    });
    setShowEditModal(true);
  };

  const submitEditPart = async (e) => {
        e.preventDefault();
        
        // Pengecekan apakah ada perubahan
        if (
          formData.machine_name === editingPart.machine_name &&
          formData.name_product === editingPart.name_product &&
          formData.wo_number === (editingPart.wo_number || "")
        ) {
          Swal.fire({
            icon: 'info', title: 'No Changes', text: "There's no modified things yet.", timer: 2000, showConfirmButton: false
          });
          setShowEditModal(false);
          return;
        }
        
        try {
          const response = await fetch("/api/editproduct", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              old_machine_name: editingPart.machine_name, 
              old_name_product: editingPart.name_product,
              new_machine_name: formData.machine_name, 
              new_name_product: formData.name_product, 
              new_wo_number: formData.wo_number
            })
          });

          if (response.ok) {
            Swal.fire({ icon: 'success', title: 'Updated!', text: 'Part updated successfully!', timer: 2000, showConfirmButton: false });
            setShowEditModal(false);
            fetchInitialData(); 
          } else {
            Swal.fire('Error', 'Failed to update part.', 'error');
          }
        } catch (error) {
          Swal.fire('Error', 'Error connecting to server.', 'error');
        }
    };

  // --- HANDLE DELETE ---
  const handleDelete = async (part) => {
    Swal.fire({
      title: 'Delete Part?',
      text: `Are you sure you want to delete ${part.name_product} permanently?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await fetch("/api/delete_product", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              machine_name: part.machine_name, 
              name_product: part.name_product 
            })
          });

          const result = await response.json();

          if (response.ok) {
            setPartsData(prev => prev.filter(p => p.no !== part.no));
            Swal.fire('Deleted!', 'Part has been successfully deleted.', 'success');
          } else {
            Swal.fire('Error', result.detail || result.message, 'error');
          }
        } catch (err) {
          Swal.fire('Error', 'Failed to connect to backend!', 'error');
        }
      }
    });
  };

  // --- HISTORY LOGIC ---
  const handleViewHistory = (part) => {
    const specificHistory = allLogs.filter(
      (log) => log.machine_name === part.machine_name && log.name_product === part.name_product
    );
    setSelectedPartHistory({ nama: part.name_product, machine: part.machine_name, history: specificHistory });
    setHistoryStart(""); setHistoryEnd(""); setActiveHistoryStart(""); setActiveHistoryEnd("");
    setShowHistoryModal(true);
  };

  const handleApplyHistoryFilter = () => {
      // 1. Check if dates are filled
      if (!historyStart || !historyEnd) {
        Swal.fire({ 
          icon: 'warning', 
          title: 'Filter is incomplete', 
          text: 'Please fill in the Start Date and End Date first.' 
        });
        return;
      }
  
      // 2. Show the loading spinner
      Swal.fire({
        title: 'Applying Filter...',
        text: 'Please wait while we filter the history data.',
        allowOutsideClick: false,
        didOpen: () => {
          Swal.showLoading();
        }
      });
  
      // 3. Tiny delay so the spinner actually renders before state updates
      setTimeout(() => {
        setActiveHistoryStart(historyStart);
        setActiveHistoryEnd(historyEnd);
        
        // Close the spinner instantly when done
        Swal.close();
      }, 150);
    };

  const handleClearHistoryFilter = () => {
    setHistoryStart(""); setHistoryEnd(""); setActiveHistoryStart(""); setActiveHistoryEnd("");
  };

  const handleExportHistoryCSV = () => {
    const filteredLogs = selectedPartHistory.history.filter(log => {
      const logDate = new Date(log.created_at);
      const start = activeHistoryStart ? new Date(activeHistoryStart) : null;
      const end = activeHistoryEnd ? new Date(activeHistoryEnd) : null;
      if (start && logDate < start) return false;
      if (end && logDate > end) return false;
      return true;
    });

    if (filteredLogs.length === 0) {
      return Swal.fire({ 
              icon: 'warning', 
              title: 'No Data to Export', 
              text: 'There is no history status data available for the selected period.' 
            });
    }

    const headers = ["No", "Timestamp", "Action", "Manpower", "Machine", "Product"];
    const rows = filteredLogs.map((log, index) => [
      index + 1,
      new Date(log.created_at).toLocaleString("en-GB", { hour12: false }).replace(",", ""), 
      log.action, log.name_manpower, log.machine_name, log.name_product
    ]);

    const csvContent = [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.setAttribute("href", URL.createObjectURL(blob));
    const fileNameStart = activeHistoryStart ? dayjs(activeHistoryStart).format('YYYY-MM-DD_HH-mm') : 'Start';
    const fileNameEnd = activeHistoryEnd ? dayjs(activeHistoryEnd).format('YYYY-MM-DD_HH-mm') : dayjs().format('YYYY-MM-DD_HH-mm'); 
    link.setAttribute("download", `History_${selectedPartHistory.nama}_${fileNameStart}_to_${fileNameEnd}.csv`);
    document.body.appendChild(link); link.click(); document.body.removeChild(link);
  };

  // --- QR LOGIC ---
  const handleViewQR = async (part) => {
    try {
      setQrGenerating(true);
      const payload = { machine_name: String(part.machine_name), name_product: String(part.name_product) };
      setQrPayload(payload);
      const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), { margin: 2, width: 320 });
      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      setQrError("Failed to generate QR Code.");
    } finally {
      setQrGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    doc.addImage(qrDataUrl, "PNG", 50, 40, 100, 100);
    doc.text(`Machine: ${qrPayload.machine_name}`, 55, 150);
    doc.text(`Product: ${qrPayload.name_product}`, 55, 160);
    doc.save(`QR_${qrPayload.name_product}_${qrPayload.machine_name}.pdf`);
  };

  // --- 5. RENDER ---
  if (loading) return <div className="loading-state">Loading...</div>;

  const getSortIcon = (columnName) => {
    if (sortConfig.key !== columnName) return <span style={{opacity: 0.3, marginLeft:'4px'}}>↕</span>;
    return sortConfig.direction === 'ascending' ? <span style={{marginLeft:'4px'}}>↑</span> : <span style={{marginLeft:'4px'}}>↓</span>;
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="page-header">
        <h1 className="page-title">PARTS</h1>

        <div className="parts-top">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search Parts"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="search-input"
            />
          </div>

          <button className="add-parts-btn" onClick={handleAddPart}>
            Add Part
          </button>
        </div>
      </div>

      <div className="table-controls">
        <div className="rows-per-page">
          <label>Show</label>
          <select value={rowsPerPage} onChange={(e) => handleRowsPerPageChange(e.target.value)} className="rows-select">
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="showing-info">
          Showing {startIndex + 1} to {Math.min(endIndex, sortedData.length)} of {sortedData.length} entries
        </div>
      </div>

      <div className="table-container">
        <table className="parts-table">
          <thead>
            <tr>
              <th>No.</th>
              <th onClick={() => handleSort('wo_number')} style={{cursor: 'pointer', whiteSpace:'nowrap'}}>
                WO Number {getSortIcon('wo_number')}
              </th>
              <th onClick={() => handleSort('name_product')} style={{cursor: 'pointer', whiteSpace:'nowrap'}}>
                Product Name {getSortIcon('name_product')}
              </th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr><td colSpan="5" style={{ textAlign: "center" }}>No data available</td></tr>
            ) : (
              currentData.map((part, index) => (
                <tr key={part.no}>
                  <td>{startIndex + index + 1}</td>
                  <td style={{ fontWeight: "600", color: "#0b4a8b" }}>{part.wo_number || "-"}</td>
                  <td>{part.name_product}</td>
                  <td>
                    {(() => {
                      const rawStatus = part.status ? part.status.toLowerCase() : "";
                      let displayLabel = "Not Working";
                      let statusClass = "status-not-working";

                      if (rawStatus === "start" || rawStatus === "working") {
                        displayLabel = "Working";
                        statusClass = "status-working";
                      }
                      return <span className={`status-badge ${statusClass}`}>{displayLabel}</span>;
                    })()}
                  </td>

                  {/* TOMBOL ACTION */}
                  <td className="text-center">
                    <div className="action-buttons">
                      <button className="action-btn btn-qr" onClick={() => handleViewQR(part)} title="View QR">
                        <QrCode size={14} /> QR
                      </button>
                      <button className="action-btn btn-history" onClick={() => handleViewHistory(part)} title="History">
                        <History size={14} /> History
                      </button>
                      <button className="action-btn btn-edit" style={{ backgroundColor: '#f59e0b' }} onClick={() => handleEdit(part)} title="Edit">
                        <Edit size={14} /> Edit
                      </button>
                      <button className="action-btn btn-delete" onClick={() => handleDelete(part)} title="Delete">
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINATION */}
      <div className="pagination">
        <button className="pagination-btn" onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}><ChevronLeft size={20} /> Previous</button>
        <div className="pagination-numbers">
          {[...Array(totalPages)].map((_, index) => (
            <button key={index + 1} className={`pagination-number ${currentPage === index + 1 ? 'active' : ''}`} onClick={() => handlePageChange(index + 1)}>{index + 1}</button>
          ))}
        </div>
        <button className="pagination-btn" onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}>Next <ChevronRight size={20} /></button>
      </div>

      {/* --- ADD MODAL --- */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Part</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={submitAddPart}>
              <div className="modal-body">
                <div className="form-group">
                  <label>WO Number <span style={{color:'red'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.wo_number}
                    onChange={(e) => setFormData({...formData, wo_number: e.target.value})}
                    placeholder="Enter WO Number"
                    required 
                  />
                </div>
                {/* DROPDOWN MACHINE NAME */}
                <div className="form-group">
                  <label>Machine Name <span style={{color:'red'}}>*</span></label>
                  <select 
                    className="form-input" 
                    value={formData.machine_name} 
                    onChange={(e) => setFormData({...formData, machine_name: e.target.value})} 
                    required
                  >
                    <option value="" disabled>Select Machine...</option>
                    {devices.map((dev, idx) => (
                      <option key={idx} value={dev.machine_name}>{dev.machine_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Parts Name <span style={{color:'red'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.name_product}
                    onChange={(e) => setFormData({...formData, name_product: e.target.value})}
                    placeholder="Enter Part Name"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-save"><Save size={16} style={{marginRight:5}}/> Save</button>
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- EDIT MODAL --- */}
      {showEditModal && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Part</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={submitEditPart}>
              <div className="modal-body">
                <div className="form-group">
                  <label>WO Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={formData.wo_number}
                    onChange={(e) => setFormData({...formData, wo_number: e.target.value})}
                    placeholder="Enter WO Number"
                  />
                </div>
                {/* DROPDOWN MACHINE NAME */}
                <div className="form-group">
                  <label>Machine Name <span style={{color:'red'}}>*</span></label>
                  <select 
                    className="form-input" 
                    value={formData.machine_name} 
                    onChange={(e) => setFormData({...formData, machine_name: e.target.value})} 
                    required
                  >
                    <option value="" disabled>Select Machine...</option>
                    {devices.map((dev, idx) => (
                      <option key={idx} value={dev.machine_name}>{dev.machine_name}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label>Part Name <span style={{color:'red'}}>*</span></label>
                  <input 
                    type="text" 
                    className="form-input"
                    value={formData.name_product}
                    onChange={(e) => setFormData({...formData, name_product: e.target.value})}
                    placeholder="Enter Part Name"
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="btn-save"><Save size={16} style={{marginRight:5}}/> Update</button>
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && selectedPartHistory && (
        <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}>
          <div className="modal modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>History Log: {selectedPartHistory.nama}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              {/* --- FILTER & EXPORT SECTION --- */}
              <div style={{ display: 'flex', gap: '10px', marginBottom: '15px', alignItems: 'center', flexWrap: 'wrap', background: '#f8f9fa', padding: '15px', borderRadius: '8px' }}>
                <div className="filter-group">
                  <DateTimePicker 
                    label="START DATE & TIME"
                    value={historyStart ? dayjs(historyStart) : null}
                    onChange={(newValue) => {
                      if (!newValue) setHistoryStart("");
                      else if (newValue.isValid()) setHistoryStart(newValue.format('YYYY-MM-DDTHH:mm'));
                    }}
                    ampm={false} format="DD/MM/YYYY HH:mm" viewRenderers={{ hours: renderTimeViewClock, minutes: renderTimeViewClock, seconds: renderTimeViewClock }}
                    slotProps={{ textField: { size: 'small', style: { backgroundColor: 'white', width: '200px' } } }}
                  />
                </div>
                <div className="filter-group">
                  <DateTimePicker 
                    label="END DATE & TIME"
                    value={historyEnd ? dayjs(historyEnd) : null}
                    onChange={(newValue) => {
                      if (!newValue) setHistoryEnd("");
                      else if (newValue.isValid()) setHistoryEnd(newValue.format('YYYY-MM-DDTHH:mm'));
                    }}
                    ampm={false} format="DD/MM/YYYY HH:mm" viewRenderers={{ hours: renderTimeViewClock, minutes: renderTimeViewClock, seconds: renderTimeViewClock }}
                    slotProps={{ textField: { size: 'small', style: { backgroundColor: 'white', width: '200px' } } }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={handleApplyHistoryFilter} style={{background: '#0b4a8b', color:'white', fontWeight: 'bold', border:'none', padding:'8px 16px', borderRadius:'4px', cursor:'pointer', height: '38px' }}>Apply Filter</button>
                  <button onClick={handleClearHistoryFilter} style={{ padding: '8px 16px', background: '#fff', fontWeight: 'bold', color: '#333', border: '1px solid #ddd', borderRadius: '6px', cursor: 'pointer', height: '38px' }}>Clear</button>
                  <button onClick={handleExportHistoryCSV} style={{ padding: '8px 16px', background: '#28a745', color: 'white', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', height: '38px' }}>
                    <Download size={16} /> Export Data 
                  </button>
                </div>
              </div>

              {/* --- TABLE SECTION --- */}
              <div className="history-scroll-container">
                <table className="history-table">
                  <thead>
                    <tr><th>No.</th><th>Timestamp</th><th>Status</th><th>Manpower</th></tr>
                  </thead>
                  <tbody>
                    {selectedPartHistory.history
                      .filter(log => {
                        if (!activeHistoryStart && !activeHistoryEnd) return true;
                        const logDate = new Date(log.created_at);
                        const start = activeHistoryStart ? new Date(activeHistoryStart) : null;
                        const end = activeHistoryEnd ? new Date(activeHistoryEnd) : null;
                        if (start && logDate < start) return false;
                        if (end && logDate > end) return false;
                        return true;
                      })
                      .map((log, i) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>
                            {new Date(log.created_at).toLocaleString("en-GB", { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}
                          </td>
                          <td>
                            {(() => {
                              const rawAction = log.action ? log.action.toLowerCase() : "";
                              return <span className={`status-badge ${rawAction === 'start' || rawAction === 'working' ? 'status-working' : 'status-not-working'}`}>{rawAction === 'start' || rawAction === 'working' ? 'Working' : 'Not Working'}</span>;
                            })()}
                          </td>
                          <td>{log.name_manpower}</td>
                        </tr>
                    ))}
                    {selectedPartHistory.history.length === 0 && (
                      <tr><td colSpan="4" style={{textAlign:'center', padding:'20px'}}>No history data available.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <div className="modal-overlay" onClick={() => setShowQrModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>QR Code</h2>
              <button className="modal-close" onClick={() => setShowQrModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              {qrGenerating ? <p>Generating...</p> : <img src={qrDataUrl} alt="QR" style={{ width: "250px" }} />}
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={handleDownloadPdf}>Download PDF</button>
              <button className="btn-cancel" onClick={() => setShowQrModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </LocalizationProvider>
  );
}