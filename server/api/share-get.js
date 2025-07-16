const fs = require('fs/promises');
const path = require('path');

const SHARES_DIR = path.join(__dirname, '../shares');

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const { shareId } = req.query;
  
  if (!shareId) {
    return res.status(400).json({ message: 'Share ID required' });
  }

  try {
    const filePath = path.join(SHARES_DIR, `${shareId}.json`);
    const data = await fs.readFile(filePath, 'utf-8');
    res.json(JSON.parse(data));
  } catch (error) {
    console.error('Failed to get share data:', error);
    res.status(404).json({ message: 'Share link not found or expired.' });
  }
}; 