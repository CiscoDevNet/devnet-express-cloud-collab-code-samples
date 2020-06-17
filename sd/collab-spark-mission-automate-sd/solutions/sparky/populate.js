const assert = require( 'assert' );
assert( process.env.WEBEX_ACCESS_TOKEN, 'Cannot populate without a Webex Teams API access token, aborting...' );

const WebexTeamsClient = require( 'node-sparky' );
const sparky = new WebexTeamsClient( { token: process.env.WEBEX_ACCESS_TOKEN } );

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

      sparky.membershipAdd( roomToPopulate, elem.email, false )
        .then( function( membership ) {
          console.log( `successfully added ${ elem.email }` );
        })
        .catch( function ( error ) {
          console.log( `could not add member: ${ elem.email }, err: ${ error }` );
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

