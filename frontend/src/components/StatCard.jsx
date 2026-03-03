import React from 'react';

export default function StatCard({ label, count, icon, bgColor }) {
  return (
    <div className="stat-card-modern">
      <div className="stat-card-icon-square" style={{ backgroundColor: bgColor }}>
        {icon}
      </div>
      <div className="stat-card-info">
        <span className="stat-card-label">{label}</span>
        <span className="stat-card-count">{count}</span>
      </div>
    </div>
  );
}