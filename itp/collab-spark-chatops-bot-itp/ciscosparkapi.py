import requests
import json
import datetime as dt
import sys
import os
import getopt


if __name__ == '__main__':

        # Command line arguments parsing    
        from argparse import ArgumentParser  
        parser = ArgumentParser("ciscospark.py")  
        parser.add_argument("-m", "--message", help="the chatops message to post to Cisco Spark", required=True)
        parser.add_argument("-r", "--room_id", help="the identifier of the Cisco Spark room you added your bot to", required=True)
        parser.add_argument("-t", "--token", help="[optional] your bot's access token. Alternatively, you can use the SPARK_ACCESS_TOKEN env variable", required=False)
        args = parser.parse_args() 
        access_token = args.token
        spark_room = args.room_id
        message = args.message

        # Check access token
        spark_access_token = os.environ.get("SPARK_ACCESS_TOKEN")
        token = access_token if access_token else spark_access_token
        if not token:
            error_message = "You must provide a Cisco Spark API access token to " \
                            "interact with the Cisco Spark APIs, either via " \
                            "a SPARK_ACCESS_TOKEN environment variable " \
                            "or via the -t command line argument."
            print(error_message)
            sys.exit(2)

        # Now let's post our message to Cisco spark
        from ciscosparkapi import CiscoSparkAPI, SparkApiError
        try:
                api = CiscoSparkAPI(access_token=token)  
                api.messages.create(roomId = spark_room, text= str(dt.datetime.now()) + "\n" + message)
                print("your message was successfully posted to Cisco Spark")
        except SparkApiError as e:
                print("failed with statusCode: %d" % e.response_code)
                if e.response_code == 404:
                        print ("please check the bot is in the Cisco Spark room you're attempting to post to...")
                elif e.response_code == 400:
                        print ("please check the identifier of the Room you're attempting to post to...")
                elif e.response_code == 401:
                        print ("please check the Cisco Spark token is correct...")

                

