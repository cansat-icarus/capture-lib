# CanSat Data Capture library

[![Greenkeeper badge][greenkeeper-image]][greenkeeper-url]
[![Dependency Status][david-image]][david-url]
[![Build Status][travis-image]][travis-url]
[![Build status][appveyor-image]][appveyor-url]
[![Codecov Status][codecov-image]][codecov-url]
[![Codacy Badge][codacy-image]][codacy-url]
[![Commitizen friendly][commitizen-image]][commitizen-url]
> Does anything the groundstation can! To use it in a real world scenario wrap it for a specific platform/use case or use a pre-built wrapper.

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Installation](#installation)
- [Features](#features)
- [Documentation](#documentation)
- [Included components](#included-components)
  - [Serial](#serial)
  - [Quasi-binary decoder](#quasi-binary-decoder)
  - [Parser](#parser)
  - [Classifier](#classifier)
  - [Data Handler](#data-handler)
  - [Backend](#backend)
  - [Station](#station)
- [Building, testing and all the workflow things](#building-testing-and-all-the-workflow-things)
- [Contributing](#contributing)
- [License](#license)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Installation

`$ npm install @cansat-icarus/capture-lib`

If you need just part of project please open an issue. This project could use some splitting.

## Features

- Modular code base for easier coding and maintenance.
- Base64 packet encoding that minimizes packet size, diminishing the time window where interference may appear.
- CRC32 checksums sent with every packet to ensure no bad data is mistakenly registered in a ground station.
- Scores every packet based on the CRC checksum and simple heuristics (eg. a temperature sensor shouldn't suddenly report a temperature 30ºC higher than the previous packet few seconds ago)
- Automagically connects to a [backend](https://github.com/cansat-icarus/backend) server through a WebSocket.
- Backend data(DB) replication Station->backend
- ~~Remote control capabilities (exposed to the backend) exposing: a REPL with access to the wrapper/station, CLI access to the host machine (something like tty.js) and possibly a VNC-like full-screen control of the host.~~ (not yet at least)

## Documentation

API documentation is available [here](https://cansat-icarus.github.io/capture-lib), built using ESDoc by Travis CI. If you want to build it locally, you can by running `npm run docs` at the root of the repository. Output will be inside a folder named docs. An overview of each module/component is available in this file.

## Included components
### Serial

A node-serialport abstraction, allowing to change the port path without recreating the instance and keeps track of state changes (open/close/...).

### Base64 Packet Encoding

Base64 is an established standard for encoding data using only alphanumeric characters, '/', '+', and '='. It's easy to manually spot interference and it translates to a reduction to ~19.7% of the original packet size. It's efficient, it's quick (quicker than serializing all data to strings like it's usual) and it works.

### Parser

Generic class for binary data parsing. No assumptions about the packet, just a helper interface for constructing an object from raw data. Along with it, a preconfigured instance ready for telemetry, info and settings packets from the CanSat. Re-implemented as IcarusParser to include our mission's packet fields.

### Classifier

Not an AI. An algorithm that calculates each packet's score: 60% for the CRC checksum, 40% for the heuristics.
The station score reflects reception quality in the recent past (The nth most recent packet accounts for at least 1/(n+1) of the station score).

### Data Handler

A function that decodes the data, parses it, gives it a score, and puts it in the db. Just a high-level utility piping everything together.

### Backend

Handles the WebSocket (Socket.IO) connected to the backend. Automatically attempts connection, reports metrics (station score, received packet count...), enables the replicator (copies local db to the backend asap, updating it live or as soon as the connection returns) and allows for remote control of the station.

### Station

Brings all the other modules together into one class. Wrappers should only need to access the station class, creating an instance and switching one implementation of a module (ex: DB, Backend) for another. A common place for triggering actions, changing settings and listening to events.

## Building, testing and all the workflow things

Source code uses ES2017 and some experimental syntax. So, until no supported nodejs versions remain that cannot run our code, babel is used for transpiling the source.

My advice: change things and when you're done, lint, run unit tests, generate and check the new documentation (if changed), check test coverage (make sure it does not drop). And while you're fixing bugs (a unit test failing), run test:watch for help. For always-running automatic linting, use a [xo plugin](https://github.com/sindresorhus/xo#editor-plugins) in your editor.

```bash
$ yarn run clean
$ npm run clean       # remove and recreate output directory (dist)

$ yarn run lint
$ npm run lint        # lint source using xo

$ yarn run build
$ npm run build       # transpile source code into ./dist

$ yarn run build:watch
$ npm run build:watch # transpile source code into ./dist (and watch for changes in code). Does not work in PowerShell/CMD.

$ yarn run docs
$ npm run docs        # generate documentation

$ yarn run coverage
$ npm run coverage    # run unit tests and generate code coverage report

$ yarn run test
$ npm run test        # run unit tests (with code coverage) and run the linter

$ yarn run test:watch
$ npm run test:watch  # run unit tests and the linter everytime the source changes
```

## Contributing

Just fork the project, do what you want (while trying to follow the advice below), and send a pull request. Or file an issue if your a bit lost... For contacting us, you have links to social media profiles and email in our [website](https://cansat-icarus.github.io/).

Some advice for a good pull request:
- If you're adding new features, **write unit tests** for them.
- **Run the unit tests** before committing.
- If the tests fail, and you're doing it on purpose, you better have a good explanation! Having a valid reason, change the unit tests to what they should be.
- Besides writing unit tests, make sure to **document** any new features and changes to normal behavior.
- Short, informative commit messages are good. See [here](http://chris.beams.io/posts/git-commit/) why they matter and how to write good ones. [Commitizen][commitizen-url] can help you stick to our commit message style.

## License

MIT © 2016 [André Breda](https://github.com/addobandre)

[greenkeeper-url]: https://greenkeeper.io/
[greenkeeper-image]: https://badges.greenkeeper.io/cansat-icarus/capture-lib.svg

[travis-url]: https://travis-ci.org/cansat-icarus/capture-lib
[travis-image]: https://img.shields.io/travis/cansat-icarus/capture-lib.svg?style=flat

[appveyor-url]: https://ci.appveyor.com/project/addobandre/capture-lib
[appveyor-image]: https://ci.appveyor.com/api/projects/status/2ntc9xapqs6a315l?svg=true

[codecov-url]: https://codecov.io/github/cansat-icarus/capture-lib
[codecov-image]: https://codecov.io/gh/cansat-icarus/capture-lib/branch/master/graph/badge.svg

[codacy-url]: https://www.codacy.com/app/addobandre/capture-lib?utm_source=github.com&amp;utm_medium=referral&amp;utm_content=cansat-icarus/capture-lib&amp;utm_campaign=Badge_Grade
[codacy-image]: https://api.codacy.com/project/badge/Grade/9eb60377b5494b868542b3a788fc53e6

[david-url]: https://david-dm.org/cansat-icarus/capture-lib
[david-image]: https://david-dm.org/cansat-icarus/capture-lib.svg?style=flat

[commitizen-url]: http://commitizen.github.io/cz-cli/
[commitizen-image]: https://img.shields.io/badge/commitizen-friendly-brightgreen.svg
