/**
 * Fetch volunteers and return custom fields.
 *
 * @param {Array} volunteerAndDistance An array with volunteer record on the 0th index and its
 * distance from requester on the 1st index
 * @param {object} request The Airtable request object.
 * @returns {{Number: *, record: *, Distance: *, Name: *, Language: *}} Custom volunteer fields.
 */
function volunteerWithCustomFields(volunteerAndDistance, request = { get: () => null }) {
    const [volunteer, distance] = volunteerAndDistance;
    let volLanguage = request.get("Language")
        ? request.get("Language")
        : volunteer.get("Please select any language you have verbal fluency with:");

    if (Array.isArray(volLanguage)) {
        if (volLanguage.length > 1) {
            volLanguage = volLanguage.join(", ");
        }
    }

    return {
        Name: volunteer.get("Full Name"),
        Number: volunteer.get("Please provide your contact phone number:"),
        Distance: distance,
        record: volunteer,
        Id: volunteer.id,
        Language: volLanguage,
    };
}

module.exports = {
    volunteerWithCustomFields
}