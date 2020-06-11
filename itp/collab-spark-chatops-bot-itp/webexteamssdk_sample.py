import json
import datetime as dt
import sys
import os
import getopt
from webexteamssdk import WebexTeamsAPI

if __name__ == '__main__':

        # Command line arguments parsing    
        from argparse import ArgumentParser  
        parser = ArgumentParser("webexteamssdk_sample.py")  
        parser.add_argument("-m", "--message", help="the chatops message to post to Webex Teams", required=True)
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
        try:
                api = WebexTeamsAPI(access_token=token)  
                api.messages.create(roomId = teams_room, text= str(dt.datetime.now()) + "\n" + message)
                print("your message was successfully posted to Webex Teams")
        except Exception as e:
                print("failed with statusCode: %d" % e.response_code)
                if e.response_code == 404:
                        print ("please check the bot is in the room you're attempting to post to...")
                elif e.response_code == 400:
                        print ("please check the identifier of the room you're attempting to post to...")
                elif e.response_code == 401:
                        print ("please check the access token is correct...")

                

