import { useState, useEffect } from "react";
import { QrCode, Edit, Trash2, X, Search, History, ChevronLeft, ChevronRight, Download } from "lucide-react"; 
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "../styles/manpower.css";
import { getManpowerList, getManpowerLogs } from "../services/api";

// --- MUI IMPORTS FOR DATE PICKER & TIME CLOCK ---
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { renderTimeViewClock } from '@mui/x-date-pickers/timeViewRenderers';
import dayjs from 'dayjs';
// MODAL LIB
import Swal from "sweetalert2";

export default function ManPower() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [manPowerData, setManPowerData] = useState([]);
  const [allLogs, setAllLogs] = useState([]);
  
  // History Modal & Filter States
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedHistory, setSelectedHistory] = useState({ name: "", logs: [] });
  const [historyStart, setHistoryStart] = useState(""); // Input State
  const [historyEnd, setHistoryEnd] = useState("");     // Input State
  const [activeHistoryStart, setActiveHistoryStart] = useState(""); // Active Filter State
  const [activeHistoryEnd, setActiveHistoryEnd] = useState("");     // Active Filter State

  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  const [editingPerson, setEditingPerson] = useState(null);
  const [addForm, setAddForm] = useState({
    name: "",
    nik: "",
    department: "Engineering",
    position: ""
  });

  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrGenerating, setQrGenerating] = useState(false);

  // --- 1. FETCH DATA ---
  const loadData = async () => {
    try {
      setLoading(true);
      const [master, logs] = await Promise.all([
        getManpowerList(),
        getManpowerLogs()
      ]);

      setAllLogs(logs);

      const merged = master.map((p, i) => {
        const lastLog = logs.find(l => String(l.nik) === String(p.nik));
        return {
          id: i + 1,
          no: i + 1,
          name: p.name || "N/A",
          nik: p.nik,
          department: p.department || "Engineering",
          position: p.position || "Staff",
          status: lastLog ? lastLog.status : "logout"
        };
      });
      setManPowerData(merged);
    } catch (err) {
      console.error("Load Error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // --- 2. SEARCH & PAGINATION ---
  const filteredManPower = manPowerData.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.nik).includes(searchQuery) ||
    p.position?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredManPower.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const currentData = filteredManPower.slice(startIndex, endIndex);

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // --- 3. HISTORY LOGIC ---
  const handleViewHistory = (person) => {
    const history = allLogs.filter(l => String(l.nik) === String(person.nik));
    setSelectedHistory({
      name: person.name,
      logs: history
    });
    
    // Reset filters when opening modal
    setHistoryStart("");
    setHistoryEnd("");
    setActiveHistoryStart("");
    setActiveHistoryEnd("");
    
    setShowHistoryModal(true);
  };

  // --- 3b. HISTORY FILTER HANDLERS ---
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
    const filteredLogs = selectedHistory.logs.filter(log => {
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
    const headers = ["No", "Timestamp", "Action", "Name"];
    
    // CSV Rows
    const rows = filteredLogs.map((log, index) => [
      index + 1,
      new Date(log.created_at).toLocaleString("en-GB", { hour12: false }).replace(",", ""), // Format Date 24h
      log.status,
      selectedHistory.name
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
      : 'Start-manpower-date';

    const fileNameEnd = activeHistoryEnd 
      ? dayjs(activeHistoryEnd).format('YYYY-MM-DD_HH-mm') 
      : dayjs().format('YYYY-MM-DD_HH-mm');

    link.setAttribute("download", `History_${selectedHistory.name}_${fileNameStart}_to_${fileNameEnd}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- 4. CRUD HANDLERS ---
  const handleAddManPower = () => { 
    setAddForm({ name: "", nik: "", department: "Engineering", position: "" });
    setShowAddModal(true);
  };

  const handleEdit = (mp) => { 
    setEditingPerson({ ...mp });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    // 1. Validation
    if (!editingPerson.name || !editingPerson.position) {
      return Swal.fire({
        icon: 'warning',
        title: 'Missing Fields',
        text: 'Please fill in Name and Position!',
      });
    }
    
    try {
      const response = await fetch("/api/editmanpower", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPerson.name,
          nik: editingPerson.nik,
          department: editingPerson.department,
          position: editingPerson.position
        })
      });
      
      if (response.ok) {
        await loadData();
        setShowEditModal(false);
        // 2. Success (Default Center Position)
        Swal.fire({
          icon: 'success',
          title: 'Updated!',
          text: 'Man Power data successfully updated!',
          timer: 2000,
          showConfirmButton: false
        });
      }
    } catch (err) { 
      Swal.fire('Error', 'Server connection failed.', 'error'); 
    }
  };

  const handleSaveAdd = async (e) => {
    e.preventDefault(); // <--- PREVENTS PAGE RELOAD

    // NOTE: validation check is removed because the browser handles it now due to 'required' attribute
    
    try {
      const response = await fetch("/api/add_manpower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm)
      });
      
      if (response.ok) {
        await loadData();
        setShowAddModal(false);
        setAddForm({ name: "", nik: "", department: "Engineering", position: "" });
        
        // Success Modal
        Swal.fire({
          icon: 'success',
          title: 'Success!',
          text: 'New Man Power successfully added!',
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire('Error', 'Failed to add data. NIK might already exist.', 'error');
      }
    } catch (err) { 
      Swal.fire('Error', 'Server Error occurred.', 'error'); 
    }
  };

  const handleDelete = async (mp) => {
    // 1. Confirmation Modal
    Swal.fire({
      title: 'Delete Man Power?',
      text: `Are you sure you want to delete ${mp.name}? This cannot be undone.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(async (result) => {
      // 2. Action if confirmed
      if (result.isConfirmed) {
        try {
          const response = await fetch("/api/delete_manpower", {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ nik: mp.nik })
          });
          
          if (response.ok) {
            setManPowerData(prev => prev.filter(p => p.nik !== mp.nik));
            
            // 3. Success Modal
            Swal.fire(
              'Deleted!',
              `${mp.name} has been deleted.`,
              'success'
            );
          }
        } catch (err) { 
          Swal.fire('Error', 'Delete failed', 'error'); 
        }
      }
    });
  };

  // --- 5. QR & PDF LOGIC ---
  const handleViewQR = async (person) => {
    setQrGenerating(true);
    setShowQrModal(true);
    const payload = { nik: String(person.nik), name: String(person.name) };
    setQrPayload(payload);
    const url = await QRCode.toDataURL(JSON.stringify(payload), { width: 300 });
    setQrDataUrl(url);
    setQrGenerating(false);
  };

  const downloadPDF = () => {
    const doc = new jsPDF();
    doc.text("MANPOWER QR CODE", 105, 20, { align: "center" });
    doc.addImage(qrDataUrl, "PNG", 55, 40, 100, 100);
    doc.text(`Nama: ${qrPayload.name}`, 20, 160);
    doc.text(`NIK : ${qrPayload.nik}`, 20, 170);
    doc.save(`QR_${qrPayload.nik}.pdf`);
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <div className="page-header">
        <h1 className="page-title">MAN POWER</h1>

        <div className="manpower-top">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search Man Power"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="search-input"
            />
          </div>

          <button className="add-manpower-btn" onClick={handleAddManPower}>
            Add Man Power
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
          Showing {startIndex + 1} to {Math.min(endIndex, filteredManPower.length)} of {filteredManPower.length} entries
        </div>
      </div>

      <div className="table-container">
        <table className="manpower-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Name</th>
              <th>NIK</th>
              <th>Department</th>
              <th>Position</th>
              <th>Status</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {currentData.length === 0 ? (
              <tr><td colSpan="7" style={{textAlign: 'center'}}>No data available</td></tr>
            ) : (
              currentData.map((mp) => (
                <tr key={mp.no}>
                  <td>{mp.no}</td>
                  <td>{mp.name}</td>
                  <td>{mp.nik}</td>
                  <td>{mp.department}</td>
                  <td>{mp.position}</td>
                  <td>
                    <span className={`status-badge status-${mp.status}`}>
                      {mp.status}
                    </span>
                  </td>
                  <td className="text-center">
                    <div className="action-buttons">
                      <button 
                        className="action-btn btn-qr"
                        onClick={() => handleViewQR(mp)}
                        title="View QR"
                      >
                        <QrCode size={16} />
                        QR
                      </button>
                      <button 
                        className="action-btn btn-history"
                        onClick={() => handleViewHistory(mp)}
                        title="History"
                      >
                        <History size={16} />
                        History
                      </button>
                      <button 
                        className="action-btn btn-edit"
                        onClick={() => handleEdit(mp)}
                        title="Edit"
                      >
                        <Edit size={16} />
                        Edit
                      </button>
                      <button 
                        className="action-btn btn-delete"
                        onClick={() => handleDelete(mp)}
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

      {/* MODAL HISTORY */}
      {showHistoryModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>History: {selectedHistory.name}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              
              {/* --- FILTER & EXPORT SECTION --- */}
              <div style={{ 
                display: 'flex', 
                gap: '10px', 
                marginBottom: '15px', 
                alignItems: 'center', // Changed for MUI alignment
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
                    slotProps={{ textField: { size: 'small', style: { backgroundColor: 'white', width: '220px' } } }}
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
                    slotProps={{ textField: { size: 'small', style: { backgroundColor: 'white', width: '220px' } } }}
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
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedHistory.logs
                      .filter(log => {
                        // Filter Logic using ACTIVE state
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
                          <td><span className={`status-badge status-${log.status}`}>{log.status}</span></td>
                        </tr>
                    ))}
                    {selectedHistory.logs.length === 0 && (
                      <tr><td colSpan="3" style={{textAlign:'center', padding:'20px'}}>No history data found.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      {/* MODAL EDIT */}
      {showEditModal && editingPerson && (
        <>
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Data Manpower</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Nama Lengkap</label>
                <input 
                  type="text" 
                  value={editingPerson.name} 
                  onChange={(e) => setEditingPerson({...editingPerson, name: e.target.value})} 
                  className="form-input" 
                />
              </div>
              <div className="form-group">
                <label>NIK (Read Only)</label>
                <input type="text" value={editingPerson.nik} disabled className="form-input disabled" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select 
                  value={editingPerson.department} 
                  onChange={(e) => setEditingPerson({...editingPerson, department: e.target.value})} 
                  className="form-input"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Operations">Operations</option>
                </select>
              </div>
              <div className="form-group">
                <label>Position</label>
                <input 
                  type="text" 
                  value={editingPerson.position} 
                  onChange={(e) => setEditingPerson({...editingPerson, position: e.target.value})} 
                  className="form-input" 
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Batal</button>
              <button className="btn-save" onClick={handleSaveEdit}>Simpan Perubahan</button>
            </div>
          </div>
        </>
      )}

      {/* MODAL ADD */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Man Power</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            
            {/* 1. WRAP INPUTS IN FORM TAG WITH onSubmit */}
            <form onSubmit={handleSaveAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Nama</label>
                  <input 
                    type="text" 
                    value={addForm.name} 
                    onChange={(e) => setAddForm({...addForm, name: e.target.value})} 
                    className="form-input"
                    required // <--- 2. ADD REQUIRED
                  />
                </div>
                <div className="form-group">
                  <label>NIK</label>
                  <input 
                    type="text" 
                    value={addForm.nik} 
                    onChange={(e) => setAddForm({...addForm, nik: e.target.value})} 
                    className="form-input"
                    required // <--- 2. ADD REQUIRED
                  />
                </div>
                <div className="form-group">
                  <label>Position</label>
                  <input 
                    type="text" 
                    value={addForm.position} 
                    onChange={(e) => setAddForm({...addForm, position: e.target.value})} 
                    className="form-input"
                    required // <--- 2. ADD REQUIRED
                  />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select 
                    value={addForm.department} 
                    onChange={(e) => setAddForm({...addForm, department: e.target.value})} 
                    className="form-input"
                  >
                    <option value="Engineering">Engineering</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Operations">Operations</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                {/* 3. CHANGE BUTTON TYPES */}
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-save">Save</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* MODAL QR */}
      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowQrModal(false)}></div>
          <div className="modal">
            <div className="modal-header"><h2>QR Code Viewer</h2><button className="modal-close" onClick={() => setShowQrModal(false)}><X size={24} /></button></div>
            <div className="modal-body" style={{textAlign:'center'}}>
              {qrGenerating ? <p>Loading...</p> : <img src={qrDataUrl} alt="QR" style={{width:250}} />}
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={downloadPDF}>Download PDF</button>
              <button className="btn-cancel" onClick={() => setShowQrModal(false)}>Close</button>
            </div>
          </div>
        </>
      )}
    </LocalizationProvider>
  );
}