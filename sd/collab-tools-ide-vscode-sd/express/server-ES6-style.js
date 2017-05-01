/**
 * Same script but leveraging ES6 features available in NodeJS v4: https://nodejs.org/en/blog/release/v4.0.0/
 *    - arrow functions
 *    - string templates
 *  
 */

const express = require('express')  
const app = express()  

app.get('/', (request, response) => {  
  "use strict"
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