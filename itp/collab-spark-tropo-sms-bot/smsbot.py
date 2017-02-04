import requests
import json
import sys
import os

try:
    from flask import Flask, request
except ImportError as e:
    print(e)
    print("Looks like the 'flask' library is missing.  Unable to start.")
    sys.exit()

try:
    bearer = os.environ["SPARK_TOKEN"] # Retrieve bot access token
    bot_url = os.environ["SPARK_BOT_URL"] #Retrieve bot webhook URL
    authorized_user = os.environ["SPARK_SMS_USER"] #Retrieve the Spark user email authorized to requests SMS messages
except:
    print("Please configure SPARK_TOKEN, SPARK_BOT_URL, and SPARK_BOT_USER environment variables  \n"
          "Example:  \n"
          "    SPARK_TOKEN={your_bot_token} python3 smsbot.py  \n"
          "    SPARK_BOT_URL=https://app.example.com  \n"
          "    SPARK_SMS_USER=your@email.com") 
    sys.exit()
    
headers = {
    "Accept": "application/json",
    "Content-Type": "application/json; charset=utf-8",
    "Authorization": "Bearer " + bearer
}

def send_spark_get(url, payload=None,js=True):

    if payload is None:
        request = requests.get(url, headers=headers)
    else:
        request = requests.get(url, headers=headers, params=payload)
    if js == True:
        request= request.json()
    return request

def send_spark_post(url, data):
    request = requests.post(url, json.dumps(data), headers=headers).json()
    return request
    
def send_spark_delete(url):
    request = requests.delete(url, headers=headers)
    return request
    
def install_webhook():
    old_webhooks = send_spark_get("https://api.ciscospark.com/v1/webhooks", js=True)
    for webhook in old_webhooks["items"]:
        result = send_spark_delete("https://api.ciscospark.com/v1/webhooks/"+webhook["id"])
        if result.status_code != 204:
            print("Unable to delete old webhook: " + webhook["id"])
            sys.exit()
    params = {"name": "all/all", "targetUrl":  bot_url, "resource": "all", "event": "all"}
    send_spark_post("https://api.ciscospark.com/v1/webhooks", data=params)

def help():

    return "Sure! I can help. Below are the commands that I understand:  \n" \
           "`/help` - I will display what I can do  \n" \
           "`/hello` - I will display my greeting message  \n" \
           "`/sms` {number} {the message to send} - Send an SMS.  Target number should begin with `+` and country code, e.g.: `+14055551212`" 


def greetings():
    return "Hi my name is %s.\n  " \
           "Type `/help` to see what I can do.\n  " % bot_name

def sms(phonenumber,msg):
    url = "https://api.tropo.com/1.0/sessions"
    querystring = {"action":"create","token":"6b68755470544c6c4175466b76474d6c4b73634b6153486d6373557043687a76466d4a41724a597959614163","phonenumber":" 14052832164","msg":"hi there2"}
    querystring.update( { "phonenumber": phonenumber,"msg":msg} )
    headers = {
        'accept': "application/json",
        'cache-control': "no-cache",
        'postman-token': "d4dc5270-219a-c6d0-a664-bbcaabf7b2f1"
    }

    response = requests.request("GET", url, headers=headers, params=querystring)
    
    r = response.text
    if r.find("true") > -1:
        return "Message Sent"
    else:
        return "Unexpected failure sending message: "+r[r.find("<reason>")+8:r.find("</reason>")]

app = Flask(__name__)
@app.route('/', methods=['GET', 'POST'])
def spark_webhook():
    if request.method == 'POST':
        webhook = request.get_json(silent=True)
        if webhook['resource'] == "memberships" and webhook['data']['personEmail'] == bot_email:
            send_spark_post("https://api.ciscospark.com/v1/messages",
                            {
                                "roomId": webhook['data']['roomId'],
                                "markdown": (greetings() +
                                             "**Note: this is a group room and you have to call "
                                             "me specifically with `@%s` for me to respond**" % bot_name)
                            }
                            )
        out_message = None
        if webhook['data']['personEmail'] != bot_email:
            result = send_spark_get(
                'https://api.ciscospark.com/v1/messages/{0}'.format(webhook['data']['id']))
            in_message = result.get('text', '').lower()
            in_message = in_message.replace(bot_name.lower()+' ', '')
            if in_message.startswith('/help'):
                out_message = help()
            elif in_message.startswith('/hello'):
                out_message = greetings()
            elif in_message.startswith('/sms'):
                result = send_spark_get("https://api.ciscospark.com/v1/people/"+webhook["data"]["personId"],js=True)
                if webhook['data']['personEmail'] != authorized_user:
                    out_message = '**'+result["displayName"]+'** is not authorized to send SMS messages'
                else:
                    phonenumber = in_message.split(" ",2)[1]
                    msg = "["+result["displayName"]+"] " + in_message.split(" ",2)[2]
                    out_message = sms(phonenumber,msg)
            else:
                out_message = " Sorry, but I did not understand your request. Type `/help` to see what I can do"
            if out_message != None:
                send_spark_post("https://api.ciscospark.com/v1/messages",
                                {"roomId": webhook['data']['roomId'], "markdown": out_message})
        return "true"
    elif request.method == 'GET':
        message = "<center><img src=\"http://bit.ly/SparkBot-512x512\" alt=\"Spark Bot\" style=\"width:256; height:256;\"</center>" \
                  "<center><h2><b>Congratulations! Your bot is up and running.</b></h2></center>"
        return message

def main():
    global bot_email, bot_name
    if len(bearer) != 0:
        test_auth = send_spark_get("https://api.ciscospark.com/v1/people/me", js=False)
        if test_auth.status_code == 401:
            print("Looks like provided access token is not correct.  \n"
                  "Please review it and make sure it belongs to your bot account.  \n"
                  "Do not worry if you have lost the access token.  \n"
                  "You can always go to https://developer.ciscospark.com/apps.html  \n"
                  "and generate a new access token.")
            sys.exit()
        if test_auth.status_code == 200:
            test_auth = test_auth.json()
            bot_name = test_auth.get("displayName","").replace(" (bot)","")
            bot_email = test_auth.get("emails","")[0]
    else:
        print("'bearer' variable is empty! \n"
              "Please populate it with the bot access token and run the script again.  \n"
              "Do not worry if you have lost the access token.  \n"
              "You can always go to https://developer.ciscospark.com/apps.html  \n"
              "and generate a new access token.")
        sys.exit()

    if "@sparkbot.io" not in bot_email:
        print("You have provided an access token which does not belong to a bot.  \n"
              "Please review it and make sure it belongs to your bot account.  \n"
              "Do not worry if you have lost the access token.  \n"
              "You can always go to https://developer.ciscospark.com/apps.html  \n"
              "and generate a new access token.")
        sys.exit()
    else:
        install_webhook()
        app.run(host='0.0.0.0', port=8080)

if __name__ == "__main__":
    main()
