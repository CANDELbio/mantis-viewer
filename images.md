---
layout: default
nav_order: 2
title: Opening and Interacting with Images
permalink: /images/
---

## Overview

Mantis Viewer allows users to load and analyze sets of images, or 'image sets' that contain multiple TIFF files. Each TIFF should contain one or multiple greyscale images of markers from a tissue slide. The below animation gives a brief overview of opening an image set and interacting with the channel and image controls. See below for detailed instructions.

<video width="640" autoplay="autoplay" loop="loop">
  <source src="{{site.baseurl}}/videos/open_image_640.mp4" type="video/mp4">
  <source src="{{site.baseurl}}/videos/open_image_640.mp4" type="video/webm">
</video>

## Supported Image Formats

Mantis currently supports loading one or multiple greyscale single-channel images from TIFFs. In the case of multi-image TIFFs, each image must be stored within its own image file directory (IFD) within the TIFF. Mantis does not support other types of multi-image TIFF files (such as hyperstacks), but there are plans to add support in the future. In the interim you can use [image-utils](https://github.com/ParkerICI/image-utils) to split up unsupported multi-image TIFFs into single channel TIFFs that can be analyzed by Mantis.

Mantis will attempt to parse the ImageDescription tag for each image file directory as an XML string. If parsing is successful Mantis will search for an element called `name` within the parsed XML tree. If Mantis finds an element called `name` it will take the text value of the `name` element and use that value as the marker name. If Mantis is unable to parse the ImageDescription tag as an XML string or does not find an element called `name`, it will use the filename as the marker name. In the case of multi-image TIFFs, Mantis will append the image file directory index to the filename and use that as the marker name if it is unable to find a name in the ImageDescription tag.

Mantis will downsample images when either the width or the height of the image is greater than 10,000 pixels. There are plans to build support for viewing higher resolution images without downsampling in later releases.

If you encounter an image that you expect to work with Mantis but doesn't or if you need help getting your images into a format that Mantis supports feel free to [create an issue on the GitHub page](https://github.com/ParkerICI/mantis-viewer/issues) or send us an email at <engineering@parkerici.org>.

## Opening Images

When you first load the application you should see a blank screen with a few unpopulated controls. Click the menu item named `mantis-viewer`, and then select `Open`.

![Application Load](images/application_load.png)

In the `Open` submenu you should see option for `Image Set` and `Project`, which represent the two ways of working with Mantis. If you just want to look at images from a single slide or ROI, you can choose to import an image set.

For an image set Mantis expects one folder with multiple images (one per marker) all stored as TIFFs. If you have images from many slides or ROIs, you can import a project. For a project, Mantis expects expects a folder containing multiple image sets. See the below screenshot for an example file structure of a project with detailed view of one of the contained image sets.

![Application Load](images/project_structure.png)


## Switching Between Image Sets

If you have loaded a project you can switch between the image sets in the project by using the dropdown under the title `Selected Image Set`, by using the arrows to the right of the dropdown, or by using the keyboard shortcut `Alt + Left or Right` or `Command/Windows + Left or Right`.

![Switching Image Sets](images/switching_image_sets.png)

When switching between image sets the application will automatically copy the selected markers, brightness and visibility settings, and plot settings from image set to image set.

## Channel Controls

Once an image set or project has been selected Mantis will load the Channel Controls. Mantis will automatically choose markers to be displayed for the channels on the first load. Automatic marker selection behavior can be configured in [preferences]({% link preferences.md %}). Mantis will automatically reload the last selected markers, brightness settings, and visibility settings on subsequent loads.

![Channel Controls](images/channel_controls.png)

If you wish to change the marker selected for a channel you can click on the dropdown and select a new channel. If you wish to clear a channel you can click the `x` on the channel select dropdown.

You can adjust the brightness of a channel by changing the min and max values on the slider below the channel dropdown. The min and max values are set using the pixel intensities from the channel's TIFF. Brightness adjustments are achieved by means of a linear transform.

You can quickly toggle the visibility of a channel by clicking on the eye icon next to the brightness slider.

## Image Controls

Other image controls that do not affect the channels can be accessed by clicking on the button `Show Image Controls`.

![Image Controls](images/image_controls.png)

From the Image Controls you can toggle the presence of a zoom inset indicator and a legend on the image that indicates which markers are currently visible and the channels they are selected for. Once [segmentation data]({% link segmentation.md %}) has been loaded, the Image Controls can also be used to adjust segmentation visualization settings.

## Selected Regions and Populations

You can select regions on the image or [populations]({% link populations.md %}) (once [segmentation data]({% link segmentation.md %}) has been loaded) by pressing Alt or Command/Windows and holding the left mouse button and outlining the region on the image. You can read more about populations in the [Populations page]({% link populations.md %})
