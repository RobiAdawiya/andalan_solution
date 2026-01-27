import { useState, useEffect } from "react";
import { Eye, Edit, Trash2, X } from "lucide-react";
import QRCode from "qrcode";
import { jsPDF } from "jspdf";
import searchIcon from "../assets/search.png";
import "../styles/manpower.css";
import { getManpowerList, getManpowerLogs } from "../services/api";

export default function ManPower() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false); 
  const [editingPerson, setEditingPerson] = useState(null);

  const [addForm, setAddForm] = useState({
    name: "",
    nik: "",
    department: "Engineering",
    position: "",
    status: "logout"
  });

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);

  const [manPowerData, setManPowerData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAllData = async () => {
      try {
        setLoading(true);
        const [masterList, logs] = await Promise.all([
          getManpowerList(),
          getManpowerLogs()
        ]);

        const mergedData = masterList.map((person, index) => {
          const lastLog = logs.find(log => String(log.nik) === String(person.nik));
          return {
            id: index + 1,
            no: index + 1,
            name: person.name || "N/A",
            nik: person.nik,
            department: person.department || "Unassigned",
            position: person.position || "Staff",
            status: lastLog ? lastLog.status : "logout"
          };
        });

        setManPowerData(mergedData);
      } catch (error) {
        console.error("Gagal memuat data manpower:", error);
      } finally {
        setLoading(false);
      }
    };
    loadAllData();
  }, []);

  const filteredManPower = manPowerData.filter(person =>
    (person.name?.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (String(person.nik || "").includes(searchQuery))
  );

  const handleAddManPower = () => {
    setAddForm({
      name: "",
      nik: "",
      department: "Engineering",
      position: "",
      status: "logout"
    });
    setShowAddModal(true);
  };

  // --- PERBAIKAN FUNGSI HANDLESAVEADD ---
  const handleSaveAdd = async () => {
    if (!addForm.name || !addForm.nik || !addForm.department || !addForm.position) {
      alert("Harap isi semua kolom yang wajib!");
      return;
    }

    try {
      // 1. Kirim data ke Backend API
      const response = await fetch("http://localhost:8000/add_manpower", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(addForm),
      });

      const result = await response.json();

      if (response.ok) {
        // 2. Jika sukses di DB, update UI local agar tidak perlu refresh
        const newId = manPowerData.length > 0 ? Math.max(...manPowerData.map(p => p.id)) + 1 : 1;
        const newPerson = {
          ...addForm,
          id: newId,
          no: newId
        };

        setManPowerData([...manPowerData, newPerson]);
        setShowAddModal(false);
        alert("Data berhasil disimpan ke database!");
      } else {
        // Menangani error dari backend (contoh: NIK duplikat)
        alert("Gagal menyimpan: " + (result.detail || "Terjadi kesalahan server"));
      }
    } catch (error) {
      console.error("Error connecting to API:", error);
      alert("Koneksi ke server gagal. Pastikan API backend sudah berjalan.");
    }
  };
  // ---------------------------------------

  const sanitizeFilePart = (s) => String(s || "").trim().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "_");

  const handleDownloadPDF = () => {
    try {
      if (!qrPayload || !qrDataUrl) return;
      const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      doc.setFontSize(16);
      doc.text("MANPOWER QR CODE", 105, 20, { align: "center" });
      doc.setFontSize(12);
      doc.text(`Nama: ${qrPayload.name}`, 20, 40);
      doc.text(`NIK : ${qrPayload.nik}`, 20, 47);
      doc.addImage(qrDataUrl, "PNG", 55, 60, 100, 100);
      doc.save(`QR_${sanitizeFilePart(qrPayload.nik)}.pdf`);
    } catch (err) {
      alert("Gagal membuat PDF.");
    }
  };

  const handleViewQR = async (person) => {
    try {
      setQrError(""); setQrDataUrl(""); setQrGenerating(true); setShowQrModal(true);
      const payload = { id: String(person.id), nik: String(person.nik), name: String(person.name) };
      setQrPayload(payload);
      const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), { margin: 2, width: 320 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setQrError("Gagal generate QR Code.");
    } finally {
      setQrGenerating(false);
    }
  };

  const handleCloseQrModal = () => setShowQrModal(false);
  const handleEdit = (person) => { setEditingPerson({ ...person }); setShowEditModal(true); };
  const handleCancelEdit = () => { setShowEditModal(false); setEditingPerson(null); };

  const handleSaveEdit = async () => {
    if (
      !editingPerson.name ||
      !editingPerson.nik ||
      !editingPerson.department ||
      !editingPerson.position
    ) {
      alert("Data tidak lengkap!");
      return;
    }

    try {
      const payload = {
        name: editingPerson.name,
        nik: editingPerson.nik,
        department: editingPerson.department,
        position: editingPerson.position
      };

      const response = await fetch("http://localhost:8000/editmanpower", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        alert("Gagal update: " + (result.detail || "Server error"));
        return;
      }

      // 🔥 Update UI (status dipaksa logout)
      setManPowerData(prev =>
        prev.map(p =>
          p.nik === editingPerson.nik
            ? { ...editingPerson, status: "logout" }
            : p
        )
      );

      setShowEditModal(false);
      setEditingPerson(null);
      alert("Data manpower berhasil diperbarui");

    } catch (error) {
      console.error(error);
      alert("Koneksi ke server gagal!");
    }
  };

  const handleDelete = async (nik) => {
  if (window.confirm(`Apakah Anda yakin ingin menghapus manpower dengan NIK: ${nik}?`)) {
    try {
      const response = await fetch("http://localhost:8000/delete_manpower", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ nik: nik }),
      });

      const result = await response.json();

      if (response.ok) {
        setManPowerData(
          manPowerData.filter((p) => String(p.nik) !== String(nik))
        );
        alert("Data berhasil dihapus!");
      } else {
        alert("Gagal menghapus: " + (result.detail || "Terjadi kesalahan server"));
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Koneksi ke server gagal!");
    }
  }
};

  const handleStatusChange = (id, newStatus) => {
    setManPowerData(manPowerData.map(p => p.id === id ? { ...p, status: newStatus } : p));
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
        {loading ? <p style={{ textAlign: "center" }}>Loading...</p> : (
          <table className="manpower-table">
            <thead>
              <tr>
                <th>No.</th><th>Name</th><th>NIK</th><th>Department</th><th>Position</th><th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredManPower.map((person) => (
                <tr key={person.id}>
                  <td>{person.no}</td>
                  <td>{person.name}</td>
                  <td>{person.nik}</td>
                  <td>{person.department}</td>
                  <td>{person.position}</td>
                  <td>
                    <span className={`status-badge status-${person.status}`}>
                      {person.status}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn view-btn" onClick={() => handleViewQR(person)}><Eye size={18} /></button>
                      <button className="action-btn edit-btn" onClick={() => handleEdit(person)}><Edit size={18} /></button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(person.nik)}><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL ADD --- */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Man Power</h2>
              <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={addForm.name} onChange={(e) => setAddForm({...addForm, name: e.target.value})} className="form-input" placeholder="Full Name" />
              </div>
              <div className="form-group">
                <label>NIK</label>
                <input type="text" value={addForm.nik} onChange={(e) => setAddForm({...addForm, nik: e.target.value})} className="form-input" placeholder="NIK Number" />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={addForm.department} onChange={(e) => setAddForm({...addForm, department: e.target.value})} className="form-input">
                  <option value="Engineering">Engineering</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Operations">Operations</option>
                  <option value="Data Science">Data Science</option>
                  <option value="Logistic">Logistic</option>
                </select>
              </div>
              <div className="form-group">
                <label>Position</label>
                <input type="text" value={addForm.position} onChange={(e) => setAddForm({...addForm, position: e.target.value})} className="form-input" placeholder="Job Position" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveAdd}>Save Man Power</button>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL QR --- */}
      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={handleCloseQrModal}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>QR Code PDF</h2>
              <button onClick={handleCloseQrModal}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              {qrGenerating ? <p>Generating...</p> : qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: 300 }} />}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseQrModal}>Close</button>
              <button className="btn-save" onClick={handleDownloadPDF}>Download PDF</button>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL EDIT --- */}
      {showEditModal && editingPerson && (
        <>
          <div className="modal-overlay" onClick={handleCancelEdit}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Man Power</h2>
              <button onClick={handleCancelEdit}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name</label>
                <input type="text" value={editingPerson.name} onChange={(e) => setEditingPerson({ ...editingPerson, name: e.target.value })} className="form-input" />
              </div>
              <div className="form-group">
                <label>NIK (Read Only)</label>
                <input type="text" value={editingPerson.nik} className="form-input disabled" readOnly />
              </div>
              <div className="form-group">
                <label>Department</label>
                <select value={editingPerson.department} onChange={(e) => setEditingPerson({ ...editingPerson, department: e.target.value })} className="form-input">
                   <option value="Engineering">Engineering</option>
                   <option value="Maintenance">Maintenance</option>
                   <option value="Operations">Operations</option>
                   <option value="Data Science">Data Science</option>
                   <option value="Logistic">Logistic</option>
                </select>
              </div>
              <div className="form-group">
                <label>Position</label>
                <input type="text" value={editingPerson.position} onChange={(e) => setEditingPerson({ ...editingPerson, position: e.target.value })} className="form-input" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCancelEdit}>Cancel</button>
              <button className="btn-save" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}