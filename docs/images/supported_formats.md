---
layout: default
title: Supported Image Formats
parent: Opening and Interacting with Images
nav_order: 1
---

## Supported Image Formats

Mantis currently supports loading images from two types of TIFFs: a folder containing multiple greyscale single-image TIFFs or a folder containing one greyscale multi-image TIFF. In the case of multi-image TIFFs, each image within the TIFF must be stored within its own image file directory (IFD). Mantis does not support other types of multi-image TIFF files (such as hyperstacks), but there are plans to add support in the future. In the interim you can use [image-utils](https://github.com/ParkerICI/image-utils) to split up unsupported multi-image TIFFs into single channel TIFFs that can be analyzed by Mantis.

### Inferring Marker Names
Mantis will attempt to parse the ImageDescription tag for each image file directory as an XML string. If parsing is successful Mantis will search for an element called `name` within the parsed XML tree. If Mantis finds an element called `name` it will take the text value of the `name` element and use that value as the marker name. If Mantis is unable to parse the ImageDescription tag as an XML string or does not find an element called `name`, it will use the filename as the marker name. In the case of multi-image TIFFs, Mantis will append the image file directory index to the filename and use that as the marker name if it is unable to find a name in the ImageDescription tag.

### Downsampling Images
Mantis will downsample images when either the width or the height of the image is greater than 10,000 pixels. There are plans to build support for viewing higher resolution images without downsampling in later releases.

### Additional Formats
If you encounter an image that you expect to work with Mantis but doesn't or if you need help getting your images into a format that Mantis supports feel free to [create an issue on the GitHub page](https://github.com/ParkerICI/mantis-viewer/issues) or send us an email at <engineering@parkerici.org>.