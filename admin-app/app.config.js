const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const appJson = require('./app.json');
const expo = appJson.expo || {};

const extra = {
  ...(expo.extra || {}),
  ...Object.fromEntries(
    Object.entries(process.env).filter(([k]) => k.startsWith('EXPO_PUBLIC_'))
  ),
};

module.exports = {
  expo: {
    ...expo,
    extra,
  },
};
