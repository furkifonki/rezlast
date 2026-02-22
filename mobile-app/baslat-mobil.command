#!/bin/bash
cd "$(dirname "$0")"
echo "Mobil uygulama başlatılıyor (port 8083)..."
echo "Tarayıcıda veya Expo Go'da QR kodu göreceksiniz."
echo ""
export CI=
npm run start:lan
