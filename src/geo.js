const NodeGeocoder = require('node-geocoder');
const geolib = require('geolib');
require('dotenv').config();

const METERS_TO_MILES = 0.000621371;

// Geocoder
const ngcOptions = {
  httpAdapter: 'https',
  formatter: null,
};

// Use Google Maps if API key provided, otherwise use MapQuest
const useGoogleApi = (typeof process.env.GOOGLE_API_KEY === 'string') && process.env.GOOGLE_API_KEY.length > 0;
ngcOptions.provider = useGoogleApi ? 'google' : 'mapquest';
ngcOptions.apiKey = useGoogleApi ? process.env.GOOGLE_API_KEY : process.env.MAPQUEST_KEY;
const geocoder = NodeGeocoder(ngcOptions);

console.log('Geocoder:', ngcOptions.provider);

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

// eslint-disable-next-line max-len
const distanceBetweenCoords = (volCoords, errandCoords) => METERS_TO_MILES * geolib.getDistance(volCoords, errandCoords);

module.exports = {
  distanceBetweenCoords,
  getCoords,
};
