const express = require('express');
const fetch = require('node-fetch');

const router = express.Router();

const CAMERA_STATUS_URL = process.env.JSON_BIN_CAMERA_STATUS_URL;
const JSON_BIN_API_KEY  = process.env.JSON_BIN_API_KEY;

if (!CAMERA_STATUS_URL || !/^https?:\/\//.test(CAMERA_STATUS_URL)) {
  throw new Error('環境変数 JSON_BIN_CAMERA_STATUS_URL が未設定、または絶対URLではありません');
}
if (!JSON_BIN_API_KEY) {
  throw new Error('環境変数 JSON_BIN_API_KEY が未設定です');
}

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
