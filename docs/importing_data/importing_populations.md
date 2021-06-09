---
layout: default
title: Importing Populations
parent: Importing Data
nav_order: 3
---

## Importing Populations from CSV

Mantis supports importing populations from CSVs. You can either select a CSV to import from when setting up a new project or you can select a CSV to import with the main menu. To import populations from the main menu, navigate to `Import` then `Populations` then `For active image from CSV` or `For project from single CSV`. Note that these menu item will be disabled unless segmentation data has been loaded for the currently active image.

When importing populations for a project Mantis expects a CSV file with no header. Each row should be of the format `image_folder_name, segment_id, population_name`. For example, here are a few rows from a valid project CSV file:

```
image_one,220,CD4 High Cells
image_one,707,CD4 High Cells
image_one,220,CD8 High Cells
image_two,77,CD8 High Cells
image_two,140,CD8 High Cells
```

When importing populations for a single image Mantis expects a similarly formatted CSV. The main difference is that `image_folder_name` is not included. Instead, each row should be of the format `segment_id, population_name`. For example, here are a few rows from a valid image CSV file:

```
220,CD4 High Cells
707,CD4 High Cells
220,CD8 High Cells
77,CD8 High Cells
140,CD8 High Cells
```


