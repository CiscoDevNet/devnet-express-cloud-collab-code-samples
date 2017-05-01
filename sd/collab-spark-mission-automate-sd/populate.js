const assert = require(`assert`);
assert(process.env.CISCOSPARK_ACCESS_TOKEN, "Cannot populate without a Cisco Spark API access token, aborting...");
const ciscospark = require(`ciscospark`);

// Read CSV sample: https://github.com/wdavidw/node-csv-parse/blob/master/samples/fs_read.js
var fs = require('fs');
var parse = require('csv-parse');

var parser = parse({ delimiter: ';', columns: true }, function (err, data) {
  if (err) {
    console.log("Sorry, coud not read CSV data, aborting...");
    process.exit(1);
  }

  // Append participants to the room
  var roomToPopulate = "PASTE_YOUR_ROOMID";
  data.forEach(function (elem, index) {
    if (elem.email) {

      ciscospark.memberships.create({
        roomId: roomToPopulate,
        personEmail: elem.email
      })
        .catch(function (reason) {
          switch (reason.message) {
            case "not authenticated":
              console.log("Token not found, aborting...");
              process.exit(1);
            case "Authorization cannot be refreshed":
              console.log("Bad token, aborting...");
              process.exit(1);
            default:
              if (reason.statusCode == 400) {
                console.log("Incorrect room identifier, aborting...");
                process.exit(1);
              } else if (reason.statusCode == 409) {
                console.log(`already member of room: ${elem.email}`);
              } else {
                console.log("Uncaught exception, continuing...");
              }
              break;
          }
        })
        .then(function (result) {
          if (result) {
            console.log(`successfully added: ${elem.email}`)
          }
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
fs.createReadStream(__dirname + '/data.csv').pipe(parser);


