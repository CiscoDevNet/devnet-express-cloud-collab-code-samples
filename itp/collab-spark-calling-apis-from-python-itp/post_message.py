# Import necessary modules
import requests
import json

# Define global variables

ACCESS_TOKEN = ""  # Paste your access token here
HEADERS = {"Content-type": "application/json; charset=utf-8",
           "Authorization": "Bearer " + ACCESS_TOKEN}


def create_room(name):
    """
    This function accepts one argument:
    name - sets the room's name
    """
    # url will hold the path against which the call is made
    url = "https://api.ciscospark.com/v1/rooms"

    # payload variable will hold necessary parameters to create a room
    payload = {"title": name}

    # Make the API call and assign the response body to room variable
    room = requests.post(url, headers=HEADERS, data=json.dumps(payload))

    # Check if the request was successful and return the ID assigned to the
    # room
    if room.status_code == 200:
        print("Room %s was created successfully" % name)
        return room.json()['id']
    else:
        exit()


def add_user(room_id, email):
    """
    This function accepts two arguments:
    room_id - the id of the room to which the user will be added
    email - user's email address who will be added to the room
    """
    # url will hold the path against which the call is made
    url = "https://api.ciscospark.com/v1/memberships"

    # payload variable will hold necessary parameters to create a room
    payload = {"roomId": room_id, "personEmail": email}

    # Make the API call and assign the response body to user variable
    user = requests.post(url, headers=HEADERS, data=json.dumps(payload))

    # Check if the request was successful and return True or False
    if user.status_code == 200:
        print("User was successfully added to the room")
        return True
    else:
        return False


def post_message(room_id, text):
    """
    This function accepts two arguments:
    room_id - the id of the room to which the message will be posted
    message - a text which will posted to the specified room
    """
    # url will hold the path against which the call is made
    url = "https://api.ciscospark.com/v1/messages"

    # payload variable will hold necessary parameters to create a room
    payload = {"roomId": room_id, "text": text}

    # Make the API call and assign the response body to message variable
    message = requests.post(url, headers=HEADERS, data=json.dumps(payload))

    # Check if the request was successful and return True or False
    if message.status_code == 200:
        print("Message was successfully posted to the room.")
        return True
    else:
        return False


def main():
    """
    Main function
    """
    # Check if ACCESS_TOKEN has a value
    if not ACCESS_TOKEN:
        print("ACCESS_TOKEN variable needs to be populated before proceeding")
        exit()
    # Call create_room() function and assign the result to the room variable
    room = create_room("IT-Pro")

    # Check if above room has a value
    if room:
        email = "sqtest-ciscospark-travisuser@squared.example.com"
        user = add_user(room, email)

    # Check if user was successfully added to the room
    if user:
        message = "Welcome to IT-Pro room"
        post_message(room, message)

# Run the application
if __name__ == "__main__":
    main()
