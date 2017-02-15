import urllib2
import json


BOT_TOKEN = "" # <- PASTE YOUR BOT'S TOKEN HERE
OPS_TEAM_SPACE = "" # <- ROOM ID WHERE THE MESSAGE WILL BE POSTED
CHATOPS_SPACE = "" # <- ROOM ID WHERE DEBUG MESSAGE WILL BE POSTED
AGENT_ADDRESS = "" # <- SIP address to transfer call to

HEADERS = {"Content-type" : "application/json; charset=utf-8",
           "Authorization" : "Bearer %s" % BOT_TOKEN}

def post_message(room_id, msg):

    url = 'https://api.ciscospark.com/v1/messages'
    data = {
        "roomId": room_id,
        "text": msg
    }
    request = urllib2.Request(url, data=json.dumps(data), headers=HEADERS)
    response=urllib2.urlopen(request)
    if response.getcode() == 200:
        log("SPARK_LOG: Message was successfully logged to Spark, response code: " + str(response.getcode()))
    else:
        log("SPARK_LOG: could not log to Spark, response code: " + str(response.getcode()))

def signal(msg):
    log("SIGNAL: " + msg)
    spark = post_message(OPS_TEAM_SPACE, msg)


## Posts to a Chatops space
def chatops(entry):
    log("DEBUG: " + entry)
    spark = post_message(CHATOPS_SPACE, entry)

def on_choice(num):
    if num == "1":
        chatops("on_choice = 1")
        signal("Employee (tel: " + str(currentCall.callerID) + ") will be late today")
        say("Your delay has been notified to the Operations team")
    elif num == "2":
        chatops("on_choice = 2")
        signal("Employee (tel: " + str(currentCall.callerID) + ") won't join today")
        say("Your absence has been notified to the Operations team")
    elif num == "3":
        chatops("on_choice = 3")
        signal("Employee (tel: " + str(currentCall.callerID) + ") asked to be transferred to an agent")
        say("Got it, now transferring you. Please hold on...")
        transfer(AGENT_ADDRESS, {
                "playvalue": "http://www.phono.com/audio/holdmusic.mp3",
                "terminator": "*",
                "onTimeout": lambda event: {
                chatops("transfer timeout for callerId: " + str(currentCall.callerID)),
                say("Sorry, nobody's available. Please contact us later...."),
                signal("Employee (tel: " + str(currentCall.callerID) + ") could not be transferred to an agent")
                },
                "onBusy": lambda event: {
                chatops("line busy for callerId: " + str(currentCall.callerID)),
                say("Sorry, line is busy. Please try again later..."),
                signal("Employee (tel: " + str(currentCall.callerID) + ") could not be transferred to an agent")
                },
                "onConnect": lambda event: {
                chatops("transfer successful for callerId: " + str(currentCall.callerID)),
                say("You're now connected !")
                }
            })

if currentCall:

    wait(1000)
    say("Welcome to the Staff Work Status Service")
    chatops("spoke welcome message to callerId: " + str(currentCall.callerID))
    wait(500)

    ask("Dial 1 if you'll be late today, 2 if you won't make it at all, and 3 to be transferred to an operator", {
            "choices": "1, 2, 3",
            "terminator": "#",
            "attempts": 3,
            "mode": "dtmf",
            "onBadChoice": lambda event: say("Your entry is not a valid."),
            "onChoice": lambda event: on_choice(event.value)
    })

    say("Bye bye !")
    wait(1000)
else:
    chatops("tropo script version: DATE TIME")
