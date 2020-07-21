const assert = require('assert');
assert(process.env.WEBEX_ACCESS_TOKEN, 'Cannot populate without a Cisco Spark API access token, aborting...');

// TODO: create/init a Webex Node SDK object

// Read CSV sample: https://github.com/wdavidw/node-csv-parse/blob/master/samples/fs_read.js
const fs = require('fs');
const path = require('path');
const parse = require('csv-parse');

const parser = parse({ delimiter: ';', columns: true }, function (err, data) {
    if (err) {
        console.log('Sorry, coud not read CSV data, aborting...');
        process.exit(1);
    }

    // Append participants to the room
    // Be sure to update launch.json with the target group space roomId
    const roomToPopulate = process.env.WEBEX_ROOM_ID;
    data.forEach(function (elem, index) {
        if (elem.email) {

        // TODO: create a membership for each email
        // TODO: add error handling
        console.log(`successfully added: ${elem.email}`)
        }
    });
});

parser.on('error', function (err) {
    console.log(err.message);
});

parser.on('finish', function () {
    console.log('successfully parsed CSV file, continuing...');
});

// Launcher parsing
fs.createReadStream(path.join(__dirname, 'data.csv')).pipe(parser);
