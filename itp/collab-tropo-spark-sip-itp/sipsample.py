if "sipaddress" in globals():
    call("sip:" + sipaddress, { "network": "SIP", "headers": { "x-nickname":"Tropo scripting"}} )
elif "sip2sip" in globals():
    call("sip:" + sip2sip + "@sip2sip.info", { "network": "SIP", "headers": { "x-nickname":"Tropo scripting"}} )
elif "phonenumber" in globals():
      call (phonenumber)
else:
    log("Bad usage, no valid parameter found")

wait(1000)

say("This is an outgoing call from Tropo")
wait(500)

say ("Bye Bye dear Tropo developer")
wait(500)
