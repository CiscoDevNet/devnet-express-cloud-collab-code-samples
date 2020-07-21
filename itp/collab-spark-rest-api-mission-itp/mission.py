import ??? # MISSION: Module name is missing
import json

# Global variables

access_token = "???" # Token can be obtained from https://developer.webex.com/docs/api/getting-started

httpHeaders = {"Content-type": "application/json",
           "Authorization": "Bearer " + access_token}

def create_team(team_name):

    """
    This function will create a team based on
    provided name and will return team's ID
    """
    print("Creating the team ...")

    apiUrl = "???" # MISSION: Provide the resource URL for creating Teams
    body = {"name": team_name}

    response = requests.post(url=apiUrl, json=body, headers=httpHeaders)

    if response.status_code == 200:
        response = response.json()
        print("Team was successfully created.")
        print("Name: " + response["name"])
        print("ID: " + response["id"])
        return response["id"]
    else:
        print("Something went wrong.\n"
              "Please check the script and run it again!")
        exit()

def create_room(room_name, team_id):

    """
    This function will create a room based on
    provided name, associate a team with it and return the
    room ID
    """
    print("Creating the room...")
    apiUrl = "https://api.ciscospark.com/v1/rooms"
    body = {"title": room_name, "???": team_id} # MISSION: Key responsible for team ID is missing

    response = requests.post(url=apiUrl, json=body, headers=httpHeaders)

    if response.status_code == 200:
        response = response.json()
        print("Room was successfully created.")
        print("Name: " + response["title"])
        print("ID: " + response["id"])
        return response["id"]
    else:
        print("Something went wrong.\n"
              "Please check the script and run it again!")
        exit()

def post_message(room_id):

    """
    This function will post a message to the
    room based on provided room ID
    """
    text = input("What message would you like to post? ")
    apiUrl = "https://api.ciscospark.com/v1/messages"
    body = {"roomId": room_id, "text": text}

    response = requests.???(url=apiUrl, json=body, headers=httpHeaders) #MISSION: requests method is missing

    if response.status_code == 200:
        print("Your message was successfully posted to the room")
    else:
        print("Something went wrong.\n"
              "Please check the script and run it again!")
        exit()

def main():

    """
    Main function
    """
    team_id = create_team("IT-Pro Team")
    room_id = create_room("Room for IT Professionals", team_id)
    post_message(room_id)


if __name__ == "__main__":
    main()