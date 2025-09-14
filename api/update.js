// api/update.js
const fetch = require('node-fetch');

const CAMERA_STATUS_URL = process.env.JSON_BIN_CAMERA_STATUS_URL; // BIN for camera status
const JSON_BIN_API_KEY  = process.env.JSON_BIN_API_KEY;           // Master Key

async function getCameraStatus() {
  const res = await fetch(`${CAMERA_STATUS_URL}/latest`, {
    method: 'GET',
    headers: { 'X-Master-Key': JSON_BIN_API_KEY }
  });
  if (!res.ok) throw new Error(`JSONBin GET失敗: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.record;
}

async function updateCameraStatus(newStatus) {
  const res = await fetch(CAMERA_STATUS_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': JSON_BIN_API_KEY
    },
    body: JSON.stringify(newStatus)
  });
  if (!res.ok) throw new Error(`JSONBin PUT失敗: ${res.status} ${await res.text()}`);
  const data = await res.json();
  return data.record;
}

module.exports = { getCameraStatus, updateCameraStatus };
