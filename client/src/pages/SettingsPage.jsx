import React, { useState, useEffect } from 'react';

const SettingsPage = () => {
  const [settings, setSettings] = useState({
    SPOTIFY_CLIENT_ID: '',
    SPOTIFY_CLIENT_SECRET: '',
    DEEZER_APP_ID: '',
    DEEZER_SECRET_KEY: '',
    GOOGLE_CLIENT_ID: '',
    GOOGLE_CLIENT_SECRET: '',
  });
  const [status, setStatus] = useState(''); // '', 'saving', 'success', 'error'

  // TODO: Add a useEffect to fetch current settings from the backend to check what's configured

  const handleChange = (e) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleSave = async () => {
    setStatus('saving');
    try {
      // We are filtering out empty values so we don't overwrite existing ones with blanks
      const settingsToSave = Object.fromEntries(
        Object.entries(settings).filter(([, value]) => value !== '')
      );

      if (Object.keys(settingsToSave).length === 0) {
        setStatus('No changes to save.');
        return;
      }
      
      const response = await fetch('/api/settings/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsToSave),
      });

      if (!response.ok) throw new Error('Failed to save settings.');
      
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>API Settings</h1>
      <p>Enter your API credentials below. The server will need to be restarted after saving.</p>
      
      <div style={{ marginBottom: '20px' }}>
        <h2>Spotify</h2>
        <p>Get your credentials from the <a href="https://developer.spotify.com/dashboard/" target="_blank" rel="noopener noreferrer">Spotify Developer Dashboard</a>.</p>
        <input name="SPOTIFY_CLIENT_ID" value={settings.SPOTIFY_CLIENT_ID} onChange={handleChange} placeholder="Spotify Client ID" style={{ width: '300px', marginBottom: '5px' }} />
        <br />
        <input name="SPOTIFY_CLIENT_SECRET" value={settings.SPOTIFY_CLIENT_SECRET} onChange={handleChange} placeholder="Spotify Client Secret" type="password" style={{ width: '300px' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>Deezer</h2>
        <p>Get your credentials from the <a href="https://developers.deezer.com/myapps" target="_blank" rel="noopener noreferrer">Deezer for Developers</a> portal.</p>
        <input name="DEEZER_APP_ID" value={settings.DEEZER_APP_ID} onChange={handleChange} placeholder="Deezer App ID" style={{ width: '300px', marginBottom: '5px' }} />
        <br />
        <input name="DEEZER_SECRET_KEY" value={settings.DEEZER_SECRET_KEY} onChange={handleChange} placeholder="Deezer Secret Key" type="password" style={{ width: '300px' }} />
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h2>YouTube Music (Google)</h2>
        <p>Get your credentials from the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" rel="noopener noreferrer">Google Cloud Console</a>.</p>
        <input name="GOOGLE_CLIENT_ID" value={settings.GOOGLE_CLIENT_ID} onChange={handleChange} placeholder="Google Client ID" style={{ width: '300px', marginBottom: '5px' }} />
        <br />
        <input name="GOOGLE_CLIENT_SECRET" value={settings.GOOGLE_CLIENT_SECRET} onChange={handleChange} placeholder="Google Client Secret" type="password" style={{ width: '300px' }} />
      </div>

      <button onClick={handleSave} disabled={status === 'saving'}>
        {status === 'saving' ? 'Saving...' : 'Save Settings'}
      </button>

      {status === 'success' && <p style={{ color: 'green' }}>Settings saved successfully! Please restart the server.</p>}
      {status === 'error' && <p style={{ color: 'red' }}>Error saving settings. Check the console.</p>}
    </div>
  );
};

export default SettingsPage; 