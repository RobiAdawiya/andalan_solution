import { useState, useEffect } from "react";
import { Edit, Trash2, X, Search } from "lucide-react";
import "../styles/device.css";
// Import API functions
import { getProductList } from "../services/api";

export default function Device() {
  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);

  const [addForm, setAddForm] = useState({
    machine_name: "",
    name_product: ""
  });

  const [editForm, setEditForm] = useState({
    machine_name: "",
    name_product: ""
  });

  // --- 1. FETCH DATA FROM API ---
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProductList();
      const mappedData = data.map((item, index) => ({
        no: index + 1,
        machine_name: item.machine_name || item.machine_id || "N/A",
        name_product: item.name_product || item.tag_name || "N/A",
      }));
      setDevices(mappedData);
    } catch (error) {
      console.error("Gagal mengambil data product:", error);
      alert("Failed to fetch data from database");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // --- 2. FILTER SEARCH ---
  const filteredDevices = devices.filter(device =>
    device.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.name_product?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 3. ADD DEVICE HANDLERS ---
  const handleAddDevice = () => {
    setAddForm({ machine_name: "", name_product: "" });
    setShowAddModal(true);
  };

  const handleSaveAdd = async () => {
    if (!addForm.machine_name || !addForm.name_product) {
      alert("Please fill in all required fields");
      return;
    }

    const exists = devices.some(d =>
      d.machine_name === addForm.machine_name &&
      d.name_product === addForm.name_product
    );
    if (exists) {
      alert("This machine already has the same product!");
      return;
    }

    try {
      const res = await fetch("http://localhost:8000/addproduct", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          machine_name: addForm.machine_name,
          name_product: addForm.name_product,
          start_date: new Date().toISOString()
        })
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.detail || "Failed to add product");
        return;
      }

      const newNo = devices.length > 0
        ? Math.max(...devices.map(d => d.no)) + 1
        : 1;

      const newDevice = { no: newNo, ...addForm };

      setDevices(prev => [newDevice, ...prev]);
      setShowAddModal(false);
      alert("Device saved to database!");
    } catch (err) {
      console.error(err);
      alert("Backend not reachable");
    }
  };

  // --- 4. EDIT DEVICE HANDLERS (API INTEGRATION) ---
  const handleEdit = (device) => {
    setEditingDevice(device);
    setEditForm({
      machine_name: device.machine_name,
      name_product: device.name_product
    });
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    try {
      const payload = {
        machine_name: editForm.machine_name,
        name_product: editForm.name_product
      };

      const response = await fetch("http://localhost:8000/editproduct", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const result = await response.json();
        alert("Gagal edit: " + (result.detail || "Server error"));
        return;
      }

      await fetchProducts(); // Refresh data dari DB
      setShowEditModal(false);
      alert("Product updated in database!");
    } catch (error) {
      console.error("Edit Error:", error);
      alert("Connection to server failed!");
    }
  };

  // --- 5. DELETE HANDLER ---
  const handleDelete = (device) => {
    if (window.confirm(`Are you sure you want to delete ${device.name_product}?`)) {
      setDevices(prev => prev.filter(d => d.no !== device.no));
      alert("Device deleted successfully!");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">DEVICE</h1>

        <div className="device-top">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search Machine or Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <button className="add-device-btn" onClick={handleAddDevice}>
            Add Device
          </button>
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <p style={{ textAlign: "center", padding: "2rem" }}>Syncing with Database...</p>
        ) : (
          <table className="device-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Machine Name</th>
                <th>Product Name</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.no}>
                  <td>{device.no}</td>
                  <td>{device.machine_name}</td>
                  <td>{device.name_product}</td>
                  <td className="text-center">
                    <div className="action-buttons">
                      <button className="action-btn btn-edit" onClick={() => handleEdit(device)} title="Edit">
                        <Edit size={16} /> Edit
                      </button>
                      <button className="action-btn btn-delete" onClick={() => handleDelete(device)} title="Delete">
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
              <h2>Add New Device</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Machine Name *</label>
                <input 
                  type="text" 
                  value={addForm.machine_name} 
                  onChange={(e) => setAddForm({ ...addForm, machine_name: e.target.value })} 
                  className="form-input" 
                  placeholder="Enter machine name" 
                />
              </div>
              <div className="form-group">
                <label>Product Name *</label>
                <input 
                  type="text" 
                  value={addForm.name_product} 
                  onChange={(e) => setAddForm({ ...addForm, name_product: e.target.value })} 
                  className="form-input" 
                  placeholder="Enter product name" 
                />
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
              <h2>Edit Device (Database)</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Machine Name (Read Only)</label>
                <input type="text" value={editForm.machine_name} disabled className="form-input disabled" />
              </div>
              <div className="form-group">
                <label>Product Name</label>
                <input 
                  type="text" 
                  value={editForm.name_product} 
                  onChange={(e) => setEditForm({ ...editForm, name_product: e.target.value })} 
                  className="form-input" 
                />
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