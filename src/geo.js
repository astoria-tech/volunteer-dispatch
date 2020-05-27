const NodeGeocoder = require("node-geocoder");
const geolib = require("geolib");
const { logger } = require("./logger");
const config = require("./config");
require("dotenv").config();

const METERS_TO_MILES = 0.000621371;

// Geocoder
const ngcOptions = {
  httpAdapter: "https",
  formatter: null,
};

// Use Google Maps if API key provided, otherwise use MapQuest
const useGoogleApi =
  typeof config.GOOGLE_API_KEY === "string" && config.GOOGLE_API_KEY.length > 0;
ngcOptions.provider = useGoogleApi ? "google" : "mapquest";
ngcOptions.apiKey = useGoogleApi ? config.GOOGLE_API_KEY : config.MAPQUEST_KEY;
const geocoder = NodeGeocoder(ngcOptions);

logger.info(`Geocoder: ${ngcOptions.provider}`);

/**
 * Get coordinates.
 *
 * @param {string} address The Airtable address to pull coordinates from.
 * @returns {Promise} Promise object containing properties latitude and longitude.
 */
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

const distanceBetweenCoords = (volCoords, errandCoords) =>
  METERS_TO_MILES * geolib.getDistance(volCoords, errandCoords);

module.exports = {
  distanceBetweenCoords,
  getCoords,
};
