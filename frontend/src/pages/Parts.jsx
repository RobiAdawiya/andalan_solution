import { useState, useEffect } from "react";
import { X, Trash2, Edit, QrCode } from "lucide-react";
import QRCode from "qrcode";
import searchIcon from "../assets/search.png";
import "../styles/parts.css";
import jsPDF from "jspdf";
// Import fungsi API
import { getProductLogs } from "../services/api"; 

export default function Parts() {
  // --- STATE MANAGEMENT ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [partsData, setPartsData] = useState([]);
  
  // Modal States
  const [showQrModal, setShowQrModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  
  // QR & PDF States
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  
  // Editing States
  const [editingPart, setEditingPart] = useState(null);
  
  // Form States (Tetap dipertahankan strukturnya)
  const [editForm, setEditForm] = useState({
    name: "",
    woNumber: "",
    startDate: "",
    endDate: "",
    status: "Working",
    manpower: ""
  });
  
  const [addForm, setAddForm] = useState({
    name: "",
    woNumber: "",
    startDate: "",
    endDate: "",
    status: "Working",
    manpower: ""
  });

  // --- 1. FETCH DATA DARI API (LOG PRODUCT) ---
  useEffect(() => {
    fetchParts();
  }, []);

  const fetchParts = async () => {
    try {
      setLoading(true);
      const data = await getProductLogs();
      
      const mappedData = data.map((item, index) => {
        // Ambil tanggal dari created_at
        const logDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : "";
        
        return {
          id: item.id || index,
          no: index + 1,
          name: item.name_product || "N/A",      // Mapping: Name
          woNumber: item.machine_name || "N/A",
          startDate: logDate,                    // Mapping: created_at
          endDate: logDate,                      // Mapping: created_at
          status: item.action || "Working",      // Mapping: action
          manpower: item.name_manpower || "-"    // Mapping: Replace isClosed
        };
      });
      
      setPartsData(mappedData);
    } catch (error) {
      console.error("Gagal mengambil data log:", error);
    } finally {
      setLoading(false);
    }
  };

  // --- 2. LOGIKA FILTER SEARCH ---
  const filteredParts = partsData.filter(
    (part) =>
      part.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.woNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 3. ADD PART HANDLERS ---
  const handleAddPart = () => {
    const today = new Date().toISOString().split('T')[0];
    setAddForm({
      name: "",
      woNumber: "",
      startDate: today,
      endDate: today,
      status: "Working",
      manpower: ""
    });
    setShowAddModal(true);
  };

  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveAdd = async () => {
    if (!addForm.name || !addForm.woNumber) {
      alert("Mohon isi field yang diperlukan!");
      return;
    }
    
    // Logic Simpan (Lokal + Placeholder API)
    const newNo = partsData.length > 0 ? Math.max(...partsData.map(p => p.no)) + 1 : 1;
    const newPart = { ...addForm, no: newNo };
    
    setPartsData(prev => [newPart, ...prev]);
    setShowAddModal(false);
    alert("Part berhasil ditambahkan!");
  };

  // --- 4. EDIT PART HANDLERS ---
  const handleEdit = (part) => {
    setEditingPart(part);
    setEditForm({
      name: part.name,
      woNumber: part.woNumber,
      startDate: part.startDate,
      endDate: part.endDate,
      status: part.status,
      manpower: part.manpower
    });
    setShowEditModal(true);
  };

  const handleEditFormChange = (field, value) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveEdit = () => {
    setPartsData(prevData =>
      prevData.map(part =>
        part.no === editingPart.no ? { ...part, ...editForm } : part
      )
    );
    setShowEditModal(false);
    alert("Data berhasil diperbarui!");
  };

  // --- 5. DELETE HANDLER ---
  const handleDelete = (part) => {
    if (window.confirm(`Hapus ${part.name}?`)) {
      setPartsData(prevData => prevData.filter(p => p.no !== part.no));
    }
  };

  // --- 6. QR & PDF LOGIC (FULL) ---
  const sanitizeFilePart = (s) =>
    String(s || "").trim().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "_");

  const handleViewQR = async (part) => {
    try {
      setQrGenerating(true);
      setShowQrModal(true);
      const payload = { machine_name: String(part.woNumber), name_product: String(part.name) };
      setQrPayload(payload);

      const jsonString = JSON.stringify(payload).replace(/":/g, '": ').replace(/","/g, '", "');
      const dataUrl = await QRCode.toDataURL(jsonString, { margin: 2, width: 320 });
      setQrDataUrl(dataUrl);
    } catch (err) {
      setQrError("Gagal generate QR Code.");
    } finally {
      setQrGenerating(false);
    }
  };

  const handleDownloadPdf = () => {
    if (!qrPayload || !qrDataUrl) return;
    const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const qrSize = 100;
    const x = (doc.internal.pageSize.getWidth() - qrSize) / 2;
    doc.addImage(qrDataUrl, "PNG", x, 40, qrSize, qrSize);
    doc.setFontSize(20);
    doc.text(`machine_name : ${qrPayload.machine_name}`, x + 6, 160);
    doc.text(`name_product  : ${qrPayload.name_product}`, x + 6, 170);
    doc.save(`QR_${sanitizeFilePart(qrPayload.name_product)}.pdf`);
  };

  // --- RENDER UI ---
  return (
    <div>
      <div className="parts-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search Parts or Machine..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
        <button className="add-parts-btn" onClick={handleAddPart}>Add Parts</button>
      </div>

      <div className="table-container">
        {loading ? <p style={{textAlign:"center", padding:"2rem"}}>Memuat data dari log...</p> : (
          <table className="parts-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Name</th>
                <th>Machine Name</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Manpower</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part) => (
                <tr key={part.no}>
                  <td>{part.no}</td>
                  <td>{part.name}</td>
                  <td>{part.woNumber}</td>
                  <td>{part.startDate}</td>
                  <td>{part.endDate}</td>
                  <td>
                    <span className={`status-badge status-${part.status.toLowerCase()}`}>
                      {part.status}
                    </span>
                  </td>
                  <td>{part.manpower}</td>
                  <td className="text-center">
                    <div className="action-buttons">
                      <button className="action-btn" onClick={() => handleViewQR(part)}><QrCode size={16} /> View QR</button>
                      <button className="action-btn" onClick={() => handleEdit(part)}><Edit size={16} /> Edit</button>
                      <button className="action-btn" onClick={() => handleDelete(part)}><Trash2 size={16} /> Delete</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODAL ADD (Struktur UI Dipertahankan) --- */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Part</h2>
              <button className="modal-close" onClick={() => setShowAddModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Name *</label>
                <input type="text" className="form-input" value={addForm.name} onChange={(e) => handleAddFormChange("name", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Machine Name *</label>
                <input type="text" className="form-input" value={addForm.woNumber} onChange={(e) => handleAddFormChange("woNumber", e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group"><label>Start Date</label><input type="date" className="form-input" value={addForm.startDate} onChange={(e) => handleAddFormChange("startDate", e.target.value)} /></div>
                <div className="form-group"><label>End Date</label><input type="date" className="form-input" value={addForm.endDate} onChange={(e) => handleAddFormChange("endDate", e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label>Manpower</label>
                <input type="text" className="form-input" value={addForm.manpower} onChange={(e) => handleAddFormChange("manpower", e.target.value)} placeholder="Nama Manpower" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveAdd}>Add Part</button>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL EDIT (Struktur UI Dipertahankan) --- */}
      {showEditModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowEditModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Part</h2>
              <button className="modal-close" onClick={() => setShowEditModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Machine Name (Read Only)</label>
                <input type="text" className="form-input disabled" value={editForm.woNumber} disabled />
              </div>
              <div className="form-group">
                <label>Name</label>
                <input type="text" className="form-input" value={editForm.name} onChange={(e) => handleEditFormChange("name", e.target.value)} />
              </div>
              <div className="form-group">
                <label>Status</label>
                <select className="form-input" value={editForm.status} onChange={(e) => handleEditFormChange("status", e.target.value)}>
                  <option value="Working">Working</option>
                  <option value="Not Working">Not Working</option>
                  <option value="start">start</option>
                  <option value="stop">stop</option>
                </select>
              </div>
              <div className="form-group">
                <label>Manpower</label>
                <input type="text" className="form-input" value={editForm.manpower} onChange={(e) => handleEditFormChange("manpower", e.target.value)} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn-save" onClick={handleSaveEdit}>Save Changes</button>
            </div>
          </div>
        </>
      )}

      {/* --- MODAL QR --- */}
      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowQrModal(false)}></div>
          <div className="modal">
            <div className="modal-header"><h2>QR Code</h2><button className="modal-close" onClick={() => setShowQrModal(false)}><X size={24} /></button></div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              {qrGenerating ? <p>Generating...</p> : qrDataUrl && <img src={qrDataUrl} alt="QR" style={{ width: 300 }} />}
            </div>
            <div className="modal-footer">
              <button className="btn-save" onClick={handleDownloadPdf}>Download PDF</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}