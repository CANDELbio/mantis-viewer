# Mantis Viewer

Mantis Viewer is an application developed by the [Parker Institute for Cancer Immunotherapy](https://www.parkerici.org/) for viewing and analyzing multi-channel pathology imaging, such as IHC, Vectra, MIBI, IMC, CODEX, or other technologies. It has been designed to be highly performant and responsive when analyzing both large and small images and to support workflows with segmentation data.

## Using Mantis Viewer

If you want a walkthrough for using Mantis Viewer, you can [check out the documentation](https://candelbio.github.io/mantis-viewer/)!

## Downloading

If you just want to use the application head to the [releases](https://github.com/CANDELbio/mantis-viewer/releases) page! Otherwise continue reading if you want to build the project yourself or to contribute to this project.

## Develop and Run Locally

To get up and running for the first time first clone the repository and install the dependencies. You may need to install the build dependencies for [canvas](https://www.npmjs.com/package/canvas) first.

```shell
npm install
```

Once NPM has installed all of the dependencies, you can start the application.

```shell
npm start
```

Webpack will automatically rebuild the application and restart Electron if you are actively developing.

## Running tests

Running tests is a little funky. It isn't possible to install a version of Node locally that has the same API version as the version of Node that's bundled with Electron. Since this project makes use of native modules, which have to be compiled targeting a specific Node API version, we have to reinstall or recompile the native modules before running tests so they can run using the local Node version, and after running tests so that the modules can be used with Electron's Node version. There's probably a better way to do this, but for now these are the three commands that you need to run tests locally.

```shell
npm rebuild
npm run test
npm run postinstall
```

## Generating executables

To generate executables on all systems, you will first need to make sure all dependencies are installed

```shell
npm install
```

Once this is done, you can build and package the application for distribution

Linux:

```shell
npm run dist-linux
```

Mac:

```shell
npm run dist-mac
```

Windows:

```shell
npm run dist-win
```

When this completes, you should have executables built in the `dist` directory.

## Creating a New Release

New releases are automatically built on CircleCI and then published to GitHub as drafts. [npm-version](https://docs.npmjs.com/cli/v8/commands/npm-version) is used to bump the version.

For a prerelease version run the following command.

```shell
npm version prerelease --preid=rc
```

Preminor, minor, and major releases do not need any additional arguments for npm-version.

To specify the verion during a release run the following command

```shell
npm version <new-version>
```

## Technologies

Mantis Viewer is build using Electron, Typescript, React, MobX, and PIXI.js.

## Cite Us

Please cite Mantis Viewer using the following citation:

Robert Schiemann, Lacey Kitch, Pier Federico Gherardini, Robin Kageyama, & Mike Travers. Mantis Viewer. Zenodo. http://doi.org/10.5281/zenodo.4009579

You may also cite the specific version of Mantis that you used instead if you wish. You can get citations for specific versions on the [Mantis Viewer Zenodo Page](https://zenodo.org/record/4009580#.X01fytNKh-W)

# License

Mantis Viewer is distributed under Apache 2 license. See the [LICENSE](LICENSE.md) file for details.
