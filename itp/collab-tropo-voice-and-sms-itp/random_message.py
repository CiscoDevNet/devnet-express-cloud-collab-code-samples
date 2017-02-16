import random

say("Thank you for calling the random message hotline");
def pickRandomQuote():
    quotes = [
        "Speech was given to man to disguise his thoughts.",
        "The adjective is the banana peel of the parts of speech."
    ]
    return quotes[random.randrange(len(quotes))]

ask("Please enter your phone number followed by the pound sign", {
    "choices": "[9-12 DIGITS]",
    "terminator": "#",
    "mode": "dtmf",
    "onChoice": lambda event : {
        message(pickRandomQuote(), {
            "to": event.value,
            "network": "SMS"
        }),
        say("Your message has been sent to " + event.value),
        hangup()
    },
    "onBadChoice": lambda event :
        say("Sorry, your entry is not a valid number. Goodbye")
})
