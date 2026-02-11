import React from "react";
import "../styles/dashboard.css"; // Ensure you import your CSS
const getStatusClass = (status) => {
  if (status === "RUNNING") return "status-running";
  if (status === "STANDBY") return "status-standby"; // Gunakan nama class yang spesifik
  return "status-stop";
};

export default function TimelineCard({ device, timelineLabels }) { 
  const { comparisonStatusSummary, comparisonChartTimeline } = device;

  if (!comparisonStatusSummary || !comparisonChartTimeline) {
    return <div className="comparison-row">Loading comparison data...</div>;
  }

  return (
    <div className="comparison-row">
      <div className="comparison-device-info">
        <h3>{device.name}</h3>
        <span
          className={`comparison-status ${getStatusClass(device.deviceStatus)}`}
        >
          {device.deviceStatus}
        </span>
      </div>

      <div className="comparison-timeline-content">
        <div className="comparison-stats">
          <div className="stat-item running">
            <span className="stat-label">● RUN</span>
            <span className="stat-value">{comparisonStatusSummary.running}</span>
          </div>
          <div className="stat-item standby">
            <span className="stat-label">● STAND BY</span>
            <span className="stat-value">{comparisonStatusSummary.standby || "00:00:00"}</span>
          </div>
          <div className="stat-item stop">
            <span className="stat-label">● STOP</span>
            <span className="stat-value">{comparisonStatusSummary.stop}</span>
          </div>
          <div className="stat-item total">
            <span className="stat-label">● TOTAL</span>
            <span className="stat-value">{comparisonStatusSummary.total}</span>
          </div>
        </div>

        {/* --- TIMELINE BAR --- */}
        <div className="comparison-timeline-bar" style={{ display: 'flex', width: '100%', height: '20px', borderRadius: '4px', overflow: 'hidden' }}>
          {comparisonChartTimeline.length > 0 ? (
            comparisonChartTimeline.map((segment, idx) => (
              <div
                key={idx}
                className="comparison-segment"
                style={{
                  backgroundColor: segment.color,
                  // FIX: Use duration so width is proportional to time
                  flex: segment.duration, 
                  // Optional: remove minWidth so very short spikes don't distort the graph
                  minWidth: "1px", 
                }}
                title={`${segment.status}: ${segment.start} - ${segment.end}`}
              />
            ))
          ) : (
            <div className="no-data-message" style={{width: '100%', textAlign: 'center', fontSize: '12px', color: '#999'}}>
                No Data
            </div>
          )}
        </div>

        {/* --- LABELS --- */}
        {/* Ensure this container has 'justify-content: space-between' in CSS */}
        <div className="comparison-timeline-labels" style={{ display: 'flex', justifyContent: 'space-between', marginTop: '5px' }}>
          {(timelineLabels || []).map((time, idx) => (
            <span key={idx} className="time-label" style={{ fontSize: '10px', color: '#666' }}>
              {time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}