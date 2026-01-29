import { useState, useEffect } from "react";
import { Search, X, Trash2, QrCode, History } from "lucide-react";
import QRCode from "qrcode";
import jsPDF from "jspdf";
import "../styles/parts.css";

// Import API functions
import { getProductList, getProductLogs } from "../services/api";

export default function Parts() {
  // --- STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [partsData, setPartsData] = useState([]); // Master data
  const [allLogs, setAllLogs] = useState([]); // Seluruh logs dari API

  // Modals Control
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // QR & PDF States
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);

  // History Selection
  const [selectedPartHistory, setSelectedPartHistory] = useState(null);

  // Form State
  const [addForm, setAddForm] = useState({
    machine_name: "",
    name_product: "",
  });

  // --- 1. FETCH DATA DARI API ---
  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [products, logs] = await Promise.all([
        getProductList(),
        getProductLogs(),
      ]);

      const mappedProducts = products.map((item, index) => ({
        ...item,
        no: index + 1,
      }));

      setPartsData(mappedProducts);
      setAllLogs(logs);
    } catch (error) {
      console.error("Fetch Error:", error);
      alert("Gagal memuat data dari database.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  // --- 2. FILTER SEARCH ---
  const filteredParts = partsData.filter(
    (part) =>
      part.name_product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.machine_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 3. HANDLERS ---

  // QR Code Generator
  const handleViewQR = async (part) => {
    try {
      setQrError("");
      setQrDataUrl("");
      setQrGenerating(true);

      const payload = {
        machine_name: String(part.machine_name),
        name_product: String(part.name_product),
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
      setQrError("Gagal generate QR Code.");
      setShowQrModal(true);
    } finally {
      setQrGenerating(false);
    }
  };

  // View History Logic (Sesuai kode kedua)
  const handleViewHistory = (part) => {
    const specificHistory = allLogs.filter(
      (log) =>
        log.machine_name === part.machine_name &&
        log.name_product === part.name_product
    );

    setSelectedPartHistory({
      machine_name: part.machine_name,
      name_product: part.name_product,
      history: specificHistory,
    });
    setShowHistoryModal(true);
  };

  // PDF Export
  const handleDownloadPdf = () => {
    try {
      if (!qrPayload || !qrDataUrl) return;
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const qrSize = 100;
      const pageWidth = doc.internal.pageSize.getWidth();
      const x = (pageWidth - qrSize) / 2;
      
      doc.setFont("helvetica", "bold");
      doc.setFontSize(18);
      doc.text("PART QR CODE", 105, 25, { align: "center" });
      
      doc.addImage(qrDataUrl, "PNG", x, 40, qrSize, qrSize);
      
      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.text(`Machine Name : ${qrPayload.machine_name}`, x + 5, 155);
      doc.text(`Name Product  : ${qrPayload.name_product}`, x + 5, 163);
      
      doc.save(`QR_${qrPayload.machine_name}_${qrPayload.name_product}.pdf`);
    } catch (err) {
      alert("Gagal membuat PDF.");
    }
  };

  const handleDelete = (part) => {
    if (window.confirm(`Hapus data ${part.name_product}? (Hanya local)`)) {
      setPartsData(prev => prev.filter(p => p.no !== part.no));
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
              placeholder="Search Machine or Product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          {/* <button className="add-parts-btn" onClick={() => setShowAddModal(true)}>
            Add Parts
          </button> */}
        </div>
      </div>

      <div className="table-container">
        {loading ? (
          <p style={{ textAlign: "center", padding: "2rem" }}>Syncing with Database...</p>
        ) : (
          <table className="parts-table">
            <thead>
              <tr>
                <th>No.</th>
                <th>Machine Name</th>
                <th>Name Product</th>
                <th className="text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part) => (
                <tr key={part.no}>
                  <td>{part.no}</td>
                  <td>{part.machine_name}</td>
                  <td>{part.name_product}</td>
                  <td className="text-center">
                    <div className="action-buttons">
                      <button className="action-btn" onClick={() => handleViewQR(part)} title="QR">
                        <QrCode size={16} /> View QR
                      </button>
                      <button className="action-btn" onClick={() => handleViewHistory(part)} title="History">
                        <History size={16} /> History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- HISTORY MODAL --- */}
      {showHistoryModal && selectedPartHistory && (
        <>
          <div className="modal-overlay" onClick={() => setShowHistoryModal(false)}></div>
          <div className="modal modal-large">
            <div className="modal-header">
              <h2>History - {selectedPartHistory.name_product}</h2>
              <button className="modal-close" onClick={() => setShowHistoryModal(false)}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div style={{ marginBottom: '15px', color: '#666' }}>
                Machine: <strong>{selectedPartHistory.machine_name}</strong>
              </div>
              {selectedPartHistory.history.length > 0 ? (
                <table className="history-table">
                  <thead>
                    <tr>
                      <th>No.</th>
                      <th>Log Date</th>
                      <th>Action</th>
                      <th>Manpower</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedPartHistory.history.map((log, index) => (
                      <tr key={index}>
                        <td>{index + 1}</td>
                        <td>{new Date(log.created_at).toLocaleString()}</td>
                        <td>
                          <span className={`history-status status-${log.action.toLowerCase()}`}>
                            {log.action}
                          </span>
                        </td>
                        <td>{log.name_manpower}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: 'center', padding: '20px' }}>No logs found for this part.</p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowHistoryModal(false)}>Close</button>
            </div>
          </div>
        </>
      )}

      {/* --- QR MODAL --- */}
      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={() => setShowQrModal(false)}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>QR Code</h2>
              <button className="modal-close" onClick={() => setShowQrModal(false)}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              {qrGenerating ? <p>Generating...</p> : qrDataUrl && (
                <img src={qrDataUrl} alt="QR" style={{ width: 320, maxWidth: "100%", borderRadius: 8 }} />
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowQrModal(false)}>Close</button>
              <button className="btn-save" onClick={handleDownloadPdf}>Download PDF</button>
            </div>
          </div>
        </>
      )}

      {/* --- ADD MODAL --- */}
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
                <label>Machine Name *</label>
                <input type="text" value={addForm.machine_name} onChange={(e) => setAddForm({...addForm, machine_name: e.target.value})} className="form-input" placeholder="e.g. Machine-01" />
              </div>
              <div className="form-group">
                <label>Product Name *</label>
                <input type="text" value={addForm.name_product} onChange={(e) => setAddForm({...addForm, name_product: e.target.value})} className="form-input" placeholder="e.g. Bearing" />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-save" onClick={() => alert("Add function not yet linked to API")}>Add Part</button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}