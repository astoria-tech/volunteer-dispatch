// Parse the "Full Name" field and into "First" and "Last" name fields.
// One off script to be run in Airtable script block.

const table = base.getTable('Volunteers');

// Update all the records
const result = await table.selectRecordsAsync();
for (let record of result.records) {
  const fullName = record.getCellValue('Full Name');
  const namePieces = fullName.split(' ');
  const firstName = namePieces.shift();
  const lastName = namePieces.join(' ');
  await table.updateRecordAsync(record, {
    'First Name': firstName,
    'Last Name': lastName
  });
}
