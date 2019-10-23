---
layout: default
nav_order: 3
title: Segmentation Data
permalink: /segmentation/
---

Mantis Viewer expects segmentation data to be stored as a TIFF where pixels not belonging to a segment have a 0 value, and where pixels belonging to a segment have a numerical segment id as their value (e.g. all of the pixels belonging to first segment have the value of 1). You can load segmentation data by hovering over `Import` and then clicking on the `Segmentation` entry in the main menu.

![Segmentation Menu](images/segmentation_menu.png)

Once segmentation data has been loaded segment outlines will be overlaid on the image. You can access controls for displaying the segmentation data by clicking the button labeled `Show Image Controls`. Once the Image Controls have been expanded you can toggle whether or not centroids for segments are displayed, adjust the alpha of segment outlines, adjust the alpha of segment fills, and clear the segmentation data.

![Segmentation Controls](images/segmentation_controls.png)

Mantis can be configured to automatically look for and load segmentation files when an image set or project is loaded. You can configure the default segmentation filename in [preferences]({% link preferences.md %}). Mantis can also automatically load segmentation files that do not match the default filename when switching between image sets in a project. To enable this behavior segmentation data files are must be stored in their respective image set folders and all have the same name.
