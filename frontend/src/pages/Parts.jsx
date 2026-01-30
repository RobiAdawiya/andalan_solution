import { useState } from "react";
import { Search, X, Trash2, QrCode, History } from "lucide-react";
import QRCode from "qrcode";
import "../styles/parts.css";
import jsPDF from "jspdf";

export default function Parts() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedPartHistory, setSelectedPartHistory] = useState(null);
  const [addForm, setAddForm] = useState({
    nama: "",
    woNumber: "",
    startDate: "",
    endDate: "",
    status: "Working",
    isClosed: false
  });

  const [partsData, setPartsData] = useState([
    { 
      no: 1, 
      nama: "Bearing", 
      woNumber: "WO-001",
      startDate: "2026-01-15",
      endDate: "2026-01-25",
      status: "Working",
      isClosed: false,
      history: [
        { no: 1, name: "SAMSUNG", machineName: "EXYNOS", startDate: "2026-01-27", endDate: "2026-01-27", status: "stop", manpower: "Alice Brotoseno" },
        { no: 2, name: "SAMSUNG", machineName: "EXYNOS", startDate: "2026-01-27", endDate: "2026-01-27", status: "start", manpower: "Alice Brotoseno" },
        { no: 3, name: "SAMSUNG", machineName: "EXYNOS", startDate: "2026-01-27", endDate: "2026-01-27", status: "stop", manpower: "Alice Brotoseno" },
      ]
    },
  ]);

  const filteredParts = partsData.filter(
    (part) =>
      part.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.woNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPart = () => {
    setAddForm({
      nama: "",
      woNumber: "",
      startDate: "",
      endDate: "",
      status: "Working",
      isClosed: false
    });
    setShowAddModal(true);
  };

  const handleAddFormChange = (field, value) => {
    setAddForm(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleViewHistory = (part) => {
    setSelectedPartHistory(part);
    setShowHistoryModal(true);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedPartHistory(null);
  };

  const handleSaveAdd = () => {
    if (!addForm.nama || !addForm.woNumber || !addForm.startDate || !addForm.endDate) {
      alert("Please fill in all required fields");
      return;
    }
    
    const woExists = partsData.some(part => part.woNumber === addForm.woNumber);
    if (woExists) {
      alert("WO Number already exists. Please use a different WO Number.");
      return;
    }

    const newNo = partsData.length > 0 ? Math.max(...partsData.map(p => p.no)) + 1 : 1;

    const newPart = {
      no: newNo,
      nama: addForm.nama,
      woNumber: addForm.woNumber,
      startDate: addForm.startDate,
      endDate: addForm.endDate,
      status: addForm.status,
      isClosed: addForm.isClosed,
      history: []
    };

    setPartsData(prev => [...prev, newPart]);
    handleCloseAddModal();
    alert("Part added successfully!");
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddForm({
      nama: "",
      woNumber: "",
      startDate: "",
      endDate: "",
      status: "Working",
      isClosed: false
    });
  };

  const handleDelete = (part) => {
    if (window.confirm(`Are you sure you want to delete ${part.nama}?`)) {
      setPartsData(prevData => prevData.filter(p => p.no !== part.no));
    }
  };

  const handleStatusChange = (partNo, newStatus) => {
    setPartsData(prevData =>
      prevData.map(part =>
        part.no === partNo ? { ...part, status: newStatus } : part
      )
    );
  };

  const handleClosedToggle = (partNo) => {
    setPartsData(prevData =>
      prevData.map(part =>
        part.no === partNo ? { ...part, isClosed: !part.isClosed } : part
      )
    );
  };

  const sanitizeFilePart = (s) =>
    String(s || "")
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^\w\-]+/g, "_");

  const handleViewQR = async (part) => {
    try {
      setQrError("");
      setQrDataUrl("");
      setQrGenerating(true);

      const payload = {
        machine_name: String(part.woNumber),
        name_product: String(part.nama),
      };

      setQrPayload(payload);

      const jsonString = JSON.stringify(payload)
        .replace(/":/g, '": ')
        .replace(/","/g, '", "');
      
      const dataUrl = await QRCode.toDataURL(jsonString, {
        margin: 2,
        width: 320,
        errorCorrectionLevel: "M",
      });

      setQrDataUrl(dataUrl);
      setShowQrModal(true);
    } catch (err) {
      console.error(err);
      setQrError("Gagal generate QR Code.");
      setShowQrModal(true);
    } finally {
      setQrGenerating(false);
    }
  };

  const handleCloseQrModal = () => {
    setShowQrModal(false);
    setQrDataUrl("");
    setQrPayload(null);
    setQrError("");
    setQrGenerating(false);
  };

  const handleDownloadPdf = async () => {
    try {
      if (!qrPayload || !qrDataUrl) return;

      const woPart = sanitizeFilePart(qrPayload.machine_name);
      const namaPart = sanitizeFilePart(qrPayload.name_product);
      const filename = `QR_PART_${woPart}_${namaPart}.pdf`;

      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });

      const imgData = qrDataUrl;

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      const qrSize = 100;
      const x = (pageWidth - qrSize) / 2;
      const y = 40;

      doc.addImage(imgData, "PNG", x, y, qrSize, qrSize);

      const textY = y + qrSize + 20;

      const textX = x + 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(20);

      const lines = [
        `machine_name : ${qrPayload.machine_name}`,
        `name_product      : ${qrPayload.name_product}`,
      ];

      lines.forEach((line, i) => {
        doc.text(line, textX, textY + i * 7);
      });

      doc.save(filename);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat PDF.");
    }
  };

  return (
    <div>
      <div className="page-header">
              <h1 className="page-title">PARTS</h1>
      
              <div className="parts-top">
                <div className="search-wrapper">
                  <Search className="search-icon" size={20} />
                  <input
                    type="text"
                    placeholder="Search Parts"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="search-input"
                  />
                </div>

                <button className="add-parts-btn" onClick={handleAddPart}>
                  Add Parts
                </button>
              </div>
            </div>

      <div className="table-container">
        <table className="parts-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama Parts</th>
              <th>WO Number</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Status</th>
              <th>Closed</th>
              <th className="text-center">Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((part) => (
              <tr key={part.no}>
                <td>{part.no}</td>
                <td>{part.nama}</td>
                <td>{part.woNumber}</td>
                <td>{part.startDate}</td>
                <td>{part.endDate}</td>
                <td>
                  <select 
                    className={`status-select ${part.status === "Working" ? "status-working" : "status-not-working"}`}
                    value={part.status}
                    onChange={(e) => handleStatusChange(part.no, e.target.value)}
                  >
                    <option value="Working">Working</option>
                    <option value="Not Working">Not Working</option>
                  </select>
                </td>
                <td>
                  <label className="checkbox-container">
                    <input
                      type="checkbox"
                      checked={part.isClosed}
                      onChange={() => handleClosedToggle(part.no)}
                    />
                    <span className="checkbox-label">{part.isClosed ? "Closed" : "Open"}</span>
                  </label>
                </td>
                <td className="text-center">
                  <div className="action-buttons">
                    <button 
                      className="action-btn" 
                      onClick={() => handleViewQR(part)}
                      title="View QR"
                    >
                      <QrCode size={16} />
                      View QR
                    </button>
                    <button 
                      className="action-btn" 
                      onClick={() => handleViewHistory(part)}
                      title="History"
                    >
                      <History size={16} />
                      History
                    </button>
                    <button 
                      className="action-btn" 
                      onClick={() => handleDelete(part)}
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
      
      {showHistoryModal && selectedPartHistory && (
        <>
          <div className="modal-overlay" onClick={handleCloseHistoryModal}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>History - {selectedPartHistory.nama} ({selectedPartHistory.woNumber})</h2>
              <button className="modal-close" onClick={handleCloseHistoryModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {selectedPartHistory.history && selectedPartHistory.history.length > 0 ? (
                <div className="history-table-container">
                  <table className="history-table">
                    <thead>
                      <tr>
                        <th>No.</th>
                        <th>Name</th>
                        <th>Machine Name</th>
                        <th>Start Date</th>
                        <th>End Date</th>
                        <th>Status</th>
                        <th>Manpower</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPartHistory.history.map((log) => (
                        <tr key={log.no}>
                          <td>{log.no}</td>
                          <td>{log.name}</td>
                          <td>{log.machineName}</td>
                          <td>{log.startDate}</td>
                          <td>{log.endDate}</td>
                          <td>
                            <span className={`history-status ${log.status === "start" ? "status-start" : "status-stop"}`}>
                              {log.status}
                            </span>
                          </td>
                          <td>{log.manpower}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: 'center', color: '#666', padding: '20px' }}>
                  No history available for this part
                </p>
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseHistoryModal}>
                Close
              </button>
            </div>
          </div>
        </>
      )}

      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={handleCloseQrModal}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>QR Code</h2>
              <button className="modal-close" onClick={handleCloseQrModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body" style={{ textAlign: "center" }}>
              {qrError ? (
                <p className="error-text">{qrError}</p>
              ) : qrGenerating ? (
                <p>Generating QR...</p>
              ) : (
                qrDataUrl && (
                  <img
                    src={qrDataUrl}
                    alt="QR Code"
                    style={{ width: 320, maxWidth: "100%", borderRadius: 8 }}
                  />
                )
              )}
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseQrModal}>
                Close
              </button>

              {qrDataUrl && !qrError && (
                <button className="btn-save" onClick={handleDownloadPdf}>
                  Download PDF
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={handleCloseAddModal}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Part</h2>
              <button className="modal-close" onClick={handleCloseAddModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label>Nama Parts *</label>
                <input
                  type="text"
                  value={addForm.nama}
                  onChange={(e) => handleAddFormChange("nama", e.target.value)}
                  className="form-input"
                  placeholder="Masukkan nama parts"
                />
              </div>

              <div className="form-group">
                <label>WO Number *</label>
                <input
                  type="text"
                  value={addForm.woNumber}
                  onChange={(e) => handleAddFormChange("woNumber", e.target.value)}
                  className="form-input"
                  placeholder="Masukkan WO number (e.g., WO-001)"
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Start Date *</label>
                  <input
                    type="date"
                    value={addForm.startDate}
                    onChange={(e) => handleAddFormChange("startDate", e.target.value)}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>End Date *</label>
                  <input
                    type="date"
                    value={addForm.endDate}
                    onChange={(e) => handleAddFormChange("endDate", e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={addForm.status}
                  onChange={(e) => handleAddFormChange("status", e.target.value)}
                  className={`form-input ${addForm.status === "Working" ? "status-working" : "status-not-working"}`}
                >
                  <option value="Working">Working</option>
                  <option value="Not Working">Not Working</option>
                </select>
              </div>

              <div className="form-group">
                <label className="checkbox-container">
                  <input
                    type="checkbox"
                    checked={addForm.isClosed}
                    onChange={(e) => handleAddFormChange("isClosed", e.target.checked)}
                  />
                  <span className="checkbox-label">
                    {addForm.isClosed ? "Closed" : "Open"}
                  </span>
                </label>
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseAddModal}>
                Cancel
              </button>
              <button className="btn-save" onClick={handleSaveAdd}>
                Add Part
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}