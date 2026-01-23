import { useState } from "react";
import { Eye, Edit, Trash2, X } from "lucide-react";
import searchIcon from "../assets/search.png";
import "../styles/manpower.css";

export default function ManPower() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingPerson, setEditingPerson] = useState(null);
  const [manPowerData, setManPowerData] = useState([
    { id: 1, no: 1, nama: "John Doe", nik: "12345", department: "Engineering", position: "Technician", status: "Active" },
    { id: 2, no: 2, nama: "Jane Smith", nik: "12346", department: "Maintenance", position: "Supervisor", status: "Active" },
    { id: 3, no: 3, nama: "Bob Johnson", nik: "12347", department: "Operations", position: "Operator", status: "Inactive" },
    { id: 4, no: 4, nama: "Alice Brown", nik: "12348", department: "Engineering", position: "Engineer", status: "Active" },
    { id: 5, no: 5, nama: "Charlie Wilson", nik: "12349", department: "Maintenance", position: "Technician", status: "Active" },
  ]);

  const filteredManPower = manPowerData.filter(person =>
    person.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    person.nik.includes(searchQuery)
  );

  const handleAddManPower = () => {
    console.log("Add man power clicked");
  };

  const handleViewQR = (person) => {
    alert(`View QR Code for: ${person.nama}`);
  };

  const handleEdit = (person) => {
    setEditingPerson({ ...person });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingPerson.nama || !editingPerson.nik || !editingPerson.department || !editingPerson.position) {
      alert("Semua field harus diisi!");
      return;
    }

    setManPowerData(manPowerData.map(person => 
      person.id === editingPerson.id ? editingPerson : person
    ));
    setShowEditModal(false);
    setEditingPerson(null);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingPerson(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this person?")) {
      setManPowerData(manPowerData.filter(person => person.id !== id));
    }
  };

  const handleStatusChange = (id, newStatus) => {
    setManPowerData(manPowerData.map(person => 
      person.id === id ? { ...person, status: newStatus } : person
    ));
  };

  return (
    <div>
      <div className="manpower-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search Man Power"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="add-manpower-btn" onClick={handleAddManPower}>
          Add Man Power
        </button>
      </div>

      <div className="table-container">
        <table className="manpower-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama</th>
              <th>NIK</th>
              <th>Department</th>
              <th>Position</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredManPower.map((person) => (
              <tr key={person.id}>
                <td>{person.no}</td>
                <td>{person.nama}</td>
                <td>{person.nik}</td>
                <td>{person.department}</td>
                <td>{person.position}</td>
                <td>
                  <select 
                    value={person.status}
                    onChange={(e) => handleStatusChange(person.id, e.target.value)}
                    className={`status-select status-${person.status.toLowerCase()}`}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-btn view-btn" 
                      onClick={() => handleViewQR(person)}
                      title="View QR Code"
                    >
                      <span>View QR</span>
                      <Eye size={18} />
                    </button>
                    <button 
                      className="action-btn edit-btn" 
                      onClick={() => handleEdit(person)}
                      title="Edit"
                    >
                      <span>Edit</span>
                      <Edit size={18} />
                    </button>
                    <button 
                      className="action-btn delete-btn" 
                      onClick={() => handleDelete(person.id)}
                      title="Delete"
                    >
                      <span>Delete</span>
                      <Trash2 size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* EDIT MODAL */}
      {showEditModal && editingPerson && (
        <>
          <div className="modal-overlay" onClick={handleCancelEdit}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Man Power</h2>
              <button className="modal-close" onClick={handleCancelEdit}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Nama</label>
                <input
                  type="text"
                  value={editingPerson.nama}
                  onChange={(e) => setEditingPerson({...editingPerson, nama: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>NIK</label>
                <input
                  type="text"
                  value={editingPerson.nik}
                  onChange={(e) => setEditingPerson({...editingPerson, nik: e.target.value})}
                  className="form-input"
                />
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
                  <option value="Quality">Quality</option>
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

              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingPerson.status}
                  onChange={(e) => setEditingPerson({...editingPerson, status: e.target.value})}
                  className="form-input"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCancelEdit}>
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