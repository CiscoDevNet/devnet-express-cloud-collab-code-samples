"""Loops and functions."""

# Do this three times
for i in range(3):
    print("How many times have we done this? {} Time(s)".format(i+1))


def do_this_n_times(n):
    for i in range(n):
        print("Really we are doing more!  Ok... {} time(s).".format(i+1))
    return "OK!  We are done."

# Call the function, passing in how many times you want the loop to run


# Can you catch the return value in a variable and print it?
