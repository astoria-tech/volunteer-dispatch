const NodeGeocoder = require('node-geocoder');
const geolib = require('geolib');
require('dotenv').config();

const METERS_TO_MILES = 0.000621371;

// Geocoder
const ngcOptions = {
  provider: 'google',
  apiKey: process.env.GOOGLE_API_KEY,

//   provider: 'mapquest',
//   apiKey: process.env.MAPQUEST_KEY,

  httpAdapter: 'https',
  formatter: null,
};
const geocoder = NodeGeocoder(ngcOptions);

// Accepts an address and returns lat/long
function getCoords(address) {
  return new Promise((resolve, reject) => {
    geocoder.geocode(address, (err, res) => {
      if (err || res.length === 0) {
        reject(err);
      } else {
        resolve({
          latitude: res[0].latitude,
          longitude: res[0].longitude,
        });
      }
    });
  });
}

const distanceBetweenCoords = (volCoords, errandCoords) => METERS_TO_MILES * geolib.getDistance(volCoords, errandCoords);

module.exports = {
  distanceBetweenCoords,
  getCoords,
};
