import { useState } from "react";
import searchIcon from "../assets/search.png";
import "../styles/parts.css";

export default function Parts() {
  const [searchQuery, setSearchQuery] = useState("");

  const partsData = [
    { no: 1, nama: "Bearing", kode: "BRG-001", stok: 150, satuan: "Pcs" },
    { no: 2, nama: "Belt", kode: "BLT-002", stok: 80, satuan: "Meter" },
    { no: 3, nama: "Oil Filter", kode: "OFL-003", stok: 200, satuan: "Pcs" },
    { no: 4, nama: "Gasket", kode: "GSK-004", stok: 300, satuan: "Pcs" },
    { no: 5, nama: "Bolt M10", kode: "BLT-005", stok: 500, satuan: "Pcs" },
  ];

  const filteredParts = partsData.filter(part =>
    part.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    part.kode.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddPart = () => {
    console.log("Add part clicked");
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
              <th>Stok</th>
              <th>Satuan</th>
            </tr>
          </thead>
          <tbody>
            {filteredParts.map((part) => (
              <tr key={part.no}>
                <td>{part.no}</td>
                <td>{part.nama}</td>
                <td>{part.kode}</td>
                <td>{part.stok}</td>
                <td>{part.satuan}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}