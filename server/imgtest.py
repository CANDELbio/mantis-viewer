import numpy as np
import cv2



def read_image(v, width, height):
    m = v.reshape((height, width, 4))
    m = m[:, :, 0:3]
    m = m[:, :, ::-1]
    #m = m[:, :, 0]
    print m
    print m.shape
    cv2.imwrite('test.png', m)
    return m

