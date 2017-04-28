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

    segmentation_mask = imgtest.read_image(data, width, height)

    response = app.make_response(segmentation_mask.tobytes())
    #response.headers['content-type'] = 'application/octet-stream'
    return response


if __name__ == "__main__":
    app.run()


    