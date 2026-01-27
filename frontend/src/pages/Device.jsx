import { useState, useEffect } from "react";
import { Edit, Trash2, X } from "lucide-react";
import searchIcon from "../assets/search.png";
import "../styles/device.css";
// Import fungsi API (Pastikan getMachineLogs tersedia di services/api)
import { getMachineLogs } from "../services/api"; 

export default function Device() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [loading, setLoading] = useState(true);

  // --- STATE DATA ---
  const [devices, setDevices] = useState([]);

  const [addForm, setAddForm] = useState({
    machine_id: "",
    tag_name: "",
    tag_value: "",
    status: "Active"
  });

  const [editForm, setEditForm] = useState({
    machine_id: "",
    tag_name: "",
    tag_value: "",
    status: "Active"
  });

  // --- 1. FETCH DATA DARI DATABASE ---
  useEffect(() => {
    fetchMachineLogs();
  }, []);

  const fetchMachineLogs = async () => {
    try {
      setLoading(true);
      const data = await getMachineLogs();
      // Mapping data dari log_machine ke struktur state lokal
      const mappedData = data.map((item, index) => ({
        no: index + 1,
        machine_id: item.machine_id,
        tag_name: item.tag_name,
        tag_value: item.tag_value,
        created_at: item.created_at, // Format dari PostgreSQL biasanya sudah string ISO
        status: "Active" // Default status karena tabel log biasanya tidak punya field status
      }));
      setDevices(mappedData);
    } catch (error) {
      console.error("Gagal mengambil data machine logs:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. FITUR FILTER/SEARCH ---
  const filteredDevices = devices.filter(device =>
    device.machine_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.tag_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 3. FITUR ADD DEVICE (STATE LOKAL) ---
  const handleAddDevice = () => {
    setAddForm({ machine_id: "", tag_name: "", tag_value: "", status: "Active" });
    setShowAddModal(true);
  };

  const handleSaveAdd = () => {
    if (!addForm.machine_id || !addForm.tag_name) {
      alert("Please fill in all required fields");
      return;
    }

    const newNo = devices.length > 0 ? Math.max(...devices.map(d => d.no)) + 1 : 1;
    const newDevice = {
      ...addForm,
      no: newNo,
      created_at: new Date().toLocaleString()
    };

    setDevices(prev => [newDevice, ...prev]);
    setShowAddModal(false);
    alert("Device log added successfully!");
  };

  // --- 4. FITUR EDIT DEVICE (STATE LOKAL) ---
  const handleEdit = (device) => {
    setEditingDevice(device);
    setEditForm({
      machine_id: device.machine_id,
      tag_name: device.tag_name,
      tag_value: device.tag_value,
      status: device.status
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    setDevices(prevData =>
      prevData.map(device =>
        device.no === editingDevice.no ? { ...device, ...editForm } : device
      )
    );
    setShowEditModal(false);
    alert("Device log updated successfully!");
  };

  // --- 5. FITUR DELETE & STATUS ---
  const handleDelete = (device) => {
    if (window.confirm(`Are you sure you want to delete log for ${device.machine_id}?`)) {
      setDevices(prevData => prevData.filter(d => d.no !== device.no));
    }
  };

  const handleStatusChange = (deviceNo, newStatus) => {
    setDevices(prevData =>
      prevData.map(device =>
        device.no === deviceNo ? { ...device, status: newStatus } : device
      )
    );
  };

  return (
    <div>
      <div className="device-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search by Machine ID or Tag..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="add-device-btn" onClick={handleAddDevice}>
          Add Log
        </button>
      </div>

      <div className="table-container">
        {loading ? <p style={{textAlign: "center", padding: "2rem"}}>Loading from Database...</p> : (
          <table className="device-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Machine ID</th>
                <th>Tag Name</th>
                <th>Tag Value</th>
                <th>Created At</th>
                <th>Status</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.no}>
                  <td>{device.no}</td>
                  <td>{device.machine_id}</td>
                  <td>{device.tag_name}</td>
                  <td>{device.tag_value}</td>
                  <td>{new Date(device.created_at).toLocaleString()}</td>
                  <td>
                    <select 
                      className={`status-select ${device.status === "Active" ? "status-active" : "status-inactive"}`}
                      value={device.status}
                      onChange={(e) => handleStatusChange(device.no, e.target.value)}
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </td>
                  <td className="text-center">
                    <div className="action-buttons">
                      <button className="action-btn btn-edit" onClick={() => handleEdit(device)}>
                        <Edit size={16} /> Edit
                      </button>
                      <button className="action-btn btn-delete" onClick={() => handleDelete(device)}>
                        <Trash2 size={16} /> Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      
      {/* MODAL ADD */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Machine Log</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Machine ID *</label>
                <input type="text" value={addForm.machine_id} onChange={(e) => setAddForm({...addForm, machine_id: e.target.value})} className="form-input" placeholder="Enter machine id" />
              </div>
              <div className="form-group">
                <label>Tag Name *</label>
                <input type="text" value={addForm.tag_name} onChange={(e) => setAddForm({...addForm, tag_name: e.target.value})} className="form-input" placeholder="Enter tag name" />
              </div>
              <div className="form-group">
                <label>Tag Value</label>
                <input type="text" value={addForm.tag_value} onChange={(e) => setAddForm({...addForm, tag_value: e.target.value})} className="form-input" placeholder="Enter value" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveAdd}>Add Device</button>
            </div>
          </div>
        </>
      )}

      {/* MODAL EDIT */}
      {showEditModal && editingDevice && (
        <>
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Machine Log</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Machine ID (Read Only)</label>
                <input type="text" value={editForm.machine_id} disabled className="form-input disabled" />
              </div>
              <div className="form-group">
                <label>Tag Name</label>
                <input type="text" value={editForm.tag_name} onChange={(e) => setEditForm({...editForm, tag_name: e.target.value})} className="form-input" />
              </div>
              <div className="form-group">
                <label>Tag Value</label>
                <input type="text" value={editForm.tag_value} onChange={(e) => setEditForm({...editForm, tag_value: e.target.value})} className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}