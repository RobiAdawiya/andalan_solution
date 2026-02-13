import React from "react";
import { Activity, Zap, Battery, TrendingUp, Thermometer, SquareUser,  Bolt} from "lucide-react";

const getBadgeClass = (status) => {
  if (status === "RUNNING") return "status-running"; // Hijau/Biru
  if (status === "STANDBY") return "status-warning"; // Kuning (sesuai logic CSS anda sebelumnya)
  return "status-stop";   // Merah
};

export default function DeviceCard({ device, onViewDetails }) {
  return (
    <div className="device-card-dashboard">
      <div className="device-card-header">
        <h3>{device.name}</h3>          
        <span className={`device-badge ${getBadgeClass(device.deviceStatus)}`}>
          {device.deviceStatus}
        </span>
      </div>

      <div className="device-card-info">
        <div className="info-row">
          <Zap size={16} /> <span>Voltage: {device.voltage}</span>
        </div>
        <div className="info-row">
          <Battery size={16} /> <span>Current: {device.current}</span>
        </div>
        <div className="info-row">
          <TrendingUp size={16} /> <span>Power: {device.power}</span>
        </div>
        <div className="info-row">
          <Thermometer size={16} /> <span>Temp: {device.temperature}</span>
        </div>
        <div className="info-row">
          <SquareUser size={16} /> <span>Operator: {device.assignedManPower}</span>
        </div>
        <div className="info-row">
          <Bolt size={16} /> <span>Part: {device.assignedParts}</span>
        </div>
      </div>

      <button className="btn-view-details" onClick={() => onViewDetails(device)}>
        View Details
      </button>
    </div>
  );
}