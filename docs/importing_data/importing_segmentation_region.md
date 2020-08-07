---
layout: default
title: Importing Segmentation and Region Data
parent: Importing Data
nav_order: 1
---

## Importing Segmentation and Region Data

Mantis supports importing segmentation data from TIFFs or TXT/CSV files and region data from TIFFs. You can set project wide segmentation and region files when opening a new project, or you can import segmentation and region data by navigating to the `Import` submenu in the main menu and then  selecting `Segmentation` or `Regions from TIFF`.

## TIFF Format

For the TIFF format, Mantis expects the data to be stored as a TIFF where pixels belonging to a segment or region have a unique numerical id as their value (e.g. all of the pixels belonging to first segment or region have the value of 1, all of the pixels belonging to the second segment or region have a value of 2, etc.), and where pixels not belonging to a segment or region have a 0 value.

## TXT/CSV Format

The TXT/CSV format is only supported for importing segmentation. For the TXT/CSV format, Mantis expects the segmentation data to be stored in a TXT or CSV file where each row contains a comma separated list of all of the X and Y values belonging to a segment (e.g. row 1 in the file contains all of the X and Y coordinates for the first segment in the format X,Y,X,Y,...).