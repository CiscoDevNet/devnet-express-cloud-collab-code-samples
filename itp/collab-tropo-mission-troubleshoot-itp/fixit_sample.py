import

def dice():
    return str(random.randrange(1,7))

def heads_tails():
    coin = random.randrange(1,3)
    if coin == 1:
        return "heads"
    return "tails"


def rock_paper_scissors():
    rps =  {
        1: "rock",
        2: "paper",
        3: "scissors"
    }
    return rps[random.randrange(1,4)]

def message():
    say("Call this number to take your chance.")

def chance_facil():
    if num == "1":
        say("You chose dice!")
        wait(1000)
        say("You rolled a " + dice() + ".")
    elif num == "2":
        say("You chose coin flip!")
        wait(1000)
        say("You got " + heads_tails() + ".")
    elif num == "3":
        say("You chose rock paper scissors!")
        wait(1000)
        say("You got " + rock_paper_scissors + ".")

## You may check currentCall properties at https://www.tropo.com/docs/scripting/currentcall
if currentCall:
    if currentCall.channel == "VOICE": ## Inbound Call
        wait(1000)
        say("Welcome to the Chance Facilitator.")
        wait(500)

        ## Loop but not indefinetely
        times = 0
        while times < 3 and currentCall.isActive():
            ask("Select 1 for dice, 2 for a coin flip, 3 for rock paper scissors.", {
                "choices": "1(one, dice, 1), 2(two, coin, flip, 2), 3(three, rock, paper, scissors, 3)",
                "timeout": 7.0,
                "attempts": 3,
                "onBadChoice": lambda event: say("I'm sorry,  I didn't understand."),
                "onChoice": lambda event: chance_facil(event.value)
            })

            times +=1
            if times < 3:
                wait(1000)
                say("Let's play again...")
                wait(1000)

        say("Thanks for playing today !")
        wait(1000)
    else: ## Inbound SMS
        message()
