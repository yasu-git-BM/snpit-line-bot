const express = require('express');
const fs      = require('fs');
const path    = require('path');
const { updateStatus } = require('../polling/scheduler');

const router = express.Router();

router.post('/status', async (req, res) => {
  try {
    await updateStatus();
    const data = JSON.parse(
      fs.readFileSync(path.join(__dirname, '../data/camera-status.json'), 'utf8')
    );
    res.json(data);
  } catch (err) {
    console.error('Error updating status:', err.message);
    res.status(500).json({ error: 'Cannot update camera status' });
  }
});

module.exports = router;
