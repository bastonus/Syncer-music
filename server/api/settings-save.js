const fs = require('fs/promises');
const path = require('path');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const newSettings = req.body;
  
  if (!newSettings || Object.keys(newSettings).length === 0) {
    return res.status(400).json({ message: 'Settings data required' });
  }

  try {
    const envFilePath = path.join(__dirname, '../.env');

    let envFileContent = '';
    // Read existing .env file if it exists
    try {
      envFileContent = await fs.readFile(envFilePath, 'utf-8');
    } catch (error) {
      if (error.code !== 'ENOENT') {
        throw error; // Rethrow if it's not a "file not found" error
      }
      // If the file doesn't exist, we'll create it.
    }

    const envLines = envFileContent.split('\n');
    const settingsMap = new Map();

    // Load existing settings into a map
    envLines.forEach(line => {
      const trimmedLine = line.trim();
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        const [key] = trimmedLine.split('=');
        settingsMap.set(key.trim(), line);
      }
    });

    // Update with new settings
    for (const [key, value] of Object.entries(newSettings)) {
      if (value) {
        settingsMap.set(key, `${key}=${value}`);
      }
    }

    const updatedEnvContent = Array.from(settingsMap.values()).join('\n');
    await fs.writeFile(envFilePath, updatedEnvContent);

    res.status(200).json({ message: 'Settings saved successfully. Please restart the server to apply changes.' });
  } catch (error) {
    console.error('Error saving settings:', error);
    res.status(500).json({ message: 'Failed to save settings to .env file.' });
  }
}; 