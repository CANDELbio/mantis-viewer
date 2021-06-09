---
layout: default
title: Importing Segment Features
parent: Importing Data
nav_order: 2
---

## Importing Segment Features from CSV

Segment features are numerical statistics that describe individual segments (e.g. cell size, or the mean or median pixel intensity for a marker or channel). You can select a CSV to import when setting up a new project or from the main menu. To import segment features from the main menu, navigate to `Import` then `Segment Features` and finally `For active image from CSV` or `For project from single CSV` . Note that these menu item will be disabled unless segmentation data has been loaded for the currently active image.

When importing segment features for a project Mantis expects the CSV file to have a header. The first column should contain the image folder name (the values in this column should match the folder names), the second column should contain segment/cell ids, and any remaining columns should contain cell/segment features. Mantis doesn't use the column names/headers for the image folder name column or the segment/cell id column, but for the remaining columns Mantis uses the column name as the cell/segment feature name. For example, here are a few rows from a valid project CSV file:

```
Image Folder Name, Segment ID, Cell Size, CD4 Intensity
set_one,220,1.23,3.45
set_one,707,2.34,4.32
set_two,77,4.45,5.43
set_two,140,6.54,7.68
```

When importing populations for a single image Mantis expects a similarly formatted CSV. The main difference is that first column (image folder name) is not included when importing for a single image. For example, here are a few rows from a valid image CSV file:

```
Segment ID, Cell Size, CD4 Intensity
220,1.23,3.45
707,2.34,4.32
77,4.45,5.43
140,6.54,7.68
```