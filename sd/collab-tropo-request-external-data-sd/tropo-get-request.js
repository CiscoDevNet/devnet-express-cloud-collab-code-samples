function requestJSONviaGET(url) {
    try {
        var connection = new java.net.URL(url).openConnection();
        connection.setRequestMethod("GET");
        connection.setDoOutput(false);
        connection.setDoInput(true);  

        connection.connect();
        if (connection.getResponseCode() != 200) return undefined;

        // Read stream and create Object from the JSON payload
        var bodyReader = connection.getInputStream();
        var contents = new String(org.apache.commons.io.IOUtils.toString(bodyReader));
        return JSON.parse(contents);
    }
    catch (e) {  return undefined; }
}

if (currentCall) { // voice call
  wait(1000); say ("Welcome to DevNet, here are the upcoming events.");
  var events = requestJSONviaGET("https://devnet-events-api.herokuapp.com/api/v1/events/next?limit=5");
  if (events) {
    for (i=0; i<events.length;i++) {
      var current = events[i];
      var result = ask("" + current.category + ": " + current.name + " takes place in " + current.city + ", " + current.country + ", on " + current.beginDay + ". Type 0 to hear more details, 1 for next activity", {
        choices: "0,1", mode: 'dtmf', // dial tones only
        attempts: 1, timeout: 3, // seconds
        bargein: true, // take action immediately when a Dial Tone is heard
        onTimeout: function() { say("Sorry but I did not receive your answer"); },
        onBadChoice: function() { say("Sorry I did not understand your answer"); },
        onHangup: function() { log("user has hanged up"); }
      });

      // Take action corresponding to user choice
      if (result.name == "choice" && result.value == "0") {
         ask ("Sure, here are the details. Event starts on " + current.beginDayInWeek + current.beginDay + " at " + current.beginTime + ", and is about: " + current.description, 
           { terminator: "#" });  
      }
      wait(500); say("Moving to next event"); wait(500);
    }
    wait(500); say("No more events, good bye!"); wait(1000);
    hangup();      
  }
  else { say("Sorry, API not responding. Please try again later"); }
}
else {  // token URL invocation
    var events = requestJSONviaGET("https://devnet-events-api.herokuapp.com/api/v1/events/next?limit=5");
    if (events) {
        for (i=0; i<events.length;i++) {
           log("event: " + events[i].name);
        }
    }
    else { log("Could not retreive the list of DevNet upcoming events"); }
}