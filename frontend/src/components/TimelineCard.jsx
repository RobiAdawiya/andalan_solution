import React from "react";

export default function TimelineCard({ device, timelineLabels }) {
  const { comparisonStatusSummary, comparisonChartTimeline } = device;

  return (
    <div className="comparison-row">
      <div className="comparison-device-info">
        <h3>{device.name}</h3>
        <span
          className={`comparison-status ${
            device.deviceStatus === "RUNNING" ? "status-running" : "status-stop"
          }`}
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
            <span className="stat-label">● STOP</span>
            <span className="stat-value">{comparisonStatusSummary.standby}</span>
          </div>
          <div className="stat-item total">
            <span className="stat-label">● TOTAL</span>
            <span className="stat-value">{comparisonStatusSummary.total}</span>
          </div>
        </div>

        <div className="comparison-timeline-bar">
          {comparisonChartTimeline.length > 0 ? (
            comparisonChartTimeline.map((segment, idx) => (
              <div
                key={idx}
                className="comparison-segment"
                style={{
                  backgroundColor: segment.color,
                  flex: 1,
                  minWidth: "2px",
                }}
                title={`${segment.status}: ${segment.start} - ${segment.end}`}
              />
            ))
          ) : (
            <div className="no-data-message">No timeline data available</div>
          )}
        </div>

        <div className="comparison-timeline-labels">
          {timelineLabels.map((time, idx) => (
            <span key={idx} className="time-label">
              {time}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}