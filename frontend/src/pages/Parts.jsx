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
  
  // Modals State
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false); 
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  
  // History Filter States
  const [selectedPartHistory, setSelectedPartHistory] = useState(null);
  const [historyStart, setHistoryStart] = useState(""); // Input State
  const [historyEnd, setHistoryEnd] = useState("");     // Input State
  const [activeHistoryStart, setActiveHistoryStart] = useState(""); // Active Filter State
  const [activeHistoryEnd, setActiveHistoryEnd] = useState("");     // Active Filter State
  
  // QR & Data State
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  
  const [editingPart, setEditingPart] = useState(null);

  // Form State (Untuk Add & Edit)
  const [formData, setFormData] = useState({
    machine_name: "",
    name_product: ""
  });

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  
  // --- 2. DATA FETCHING (API INTEGRATION) ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
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
      alert("Failed to fetch data from server.");
    } finally {
      setLoading(false);
    }
  };

  // --- 3. FILTER & PAGINATION ---
  const filteredParts = partsData.filter(part =>
    part.name_product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.machine_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredParts.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = filteredParts.slice(startIndex, endIndex);

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
    setFormData({ machine_name: "", name_product: "" }); 
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
        // Success Modal
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'Part added successfully!',
          timer: 2000,
          showConfirmButton: false
        });
        
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
      machine_name: part.machine_name,
      name_product: part.name_product
    });
    setShowEditModal(true);
  };

  const submitEditPart = async (e) => {
        e.preventDefault();
        
        try {
          const response = await fetch("/api/editproduct", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              old_machine_name: editingPart.machine_name, 
              old_name_product: editingPart.name_product,
              new_machine_name: formData.machine_name, 
              new_name_product: formData.name_product, 
            })
          });

          if (response.ok) {
            // Success Modal
            Swal.fire({
              icon: 'success',
              title: 'Updated!',
              text: 'Part updated successfully!',
              timer: 2000,
              showConfirmButton: false
            });
            
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
    // 1. Confirmation Modal
    Swal.fire({
      title: 'Delete Part?',
      text: `Are you sure you want to delete ${part.name_product} permanently?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(async (result) => {
      // 2. Action if Confirmed
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
            
            // 3. Success Modal
            Swal.fire(
              'Deleted!',
              'Part has been successfully deleted.',
              'success'
            );
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
      (log) =>
        log.machine_name === part.machine_name &&
        log.name_product === part.name_product
    );

    setSelectedPartHistory({
      nama: part.name_product,
      machine: part.machine_name,
      history: specificHistory,
    });

    // Reset filters when opening modal
    setHistoryStart("");
    setHistoryEnd("");
    setActiveHistoryStart("");
    setActiveHistoryEnd("");

    setShowHistoryModal(true);
  };

  // --- HISTORY FILTER HANDLERS ---
  const handleApplyHistoryFilter = () => {
    setActiveHistoryStart(historyStart);
    setActiveHistoryEnd(historyEnd);
  };

  const handleClearHistoryFilter = () => {
    setHistoryStart("");
    setHistoryEnd("");
    setActiveHistoryStart("");
    setActiveHistoryEnd("");
  };

  const handleExportHistoryCSV = () => {
    // Filter data based on ACTIVE filter state
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
        title: 'No Data',
        text: 'There is no history data to export based on your current filters.',
        confirmButtonText: 'OK'
      });
    }

    // CSV Headers
    const headers = ["No", "Timestamp", "Action", "Manpower", "Machine", "Product"];
    
    // CSV Rows
    const rows = filteredLogs.map((log, index) => [
      index + 1,
      new Date(log.created_at).toLocaleString("en-GB", { hour12: false }).replace(",", ""), // Format Date 24h
      log.action, // Raw action (start/stop)
      log.name_manpower,
      log.machine_name,
      log.name_product
    ]);

    // Combine & Download
    const csvContent = [
      headers.join(","), 
      ...rows.map(e => e.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    const fileNameStart = activeHistoryStart 
      ? dayjs(activeHistoryStart).format('YYYY-MM-DD_HH-mm') 
      : 'Start-part-date';
      
    const fileNameEnd = activeHistoryEnd 
      ? dayjs(activeHistoryEnd).format('YYYY-MM-DD_HH-mm') 
      : dayjs().format('YYYY-MM-DD_HH-mm'); 

    link.setAttribute("download", `History_${selectedPartHistory.nama}_${fileNameStart}_to_${fileNameEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- QR LOGIC ---
  const handleViewQR = async (part) => {
    try {
      setQrGenerating(true);
      const payload = {
        machine_name: String(part.machine_name),
        name_product: String(part.name_product),
      };
      setQrPayload(payload);
      const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), { margin: 2, width: 320 });
      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      setQrError("Gagal generate QR Code.");
    } finally {
      setQrGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    const doc = new jsPDF();
    doc.addImage(qrDataUrl, "PNG", 50, 40, 100, 100);
    doc.text(`Machine: ${qrPayload.machine_name}`, 55, 150);
    doc.text(`Product: ${qrPayload.name_product}`, 55, 160);
    doc.save(`QR_${qrPayload.name_product}.pdf`);
  };

  // --- 5. RENDER ---
  if (loading) {
    return <div className="loading">Loading...</div>;
  }

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
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
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
          <select 
            value={rowsPerPage} 
            onChange={(e) => handleRowsPerPageChange(e.target.value)}
            className="rows-select"
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="showing-info">
          Showing {startIndex + 1} to {Math.min(endIndex, filteredParts.length)} of {filteredParts.length} entries
        </div>
      </div>

      <div className="table-container">
        <table className="parts-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Machine Name</th>
              <th>Product Name</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr>
                <td colSpan="5" style={{ textAlign: "center" }}>No data available</td>
              </tr>
            ) : (
              currentData.map((part) => (
                <tr key={part.no}>
                  <td>{part.no}</td>
                  <td>{part.machine_name}</td>
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

                      return (
                        <span className={`status-badge ${statusClass}`}>
                          {displayLabel}
                        </span>
                      );
                    })()}
                  </td>
                  <td className="text-center">
                    <div className="action-buttons">
                      <button 
                        className="action-btn btn-qr"
                        onClick={() => handleViewQR(part)}
                        title="View QR"
                      >
                        <QrCode size={16} />
                        QR
                      </button>
                      <button 
                        className="action-btn btn-history"
                        onClick={() => handleViewHistory(part)}
                        title="History"
                      >
                        <History size={16} />
                        History
                      </button>
                      
                      <button 
                        className="action-btn btn-edit"
                        onClick={() => handleEdit(part)}
                        title="Edit"
                      >
                        <Edit size={16} />
                        Edit
                      </button>

                      <button 
                        className="action-btn btn-delete"
                        onClick={() => handleDelete(part)}
                        title="Delete"
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="pagination">
        <button 
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
        >
          <ChevronLeft size={20} />
          Previous
        </button>

        <div className="pagination-numbers">
          {[...Array(totalPages)].map((_, index) => (
            <button
              key={index + 1}
              className={`pagination-number ${currentPage === index + 1 ? 'active' : ''}`}
              onClick={() => handlePageChange(index + 1)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        <button 
          className="pagination-btn"
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
        >
          Next
          <ChevronRight size={20} />
        </button>
      </div>

      {/* --- ADD MODAL --- */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Part</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={submitAddPart}>
              <div className="modal-body">
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display:"block", marginBottom:"5px" }}>Machine Name</label>
                  <input 
                    type="text" 
                    className="search-input" 
                    style={{ width: "100%" }}
                    value={formData.machine_name}
                    onChange={(e) => setFormData({...formData, machine_name: e.target.value})}
                    required
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display:"block", marginBottom:"5px" }}>Product Name</label>
                  <input 
                    type="text" 
                    className="search-input" 
                    style={{ width: "100%" }}
                    value={formData.name_product}
                    onChange={(e) => setFormData({...formData, name_product: e.target.value})}
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
        </>
      )}

      {/* --- EDIT MODAL --- */}
      {showEditModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Part</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={24} /></button>
            </div>
            <form onSubmit={submitEditPart}>
              <div className="modal-body">
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display:"block", marginBottom:"5px" }}>Machine Name</label>
                  <input 
                    type="text" 
                    className="search-input" 
                    style={{ width: "100%" }}
                    value={formData.machine_name}
                    onChange={(e) => setFormData({...formData, machine_name: e.target.value})}
                    required
                  />
                </div>
                <div style={{ marginBottom: "1rem" }}>
                  <label style={{ display:"block", marginBottom:"5px" }}>Product Name</label>
                  <input 
                    type="text" 
                    className="search-input" 
                    style={{ width: "100%" }}
                    value={formData.name_product}
                    onChange={(e) => setFormData({...formData, name_product: e.target.value})}
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
        </>
      )}

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && selectedPartHistory && (
        <>
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>History Log: {selectedPartHistory.nama}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              
              {/* --- FILTER & EXPORT SECTION --- */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '15px', 
                alignItems: 'center', // Adjusted for MUI alignment
                flexWrap: 'wrap',
                background: '#f8f9fa',
                padding: '15px',
                borderRadius: '8px'
              }}>
                <div className="filter-group">
                  <DateTimePicker 
                    label="START DATE & TIME"
                    value={historyStart ? dayjs(historyStart) : null}
                    onChange={(newValue) => setHistoryStart(newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '')}
                    ampm={false}
                    format="DD/MM/YYYY HH:mm"
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock,
                    }}
                    slotProps={{ textField: { size: 'medium', style: { backgroundColor: 'white', width: '220px' } } }}
                  />
                </div>
                <div className="filter-group">
                  <DateTimePicker 
                    label="END DATE & TIME"
                    value={historyEnd ? dayjs(historyEnd) : null}
                    onChange={(newValue) => setHistoryEnd(newValue ? newValue.format('YYYY-MM-DDTHH:mm') : '')}
                    ampm={false}
                    format="DD/MM/YYYY HH:mm"
                    viewRenderers={{
                      hours: renderTimeViewClock,
                      minutes: renderTimeViewClock,
                      seconds: renderTimeViewClock,
                    }}
                    slotProps={{ textField: { size: 'medium', style: { backgroundColor: 'white', width: '220px' } } }}
                  />
                </div>
                
                {/* BUTTON GROUP */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    onClick={handleApplyHistoryFilter}
                    style={{background: '#0b4a8b', color:'white', fontWeight: 'bold', border:'none', padding:'8px 16px', borderRadius:'4px', cursor:'pointer', marginRight:'10px', height: '40px' 
                      }}
                  >
                    Apply Filter
                  </button>
                  <button 
                    onClick={handleClearHistoryFilter}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#fff', 
                      fontWeight: 'bold',
                      color: '#333', 
                      border: '1px solid #ddd', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      height: '40px'
                    }}
                  >
                    Clear
                  </button>
                  <button 
                    onClick={handleExportHistoryCSV}
                    style={{ 
                      padding: '8px 16px', 
                      background: '#28a745', 
                      color: 'white', 
                      fontWeight: 'bold',
                      border: 'none', 
                      borderRadius: '6px', 
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '5px',
                      height: '40px'
                    }}
                  >
                    <Download size={18} /> Export Data </button>
                </div>
              </div>

              {/* --- TABLE SECTION --- */}
              <div className="history-scroll-container">
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Timestamp</th>
                      <th>Status</th>
                      <th>Manpower</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPartHistory.history
                      .filter(log => {
                        // Filter Logic
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
                            {new Date(log.created_at).toLocaleString("en-GB", { 
                              year: 'numeric', month: '2-digit', day: '2-digit', 
                              hour: '2-digit', minute: '2-digit', second: '2-digit',
                              hour12: false 
                            })}
                          </td>
                          <td>
                            {(() => {
                              const rawAction = log.action ? log.action.toLowerCase() : "";
                              let displayLabel = "Not Working";
                              let statusClass = "status-not-working";

                              if (rawAction === "start" || rawAction === "working") {
                                displayLabel = "Working";
                                statusClass = "status-working";
                              }

                              return (
                                <span className={`status-badge ${statusClass}`}>
                                  {displayLabel}
                                </span>
                              );
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
        </>
      )}

      {/* QR Code Modal */}
      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowQrModal(false)}></div>
          <div className="modal">
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
        </>
      )}
    </LocalizationProvider>
  );
}