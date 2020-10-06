const assert = require('assert');
assert(process.env.WEBEX_ACCESS_TOKEN, 'Cannot populate without a Cisco Spark API access token, aborting...');

const webexSdk = require('webex');
const webex = webexSdk.init({
    credentials: {
        authorization: {
            access_token: process.env.WEBEX_ACCESS_TOKEN
        }
    }
});

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

        webex.memberships.create({
            roomId: roomToPopulate,
            personEmail: record.email
        })
            .then((result) => console.log(`successfully added: ${record.email}`))
            .catch((reason) => {
                switch (reason.message) {
                    case 'not authenticated':
                        console.log('Token not found, aborting...');
                        process.exit(1);
                    case 'Authorization cannot be refreshed':
                        console.log('Bad token, aborting...');
                        process.exit(1);
                    default:
                        if (reason.statusCode == 400) {
                            console.log('Incorrect room identifier, aborting...');
                            process.exit(1);
                        } else if (reason.statusCode == 409) {
                            console.log(`already member of room: ${record.email}`);
                        } else {
                            console.log(`Uncaught exception: ${reason}`);
                        }
                        break;
                }
            });
    }
});

