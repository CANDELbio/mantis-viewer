# Mantis Viewer

Mantis Viewer is an application developed by the [Parker Institute for Cancer Immunotherapy](https://www.parkerici.org/) for viewing and analyzing multi-channel pathology imaging, such as IHC, Vectra, MIBI, IMC, CODEX, or other technologies. It has been designed to be highly performant and responsive when analyzing both large and small images and to support workflows with segmentation data.

## Using Mantis Viewer

If you want a walkthrough for using Mantis Viewer, you can [check out the documentation](https://mantis.parkerici.org)!

## Downloading

If you just want to use the application head to the [releases](https://github.com/ParkerICI/imc-viewer-js/releases) page! Otherwise continue reading if you want to build the project yourself or to contribute to this project.

## Develop and Run Locally

To get up and running for the first time first clone the repository and install the dependencies. You may need to install the build dependencies for [canvas](https://www.npmjs.com/package/canvas) first.

```shell
npm install
```

Once NPM has installed all of the dependencies, build the application and then run it.

```shell
npm run build
npm start
```

If you are actively developing you will need to run `npm run build` before running `npm start` to see your changes.

## Running tests

Running tests is a little funky. It isn't possible to install a version of Node locally that has the same API version as the version of Node that's bundled with Electron. Since this project makes use of native modules, which have to be compiled targeting a specific Node API version, we have to reinstall or recompile the native modules before running tests so they can run using the local Node version, and after running tests so that the modules can be used with Electron's Node version. There's probably a better way to do this, but for now these are the three commands that you need to run tests locally.

```shell
npm rebuild
npm run test
npm run postinstall
```

## Generating executables

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

## Technologies

Mantis Viewer is build using Electron, Typescript, React, MobX, and PIXI.js.

## License

Mantis Viewer is distributed under a GPLv3 license.
