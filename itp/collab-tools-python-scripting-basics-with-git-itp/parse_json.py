"""Hands-on parsing JSON in Python"""

import json

# Read-in the JSON text
with open("itp/collab-tools-python-scripting-basics-with-git-itp/cars.json") as read_file:
    json_text = read_file.read()

# What type of data is JSON?
print("json_text is a", type(json_text))


# Python handles the JSON parsing for you
json_data = json.loads(json_text)


# Print out the data type of the json_data object


# Write a for loop that prints out all of the makes and models
