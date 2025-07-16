import React from 'react';

const TransferOverlay = ({ progress, message }) => {
  return (
    <div className="transfer-overlay">
      <div className="transfer-progress">
        <div className="progress-bar-container">
          <div className="progress-bar-fill" style={{ width: `${progress}%` }}></div>
        </div>
        <div className="progress-text">{progress}%</div>
        <p className="transfer-message">{message}</p>
      </div>
    </div>
  );
};

export default TransferOverlay;
