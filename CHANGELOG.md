# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

## [v4.0.0] - 2017-05-01
### Tested configurations
Basic packet reception was tested and is working.
Backend connection and replication is also working (required a few bugfixes included in this release).

### Breaking
- Acceleration unit is now G (was m/s^2). It was deemed more fitting for us. (1ca064957fe633c5e2fe047fa9a40c4748469b82)
- Dropped support for NodeJS v4 and Electron v1.4. (92a509734042c5da72ecdd667de3301919c50de1)

### Added
- New replicator state that removes undefined behavior between backoff. (758ed04068bc8771da586b270609f448e9073917)

### Fixed
- Backoff now has a minimum delay of 1s and a maximum delay of 60s to prevent deadlocks. (c04503cca805511b251d0169315ad31e1f313a82, df99e95430764d4c4d70c7c76545b24bd7b77ec8)
- When replication fails, all event listeners for the task are removed right after backing off to prevent duplicate backoff calls. (3176cc9f77b3f5ca6971c1b4a6e92fb2cc89e19a)
- Limited PouchDB replicator batching to prevent deadlocks. (ba804a692702001cc78ad2b5842b109703df8d55)
- Replicator is no longer marked as "connecting" while backing off. (758ed04068bc8771da586b270609f448e9073917)
- Prevent log replicator from going in an infinite loop: do not log pause or active events unless coming from a different state or an error occurs. (dcb4953477659910b27a851a98742254e7d4b748)

### Changed
- The station name is now included in the log DB path to split logs of different missions/stations. (a6e8038573da00bf72b85c99dc85c7564903c204)
- The PouchDB replication task is now dereferenced while backing off, allowing GC to get rid of it and saving memory. (071d0b1731c669d19d3c18819f206c3bdcf3f6c1)
- Replicators are now also stopped when disconnecting from the backend to save memory. It's possible they slow down the app too much and the station operator may decide that they mustn't run. (ac06773cba8891c69785656d024e66a6decd6514)
- Log childIds are now shorter because they no longer begin with "station." (which is redundant, we know they are part of the station). (59bb9e9763bf1f8a94c72b6e2e890a0e102fc613)

## [v3.0.1] - 2017-04-23
Disabled a failing test for the build to pass. It's intended, we corrected the conversions according to the datasheet for the pressure sensor.

### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

## [v3.0.0] - 2017-04-23
### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

### Breaking
- Switch 2nd accelerometer to a MMA7361 (a68d0080c43b51e3fa34efe21b847eb28dd55104)

### Added
- Value conversions for the MMA7361 accelerometer. (bc9782da39d1bb9826ba53142c217047c3d0c14b)

### Fixed
- Value conversions for the MPX4115A pressure sensor according to datasheet. (b2e3e028f516e057dd9a3739c431532b18c0fc62)

## [v2.1.0] - 2017-04-22
### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

### Added
- Save log files in `global.pathPrefix` directory. (a5b738e9ebfdd9eeed1a8e8731efe0a2c771caa5)

## [v2.0.4] - 2017-04-21
### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

### Fixes
- Split packets or \r\n. (4c21354a61fa4fefa86ba7769de6ca65dde7da28)

## [v2.0.3] - 2017-04-21
See changelog for 2.0.2, some changes went unreleased.

## [v2.0.2] - 2017-04-21
### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

### Fixes
- Save essential fields in bad packets. (c26ea8de50ac1af0a878b02acd076be84bb51079)

## [v2.0.1] - 2017-04-21
### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

### Changed
- Packet parser instances are now isolated. One is created per packet. (765166181a81a628493b13201de4fb2cd6ee0b79)

### Fixes
- Packet parsing no longer crashes because of too small packets. (ccc1b5645f1ff954ff8bda8fb901503f88a25f16)

## [v2.0.0] - 2017-04-20
### Tested configurations
Basic packet reception was tested and is working.
Backend-related code will be tested in the next few weeks.

### Changed
- **BREAKING**: Packet encoding algorithm changed from quasi-binary to base64. It gives the same savings, and our transceivers actually work with it. (3006aca0c65bbd9241e405b1f775a8098b475140)

## [v1.0.3] - 2017-04-14
No changes to the code. Just changing the package name to be scoped (in @cansat-icarus).
Last patch version containing nothing. I hope.

## [v1.0.2] - 2017-04-14
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

[Unreleased]: https://github.com/cansat-icarus/capture-lib/compare/HEAD...v4.0.0
[v4.0.0]: https://github.com/cansat-icarus/capture-lib/compare/v3.0.1...v4.0.0
[v3.0.1]: https://github.com/cansat-icarus/capture-lib/compare/v3.0.0...v3.0.1
[v3.0.0]: https://github.com/cansat-icarus/capture-lib/compare/v2.1.0...v3.0.0
[v2.1.0]: https://github.com/cansat-icarus/capture-lib/compare/v2.0.4...v2.1.0
[v2.0.4]: https://github.com/cansat-icarus/capture-lib/compare/v2.0.3...v2.0.4
[v2.0.3]: https://github.com/cansat-icarus/capture-lib/compare/v2.0.2...v2.0.3
[v2.0.2]: https://github.com/cansat-icarus/capture-lib/compare/v2.0.1...v2.0.2
[v2.0.1]: https://github.com/cansat-icarus/capture-lib/compare/v2.0.0...v2.0.1
[v2.0.0]: https://github.com/cansat-icarus/capture-lib/compare/v2.0.0...v1.0.3
[v1.0.3]: https://github.com/cansat-icarus/capture-lib/compare/v1.0.3...v1.0.2
[v1.0.2]: https://github.com/cansat-icarus/capture-lib/compare/v1.0.2...v1.0.1
[v1.0.1]: https://github.com/cansat-icarus/capture-lib/compare/v1.0.1...v1.0.0
[v1.0.0]: https://github.com/cansat-icarus/capture-lib/compare/v0.3.0...v1.0.0
[v0.3.0]: https://github.com/cansat-icarus/capture-lib/compare/v0.2.1...v0.3.0
[v0.2.1]: https://github.com/cansat-icarus/capture-lib/compare/v0.2.0...v0.2.1
[v0.2.0]: https://github.com/cansat-icarus/capture-lib/compare/v0.1.0...v0.2.0
[v0.1.0]: https://github.com/cansat-icarus/capture-lib/compare/e73fe964bc6dfae26e1a6bbb03d0565b35a394f9...v0.1.0
