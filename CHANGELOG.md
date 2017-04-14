# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## [v1.0.3] - 2017-4-14
No changes to the code. Just changing the package name to be scoped (in @cansat-icarus).
Last patch version containing nothing. I hope.

## [v1.0.2] - 2017-4-14
No changes to the code. Just removing the private mark of our package.json so we can publish this in npm.

## [v1.0.1] - 2017-04-14
Changes to CI configuration, not to the code itself.

## [v1.0.0] - 2017-04-14
### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

### Added
- Backend connection logic and data/log db replication. (4eb02e79aa9bae70df6e5860bdc91b3f8831712d, 1bfb9fac2912718488e7d45c12d0d2078bf45ed3)
- API method: listPorts (in ./serial.js), a wrapper around SerialPort.list that extracts hardware IDs in Windows. (905624d2e6e2f499f71df4102d5b52b208d3a5ad)
- API method: Station#getAvailablePorts, a wrapper around listPorts that marks and prioritizes T-Minus transceivers in its output. (3ee5de49d789d072a54ce35714dbbaa53cc6d3ed)
- babel-runtime, to prevent global scope pollution by babel-polyfill. (2a6659b2de1dcb3fc5cfd286418d3efb9c647dae)
- Logging with bunyan. (eb8399574df2107d09877ff61c7ff1b864d2c36f)
- API method: Station#cleanup, calls Serial#close and Backend#cleanup; returns a Promise. (f41fcaca18b43ce60c7ed018eea02b6077c931ef)
- Serial now emits a "pathChange" event, whenever Serial#_path is changed. (c17248085ba3654583dc1274e45a79603c69534c)
- API method: encode (in quasi-binary.js), a quasi-binary encoder. (33d3e6bd0ec982f25ae00a4b22eef4e3883c7265)
- **BREAKING**: Missing fields from CanSat packets (unix timestamp, gps data, acceleration). (89a116c6ca4a52eb3071815fbaf0fa4985e0ad42)

### Changed
- **BREAKING**: "Serial" event names have changed for coherency with the rest of the codebase: (0a371e32f9374e7282c7fbba83c18d96bde7a8b6)
	* disconnect**ed**\_force**d** -> disconnect\_force
	* disconnect**ed** -> disconnect
	* close**d** -> close
- **BREAKING**: Serial#_state is now initially set to "close" (instead of disconnect), to reflect the fact that no serialports were opened yet. (0a371e32f9374e7282c7fbba83c18d96bde7a8b6)
- **BREAKING**: rename field in control packet parser for coherency: module.enable**d** -> module.enable (97823d08c89247c838b1eb4e63bc501313505b08)
- **BREAKING**: Station constructor now requires a name (a6a9b01ca1658d65baabcb0ce8a775bd4c4318a9)
- CanSat information packets message strings were shortened (88bd67253a973e9789b61c955f69347be7eab4c9)
- yarn is now used for (deterministic) dependency management. (f1c5f07bf88753ffbc7ea69fa54a6c4758e7fc01)
- "Packet saved" log messages are now log level trace. (e54530bcc0893e55315dc8b5fd28ffece5e8b743)
- We now keep 40 log files (instead of 10). (57edbb9d55cc20b641c0f52e280f6f1ca9ed2de6)

### Fixes
- Remove unused (but ignored, so things would never work) parameter in the minmaxH packet heuristic (silent fix included in f7b0d2b98448b5ec193659f31439f1bb325d406a)
- Serial#_destroyPort no longer tries to destroy ports that do not exist. (d93e342d7543f8f3c571049ebfb10162ad2632cd)
- Serial.listPorts no longer logs (it's static, therefore it had no access to the logger). (7e97b537d4beb0ebb5159cb87ca07a7fbaaba31f)
- Don't pass objects with circular references to PouchDB when saving error logs (a42201e4bd52e15ac237b187a33323edddff484a, b8d83db0dc4340f6af5ca4bbd044a57ac1ebcbba)
- packet.raw now includes the CRC, allowing the field to really be the full raw packet as it was sent. (ab2e1e1d74f1fcc3b92d3907367c9906d453c488)
- packet._id is now a string, like PouchDB requires. (89a116c6ca4a52eb3071815fbaf0fa4985e0ad42)
- Write a few bytes to the transceiver to make it work after opening the SerialPort. (b152050a5fa8ab43bb3e90e5a03900fce59ca6a2)

## [v0.3.0] - 2016-08-14
### Tested configurations
None. **UNTESTED AND UNSTABLE. DO NOT USE!** Until test protocol is finalized, version 1.* (stable) will not be reached. Unit tests are setup and passing.

### Added
- Unit tests for everything implemented (except for the quasi-binary decoder, those already existed).

### Changes
Too many to list, all untracked so far. Until v1.* arrives, breaking changes may go undocumented.
If for some (probably bad) reason you're using sub-v1 versions, check the few commits that took place between v0.2.1 and v0.3.

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
- Packet and Station classification algorithm (Classifier).

## [v0.1.0] - 2016-08-11
### Tested configurations
None. **UNTESTED AND UNSTABLE. DO NOT USE!** Until unit tests and test protocol is finalized, version 1.* (stable) will not be reached.
### Added
- Add local database (PouchDB over LevelDown) for packet storage and replication.
- Implement Station, the class to rule them all, literally. The only interaction a wrapper should have is with this class.
- Implement quasi-binary decoder.
- Implement Serial, a node-serialport wrapper that allows path changes and keeps track of port state.
- Implement Parser, a general purpose parser meant to be implemented and fitted to anyone's needs.
- Implement IcarusParser, the parser for our team (extends Parser).
- Add sensor unit conversion.
- Add string tables for raw CanSat values.

[Unreleased]: https://github.com/cansat-icarus/capture-lib/compare/v1.0.3...HEAD
[v1.0.3]: https://github.com/cansat-icarus/capture-lib/compare/v1.0.3...v1.0.2
[v1.0.2]: https://github.com/cansat-icarus/capture-lib/compare/v1.0.2...v1.0.1
[v1.0.1]: https://github.com/cansat-icarus/capture-lib/compare/v1.0.1...v1.0.0
[v1.0.0]: https://github.com/cansat-icarus/capture-lib/compare/v0.3.0...v1.0.0
[v0.3.0]: https://github.com/cansat-icarus/capture-lib/compare/v0.2.1...v0.3.0
[v0.2.1]: https://github.com/cansat-icarus/capture-lib/compare/v0.2.0...v0.2.1
[v0.2.0]: https://github.com/cansat-icarus/capture-lib/compare/v0.1.0...v0.2.0
[v0.1.0]: https://github.com/cansat-icarus/capture-lib/compare/e73fe964bc6dfae26e1a6bbb03d0565b35a394f9...v0.1.0
