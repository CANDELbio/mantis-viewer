---
layout: default
title: Exporting Segment Statistics
parent: Exporting Data
nav_order: 3
---

## Exporting Segment Statistics

Segment statistics are composed of any information Mantis has about the currently loaded segments. This includes [segment features]({{ site.baseurl }}{% link docs/segment_features.md %}), centroid locations, and population membership. Mantis supports exporting segment statistics in two formats: FCS and CSV.

### Exporting to FCS

Statistics about segments can be exported to FCS by selecting the main menu item `Export` then `Segment Features to FCS` and then one of the options in that submenu. You can export either the mean or median segment intensities, and you can either export to one FCS for the active image or to multiple FCS files for all open images. The FCS file format does not have the concept of populations or subpopulations, but Mantis supports exporting the selected populations to FCS files by exporting each population to its own FCS file.

### Exporting to CSV

Statistics about segments can be exported to CSV by selecting the main menu item `Export` then `Segment Features to CSV` and then one of the options in that submenu. You can export either the mean or median segment intensities, and you can either export to one CSV for the active image or to multiple CSVs for all open images. When exporting to CSV you will get the mean or median segment intensity, the X and Y coordinates of the segment centroid, and any populations the segment belongs to.