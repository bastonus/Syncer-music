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
  const [status, setStatus] = useState(''); // '', 'saving', 'success', 'error', 'restarting'

  // TODO: Add a useEffect to fetch current settings from the backend to check what's configured

  const [logs, setLogs] = useState([]);

  useEffect(() => {
    const originalConsole = {
      log: console.log,
      error: console.error,
      warn: console.warn,
      info: console.info,
    };

    const consoleOverride = (type, ...args) => {
      originalConsole[type](...args);
      const message = args.map(arg => {
        if (arg instanceof Error) {
          return arg.stack || arg.message;
        }
        try {
          return typeof arg === 'string' ? arg : JSON.stringify(arg, null, 2);
        } catch (e) {
          return String(arg);
        }
      }).join(' ');

      setLogs(prevLogs => [...prevLogs, { type, message, timestamp: new Date() }]);
    };

    console.log = (...args) => consoleOverride('log', ...args);
    console.error = (...args) => consoleOverride('error', ...args);
    console.warn = (...args) => consoleOverride('warn', ...args);
    console.info = (...args) => consoleOverride('info', ...args);

    return () => {
      console.log = originalConsole.log;
      console.error = originalConsole.error;
      console.warn = originalConsole.warn;
      console.info = originalConsole.info;
    };
  }, []);

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

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Failed to save settings. Status: ${response.status}. Body: ${errorBody}`);
      }
      
      setStatus('success');
    } catch (error) {
      console.error(error);
      setStatus('error');
    }
  };

  const handleRestart = async () => {
    setStatus('restarting');
    try {
      const response = await fetch('/api/server/restart', { method: 'POST' });
      if (!response.ok) {
        throw new Error('Failed to send restart command.');
      }
      // Don't expect a success status change here as the server will go down
    } catch (error) {
      console.error(error);
      setStatus('error'); // If the restart command fails, show an error
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

      {status === 'success' && (
        <div style={{ marginTop: '10px' }}>
          <p style={{ color: 'green', display: 'inline' }}>Settings saved successfully! Please restart the server.</p>
          <button onClick={handleRestart} style={{ marginLeft: '10px' }}>
            Restart Server
          </button>
        </div>
      )}
      {status === 'error' && <p style={{ color: 'red' }}>Error saving settings. Check the console.</p>}
      {status === 'restarting' && <p style={{ color: 'blue' }}>Server is restarting... Please wait a moment and refresh the page.</p>}

      {logs.length > 0 && (
        <div style={{ marginTop: '20px', backgroundColor: '#f0f0f0', border: '1px solid #ccc', padding: '10px', maxHeight: '300px', overflowY: 'auto' }}>
          <h3>Console Output:</h3>
          <pre style={{ whiteSpace: 'pre-wrap', wordWrap: 'break-word', fontSize: '12px' }}>
            {logs.map((log, index) => (
              <div key={index} style={{ color: log.type === 'error' ? 'red' : 'inherit', borderBottom: '1px solid #ddd', paddingTop: '5px', paddingBottom: '5px' }}>
                <strong>[{log.timestamp.toLocaleTimeString()}] [{log.type.toUpperCase()}]:</strong> {log.message}
              </div>
            ))}
          </pre>
        </div>
      )}
    </div>
  );
};

export default SettingsPage; 