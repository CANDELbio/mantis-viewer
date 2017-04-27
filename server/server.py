from flask import Flask
from flask import request
import numpy as np


import imgtest

app = Flask(__name__)

@app.route("/")
def hello():
    return "Hello World!"


@app.route("/segmentation", methods = ['POST'])
def run_segmentation():
    print(request)
    print "Here"
    data = request.get_data()
    v = np.frombuffer(data, np.uint8)
    print v.shape

    imgtest.read_image(v, 985, 822)

    return "202"



if __name__ == "__main__":
    app.run()


    