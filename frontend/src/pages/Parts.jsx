import { useState, useEffect } from "react";
import { X, QrCode, History } from "lucide-react";
import QRCode from "qrcode";
import searchIcon from "../assets/search.png";
import "../styles/parts.css";
import jsPDF from "jspdf";
// Import API functions (Adjust path if necessary)
import { getProductList, getProductLogs } from "../services/api";

export default function Parts() {
  // --- STATES ---
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [partsData, setPartsData] = useState([]); // Main table data
  const [allLogs, setAllLogs] = useState([]); // Holds all history logs

  // Modals
  const [showQrModal, setShowQrModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // QR & PDF
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);

  // History Selection
  const [selectedPartHistory, setSelectedPartHistory] = useState(null);

  // Simplified Add Form (Old fields removed as they don't exist in master product)
  const [addForm, setAddForm] = useState({
    machine_name: "",
    name_product: "",
  });

  // --- 1. FETCH DATA (API Integration) ---
  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      // Fetch both master list and logs in parallel
      const [productsData, logsData] = await Promise.all([
        getProductList(),
        getProductLogs(),
      ]);

      // Map API data to add 'no' for table indexing
      const mappedProducts = productsData.map((item, index) => ({
        ...item,
        no: index + 1,
      }));

      setPartsData(mappedProducts);
      setAllLogs(logsData); // Store all logs for client-side filtering later
    } catch (error) {
      console.error("Error fetching data:", error);
      alert("Failed to fetch data from server.");
    } finally {
      setLoading(false);
    }
  };

  // --- 2. SEARCH FILTER ---
  const filteredParts = partsData.filter(
    (part) =>
      part.name_product?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.machine_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // --- 3. HANDLERS ---

  // QR Code Handler (Updated fields)
  const handleViewQR = async (part) => {
    try {
      setQrError("");
      setQrDataUrl("");
      setQrGenerating(true);

      // Use new column names based on API requirement
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
      console.error(err);
      setQrError("Gagal generate QR Code.");
      setShowQrModal(true);
    } finally {
      setQrGenerating(false);
    }
  };

  // History Handler (Updated logic to filter logs)
  const handleViewHistory = (part) => {
    // Filter the pre-fetched logs based on current part's machine and product name
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

  // --- Modal Closers ---
  const handleCloseQrModal = () => {
    setShowQrModal(false);
    setQrDataUrl("");
    setQrPayload(null);
    setQrError("");
    setQrGenerating(false);
  };

  const handleCloseHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedPartHistory(null);
  };

  const handleCloseAddModal = () => {
    setShowAddModal(false);
    setAddForm({ machine_name: "", name_product: "" });
  };

  // --- Add / Delete Handlers (Placeholder/Modified) ---
  const handleAddPart = () => {
    // Keeping the button active to maintain UI structure, but form is empty
    setShowAddModal(true);
  };
  
  // const handleDelete = (part) => {
    // Delete functionality removed from requirements for this page
  // };

  // --- PDF Download ---
  const handleDownloadPdf = async () => {
    try {
      if (!qrPayload || !qrDataUrl) return;
      const sanitizeFilePart = (s) => String(s || "").trim().replace(/\s+/g, "_").replace(/[^\w\-]+/g, "_");
      const woPart = sanitizeFilePart(qrPayload.machine_name);
      const namaPart = sanitizeFilePart(qrPayload.name_product);
      const filename = `QR_PART_${woPart}_${namaPart}.pdf`;
      const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
      const imgData = qrDataUrl;
      const pageWidth = doc.internal.pageSize.getWidth();
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
        `name_product : ${qrPayload.name_product}`,
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

  // --- RENDER UI ---
  return (
    <div>
      <div className="parts-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search Machine or Product"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        {/* Kept button to maintain layout structure */}
        <button className="add-parts-btn" onClick={handleAddPart}>
          Add Parts
        </button>
      </div>

      <div className="table-container">
        {loading ? (
          <p style={{ textAlign: "center", padding: "20px" }}>Loading data...</p>
        ) : (
          <table className="parts-table">
            <thead>
              <tr>
                {/* NEW COLUMN STRUCTURE */}
                <th>No.</th>
                <th>Machine Name</th>
                <th>Name Product</th>
                <th className="text-center" style={{ minWidth: "180px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredParts.map((part) => (
                <tr key={part.no}>
                  <td>{part.no}</td>
                  {/* MAPPING API DATA */}
                  <td>{part.machine_name}</td>
                  <td>{part.name_product}</td>
                  <td className="text-center">
                    <div className="action-buttons" style={{ justifyContent: "center" }}>
                      <button
                        className="action-btn"
                        onClick={() => handleViewQR(part)}
                        title="View QR"
                      >
                        <QrCode size={16} />
                        View QR
                      </button>
                      {/* Delete button removed */}
                      <button
                        className="action-btn"
                        onClick={() => handleViewHistory(part)}
                        title="History"
                      >
                        <History size={16} />
                        History
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* --- MODALS --- */}

      {/* HISTORY MODAL (Updated Structure) */}
      {showHistoryModal && selectedPartHistory && (
        <>
          <div className="modal-overlay" onClick={handleCloseHistoryModal}></div>
          <div className="modal modal-large" style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              {/* Shows which product we are viewing history for */}
              <h2>History - {selectedPartHistory.name_product} ({selectedPartHistory.machine_name})</h2>
              <button className="modal-close" onClick={handleCloseHistoryModal}>
                <X size={24} />
              </button>
            </div>

            <div className="modal-body">
              {selectedPartHistory.history && selectedPartHistory.history.length > 0 ? (
                <div className="history-table-container" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="history-table">
                    <thead>
                      <tr>
                        {/* Columns match log_product structure data relevant for display */}
                        <th>No.</th>
                        <th>Log Date</th>
                        <th>Action</th>
                        <th>Manpower</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedPartHistory.history.map((log, index) => (
                        <tr key={log.id || index}>
                          <td>{index + 1}</td>
                          {/* Format created_at */}
                          <td>{new Date(log.created_at).toLocaleString()}</td>
                          <td>
                            {/* Simple styling for action (start/stop) */}
                            <span className={`history-status status-${log.action.toLowerCase()}`}>
                              {log.action}
                            </span>
                          </td>
                          <td>{log.name_manpower}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ textAlign: "center", color: "#666", padding: "20px" }}>
                  No history logs found for this product on this machine.
                </p>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseHistoryModal}>Close</button>
            </div>
          </div>
        </>
      )}

      {/* QR MODAL (Kept existing structure) */}
      {showQrModal && (
        <>
          <div className="modal-overlay" onClick={handleCloseQrModal}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>QR Code</h2>
              <button className="modal-close" onClick={handleCloseQrModal}><X size={24} /></button>
            </div>
            <div className="modal-body" style={{ textAlign: "center" }}>
              {qrError ? (
                <p className="error-text">{qrError}</p>
              ) : qrGenerating ? (
                <p>Generating QR...</p>
              ) : (
                qrDataUrl && <img src={qrDataUrl} alt="QR Code" style={{ width: 320, maxWidth: "100%", borderRadius: 8 }} />
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseQrModal}>Close</button>
              {qrDataUrl && !qrError && (
                <button className="btn-save" onClick={handleDownloadPdf}>Download PDF</button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ADD MODAL (Kept structure, but fields commented out as they don't fit new data model) */}
      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={handleCloseAddModal}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Part (Master)</h2>
              <button className="modal-close" onClick={handleCloseAddModal}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <p>Adding new master products is not yet implemented via API.</p>
              {/* OLD FORM FIELDS COMMENTED OUT DUE TO SCHEMA CHANGE
              <div className="form-group">
                <label>Nama Parts *</label>
                <input type="text" value={addForm.nama} onChange={(e) => setAddForm({ ...addForm, nama: e.target.value })} className="form-input" />
              </div>
               ... other fields ...
              */}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={handleCloseAddModal}>Close</button>
              {/* <button className="btn-save" onClick={() => alert("Not implemented")}>Add Part</button> */}
            </div>
          </div>
        </>
      )}
    </div>
  );
}