from flask import Flask
app = Flask(__name__)

@app.route("/")
def hello():
    message = "Welcome to DevNet Express"
    return message

if __name__ == "__main__":
    import os
    default = int(os.getenv('PORT', 5000))
    app.run(port=default)
