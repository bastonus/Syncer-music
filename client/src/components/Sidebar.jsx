import React from 'react';
import { Link } from 'react-router-dom';

const Sidebar = ({
  services,
  authStatus,
  hasSelectedTracks,
  connectedServices,
  transferSource,
  transferLoading,
  theme,
  setTheme,
  handleServiceConnect,
  fetchPlaylists,
  handleTransfer,
  handleDragOver,
  handleDrop,
  handleDragLeave,
  dropTarget
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">Syncer Music</h1>
        <p className="sidebar-subtitle">Synchronisez vos playlists</p>
      </div>

      <div className="services-section">
        <h3 className="services-title">Services</h3>
        {services.map(service => (
          <div
            key={service.id}
            className={`service-item ${authStatus[service.id] ? 'connected' : ''} ${dropTarget === service.id ? 'drop-target' : ''}`}
            onClick={() => authStatus[service.id] ? fetchPlaylists(service.id) : handleServiceConnect(service.id)}
            onDragOver={(e) => handleDragOver(e, service.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, service.id)}
          >
            <img src={service.icon} alt={service.name} className="service-icon" />
            <div className="service-info">
              <div className="service-name">{service.name}</div>
              <div className={`service-status ${authStatus[service.id] ? 'connected' : ''}`}>
                {authStatus[service.id] ? 'Connecté' : 'Non connecté'}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasSelectedTracks && connectedServices.length > 1 && (
        <div className="transfer-section">
          <h3 className="services-title">Actions de Transfert</h3>
          <div className="transfer-actions">
            {connectedServices.map(targetService => {
              if (transferSource && targetService.id === transferSource.serviceId) return null;
              
              return (
                <button
                  key={targetService.id}
                  className="transfer-btn"
                  onClick={() => handleTransfer(transferSource.serviceId, targetService.id)}
                  disabled={transferLoading || !transferSource || !hasSelectedTracks}
                >
                  <span>Transférer vers {targetService.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="sidebar-footer">
        <div className="theme-switcher">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>
          <label className="switch">
            <input 
              type="checkbox" 
              onChange={() => setTheme(theme === 'light' ? 'dark' : 'light')} 
              checked={theme === 'dark'}
            />
            <span className="slider round"></span>
          </label>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>
        </div>
        <Link to="/settings" className="btn-primary" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
          Paramètres
        </Link>
      </div>
    </div>
  );
};

export default Sidebar;
