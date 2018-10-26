# Using Mantis Viewer #

## Getting started! ##

When you first load the application you should see a blank screen with a few unpopulated controls. Click the menu item named `mantis-viewer`, and then select `Open Folder`.

![Application Load](./images/tutorial/application_load.png)

Mantis Viewer expects one folder with multiple images (one per channel) all stored as TIFFs.

## Color Controls ##

Once a folder has been selected, Mantis Viewer will select a random channel image for each color.

![Channel Controls](./images/tutorial/channel_controls.png)

If you wish to change the channel selected for a color you can click on the dropdown and select a new channel. If you wish to clear a color you can click the `x` on the channel select dropdown.

You can adjust the brightness of a color by changing the min and max values on the slider below the color dropdown. The min and max values are set using the pixel intensities from the channel's TIFF. Brihtness adjustments are achieved by means of a linear transform.

## Additional Menu Items ##

Additional menu items will be activated in the main menu once channels have been loaded. 

![Additional Menu Items](./images/tutorial/menu_options_images_loaded.png)

You should see the following menu items enabled:

* `Open Segmentation File`
* `Add populations from CSV`
* `Import selected populations`
* `Export selected populations`

These items will be discussed in subsequent sections.

## Segmentation Data ##

You can load segmentation data by clicking the `Open Segmentation File` entry in the main menu. Mantis Viewer expects segmentation data to be loaded as a TIFF where pixels not belonging to a segment have a 0 value, and where pixels belonging to a segment have a numerical segment id as their value.

Once segemntation data has been loaded segment outlines will be overlayed on the image.

![Segmentation Controls](./images/tutorial/segmentation_controls.png)

You can access controls for displaying the segmentation data by clicking the button labeled `Show Segmentation Controls`. Once segmentation controls have been expanded you can toggle whether or not centroids for segments are displayed, adjust the alpha of segment outlines, and adjust the alpha of segment fills. 

## Graphing ##

The graphing functions of Mantis Viewer allow you to view scatterplots of cell intensities per channel, as well as select and view populations of cells. If segmentation data is loaded you can access graphs of the data by clicking the `Show Graphing Pane` button or by selecting the `Open Plot Window` entry in the `Window` menu. Note: graph performance is usually better in the plot window, and the graphing pane will automatically close when the plot window is opened.
 
![Opening Graphing](./images/tutorial/graphing.png)

When you first load a graphing view you should see a blank view with a select form.

![Initial Graphing](./images/tutorial/graph_initial.png)

Click the form and start typing channel names. Once you've selected two different channels you should be shown a scatter plot comparing the intensities for each segment.

![Graphing Loaded](./images/tutorial/graph_load.png)

Once the scatter plot has loded you will be presented with a few more controls. Above the graph you will see a row of icons that can be used to manipulate the graph. Notable here is the camera, which can be used to export an image of the graph. Also notable is the lasso, which can be used to select a population of segments on the graph to be analyzed in a different scatter plot or viewed on the image.

## Selecting Regions or Populations ##

In addition to selecting populations on the scatter plot you can select regions or populations of interest on the image. You can accomplish this by holding down `Alt` or `Option` and clicking and drawing a region on the image.

![Selected Region](./images/tutorial/selected_region.png)

Once you've selected a region or population on the image or in a scatter plot it will be shown in the list of selected regions to the right of the image. From the list of selected regions you can change the name, change the display color, take notes, toggle display on the image, or delete a selected region.

If segmentation data has been loaded selected regions will also be displayed on the scatter plot. You can toggle visibility of regions on the scatter plot by clicking on the colored dot next to the name in the legend.

![Graph Region](./images/tutorial/graph_region.png)

## Adding Populations from CSV ##

Mantis Viewer allows you to import populations, ie from gating using other software. Using the main menu item `Add populations from CSV` you can add populations from a CSV file. The CSV file should have no header, and each row should be of the format `segment_id, population_name`. For example, here are a few rows from a valid population CSV file:

```
220,CD4 High Cells
707,CD4 High Cells
220,CD8 High Cells
77,CD8 High Cells
140,CD8 High Cells
```

## Importing and Exporting Populations ##

You can save your selected regions and populations for use later by selecting the main menu item `Export selected populations` and saving the selected populations in a file.

You can reload exported populations at a later time by selecting the main menu item `Import selected populations` and selecting a file that you previously exported.
