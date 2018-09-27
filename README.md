# Mantis Viewer #

Mantis Viewer is an application for viewing and analyzing multi-channel [immunohistochemistry](https://en.wikipedia.org/wiki/Immunohistochemistry) images. It has been designed to support large images (>100 MB per channel).

## Downloading ##
If you just want to use the application head to the [releases](https://github.com/ParkerICI/imc-viewer-js/releases) page! Otherwise continue reading if you want to build the project yourself or to contribute to this project.

## Develop and Run Locally ##

To get up and running for the first time first clone the repository and install the dependencies.

```shell
npm install
```

Once NPM has installed all of the dependencies, build the application and then run it.

```shell
npm run build
npm start
```

If you are actively developing you will need to run `npm run build` before running `npm start` to see your changes.

## Generating executables ##

To generate executables you will first need to make sure all dependencies are installed

```shell
npm install
```
If you are generating executables in a non-Windows environment you will need to install Wine. On Mac you can accomplish this with [Homebrew](https://brew.sh/).

```shell
brew install wine
```

Once this is done, you can build the application and then package it for distribution.

```shell
npm run build
npm run dist
```

When this completes, you should have executables built for Mac, Windows, and Linux in the `dist` directory.

## Technologies ##

Mantis Viewer is build using Electron, Typescript, React, MobX, and PIXI.js.

## License ##
Mantis Viewer is distributed under a GPLv3 license.

