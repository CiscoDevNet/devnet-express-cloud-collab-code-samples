# Importing necessary modules
import requests
import json

# Variables

url = "https://api.ciscospark.com/v1"
api_call = "/people"
# Paste your personal access token here.
access_token = ""

# Header information
headers = {
    "content-type": "application/json; charset=utf-8",
    "authorization": "Bearer " + access_token,
}

# Parameter variable. The email belongs to a bot user, but we can use it
# for our code
param = {"email": "sqtest-ciscospark-travisuser@squared.example.com"}

# Combine URL, API call and parameters variables
url += api_call

response = requests.get(url, headers=headers, params=param).json()

# Print user's name and email address from respond body.
for item in response["items"]:
    print('Name: ' + item['displayName'])
    print('Email: ' + item['emails'][0])
