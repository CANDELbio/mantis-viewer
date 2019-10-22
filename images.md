---
layout: default
nav_order: 2
title: Opening and Interacting with Images
permalink: /images/
---

# Opening Images

## Getting started!

When you first load the application you should see a blank screen with a few unpopulated controls. Click the menu item named `mantis-viewer`, and then select `Open`.

![Application Load](images/application_load.png)

In the `Open` submenu you should see option for `Image Set` and `Project`. For an `Image Set`, Mantis Viewer expects one folder with multiple images (one per marker) all stored as TIFFs. For a `Project` Mantis Viewer expects a folder containing multiple image sets.

# Interacting with Images

## Switching Between Image Sets

If you have loaded a project you can switch between the image sets in the project by using the dropdown under the title `Selected Image Set`, by using the arrows to the right of the dropdown, or by using the keyboard shortcut `Alt + Left or Right` or `Command/Windows + Left or Right`.

![Switching Image Sets](images/switching_image_sets.png)

When switching between image sets the application will automatically copy the selected markers, brightness and visibility settings, and plot settings from image set to image set.

## Channel Controls

Once an image set or project has been selected Mantis will load the Channel Controls. Mantis will automatically choose markers to be displayed for the channels on the first load. Automatic marker selection behavior can be configured in [preferences]({% link preferences.md %}). Mantis will automatically reload the last selected markers, brightness settings, and visibility settings on subsequent loa

![Channel Controls](images/channel_controls.png)

If you wish to change the marker selected for a channel you can click on the dropdown and select a new channel. If you wish to clear a channel you can click the `x` on the channel select dropdown.

You can adjust the brightness of a channel by changing the min and max values on the slider below the channel dropdown. The min and max values are set using the pixel intensities from the channel's TIFF. Brightness adjustments are achieved by means of a linear transform.

You can quickly toggle the visibility of a channel by clicking on the eye icon next to the brightness slider.

<video width="640" autoplay="autoplay" loop="loop">
  <source src="{{site.baseurl}}/videos/open_image_640.mp4" type="video/mp4">
  <source src="{{site.baseurl}}/videos/open_image_640.mp4" type="video/webm">
</video>

## Image Controls

Other image controls that do not affect the channels can be accessed by clicking on the button `Show Image Controls`.

![Image Controls](images/image_controls.png)

From the Image Controls you can toggle the presence of a legend on the image that indicates which markers are currently visible and the channels they are selected for. Once [segmentation data]({% link segmentation.md %}) has been loaded, the Image Controls can also be used to adjust segmentation visualization settings.
