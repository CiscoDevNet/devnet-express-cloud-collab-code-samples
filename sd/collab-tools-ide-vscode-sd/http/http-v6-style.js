
const http = require('http')


const requestHandler = (request, response) => {  
  var message = "Welcome to DevNet Express for Cloud Collaboration with Cisco Spark & Tropo APIs"
  response.end(message)
}
const server = http.createServer(requestHandler)


const port = process.env.PORT || 5000;
server.listen(port, (err) => {  
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})