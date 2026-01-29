import { useState, useEffect } from "react";
import { QrCode, Edit, Trash2, X, Search } from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "../styles/manpower.css";
// API Imports
import { getManpowerList, getManpowerLogs } from "../services/api";

export default function ManPower() {
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [manPowerData, setManPowerData] = useState([]);
  
  // Modal States
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);

  // Form States
  const [editingPerson, setEditingPerson] = useState(null);
  const [addForm, setAddForm] = useState({
    name: "",
    nik: "",
    department: "Engineering",
    position: ""
  });

  // QR States
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

  // --- 2. SEARCH FILTER ---
  const filteredData = manPowerData.filter(p =>
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.nik).includes(searchQuery)
  );

  // --- 3. EDIT LOGIC (INI YANG ANDA MAKSUD) ---
  const handleEditClick = (person) => {
    setEditingPerson({ ...person }); // Mengambil data baris yang diklik
    setShowEditModal(true); // Membuka modal edit
  };

  const handleSaveEdit = async () => {
    if (!editingPerson.name || !editingPerson.position) {
      alert("Harap isi semua field!");
      return;
    }

    try {
      const response = await fetch("http://localhost:8000/editmanpower", {
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
        await loadData(); // Refresh data dari database
        setShowEditModal(false);
        alert("Man Power berhasil diperbarui!");
      } else {
        alert("Gagal memperbarui data ke database.");
      }
    } catch (err) {
      alert("Koneksi server gagal.");
    }
  };

  // --- 4. ADD & DELETE LOGIC ---
  const handleSaveAdd = async () => {
    try {
      const response = await fetch("http://localhost:8000/add_manpower", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(addForm)
      });
      if (response.ok) {
        await loadData();
        setShowAddModal(false);
        setAddForm({ name: "", nik: "", department: "Engineering", position: "" });
        alert("Man Power ditambahkan!");
      }
    } catch (err) { alert("Server Error"); }
  };

  const handleDelete = async (nik) => {
    if (window.confirm(`Hapus NIK: ${nik}?`)) {
      try {
        const response = await fetch("http://localhost:8000/delete_manpower", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ nik })
        });
        if (response.ok) {
          setManPowerData(prev => prev.filter(p => p.nik !== nik));
          alert("Terhapus!");
        }
      } catch (err) { alert("Gagal hapus"); }
    }
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

  return (
    <div>
      <div className="page-header">
        <h1 className="page-title">MAN POWER</h1>
        <div className="manpower-top">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input
              type="text"
              placeholder="Cari Nama atau NIK..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button className="add-manpower-btn" onClick={() => setShowAddModal(true)}>
            Add Man Power
          </button>
        </div>
      </div>

      <div className="table-container">
        {loading ? <p style={{textAlign:'center', padding:'20px'}}>Syncing...</p> : (
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
              {filteredData.map((person) => (
                <tr key={person.id}>
                  <td>{person.no}</td>
                  <td>{person.name}</td>
                  <td>{person.nik}</td>
                  <td>{person.department}</td>
                  <td>{person.position}</td>
                  <td>
                    {/* STATUS BADGE - TIDAK INTERAKTIF */}
                    <span className={`status-badge status-${person.status.toLowerCase()}`}>
                      {person.status.toUpperCase()}
                    </span>
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button className="action-btn view-btn" onClick={() => handleViewQR(person)} title="QR">
                        <QrCode size={18} />
                        <span className="sr-only">View QR</span>
                      </button>
                      {/* TOMBOL EDIT TETAP ADA */}
                      <button className="action-btn edit-btn" onClick={() => handleEditClick(person)} title="Edit">
                        <Edit size={18} />
                        <span className="sr-only">Edit</span>
                      </button>
                      <button className="action-btn delete-btn" onClick={() => handleDelete(person.nik)} title="Delete">
                        <Trash2 size={18} />
                        <span className="sr-only">Delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL EDIT (FITUR UTAMA) */}
      {showEditModal && editingPerson && (
        <>
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Data Manpower</h2>
              <button onClick={() => setShowEditModal(false)}><X size={24} /></button>
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

      {/* MODAL ADD & QR (Sama seperti sebelumnya) */}
      {/* ... bagian Modal Add dan QR tetap disertakan ... */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Man Power</h2>
              <button onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
                <div className="form-group"><label>Nama</label><input type="text" onChange={(e) => setAddForm({...addForm, name: e.target.value})} className="form-input" /></div>
                <div className="form-group"><label>NIK</label><input type="text" onChange={(e) => setAddForm({...addForm, nik: e.target.value})} className="form-input" /></div>
                <div className="form-group"><label>Position</label><input type="text" onChange={(e) => setAddForm({...addForm, position: e.target.value})} className="form-input" /></div>
                <div className="form-group"><label>Department</label><input type="text" onChange={(e) => setAddForm({...addForm, department: e.target.value})} className="form-input" /></div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveAdd}>Save</button>
            </div>
          </div>
        </>
      )}

      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowQrModal(false)}></div>
          <div className="modal">
            <div className="modal-header"><h2>QR Code Viewer</h2><button onClick={() => setShowQrModal(false)}><X size={24} /></button></div>
            <div className="modal-body" style={{textAlign:'center'}}>
              {qrGenerating ? <p>Loading...</p> : <img src={qrDataUrl} alt="QR" style={{width:250}} />}
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={downloadPDF}>Download PDF</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
