import numpy as np
import cv2
from matplotlib import pyplot as plt


TOLERANCE = 0.5

img = cv2.imread('test_image.png')


redCh = img[:,:,2]

ret, thresh = cv2.threshold(redCh, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)

cv2.imwrite('thresh.png', thresh)
cv2.imwrite('redCh.png', redCh)
 
kernel = np.ones((2, 2), np.uint8)
opening = cv2.morphologyEx(thresh, cv2.MORPH_OPEN, kernel, iterations = 2)
bg_area = cv2.dilate(opening, kernel, iterations = 3)

cv2.imwrite('opening.png', opening)
cv2.imwrite('bg_area.png', bg_area)



dist_transform = cv2.distanceTransform(opening, cv2.DIST_L2, 5)
cv2.imwrite('dist_transform.png', dist_transform * (255.0 / dist_transform.max()))
ret, sure_fg = cv2.threshold(dist_transform, TOLERANCE * dist_transform.max(), 255, 0)
sure_fg = np.uint8(sure_fg)
#unknown = cv2.subtract(bg_area, sure_fg)


cv2.imwrite('sure_fg.png', sure_fg)
cv2.imwrite('unknown.png', unknown)


ret, markers = cv2.connectedComponents(sure_fg)
#markers = markers + 1
#markers[unknown == 255] = 0

colors = np.random.randint(0, 256, size = (markers.max() + 1, 3), dtype = np.uint8)
markers_colormapped = colors[markers]

cv2.imwrite('markers_colormapped.png', markers_colormapped)

water = cv2.watershed(img, markers)
img[water == -1] = [66, 244, 244]
cv2.imwrite('watershed.png', img)


sure_fg = cv2.cvtColor(sure_fg, cv2.COLOR_GRAY2RGB)
sure_fg[water == -1] = [66, 244, 244]
cv2.imwrite('sure_fg_watershed.png', sure_fg)




#th, thresholded_distance = cv2.threshold(dist_transform, 0.2 * dist_transform.max(), 255, cv2.THRESH_BINARY)

#cv2.imwrite('thresholded_distance.png', thresholded_distance)