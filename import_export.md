---
layout: default
nav_order: 6
title: Importing and Exporting Data
permalink: /import_export/
---

## Importing and Exporting Populations to JSON

You can save your selected regions and populations for use later by selecting the main menu item `Export` and then `Populations`. You can either export for the currently active image set by selecting `For active image set to JSON` or for all of the open image sets in a project by selecting `For project to JSON`. If you select `For project to JSON` it will ask you to save for the currently active image set, but it will also create and export to a file with the same name in the base directory of every image set with populations. Note that these menu options will only be enabled when you have selected populations for the currently active image set.

You can reload exported populations at a later time by selecting the main menu item `Import` and then `Populations`. You can either import for the currently active image set by selecting `For active image set from JSON` or for all of the open image sets in a project by selecting `For project from JSON`. Importing for a project from JSON files works the same way as exporting: you select a JSON file for the currently active image set, and the application will look for JSON files with the same name in all of the base directories for every loaded image set.

## Importing and Exporting Populations to CSV

Mantis Viewer also allows you to import and export populations from CSVs (i.e. from or for use in other applications). Using the main menu item `Import` then `Populations` then `For Active Image Set from CSV` you can add populations from a CSV file. Note that this menu item will be disabled unless segmentation data has been loaded for the currently active image set.

The CSV file selected should have no header, and each row should be of the format `segment_id, population_name`. For example, here are a few rows from a valid population CSV file:

```
220,CD4 High Cells
707,CD4 High Cells
220,CD8 High Cells
77,CD8 High Cells
140,CD8 High Cells
```

## Exporting Segment Statistics

Statistics about segments can also be exported to CSV or FCS.

## Exporting the Current Image with Layers

You can export the current image with layers from the main menu by selecting `Export` then `Image` then `Current Image and Layers`.
