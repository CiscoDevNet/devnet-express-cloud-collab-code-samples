#Completed working version

from flask import Flask, request, jsonify
import requests
import json
import os

baseurl = "https://api.ciscospark.com/v1"

bot_auth_token = os.environ.get("SPARK_ACCESS_TOKEN")

headers = {"Content-Type": "application/json",
           "accept": "application/json",
           "Authorization": "Bearer %s" % bot_auth_token
           }

app = Flask(__name__)

me_resp = requests.get(baseurl + '/people/me', headers=headers)
bot_id = json.loads(me_resp.text)['id'] #Retrieve and extract the bot's user ID

def get_message(data):
    mess_id = data['id']

    mess_api = "/messages/%s" % mess_id

    mess_url = baseurl + mess_api

    mess_resp = requests.get(mess_url, headers=headers)

    mess_content = json.loads(mess_resp.text)['text']

    mess_room = json.loads(mess_resp.text)['roomId']

    return mess_room, mess_content


def send_message(room, text):
    send_api = "/messages"

    send_url = baseurl + send_api

    send_data = {"roomId": room,
                 "text": text
                 }

    send_resp = requests.post(send_url,
                              headers=headers,
                              json=send_data)

    return send_resp


def get_membership(room, email):
    get_mem_api = "/memberships"

    get_mem_param = {"roomId": room,
                     "personEmail": email
                     }

    get_mem_url = baseurl + get_mem_api

    get_mem_resp = requests.get(get_mem_url,
                                params=get_mem_param,
                                headers=headers)

    print(get_mem_resp)

    if get_mem_resp.status_code != 200 or json.loads(get_mem_resp.text)["items"] == []:
        get_mem_id = None

    else:
        get_mem_id = json.loads(get_mem_resp.text)["items"][0]["id"]

    return get_mem_id


def rock_ban(mem_id):
    del_mem_api = "/memberships/%s" % mem_id

    ban_url = baseurl + del_mem_api

    ban_resp = requests.delete(ban_url, headers=headers)

    return ban_resp


@app.route('/ban/this/guy', methods=['POST'])
def ban_hook():
    spark_hook = request.json

    hook_data = spark_hook["data"]

    if hook_data["personId"] == bot_id:  #Make sure this isn't a message previously posted by this bot's id
        return "OK"

    mess_room, mess_content = get_message(hook_data)

    mess_list = mess_content.split()

    print(mess_list)

    if len(mess_list) >= 3 and mess_list[1] == "/ban":

        mem_id = get_membership(mess_room, mess_list[2])
        print(mem_id)

        if mem_id is None:
            print("E-mail address not valid, user is not in this room!!!")

            print("We didn't end up banning anyone, DOH!")
            send = send_message(mess_room,
                                "I can exile anyone, just say the word.  But they have to actually be in a room, And I have to be the moderator :-)")
            print(send)
        else:
            banned_for_life = rock_ban(mem_id)

            if banned_for_life.status_code == 204:
                print("We banned that jerk %s" % mess_list[2])
            else:
                print("I don't think we banned them, well this is embarrassing...")

            send = send_message(mess_room, "%s is now banned!!!!" % mess_list[2])

            print(send)
    else:
        print("We didn't end up banning anyone, DOH!")
        send = send_message(mess_room,
                            "I can exile anyone, just say the word.  But they have to actually be in a room, And I have to be the moderator :-)")
        print(send)

    return json.dumps({"did-it-work": "A-OK"})


if __name__ == '__main__':
    app.run(host="0.0.0.0")
