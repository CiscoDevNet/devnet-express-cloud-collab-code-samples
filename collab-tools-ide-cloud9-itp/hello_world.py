from flask import Flask
from flask import request
app = Flask(__name__)

@app.route('/')
def index():
    strAge = request.args.get('age')
    intAge = int(strAge)
    if (intAge > 30):
        return ('Kids these days!')
    else:
        return ('Never trust anyone over 30!')

if __name__ == '__main__':
    app.run(host='0.0.0.0',port='8080')
