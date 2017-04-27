from flask import Flask
from flask import request


import imgtest

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello World!"


@app.route("/segmentation", methods = ['POST'])
def run_segmentation():
    print request.headers
    
    width = int(request.headers["width"])
    height = int(request.headers["height"])
    data = request.get_data()

    imgtest.read_image(data, width, height)

    return "202"



if __name__ == "__main__":
    app.run()


    