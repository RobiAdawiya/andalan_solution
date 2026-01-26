import { useState } from "react";
import { X, Trash2, Edit, QrCode } from "lucide-react";
import QRCode from "qrcode";
import { saveAs } from "file-saver";
import searchIcon from "../assets/search.png";
import "../styles/parts.css";

export default function Parts() {
  const [searchQuery, setSearchQuery] = useState("");

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrPayload, setQrPayload] = useState(null);
  const [qrError, setQrError] = useState("");
  const [qrGenerating, setQrGenerating] = useState(false);

  const partsData = [
    { no: 1, nama: "Bearing", kode: "BRG-001", stok: 150, satuan: "Pcs" },
    { no: 2, nama: "Belt", kode: "BLT-002", stok: 80, satuan: "Meter" },
    { no: 3, nama: "Oil Filter", kode: "OFL-003", stok: 200, satuan: "Pcs" },
    { no: 4, nama: "Gasket", kode: "GSK-004", stok: 300, satuan: "Pcs" },
    { no: 5, nama: "Bolt M10", kode: "BLT-005", stok: 500, satuan: "Pcs" },
  ];

  const filteredParts = partsData.filter(
    (part) =>
      part.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
      part.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPart = () => {
    console.log("Add part clicked");
  };

  const handleEdit = (part) => {
    console.log("Edit part:", part);
  };

  const handleDelete = (part) => {
    console.log("Delete part:", part);
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
        kode: String(part.kode),
        nama: String(part.nama),
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

  const handleDownloadWord = () => {
    try {
      if (!qrPayload || !qrDataUrl) return;

      const kodePart = sanitizeFilePart(qrPayload.kode);
      const namaPart = sanitizeFilePart(qrPayload.nama);
      const filename = `QR_PART_${kodePart}_${namaPart}.doc`;

      const html = `<!DOCTYPE html>
        <html xmlns:o="urn:schemas-microsoft-com:office:office"
              xmlns:w="urn:schemas-microsoft-com:office:word"
              xmlns="http://www.w3.org/TR/REC-html40">
        <head>
          <meta charset="utf-8">
          <title>QR</title>
          <!--[if gte mso 9]>
          <xml>
            <w:WordDocument>
              <w:View>Print</w:View>
              <w:Zoom>100</w:Zoom>
              <w:DoNotOptimizeForBrowser/>
            </w:WordDocument>
          </xml>
          <![endif]-->
          <style>
            @page { margin: 1in; }
            body { margin: 0; padding: 0; }
            .wrap { width: 100%; text-align: center; margin-top: 20px; }
            img { width: 320px; height: 320px; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <img src="${qrDataUrl}" />
          </div>
        </body>
        </html>`;

      const blob = new Blob([html], { type: "application/msword;charset=utf-8" });
      saveAs(blob, filename);
    } catch (err) {
      console.error(err);
      alert("Gagal membuat file Word.");
    }
  };

  return (
    <div>
      <div className="parts-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
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

      <div className="table-container">
        <table className="parts-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>Nama Parts</th>
              <th>Kode</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((part) => (
              <tr key={part.no}>
                <td>{part.no}</td>
                <td>{part.nama}</td>
                <td>{part.kode}</td>
                <td>
                  <div className="action-buttons">
                    <button 
                      className="action-btn" 
                      onClick={() => handleViewQR(part)}
                      title="View QR"
                    >
                      <span>View QR</span>
                      <QrCode size={18} />
                    </button>
                    <button 
                      className="action-btn" 
                      onClick={() => handleEdit(part)}
                      title="Edit"
                    >
                      <span>Edit</span> 
                      <Edit size={18} />
                    </button>
                    <button 
                      className="action-btn" 
                      onClick={() => handleDelete(part)}
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
                <button className="btn-save" onClick={handleDownloadWord}>
                  Download Word
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
