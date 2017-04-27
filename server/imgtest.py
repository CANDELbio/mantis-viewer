import numpy as np
import cv2

import segmentation


def read_image(data, width, height):
    v = np.frombuffer(data, np.uint8)
    m = v.reshape((height, width, 4))
    
    #Drop the alpha channel
    m = m[:, :, 0:3]
    #Revers the channel order for OpenCV (BGR)
    m = m[:, :, ::-1]
    #m = m[:, :, 0]
    cv2.imwrite('test.png', m)
    segmentation.segment_image(m)
    return m

