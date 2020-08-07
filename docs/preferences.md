---
layout: default
nav_order: 9
title: Preferences
permalink: /preferences/
---

## Overview

Mantis Viewer allows the user to configure some default behaviors to improve the user experience or performance of the application. You can access the Preferences window by selecting the `Preferences` entry in the main menu.

![Preferences Menu Entry](../assets/images/preferences_menu.png)

## Configurable Preferences

The preferences window allows you to configure the following behaviors:

* The maximum number of image sets stored in memory
* Whether or not pixels are blurred/smoothed
* The default segmentation filename
* If Mantis should remember to automatically calculate segment intensities (or not) or ask you for your input when importing a new image set or project
* If Mantis should remember to automatically recalculate segment intensities when reloading a project (or not) or ask you for your input when reloading a project
* If Mantis should clear any potential duplicate segment features (or not) or ask you for your input when loading custom segment features
* The default brightness settings for each channel
* The default marker names and their selection priority for each channel
* Whether or not any marker should be selected if a default marker is not present for each channel

## Maximum Image Sets Stored in Memory
When viewing a project, Mantis keeps the most recently viewed image sets in memory so you can quickly switch between them without having to wait for them to reload. If too many image sets are stored in memory then Mantis may become slow or unresponsive. However, if very few image sets are stored in memory then you will have to wait as they are reloaded. This setting allows you to tune Mantis to optimally perform on your machine.