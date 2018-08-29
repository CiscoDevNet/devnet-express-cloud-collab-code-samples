const assert = require('assert');
assert(process.env.ACCESS_TOKEN, "Cannot populate without a Webex Teams API access token, aborting...");

var WebexTeamsClient = require("node-sparky");
var sparky = new WebexTeamsClient({ token: process.env.ACCESS_TOKEN });

// Read CSV sample: https://github.com/wdavidw/node-csv-parse/blob/master/samples/fs_read.js
var fs = require('fs');
var parse = require('csv-parse');

var parser = parse({ delimiter: ';', columns: true }, function (err, data) {
  if (err) {
    console.log("Sorry, coud not read CSV data, aborting...");
    process.exit(1);
  }

  // Append participants to the room
  // [TODO] Create a space and place the identifier below
  var roomToPopulate = "PASTE_YOUR_ROOMID";
  data.forEach(function (elem, index) {
    if (elem.email) {

      sparky.membershipAdd(roomToPopulate, elem.email, false)
        .then(function(membership) {
          console.log(`successfully added ${elem.email}`);
        })
        .catch(function (error) {
          console.log(`could not add member: ${elem.email}, err: ${error}`);
        });
    }
  });
});

parser.on('error', function (err) {
  console.log(err.message);
});

parser.on('finish', function () {
  console.log("successfully parsed CSV file, continuing...");
});


// Launcher parsing
fs.createReadStream(__dirname + '/../../data.csv').pipe(parser);


