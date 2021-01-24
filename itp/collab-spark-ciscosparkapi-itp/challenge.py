from webexteamssdk import WebexTeamsAPI

# Variable which holds the message
msg = "**I am an IT-Professional, and I have completed this challenge!!!**"

# New instance of the CiscoSparkAPI object
api = WebexTeamsAPI(access_token="PASTE_YOUR_ACCESS_TOKEN_HERE")

# Create a room and assign returned value to a variable
room = api.rooms.create("Challenge Room")

# Send message to specified room with markdown syntax.
send_msg = api.messages.create(room.id, markdown=msg)
