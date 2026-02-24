import { useState, useEffect } from "react";
import { Edit, Trash2, X, Search, ChevronLeft, ChevronRight } from "lucide-react";
import "../styles/device.css";
import { getDeviceList, addDevice, deleteDevice, updateDevice } from "../services/api";
import Swal from "sweetalert2";

export default function Device() {
  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  
  const [addForm, setAddForm] = useState({ machine_name: "", serial_number: "" });
  const [editForm, setEditForm] = useState({ machine_name: "", serial_number: "" });

  const [editingDevice, setEditingDevice] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  // --- 1. DATA FETCHING ---
  const fetchDevices = async () => {
    try {
      setLoading(true);
      const data = await getDeviceList();
      const mappedData = data.map((item, index) => ({
        no: index + 1,
        machine_name: item.machine_name || "N/A",
        serial_number: item.serial_number || "N/A",
      }));
      setDevices(mappedData);
    } catch (error) {
      console.error("Gagal load devices:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDevices(); }, []);

  // --- 2. SEARCH & PAGINATION LOGIC ---
  const filteredDevices = devices.filter(d =>
    d.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    d.serial_number?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredDevices.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const currentData = filteredDevices.slice(startIndex, startIndex + rowsPerPage);

  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) setCurrentPage(page);
  };

  const handleRowsPerPageChange = (value) => {
    setRowsPerPage(Number(value));
    setCurrentPage(1);
  };

  // --- 3. CRUD HANDLERS ---
  const handleAddDevice = () => {
    setAddForm({ machine_name: "", serial_number: "" });
    setShowAddModal(true);
  };

  // FIXED: Added 'e' parameter
  const handleSaveAdd = async (e) => {
    e.preventDefault(); // Now 'e' is defined!
    try {
      const res = await addDevice(addForm);
      if (res.status === "success") {
        await fetchDevices();
        setShowAddModal(false);
        
        Swal.fire({
          icon: 'success',
          title: 'Device Saved Successfully!',   
          showConfirmButton: false,
          timer: 1500,
          showClass: { popup: 'animate__animated animate__fadeInDown' },
          hideClass: { popup: 'animate__animated animate__fadeOutUp' }
        });
      }
    } catch (err) { 
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'Server error while adding device.'
      });
    }
  };

  const handleEditClick = (device) => {
    setEditingDevice(device);
    setEditForm({ machine_name: device.machine_name, serial_number: device.serial_number });
    setShowEditModal(true);
  };

  // FIXED: Added 'e' parameter
  const handleSaveEdit = async (e) => {
    e.preventDefault(); 
    if (
      editingDevice &&
      editForm.machine_name === editingDevice.machine_name &&
      editForm.serial_number === editingDevice.serial_number
    ) {
      Swal.fire({
        icon: 'info', 
        title: 'No Changes', 
        text: "There's no modified things yet.", 
        timer: 2000, 
        showConfirmButton: false
      });
      setShowEditModal(false);
      return;
    }

    try {
      const res = await updateDevice(editForm);
      if (res.status === "success") {
        await fetchDevices();
        setShowEditModal(false);
        
        Swal.fire({
          icon: 'success',
          title: 'Serial Number Updated!',
          showConfirmButton: false,
          timer: 1500
        });
      }
    } catch (error) { 
      Swal.fire({
        icon: 'error',
        title: 'Update Failed',
        text: 'Failed to update device data.'
      });
    }
  };

  const handleDelete = async (device) => {
    Swal.fire({
      title: 'Delete Device?',
      text: `Are you sure you want to delete ${device.machine_name}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'Cancel',
      reverseButtons: true
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const res = await deleteDevice(device.machine_name);
          if (res.status === "success") {
            await fetchDevices();
            
            Swal.fire({
              icon: 'success',
              title: 'Device Deleted!',
              showConfirmButton: false,
              timer: 1500
            });
          }
        } catch (err) { 
          Swal.fire('Error', 'Delete failed.', 'error'); 
        }
      }
    });
  };

  return (
    <div className="device-container">
      {/* HEADER SECTION */}
      <div className="page-header">
        <h1 className="page-title">DEVICE</h1>
        <div className="device-top">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search Device"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="search-input"
            />
          </div>
          <button className="add-device-btn" onClick={handleAddDevice}>
            Add Device
          </button>
        </div>
      </div>

      {/* TABLE CONTROLS */}
      <div className="table-controls">
        <div className="rows-per-page">
          <label>Show</label>
          <select 
            className="rows-select" 
            value={rowsPerPage} 
            onChange={(e) => handleRowsPerPageChange(e.target.value)}
          >
            <option value="10">10</option>
            <option value="20">20</option>
            <option value="50">50</option>
          </select>
          <span>entries</span>
        </div>
        <div className="showing-info">
          Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, filteredDevices.length)} of {filteredDevices.length} entries
        </div>
      </div>

      {/* TABLE SECTION */}
      <div className="table-container">
        {loading ? <p className="loading-state">Loading...</p> : (
          <table className="device-table">
            <thead>
              <tr>
                <th className="text-center">No.</th>
                <th>Machine Name</th>
                <th>Serial Number</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {currentData.length > 0 ? currentData.map((device) => (
                <tr key={device.no}>
                  <td className="text-center">{device.no}</td>
                  <td>{device.machine_name}</td>
                  <td>{device.serial_number}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn btn-edit" onClick={() => handleEditClick(device)}>
                        <Edit size={14} /> Edit
                      </button>
                      <button className="action-btn btn-delete" onClick={() => handleDelete(device)}>
                        <Trash2 size={14} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4" className="text-center">No devices found.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* PAGINATION */}
      <div className="pagination">
        <button 
          className="pagination-btn" 
          onClick={() => handlePageChange(currentPage - 1)} 
          disabled={currentPage === 1}
        >
          <ChevronLeft size={16} /> Previous
        </button>
        <div className="pagination-numbers">
          {[...Array(totalPages)].map((_, i) => (
            <button 
              key={i} 
              className={`pagination-number ${currentPage === i + 1 ? 'active' : ''}`}
              onClick={() => handlePageChange(i + 1)}
            >
              {i + 1}
            </button>
          ))}
        </div>
        <button 
          className="pagination-btn" 
          onClick={() => handlePageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
        >
          Next <ChevronRight size={16} />
        </button>
      </div>

      {/* MODAL ADD */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Device</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={20}/></button>
            </div>
            
            {/* FIXED: Wrapped in FORM tag */}
            <form onSubmit={handleSaveAdd}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Machine Name (ID)</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={addForm.machine_name} 
                    onChange={(e) => setAddForm({...addForm, machine_name: e.target.value})} 
                    placeholder="e.g. machine_01" 
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Serial Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={addForm.serial_number} 
                    onChange={(e) => setAddForm({...addForm, serial_number: e.target.value})} 
                    placeholder="e.g. SN-0502" 
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                {/* FIXED: Button types */}
                <button type="button" className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
                <button type="submit" className="btn-save">Save Device</button>
              </div>
            </form>
          </div>
        </>
      )}

      {/* MODAL EDIT */}
      {showEditModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Serial Number</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={20}/></button>
            </div>
            
            {/* FIXED: Wrapped in FORM tag */}
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Machine Name (Read Only)</label>
                  <input type="text" className="form-input disabled" value={editForm.machine_name} disabled required/>
                </div>
                <div className="form-group">
                  <label>Update Serial Number</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    value={editForm.serial_number} 
                    onChange={(e) => setEditForm({...editForm, serial_number: e.target.value})}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                {/* FIXED: Button types */}
                <button type="button" className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button type="submit" className="btn-save">Update Data</button>
              </div>
            </form>
          </div>
        </>
      )}
    </div>
  );
}