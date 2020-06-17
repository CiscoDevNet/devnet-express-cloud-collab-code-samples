const assert = require('assert');
assert( process.env.WEBEX_ACCESS_TOKEN, 'Cannot populate without a Cisco Spark API access token, aborting...' );

const webexSdk = require( 'webex' );
const webex = webexSdk.init({
    credentials: {
        authorization: {
            access_token: process.env.WEBEX_ACCESS_TOKEN
        }
    }
  });

// Read CSV sample: https://github.com/wdavidw/node-csv-parse/blob/master/samples/fs_read.js
const fs = require( 'fs' );
const path = require( 'path' );
const parse = require( 'csv-parse' );

const parser = parse( { delimiter: ';', columns: true }, function ( err, data ) {
  if ( err ) {
    console.log( 'Sorry, coud not read CSV data, aborting...' );
    process.exit( 1 );
  }

  // Append participants to the room
  // [TODO] Create a space and place the identifier below
  const roomToPopulate = 'YOUR_ROOM_ID';
  data.forEach( function ( elem, index ) {
    if ( elem.email ) {

      webex.memberships.create({
        roomId: roomToPopulate,
        personEmail: elem.email
      })
        .catch( function ( reason ) {
          switch ( reason.message ) {
            case 'not authenticated':
              console.log( 'Token not found, aborting...' );
              process.exit( 1 );
            case 'Authorization cannot be refreshed':
              console.log( 'Bad token, aborting...' );
              process.exit( 1 );
            default:
              if ( reason.statusCode == 400 ) {
                console.log( 'Incorrect room identifier, aborting...' );
                process.exit( 1 );
              } else if ( reason.statusCode == 409 ) {
                console.log( `already member of room: ${ elem.email }` );
              } else {
                console.log( 'Uncaught exception, continuing...' );
              }
              break;
          }
        })
        .then( function ( result ) {
          if ( result ) {
            console.log( `successfully added: ${ elem.email }` )
          }
        });
    }
  });
});

parser.on( 'error', function ( err ) {
  console.log( err.message );
});

parser.on( 'finish', function () {
  console.log( 'successfully parsed CSV file, continuing...' );
});

// Launcher parsing
fs.createReadStream( path.join( __dirname, '..', '..', 'data.csv' ) ).pipe( parser );
