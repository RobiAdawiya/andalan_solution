import { useState, useEffect, useRef } from "react";
import { Edit, Trash2, QrCode, X, Camera } from "lucide-react";
import { Html5QrcodeScanner } from 'html5-qrcode';
import searchIcon from "../assets/search.png";
import "../styles/device.css";

export default function Device() {
  const [searchQuery, setSearchQuery] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQrScanner, setShowQrScanner] = useState(false);
  const [editingDevice, setEditingDevice] = useState(null);
  const [newDevice, setNewDevice] = useState({
    name: "",
    location: "Area A",
    range: "",
    status: "Active",
    qrCode: ""
  });
  const qrScannerRef = useRef(null);

  const [devices, setDevices] = useState([
    { id: 1, name: "Device 1", status: "Active", location: "Area A", range: "100m", qrCode: "QR001" },
    { id: 2, name: "Device 2", status: "Active", location: "Area B", range: "150m", qrCode: "QR002" },
    { id: 3, name: "Device 3", status: "Inactive", location: "Area C", range: "120m", qrCode: "QR003" },
    { id: 4, name: "Device 4", status: "Active", location: "Area D", range: "200m", qrCode: "QR004" },
    { id: 5, name: "Device 5", status: "Active", location: "Area A", range: "80m", qrCode: "QR005" },
    { id: 6, name: "Device 6", status: "Inactive", location: "Area B", range: "90m", qrCode: "QR006" },
    { id: 7, name: "Device 7", status: "Active", location: "Area C", range: "110m", qrCode: "QR007" },
    { id: 8, name: "Device 8", status: "Active", location: "Area D", range: "130m", qrCode: "QR008" },
  ]);

  useEffect(() => {
    if (showQrScanner && !qrScannerRef.current) {
      const scanner = new Html5QrcodeScanner('qr-reader', {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0
      });
      
      scanner.render(
        (decodedText) => {
          setNewDevice({...newDevice, qrCode: decodedText});
          setShowQrScanner(false);
          if (qrScannerRef.current) {
            qrScannerRef.current.clear().catch(console.error);
            qrScannerRef.current = null;
          }
          alert(`QR Code Scanned: ${decodedText}`);
        },
        (error) => {
          console.error(error);
        }
      );
      
      qrScannerRef.current = scanner;
    }

    return () => {
      if (qrScannerRef.current && !showQrScanner) {
        qrScannerRef.current.clear().catch(console.error);
        qrScannerRef.current = null;
      }
    };
  }, [showQrScanner]);

  const filteredDevices = devices.filter(device =>
    device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    device.location.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddDevice = () => {
    setShowAddModal(true);
    setNewDevice({
      name: "",
      location: "Area A",
      range: "",
      status: "Active",
      qrCode: ""
    });
  };

  const handleOpenQrScanner = () => {
    setShowQrScanner(true);
  };

  const handleSaveNewDevice = () => {
    if (!newDevice.name || !newDevice.location || !newDevice.range || !newDevice.qrCode) {
      alert("Semua field harus diisi dan QR Code harus di-scan!");
      return;
    }

    if (devices.some(device => device.qrCode === newDevice.qrCode)) {
      alert("QR Code sudah terdaftar!");
      return;
    }

    const newId = Math.max(...devices.map(d => d.id), 0) + 1;
    setDevices([...devices, { ...newDevice, id: newId }]);
    setShowAddModal(false);
    setNewDevice({
      name: "",
      location: "Area A",
      range: "",
      status: "Active",
      qrCode: ""
    });
    alert("Device berhasil ditambahkan!");
  };

  const handleCancelAdd = () => {
    setShowAddModal(false);
    setShowQrScanner(false);
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().catch(console.error);
      qrScannerRef.current = null;
    }
    setNewDevice({
      name: "",
      location: "Area A",
      range: "",
      status: "Active",
      qrCode: ""
    });
  };

  const handleEdit = (device) => {
    setEditingDevice({ ...device });
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    if (!editingDevice.name || !editingDevice.location || !editingDevice.range) {
      alert("Semua field harus diisi!");
      return;
    }

    setDevices(devices.map(device => 
      device.id === editingDevice.id ? editingDevice : device
    ));
    setShowEditModal(false);
    setEditingDevice(null);
    alert("Device berhasil diupdate!");
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingDevice(null);
  };

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this device?")) {
      setDevices(devices.filter(device => device.id !== id));
      alert("Device berhasil dihapus!");
    }
  };

  const handleViewRange = (device) => {
    alert(`Range for ${device.name}: ${device.range}\nLocation: ${device.location}`);
  };

  const handleCancelScan = () => {
    setShowQrScanner(false);
    if (qrScannerRef.current) {
      qrScannerRef.current.clear().catch(console.error);
      qrScannerRef.current = null;
    }
  };

  return (
    <div>
      <div className="device-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search Device"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="add-device-btn" onClick={handleAddDevice}>
          Add Device
        </button>
      </div>

      <div className="device-grid">
        {filteredDevices.length > 0 ? (
          filteredDevices.map((device) => (
            <div key={device.id} className="device-card">
              <div className="device-header">
                <h3>{device.name}</h3>
                <span className={`device-status status-${device.status.toLowerCase()}`}>
                  {device.status}
                </span>
              </div>
              
              <div className="device-body">
                <div className="device-info-item">
                  <span className="device-info-label">Location:</span>
                  <span className="device-info-value">{device.location}</span>
                </div>
                <div className="device-info-item">
                  <span className="device-info-label">Range:</span>
                  <span className="device-info-value">{device.range}</span>
                </div>
                <div className="device-info-item">
                  <span className="device-info-label">QR Code:</span>
                  <span className="device-info-value">{device.qrCode}</span>
                </div>
              </div>

              <div className="device-actions">
                <button 
                  className="device-action-btn range-btn"
                  onClick={() => handleViewRange(device)}
                  title="View Range"
                >
                  <span>Range</span>
                </button>
                <button 
                  className="device-action-btn edit-btn"
                  onClick={() => handleEdit(device)}
                  title="Edit Device"
                >
                  <Edit size={16} />
                  <span>Edit</span>
                </button>
                <button 
                  className="device-action-btn delete-btn"
                  onClick={() => handleDelete(device.id)}
                  title="Delete Device"
                >
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="no-devices">
            <p>No devices found</p>
          </div>
        )}
      </div>

      {showAddModal && (
        <>
          <div className="modal-overlay" onClick={handleCancelAdd}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Add New Device</h2>
              <button className="modal-close" onClick={handleCancelAdd}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              {!showQrScanner ? (
                <>
                  <div className="form-group">
                    <label>Device Name</label>
                    <input
                      type="text"
                      value={newDevice.name}
                      onChange={(e) => setNewDevice({...newDevice, name: e.target.value})}
                      className="form-input"
                      placeholder="Enter device name"
                    />
                  </div>

                  <div className="form-group">
                    <label>Location</label>
                    <select
                      value={newDevice.location}
                      onChange={(e) => setNewDevice({...newDevice, location: e.target.value})}
                      className="form-input"
                    >
                      <option value="Area A">Area A</option>
                      <option value="Area B">Area B</option>
                      <option value="Area C">Area C</option>
                      <option value="Area D">Area D</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Range</label>
                    <input
                      type="text"
                      value={newDevice.range}
                      onChange={(e) => setNewDevice({...newDevice, range: e.target.value})}
                      className="form-input"
                      placeholder="e.g. 100m"
                    />
                  </div>

                  <div className="form-group">
                    <label>Status</label>
                    <select
                      value={newDevice.status}
                      onChange={(e) => setNewDevice({...newDevice, status: e.target.value})}
                      className="form-input"
                    >
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>QR Code</label>
                    <div className="qr-input-group">
                      <input
                        type="text"
                        value={newDevice.qrCode}
                        readOnly
                        className="form-input"
                        placeholder="Scan QR Code"
                      />
                      <button 
                        className="scan-qr-btn"
                        onClick={handleOpenQrScanner}
                      >
                        <Camera size={20} />
                        <span>Scan QR</span>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div className="qr-scanner-container">
                  <h3>Scan QR Code</h3>
                  <div id="qr-reader" style={{ width: '100%' }}></div>
                  <button 
                    className="btn-cancel" 
                    onClick={handleCancelScan}
                    style={{ marginTop: '15px', width: '100%' }}
                  >
                    Cancel Scan
                  </button>
                </div>
              )}
            </div>

            {!showQrScanner && (
              <div className="modal-footer">
                <button className="btn-cancel" onClick={handleCancelAdd}>
                  Cancel
                </button>
                <button className="btn-save" onClick={handleSaveNewDevice}>
                  Add Device
                </button>
              </div>
            )}
          </div>
        </>
      )}

      {showEditModal && editingDevice && (
        <>
          <div className="modal-overlay" onClick={handleCancelEdit}></div>
          <div className="modal">
            <div className="modal-header">
              <h2>Edit Device</h2>
              <button className="modal-close" onClick={handleCancelEdit}>
                <X size={24} />
              </button>
            </div>
            
            <div className="modal-body">
              <div className="form-group">
                <label>Device Name</label>
                <input
                  type="text"
                  value={editingDevice.name}
                  onChange={(e) => setEditingDevice({...editingDevice, name: e.target.value})}
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label>Location</label>
                <select
                  value={editingDevice.location}
                  onChange={(e) => setEditingDevice({...editingDevice, location: e.target.value})}
                  className="form-input"
                >
                  <option value="Area A">Area A</option>
                  <option value="Area B">Area B</option>
                  <option value="Area C">Area C</option>
                  <option value="Area D">Area D</option>
                </select>
              </div>

              <div className="form-group">
                <label>Range</label>
                <input
                  type="text"
                  value={editingDevice.range}
                  onChange={(e) => setEditingDevice({...editingDevice, range: e.target.value})}
                  className="form-input"
                  placeholder="e.g. 100m"
                />
              </div>

              <div className="form-group">
                <label>Status</label>
                <select
                  value={editingDevice.status}
                  onChange={(e) => setEditingDevice({...editingDevice, status: e.target.value})}
                  className="form-input"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>

              <div className="form-group">
                <label>QR Code</label>
                <input
                  type="text"
                  value={editingDevice.qrCode}
                  readOnly
                  className="form-input"
                  disabled
                  style={{ backgroundColor: '#f0f0f0', cursor: 'not-allowed' }}
                />
                <small style={{ color: '#666', fontSize: '12px' }}>
                  QR Code cannot be changed
                </small>
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
