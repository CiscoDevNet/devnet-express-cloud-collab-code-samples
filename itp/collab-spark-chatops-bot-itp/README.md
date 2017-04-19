# Sparkios-Bot

This is a simple command line tool for passing messages to a Spark ChatOps room.
This tool can be used as a Nagios plugin to send alerts to Cisco Spark, but can also be used from any python script.

## From the Command line

Run chatops.py with the room identifier and message arguments.

```shell
> python chatops.py
usage: chatops.py [-h] -m MESSAGE -r ROOM_ID [-t TOKEN]

> python chatops.py -m "sample chatops message" -r "Y2lzY29zcGFyazovL...3VzL1JPTz" -t "Paste your Cisco Spark token"
```

*Note that the Cisco Spark access token can be passed via the -t argument, or via the SPARK_ACCESS_TOKEN env variable.*

On Windows:
```shell
> set SPARK_ACCESS_TOKEN="Paste your Cisco Spark token"
> python chatops.py -m "sample chatops message" -r "Y2lzY29zcGFyazovL...3VzL1JPTz"

```

On Mac:
> SPARK_ACCESS_TOKEN="Paste your Cisco Spark token" python chatops.py -m "sample chatops message" -r "Y2lzY29zcGFyazovL...3VzL1JPTz"


## From VS Code

Make sure you have the Python extension installed.

Open launch.json file from .vscode directory, and replace the values as mentionned:

```json
            "args": [
                "-r",
                "PASTE THE IDENTIFIER OF THE ROOM YOU ADDED YOUR BOT TO",
                "-m",
                "customize this chatops message"
            ],
            "env": {
                "SPARK_ACCESS_TOKEN" : "PASTE YOUR BOT ACCESS TOKEN HERE"
            }
```

Now, run the "ChatOps" launch configuration by hitting ctrl+F5

