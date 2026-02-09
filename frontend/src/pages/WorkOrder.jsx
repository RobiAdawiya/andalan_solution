import { useState } from "react";
import { Search, X, Trash2, Edit } from "lucide-react";
import "../styles/workorder.css";

export default function WorkOrder() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingWO, setEditingWO] = useState(null);
  const [addForm, setAddForm] = useState({
    woNumber: "",
    device: "",
    parts: "",
    status: "Pending",
    date: ""
  });
  const [editForm, setEditForm] = useState({
    woNumber: "",
    device: "",
    parts: "",
    status: "Pending",
    date: ""
  });

  const [workOrderData, setWorkOrderData] = useState([
    { 
      no: 1, 
      woNumber: "WO-2024-001", 
      device: "Device 1", 
      parts: "Belt, Bearing",
      status: "In Progress", 
      date: "2024-01-20" 
    },
    { 
      no: 2, 
      woNumber: "WO-2024-002", 
      device: "Device 2", 
      parts: "Gasket",
      status: "Completed", 
      date: "2024-01-19" 
    },
    { 
      no: 3, 
      woNumber: "WO-2024-003", 
      device: "Device 3", 
      parts: "Bearing, Oil Filter",
      status: "Pending", 
      date: "2024-01-21" 
    },
    { 
      no: 4, 
      woNumber: "WO-2024-004", 
      device: "Device 4", 
      parts: "Oil Filter",
      status: "In Progress", 
      date: "2024-01-22" 
    },
    { 
      no: 5, 
      woNumber: "WO-2024-005", 
      device: "Device 1", 
      parts: "Belt",
      status: "Completed", 
      date: "2024-01-18" 
    },
  ]);

  const filteredWorkOrder = workOrderData.filter(wo =>
    wo.woNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.parts.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddWorkOrder = () => {
    setAddForm({
      woNumber: "",
      device: "",
      parts: "",
      status: "Pending",
      date: ""
    });
    setShowAddModal(true);
  };

  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveAdd = () => {
    if (!addForm.woNumber || !addForm.device || !addForm.parts || !addForm.date) {
      alert("Please fill in all required fields");
      return;
    }

    const woExists = workOrderData.some(wo => wo.woNumber === addForm.woNumber);
    if (woExists) {
      alert("WO Number already exists. Please use a different WO Number.");
      return;
    }

    const newNo = workOrderData.length > 0 ? Math.max(...workOrderData.map(wo => wo.no)) + 1 : 1;

    const newWO = {
      no: newNo,
      woNumber: addForm.woNumber,
      device: addForm.device,
      parts: addForm.parts,
      status: addForm.status,
      date: addForm.date
    };

    setWorkOrderData(prev => [...prev, newWO]);
    handleCloseAddModal();
    alert("Work Order added successfully!");
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      woNumber: "",
      device: "",
      parts: "",
      status: "Pending",
      date: ""
    });
  };

  const handleEdit = (wo) => {
    setEditingWO(wo);
    setEditForm({
      woNumber: wo.woNumber,
      device: wo.device,
      parts: wo.parts,
      status: wo.status,
      date: wo.date
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveEdit = () => {
    if (!editingWO) return;

    setWorkOrderData(prevData =>
      prevData.map(wo =>
        wo.no === editingWO.no
          ? {
              ...wo,
              device: editForm.device,
              parts: editForm.parts,
              status: editForm.status,
              date: editForm.date
            }
          : wo
      )
    );

    handleCloseEditModal();
    alert("Work Order updated successfully!");
  };

  const handleCloseEditModal = () => {
    setShowEditModal(false);
    setEditingWO(null);
    setEditForm({
      woNumber: "",
      device: "",
      parts: "",
      status: "Pending",
      date: ""
    });
  };

  const handleDelete = (wo) => {
    if (window.confirm(`Are you sure you want to delete ${wo.woNumber}?`)) {
      setWorkOrderData(prevData => prevData.filter(w => w.no !== wo.no));
      alert("Work Order deleted successfully!");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">WORK ORDER</h1>

        <div className="workorder-top">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Search Work Order"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <button className="add-workorder-btn" onClick={handleAddWorkOrder}>
            Add Work Order
          </button>
        </div>
      </div>

      <div className="table-container">
        <table className="workorder-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>WO Number</th>
              <th>Device</th>
              <th>Parts</th>
              <th>Status</th>
              <th>Date</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkOrder.map((wo) => (
              <tr key={wo.no}>
                <td>{wo.no}</td>
                <td>{wo.woNumber}</td>
                <td>{wo.device}</td>
                <td>{wo.parts}</td>
                <td>
                  <span className={`status-badge status-${wo.status.toLowerCase().replace(' ', '-')}`}>
                    {wo.status}
                  </span>
                </td>
                <td>{wo.date}</td>
                <td className="text-center">
                  <div className="action-buttons">
                    <button 
                    className="action-btn btn-edit"  /* Tambahkan class btn-edit */
                    onClick={() => handleEdit(wo)}
                    title="Edit"
                  >
                    <Edit size={16} />
                    Edit
                  </button>
                  <button 
                    className="action-btn btn-delete"  /* Tambahkan class btn-delete */
                    onClick={() => handleDelete(wo)}
                    title="Delete"
                  >
                    <Trash2 size={16} />
                    Delete
                  </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={handleCloseAddModal}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Work Order</h2>
              <button className="modal-close" onClick={handleCloseAddModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>WO Number *</label>
                <input
                  type="text"
                  value={addForm.woNumber}
                  onChange={(e) => handleAddFormChange("woNumber", e.target.value)}
                  className="form-input"
                  placeholder="Masukkan WO number (e.g., WO-2024-001)"
                />
              </div>

              <div className="form-group">
                <label>Device *</label>
                <input
                  type="text"
                  value={addForm.device}
                  onChange={(e) => handleAddFormChange("device", e.target.value)}
                  className="form-input"
                  placeholder="Masukkan nama device"
                />
              </div>

              <div className="form-group">
                <label>Parts *</label>
                <input
                  type="text"
                  value={addForm.parts}
                  onChange={(e) => handleAddFormChange("parts", e.target.value)}
                  className="form-input"
                  placeholder="Masukkan parts (e.g., Belt, Bearing)"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={addForm.status}
                  onChange={(e) => handleAddFormChange("status", e.target.value)}
                  className="form-input"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date *</label>
                <input
                  type="date"
                  value={addForm.date}
                  onChange={(e) => handleAddFormChange("date", e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseAddModal}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveAdd}>
                Add Work Order
              </button>
            </div>
          </div>
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingWO && (
        <>
          <div className="modal-overlay" onClick={handleCloseEditModal}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Work Order</h2>
              <button className="modal-close" onClick={handleCloseEditModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>WO Number (Read Only)</label>
                <input
                  type="text"
                  value={editingWO.woNumber}
                  disabled
                  className="form-input disabled"
                />
              </div>

              <div className="form-group">
                <label>Device</label>
                <input
                  type="text"
                  value={editForm.device}
                  onChange={(e) => handleEditFormChange("device", e.target.value)}
                  className="form-input"
                  placeholder="Masukkan nama device"
                />
              </div>

              <div className="form-group">
                <label>Parts</label>
                <input
                  type="text"
                  value={editForm.parts}
                  onChange={(e) => handleEditFormChange("parts", e.target.value)}
                  className="form-input"
                  placeholder="Masukkan parts (e.g., Belt, Bearing)"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => handleEditFormChange("status", e.target.value)}
                  className="form-input"
                >
                  <option value="Pending">Pending</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Completed">Completed</option>
                </select>
              </div>

              <div className="form-group">
                <label>Date</label>
                <input
                  type="date"
                  value={editForm.date}
                  onChange={(e) => handleEditFormChange("date", e.target.value)}
                  className="form-input"
                />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseEditModal}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveEdit}>
                Save Changes
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
