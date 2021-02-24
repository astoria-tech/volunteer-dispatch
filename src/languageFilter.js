/**
 * @param {object} request The Airtable request object.
 * @param {Array} volunteerDistances List of all potential volunteer records with distance.
 * @returns {Array} List of potential volunteers that speak requester's language.
 */
function filterByLanguage(request, volunteerDistances) {
  // HACK: only use the first language until we introduce logic to search for multiple languagers
  let firstLanguage;
  const languages = request.get("Language");
  if (languages && languages.length && languages.length > 0) {
    firstLanguage = languages.shift();
  } else {
    firstLanguage = "English";
  }

  // If the language is English, return everyone. Otherwise, filter by the language
  let result;
  if (firstLanguage === "English") {
    result = volunteerDistances;
  } else {
    result = volunteerDistances.filter((volunteerAndDistance) => {
      const volunteer = volunteerAndDistance[0];
      const volLanguages = volunteer.get(
        "Please select any language you have verbal fluency with:"
      );
      return (volLanguages || []).some(
        (language) => language === firstLanguage
      );
    });
  }

  return result;
}

module.exports = { filterByLanguage };
