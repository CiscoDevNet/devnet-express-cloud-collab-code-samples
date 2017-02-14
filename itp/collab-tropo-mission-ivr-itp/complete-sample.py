wait(1000)

say("Welcome to the Tropo Mission: Build your own IVR")
wait(500)

## 0 for English, 1 for French, 2 for Italian
language = 0
voices = [ "Vanessa", "Audrey", "Alice"]
announces = [ "I can't wait to run the learning lab: Spark and Tropo better together", "Je suis impatient de commencer les travaux pratiques: Combiner Spark et Tropo", "Non vedo l'ora di tenere i lab: Spark e Tropo son meglio se considerati insieme"]
invites = [ "Dial 1 for French, 2 for Italian, 0 for English", "Pour français faites le 1, pour italien faites le 2, pour anglais faites le 0", "Tape 1 per france, 2 per italian, 0 per english"]

## Try 5 times
times = 0

def switch(x):
    if x == 1:
        say("Your entry is not a valid number."),
    elif x ==2:
        say("Sorry, still invalid."),
    elif x ==3:
        say("Looks like you did not make it.")


def chang_lang(num):
    global language
    language = num
    log("changed language to: " + str(language))
    say(announces[language], { "voice": voices[language] })
    wait(500)


while (times < 5):
    ask(invites[language], {
        "voice": voices[language],
        "choices": "0, 1, 2",
        "terminator": "#",
        "attempts": 3,
        "mode": "dtmf",
        "onChoice": lambda event: chang_lang(int(event.value)),
        "onBadChoice": lambda event: switch(event.attempt)
    })
    times +=1


say("Bye bye !")
wait(500)
