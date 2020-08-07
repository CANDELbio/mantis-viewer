---
layout: default
title: Importing Populations
parent: Importing Data
nav_order: 2
---

## Importing Populations from CSV

Mantis supports importing populations from CSVs. You can either select a CSV to import from when setting up a new project or you can select a CSV to import with the main menu. To import populations from the main menu, navigate to `Import` then `Populations` then `For active image set from CSV` or `For project from single CSV`. Note that these menu item will be disabled unless segmentation data has been loaded for the currently active image set.

When importing populations for a project Mantis expects a CSV file with no header. Each row should be of the format `image_set_name, segment_id, population_name`. For example, here are a few rows from a valid project CSV file:

```
set_one,220,CD4 High Cells
set_one,707,CD4 High Cells
set_one,220,CD8 High Cells
set_two,77,CD8 High Cells
set_two,140,CD8 High Cells
```

When importing populations for a single image set Mantis expects a similarly formatted CSV. The main difference is that `image_set_name` is not included. Instead, each row should be of the format `segment_id, population_name`. For example, here are a few rows from a valid image set CSV file:

```
220,CD4 High Cells
707,CD4 High Cells
220,CD8 High Cells
77,CD8 High Cells
140,CD8 High Cells
```


