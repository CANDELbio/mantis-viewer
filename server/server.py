from flask import Flask
from flask import request



import test

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello World!"


@app.route("/segmentation", methods = ['POST'])
def run_segmentation():
    print(request)
    print "Here"
    print(request.get_json())
    js = request.get_json()
    print "aaa " + js['msg']
    test.read_image(request)
    return "202"
    


if __name__ == "__main__":
    app.run()


    