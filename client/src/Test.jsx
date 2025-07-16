import React from 'react';

const Test = () => {
  return (
    <div style={{ padding: '20px', textAlign: 'center' }}>
      <h1>🎵 Syncer Music - Test</h1>
      <p>Si vous voyez ce message, React fonctionne correctement !</p>
      <button onClick={() => alert('Bouton cliqué!')}>
        Tester JavaScript
      </button>
    </div>
  );
};

export default Test; 