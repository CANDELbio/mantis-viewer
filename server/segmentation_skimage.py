from skimage.morphology import watershed, disk, square, dilation
from skimage import io
from skimage import feature
from skimage.filters import rank, sobel, threshold_otsu
from skimage.util import img_as_ubyte
from scipy import ndimage
import numpy as np
import matplotlib.pyplot as plt
from skimage import color


img = io.imread("test_image.PNG")

red_channel = img[:, :, 0]
blue_channel = img[:, :, 2]

io.imsave("redch.png", red_channel)

#elevation_map = sobel(red_channel)
elevation_map = sobel(blue_channel)


io.imsave("sobel.png", elevation_map)

thresh = threshold_otsu(red_channel)

binary = red_channel.copy()
binary[binary >= thresh] = 255
binary[binary < thresh] = 0

io.imsave("otsu.png", binary)

dist_transform = ndimage.distance_transform_edt(binary)
local_max = feature.peak_local_max(dist_transform, indices = False, labels = binary, min_distance = 5)
markers = ndimage.label(local_max, structure = np.ones((3, 3)))[0]
io.imsave("markers.png", color.label2rgb(markers, red_channel))

segmentation = watershed(elevation_map, markers)

io.imsave("watershed.png", color.label2rgb(segmentation, img))