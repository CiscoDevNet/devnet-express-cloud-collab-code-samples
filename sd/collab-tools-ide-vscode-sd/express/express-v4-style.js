
var express = require('express'); 
var app = express();

app.get('/', function (request, response) {  
  var message = "Welcome to DevNet Express for Cloud Collaboration with Cisco Spark & Tropo APIs";
  response.send(message);
});

var port = process.env.PORT || 5000;
app.listen(port, function(err) {  
  if (err) {
    return console.log('something bad happened', err);
  }

  console.log('server is listening on ' + port);
});