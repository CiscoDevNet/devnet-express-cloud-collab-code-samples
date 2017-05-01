/**
 * Same script leveraging a NodeJS V6 runtime
 *  
 */

const express = require('express')  
const app = express()  

app.get('/', (request, response) => {  
  let message = "Welcome to DevNet Express for Cloud Collaboration with Cisco Spark & Tropo APIs"
  response.send(message)
})

const port = process.env.PORT || 5000
app.listen(port, (err) => {  
  if (err) {
    return console.log('something bad happened', err)
  }

  console.log(`server is listening on ${port}`)
})