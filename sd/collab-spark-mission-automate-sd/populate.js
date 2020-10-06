const assert = require('assert');
assert(process.env.WEBEX_ACCESS_TOKEN, 'Cannot populate without a Cisco Spark API access token, aborting...');

// TODO: create/init a Webex Node SDK object

// Read CSV sample: https://csv.js.org/parse/recipies/file_interaction/
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse/lib/sync');

var records;

try {
    const csvData = fs.readFileSync(path.join(__dirname, 'data.csv'));
    records = parse(csvData, { delimiter: ';', columns: true });
}
catch (err) {
    console.log(`Error reading/parsing .csv file: ${err}`);
    process.exit(1);
}

const roomToPopulate = process.env.WEBEX_ROOM_ID;

records.forEach((record, index) => {
    if (record.email) {

        // TODO: create a membership for each email
        // TODO: handle errors for authentication problems, incorrect room Id,
        // and membership already exists scenarios
    }
});
