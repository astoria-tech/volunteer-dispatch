const NodeGeocoder = require('node-geocoder');
const geolib = require('geolib');
require('dotenv').config();

const METERS_TO_MILES = 0.000621371;

// Geocoder
const getNgcOptions = () => {
  const options = {
    httpAdapter: 'https',
    formatter: null,
  }

  if (process.env.NODE_ENV === "development") {
    options.provider = "mapquest";
    options.apiKey = process.env.MAPQUEST_KEY
  }
  else if (process.env.NODE_ENV === "production") {
    options.provider = 'google';
    options.apiKey = process.env.GOOGLE_API_KEY;
  }
  else {
    console.error("Please set NODE_ENV in .env to development or production");
    process.exit(1);
  }

  return options;
}

const ngcOptions = getNgcOptions();
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

// eslint-disable-next-line
const distanceBetweenCoords = (volCoords, errandCoords) => METERS_TO_MILES * geolib.getDistance(volCoords, errandCoords);

module.exports = {
  distanceBetweenCoords,
  getCoords,
};
