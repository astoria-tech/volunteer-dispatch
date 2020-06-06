/**
 * @param {object} request The Airtable request object.
 * @param {Array} volunteerDistances List of all potential volunteer records with distance.
 * @returns {Array} List of potential volunteers that speak requester's language.
 */
function filterByLanguage(request, volunteerDistances) {
  return request.get("Language") && request.get("Language") !== "English"
    ? volunteerDistances.filter((volunteerAndDistance) => {
        const volunteer = volunteerAndDistance[0];
        const volLanguages = volunteer.get(
          "Please select any language you have verbal fluency with:"
        );
        if (volLanguages) {
          return volLanguages.some(
            (language) => language === request.get("Language")
          );
        }
      })
    : volunteerDistances;
}

module.exports = { filterByLanguage };
