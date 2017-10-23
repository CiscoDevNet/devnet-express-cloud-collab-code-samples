
var http = require('http');


var server = http.createServer(function (request, response) {  
  var message = "Welcome to DevNet Express for Cloud Collaboration with Cisco Spark";
  response.end(message);
});


var port = process.env.PORT || 5000;
server.listen(port, function(err) {  
  if (err) {
    return console.log('something bad happened', err);
  }

  console.log('server is listening on ' + port);
});