import { useState } from "react";
import searchIcon from "../assets/search.png";
import "../styles/workorder.css";

export default function WorkOrder() {
  const [searchQuery, setSearchQuery] = useState("");

  const workOrderData = [
    { no: 1, woNumber: "WO-2024-001", device: "Device 1", status: "In Progress", date: "2024-01-20" },
    { no: 2, woNumber: "WO-2024-002", device: "Device 2", status: "Completed", date: "2024-01-19" },
    { no: 3, woNumber: "WO-2024-003", device: "Device 3", status: "Pending", date: "2024-01-21" },
    { no: 4, woNumber: "WO-2024-004", device: "Device 4", status: "In Progress", date: "2024-01-22" },
    { no: 5, woNumber: "WO-2024-005", device: "Device 1", status: "Completed", date: "2024-01-18" },
  ];

  const filteredWorkOrder = workOrderData.filter(wo =>
    wo.woNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    wo.device.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddWorkOrder = () => {
    console.log("Add work order clicked");
  };

  return (
    <div>
      <div className="workorder-top">
        <div className="search-wrapper">
          <img src={searchIcon} alt="Search" className="search-icon" />
          <input
            type="text"
            placeholder="Search Work Order"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>

        <button className="add-workorder-btn" onClick={handleAddWorkOrder}>
          Add Work Order
        </button>
      </div>

      <div className="table-container">
        <table className="workorder-table">
          <thead>
            <tr>
              <th>No.</th>
              <th>WO Number</th>
              <th>Device</th>
              <th>Status</th>
              <th>Date</th>
            </tr>
          </thead>
          <tbody>
            {filteredWorkOrder.map((wo) => (
              <tr key={wo.no}>
                <td>{wo.no}</td>
                <td>{wo.woNumber}</td>
                <td>{wo.device}</td>
                <td>
                  <span className={`status-badge status-${wo.status.toLowerCase().replace(' ', '-')}`}>
                    {wo.status}
                  </span>
                </td>
                <td>{wo.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}