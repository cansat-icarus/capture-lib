# Change Log
All notable changes to this project will be documented in this file.
This project adheres to [Semantic Versioning](http://semver.org/).

## [Unreleased]

### Added
- Add local database (PouchDB over LevelDown) for packet storage and replication.
- Implement Station, the class to rule them all, literally. The only interaction a wrapper should have is with this class.
- Implement quasi-binary decoder.
- Implement Serial, a node-serialport wrapper that allows path changes and keeps track of port state.
- Implement Parser, a general purpose parser meant to be implemented and fitted to anyone's needs.
- Implement IcarusParser, the parser for our team (extends Parser)
- Add sensor unit conversion
- Add string tables for raw CanSat values
