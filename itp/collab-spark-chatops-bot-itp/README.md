# Sparkios-Bot

This is a simple command line tool for passing messages to a Spark ChatOps room.
This tool can be used as a Nagios plugin to send alerts to Cisco Spark, but can also be used from any python script.


## Run from the Command line

Run chatops.py with the room identifier and message to post.
*Note that the Cisco Spark access token can be passed via the -t argument, or via the SPARK_ACCESS_TOKEN env variable.*

```shell
> git clone https://github.com/CiscoDevNet/devnet-express-cloud-collab-code-samples
> cd devnet-express-cloud-collab-code-samples
> cd itp
> cd collab-spark-chatops-bot-itp
> python chatops.py
usage: chatops.py [-h] -m MESSAGE -r ROOM_ID [-t TOKEN]

> python chatops.py -m "sample chatops message" -r "Y2lzY29zcGFyazovL...3VzL1JPTz" -t "Paste your Cisco Spark token"
```

On Windows:
```shell
> set SPARK_ACCESS_TOKEN="Paste_your_Cisco_Spark_token"
> python chatops.py -m "sample chatops message" -r "Y2lzY29zcGFyazovL...3VzL1JPTz"
```

On Mac:
```shell
> SPARK_ACCESS_TOKEN="Paste_your_Cisco_Spark_token" python chatops.py -m "sample chatops message" -r "Y2lzY29zcGFyazovL...3VzL1JPTz"
```


## Debug in Visual Studio Code

Open the ChatOps code samples in VSCode, make sure you have the Python extension is installed.

```shell
> git clone https://github.com/CiscoDevNet/devnet-express-cloud-collab-code-samples
> cd devnet-express-cloud-collab-code-samples
> cd itp
> cd collab-spark-chatops-bot-itp
> code .
```

Then, in VS Code, open .vscode/launch.json file, and replace the values as mentionned:

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

Now, select the chatops.py 
and hit F5 to run the "ChatOps" launch configuration, or by clicking the ChatOps Debug configuration.


## Alternative code leveraging ciscosparkapi

The same steps described above can be run with the ciscospark.py sample code,
that leverage the [ciscosparkapi wrapper library](http://ciscosparkapi.readthedocs.io/en/latest/index.html).


