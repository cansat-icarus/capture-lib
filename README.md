# CanSat Data Capture library
[![Build Status][travis-image]][travis-url]
[![Codecov Status][codecov-image]][codecov-url]
[![Dependency Status][depstat-image]][depstat-url]
[![Standard][standard-image]][standard-url]
> Does anything the groundstation can! To use it in a real world scenario wrap it for a specific platform/use case or use a pre-built wrapper.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Building, testing and all the workflow things](#building-testing-and-all-the-workflow-things)
- [Features](#features)
- [Included components](#included-components)
  - [Serial](#serial)
  - [Quasi-binary decoder](#quasi-binary-decoder)
  - [Parser](#parser)
  - [Classifier](#classifier)
  - [SerialHandler](#serialhandler)
  - [Backend](#backend)
  - [Station](#station)
  - [DB](#db)
- [Documentation](#documentation)
- [Contributing](#contributing)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

This library is **not** published on npm, if you need it please suggest names for each required part (they're split into folders under src, easy to see what is a part) and I'll publish it! For the moment, I'm bad at naming and don't really want to have to maintain things that no one will ever use (except maybe for the parser or the serialport wrapper).
Its purpose is really just to split the UI/UX from the inner workings of our ground stations.

If you really have to use it and cannot wait, use git submodules! But still create the issue to migrate the library

## Building, testing and all the workflow things

Source code uses ES2015 and some experimental syntax. So, until no supported nodejs versions remain that cannot run our code, babel is used for transpiling the source.

My advice: change things and when you're done, lint, run unit tests, generate and check the new documentation (if changed), check test coverage (make sure it does not drop). And while you're fixing bugs (a unit test failing), run test:watch for help. For always-running automatic linting, use a [standard plugin](https://github.com/feross/standard#text-editor-plugins) in your editor.

```bash
$ npm run clean       # remove and recreate output directory (dist)

$ npm run lint        # lint source using standard

$ npm run build       # transpile source code into ./dist

$ npm run build:watch # transpile source code into ./dist (and watch for changes in code)

$ npm run docs        # generate documentation

$ npm run test        # run unit tests

$ npm run test:watch  # run unit tests (and watch for changes in code)

$ npm run coverage    # run unit tests and generate code coverage report
```

## Features

- Modular code base for easier coding and maintenance.
- Quasi-binary packet encoding that minimizes packet size, diminishing time window where interference may appear.
- CRC32 checksums sent with every packet to ensure no bad data is mistakenly registered in a ground station.
- Scores every packet based on the CRC checksum and simple heuristics (eg. a temperature sensor shouldn't suddenly report a temperature 30ºC higher than the previous packet few seconds ago)
- Automagically connects to a [backend](https://github.com/cansat-icarus/backend) server through a WebSocket.
- Backend data(DB) replication Station->backend
- Remote control capabilities (exposed to the backend) exposing: a REPL with access to the wrapper/station, CLI access to the host machine (something like tty.js) and possibly a VNC-like full-screen control of the host.

## Included components
### Serial

A node-serialport abstraction, allowing to change the port path without recreating the instance and keeps track of state changes (open/close/pause/resume).

### Quasi-binary decoder

Decodes data from our CanSat following this set of rules: for each byte, if the value is within [0, 232] leave it unchanged, if the byte value equals 253, write it plus (as in sum the values) the value of the next byte (whose parsing will be skipped).
If any byte value overflows (anything above 255) or no parsing rule was defined for this case stop parsing and return an error.

### Parser

Generic class for binary data parsing. No assumptions about the packet, just a helper interface for constructing an object from raw data. Along with it, a preconfigured instance ready for telemetry, info and settings packets from the CanSat.

### Classifier

Not an AI unfortunately. It just helps calculating individual packet scores and the station score.

### SerialHandler

A function that decodes the data, parses it, gives it a score, and puts it in the db. Just a high-level utility piping everything together. Makes future possible npm publishing of parts of the project easier.

### Backend

Handles the WebSocket (Socket.IO) connected to the backend. Automatically attempts connection, reports metrics (station score, received packet count...), enables the replicator (copies local db to the backend asap, updating it live or as soon as the connection returns) and allows for remote control of the station.

### Station

Brings all the other modules together into one class instance. Wrappers should only need to access the station class, creating an instance and switching one implementation of a module (ex: DB, Backend) for another. A common place for triggering actions, changing settings and listening to events.

### DB

Simply exports a PouchDB object for a locally-created database named "stationdb". Nothing else.

## Documentation

API documentation is available [here](https://cansat-icarus.github.io/capture-lib), built using JSDoc by Travis CI (TODO: actually do that). If you want to build it locally, you can by running JSDoc at the root of the repository. Output will be inside a folder named docs. An overview of each module/component is available in this file.

## Contributing

Just fork the project, do what you want (while trying to follow the advice below), and send a pull request. Or file an issue if your a bit lost... For contacting us, you have links to social media profiles and email in our [website](https://cansat-icarus.github.io/).

Some advice for a good pull request:
- Before committing, **transpile** your changes and include them, no one should be forced to install babel when trying to use the library.
- If you're adding new features, **write unit tests** for them.
- **Run the unit tests** before committing.
- If the tests fail, and you're doing it on purpose, you better have a good explanation! Having a valid reason, change the unit tests to what they should be.
- Besides writing unit tests, make sure to **document** any new features and changes to normal behavior.
- Short, informative commit messages are good. See [here](http://chris.beams.io/posts/git-commit/) why they matter and how to write good ones.


## License

MIT © 2016 [André Breda](https://github.com/addobandre)

[travis-url]: https://travis-ci.org/cansat-icarus/capture-lib
[travis-image]: https://img.shields.io/travis/cansat-icarus/capture-lib.svg?style=flat

[codecov-url]: https://codecov.io/github/cansat-icarus/capture-lib
[codecov-image]: https://img.shields.io/codecov/c/github/cansat-icarus/capture-lib.svg?style=flat

[depstat-url]: https://david-dm.org/cansat-icarus/capture-lib
[depstat-image]: https://david-dm.org/cansat-icarus/capture-lib.svg?style=flat

[download-image]: http://img.shields.io/npm/dm/capture-lib.svg?style=flat

[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat
[standard-url]: http://standardjs.com/
