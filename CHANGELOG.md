# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## [v0.2.1] - 2016-08-12
### Tested configurations
None. **UNTESTED AND UNSTABLE. DO NOT USE!** Until unit tests and test protocol is finalized, version 1.* (stable) will not be reached.

### Changed
- Data handler now makes station emit an event on every packet received.
- Bugfix: Quasi-binary unit tests now work (quasi-binary:error:* were expecting errors to be returned, not throwed).
- Bugfix: Classifier#classifyPacket was ignoring the argument updateStationClassification.

## [v0.2.0] - 2016-08-12
### Tested configurations
None. **UNTESTED AND UNSTABLE. DO NOT USE!** Until unit tests and test protocol is finalized, version 1.* (stable) will not be reached.

### Added
- Packet and Station classification algorithm (Classifier)

## [v0.1.0] - 2016-08-11
### Tested configurations
None. **UNTESTED AND UNSTABLE. DO NOT USE!** Until unit tests and test protocol is finalized, version 1.* (stable) will not be reached.
### Added
- Add local database (PouchDB over LevelDown) for packet storage and replication.
- Implement Station, the class to rule them all, literally. The only interaction a wrapper should have is with this class.
- Implement quasi-binary decoder.
- Implement Serial, a node-serialport wrapper that allows path changes and keeps track of port state.
- Implement Parser, a general purpose parser meant to be implemented and fitted to anyone's needs.
- Implement IcarusParser, the parser for our team (extends Parser)
- Add sensor unit conversion
- Add string tables for raw CanSat values

[Unreleased]: https://github.com/cansat-icarus/cansat/compare/v0.2.1...HEAD
[v0.2.1]: https://github.com/cansat-icarus/cansat/compare/v0.2.0...v0.2.1
[v0.2.0]: https://github.com/cansat-icarus/cansat/compare/v0.1.0...v0.2.0
[v0.1.0]: https://github.com/cansat-icarus/cansat/compare/e73fe964bc6dfae26e1a6bbb03d0565b35a394f9...v0.1.0
