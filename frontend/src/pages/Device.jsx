import { useState, useEffect } from "react";
import { Edit, Trash2, X } from "lucide-react"; // Removed QrCode icon
// Removed QRCode and jsPDF imports
import searchIcon from "../assets/search.png";
import "../styles/device.css";
// Import fungsi API (Pastikan getProductList tersedia di services/api)
import { getProductList } from "../services/api";

export default function Device() {
  // --- MAIN STATE ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [devices, setDevices] = useState([]);

  // --- MODAL STATES ---
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  // Removed showQrModal state

  // Removed QR & PDF STATES (qrDataUrl, qrPayload, qrGenerating)

  // --- FORM STATES ---
  const [editingDevice, setEditingDevice] = useState(null);

  const [addForm, setAddForm] = useState({
    machine_name: "",
    name_product: ""
  });

  const [editForm, setEditForm] = useState({
    machine_name: "",
    name_product: ""
  });

  // --- 1. FETCH DATA DARI DATABASE ---
  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      // Assuming getProductList returns an array of objects with machine_name and name_product
      const data = await getProductList();

      const mappedData = data.map((item, index) => ({
        no: index + 1,
        // Adjust these keys based on exactly what your API returns if different
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

  // --- 2. FITUR FILTER/SEARCH ---
  const filteredDevices = devices.filter(device =>
    device.machine_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.name_product?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 3. FITUR ADD DEVICE (Simplified Local State for now) ---
  const handleAddDevice = () => {
    setAddForm({ machine_name: "", name_product: "" });
    setShowAddModal(true);
  };

  const handleSaveAdd = () => {
    if (!addForm.machine_name || !addForm.name_product) {
      alert("Please fill in all required fields");
      return;
    }
    // Note: This is currently local add. Connect to API if needed later.
    const newNo = devices.length > 0 ? Math.max(...devices.map(d => d.no)) + 1 : 1;
    const newDevice = { ...addForm, no: newNo };

    setDevices(prev => [newDevice, ...prev]);
    setShowAddModal(false);
    alert("Device added locally!");
  };

  // --- 4. FITUR EDIT DEVICE (API BACKEND INTEGRATION) ---
  const handleEdit = (device) => {
    setEditingDevice(device);
    setEditForm({
      machine_name: device.machine_name,
      name_product: device.name_product
    });
    setShowEditModal(true);
  };

  // Using the API approach from your Parts example
  const handleSaveEdit = async () => {
    try {
      const payload = {
        machine_name: editForm.machine_name, // Usually used as the identifier
        name_product: editForm.name_product  // The value to update
      };

      // Assuming this endpoint exists as per your Parts example
      const response = await fetch("http://localhost:8000/editproduct", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        alert("Gagal edit product: " + (result.detail || "Server error"));
        return;
      }

      // 🔥 REFRESH DATA FROM DB ON SUCCESS
      await fetchProducts();

      setShowEditModal(false);
      alert("Product updated successfully in database!");

    } catch (error) {
      console.error("Edit Error:", error);
      alert("Connection to server failed!");
    }
  };

  // --- 5. FITUR DELETE (Kept Local as per original code) ---
  const handleDelete = (device) => {
    if (window.confirm(`Are you sure you want to delete ${device.name_product} on ${device.machine_name}? (Local delete only)`)) {
      setDevices(prevData => prevData.filter(d => d.no !== device.no));
    }
  };

  // Removed QR Code & PDF Logic functions

  // --- RENDER UI ---
  return (
    <div>
      <div className="device-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search Machine Name or Product Name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="add-device-btn" onClick={handleAddDevice}>
          Add Device
        </button>
      </div>

      <div className="table-container">
        {loading ? <p style={{ textAlign: "center", padding: "2rem" }}>Loading Data...</p> : (
          <table className="device-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Machine Name</th>
                <th>Name Product</th>
                {/* Reduced min-width since there are fewer buttons */}
                <th className="text-center" style={{minWidth: "180px"}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredDevices.map((device) => (
                <tr key={device.no}>
                  <td>{device.no}</td>
                  <td>{device.machine_name}</td>
                  <td>{device.name_product}</td>
                  
                  <td className="text-center">
                    <div className="action-buttons" style={{justifyContent: "center"}}>
                      {/* Removed QR Button */}
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
                <input type="text" value={addForm.machine_name} onChange={(e) => setAddForm({ ...addForm, machine_name: e.target.value })} className="form-input" placeholder="Enter machine name" />
              </div>
              <div className="form-group">
                <label>Name Product *</label>
                <input type="text" value={addForm.name_product} onChange={(e) => setAddForm({ ...addForm, name_product: e.target.value })} className="form-input" placeholder="Enter product name" />
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
                <label>Name Product</label>
                <input type="text" value={editForm.name_product} onChange={(e) => setEditForm({ ...editForm, name_product: e.target.value })} className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </>
      )}

      {/* Removed QR Modal Component */}
    </div>
  );
}