const PNF = require("google-libphonenumber").PhoneNumberFormat;
const phoneUtil = require("google-libphonenumber").PhoneNumberUtil.getInstance();

const getTappablePhoneNumber = (rawInput) => {
  let parsedNumber;
  try {
    parsedNumber = phoneUtil.parseAndKeepRawInput(rawInput, "US");
  } catch (error) {
    return false; // Not a phone number
  }

  if (phoneUtil.isValidNumber(parsedNumber)) {
    // Return +1 ###-###-#### without the country code
    return phoneUtil.format(parsedNumber, PNF.INTERNATIONAL).substring(3);
  } else {
    return false; // Not a phone number
  }
};

const getDisplayNumber = (rawInput) => {
  const tappableNumber = getTappablePhoneNumber(rawInput);

  const displayNumber = tappableNumber
    ? tappableNumber
    : `${rawInput} _[User appears to have entered invalid number]_`;

  return displayNumber;
};

module.exports = {
  getDisplayNumber,
};
