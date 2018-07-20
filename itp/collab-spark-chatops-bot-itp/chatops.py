import requests
import json
import datetime as dt
import sys
import os
import getopt


# Simple Bot Function for passing messages to a room
def send_it(token, room_id, message):

        header = {"Authorization": "Bearer %s" % token,
                  "Content-Type": "application/json"}

        data = {"roomId": room_id,
                "text": message}

        return requests.post("https://api.ciscospark.com/v1/messages/", headers=header, data=json.dumps(data), verify=True)


if __name__ == '__main__':

        # Command line arguments parsing    
        from argparse import ArgumentParser  
        parser = ArgumentParser("chatops.py")  
        parser.add_argument("-m", "--message", help="the message text to post to Webex Teams", required=True)
        parser.add_argument("-r", "--room_id", help="the identifier of the room you added your bot to", required=True)
        parser.add_argument("-t", "--token", help="[optional] your bot's access token. Alternatively, you can use the TEAMS_ACCESS_TOKEN env variable", required=False)
        args = parser.parse_args() 
        access_token = args.token
        teams_room = args.room_id
        message = args.message

        # Check access token
        teams_access_token = os.environ.get("TEAMS_ACCESS_TOKEN")
        token = access_token if access_token else teams_access_token
        if not token:
            error_message = "You must provide a Webex Teams API access token to " \
                            "interact with the Webex Teams APIs, either via " \
                            "a TEAMS_ACCESS_TOKEN environment variable " \
                            "or via the -t command line argument."
            print(error_message)
            sys.exit(2)

        # Now let's post our message to Webex Teams
        res = send_it(token, teams_room, str(dt.datetime.now()) + "\n" + message)
        if res.status_code == 200:
                print("your message was successfully posted to Webex Teams")
        else:
                print("failed with statusCode: %d" % res.status_code)
                if res.status_code == 404:
                        print ("please check the bot is in the room you're attempting to post to...")
                elif res.status_code == 400:
                        print ("please check the identifier of the room you're attempting to post to...")
                elif res.status_code == 401:
                        print ("please check if the access token is correct...")

