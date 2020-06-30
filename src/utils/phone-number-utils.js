const PNF = require("google-libphonenumber").PhoneNumberFormat;
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();
const phone = require("phone");

/**
 * Parse phone numbers
 *
 * @param {string} rawInput - phone number to operate on.
 * @returns {string} - formatted phone number.
 */
const getTappablePhoneNumber = (rawInput) => {
  let parsedNumber;
  try {
    parsedNumber = phoneUtil.parseAndKeepRawInput(rawInput, "US");
  } catch (error) {
    return false; // Not a phone number
  }

  if (!phoneUtil.isValidNumber(parsedNumber)) {
    return false; // Not a phone number
  }

  // Return +1 ###-###-#### without the country code
  return phoneUtil.format(parsedNumber, PNF.INTERNATIONAL).substring(3);
};

/**
 * Format phone numbers
 *
 * @param {string} rawInput - phone number to operate on.
 * @returns {string} - formatted phone number.
 */
const getDisplayNumber = (rawInput) => {
  if (!rawInput) return "None provided";

  const tappableNumber = getTappablePhoneNumber(rawInput);

  const displayNumber =
    tappableNumber || `${rawInput} _[Bot note: unparseable number.]_`;

  return displayNumber;
};

/**
 * Normalizes mobile phone number into E.164 format
 *
 * @param {string} phoneNumber - Mobile phone number
 * @returns {string} E.164-formatted mobile phone number
 */
const formatPhoneNumber = (phoneNumber) => {
  return phone(phoneNumber)[0];
};

module.exports = {
  getDisplayNumber,
  formatPhoneNumber,
};
