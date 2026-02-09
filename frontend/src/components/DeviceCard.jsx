import React from "react";
import { Activity, Zap, Battery, TrendingUp, Thermometer } from "lucide-react";

export default function DeviceCard({ device, onViewDetails }) {
  return (
    <div className="device-card-dashboard">
      <div className="device-card-header">
        <h3>{device.name}</h3>
        <span
          className={`device-badge status-${
            device.deviceStatus === "RUNNING" ? "active" : "warning"
          }`}
        >
          {device.deviceStatus}
        </span>
      </div>

      <div className="device-card-info">
        <div className="info-row">
          <Activity size={16} /> <span>Uptime: {device.uptime}</span>
        </div>
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
      </div>

      <button className="btn-view-details" onClick={() => onViewDetails(device)}>
        View Details
      </button>
    </div>
  );
}