# Changelog
All notable changes to this project will be documented in this file.

<a name="v4.2.0"></a>
## [v4.2.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v4.1.1...v4.2.0) - 2024-04-23

### Added
* [Add basic auth and timeout support to the CLI](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/837e944542a333f938ff1faa48fdc4e84ca0d6be)

### Changed
* [Migrate from readable-web-to-node-stream to readable-from-web](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/6f62a481ff264c7148265c9927eee528367705a9)
* [Updates to dependencies and GitHub actions, and code clean-up](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/7a067922a85f31d54b81fdb9f906b1fab2b521be)

<a name="v4.1.1"></a>
## [v4.1.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v4.1.0...v4.1.1) - 2024-01-16

### Fixed
* [Migrate to @smessie/readable-web-to-node-stream](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/aa2e0527cb25d3a963b1a426840a5040449be8b0)

<a name="v4.1.0"></a>
## [v4.1.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v4.0.0...v4.1.0) - 2023-09-05

### Added
* [Enable SPARQL* support for queries (#68)](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/facef06abf09d377655b9ea3c090c65036c1c7e4)

<a name="v4.0.0"></a>
## [v4.0.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.3.3...v4.0.0) - 2023-08-07

### Changed
* [Make fetch input argument required](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/830d1dfbd53f618bfb408e28f2e5f57b5185c5a7)
    Strictly, this is a breaking change. But in practise, nothing significant changes.

<a name="v3.3.3"></a>
## [v3.3.3](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.3.2...v3.3.3) - 2023-06-27

### Fixed
* [Bump to sparqljson that can parse quoted triples](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/397936e8002c1639fa0e6c759963f37ebd9b9a95)

<a name="v3.3.2"></a>
## [v3.3.2](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.3.1...v3.3.2) - 2023-06-05

### Fixed
* [Fix invalid symbols ending up in raw headers init objects](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/2ffc98f8e07840cd2ffad08fb574d03f8415f2fb)

<a name="v3.3.1"></a>
## [v3.3.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.3.0...v3.3.1) - 2023-06-05

### Changed
* [Migrate to @rubensworks/saxes](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/e70b7186a814c803a9fd916aeeedf030dd1e9e93)

<a name="v3.3.0"></a>
## [v3.3.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.2.1...v3.3.0) - 2023-05-23

### Added
* [Allow default headers to be passed, Closes #53](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/38437b1c6b6c5748941aa837f5e1952a17685564)

<a name="v3.2.1"></a>
## [v3.2.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.2.0...v3.2.1) - 2023-02-09

### Fixed
* [Fix timeout set to 5 seconds by default](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/1b087d798060cdc8035146b130fca23be6c32117)

<a name="v3.2.0"></a>
## [v3.2.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.1.1...v3.2.0) - 2023-01-11

### Added
* [Add timeout option](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/f2cbb2daa5e9ce16cdf36a4536a4c2d35ec122cc)

<a name="v3.1.1"></a>
## [v3.1.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.1.0...v3.1.1) - 2022-11-09

### Fixed
* [Include source map files in packed files](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/60b68627ae504de93eadf2fbbd6c0ea96a8fbc44)

<a name="v3.1.0"></a>
## [v3.1.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v3.0.0...v3.1.0) - 2022-08-03

### Changed
* [Bump to sparqljson-parse 2.1.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/4599e5e9033daf7d0f9c0849db54ae7f4c08282f)

<a name="v3.0.0"></a>
## [v3.0.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.4.1...v3.0.0) - 2022-07-14

This release has been marked as a major change due to the transition from Node's internal stream API to readable-stream. Most users should experience not breakages with this change.

### Changed
* [Move away from Node.js built-ins](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/bcb9c2559a8e3571eb4123a9f36875cf03e5a4d0)

<a name="v2.4.1"></a>
## [v2.4.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.4.0...v2.4.1) - 2022-07-13

### Fixed
* [Fix key-value in additional params being reversed](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/d219ffd06846a244300c90d06ce01956a37eb056)

### Added
* [Enable tree shaking in package.json](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/8f26d1a9588209c84e78359663535dee625c20a0)

<a name="v2.4.0"></a>
## [v2.4.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.3.3...v2.4.0) - 2022-02-01

### Added
* [Allow custom URL parameters to be passed](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/12064c3cf6ae57d9fbf11675269ae9693fbb7409)

<a name="v2.3.3"></a>
## [v2.3.3](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.3.2...v2.3.3) - 2021-11-29

### Fixed
* [Use default export of 'abort-controller' to fix browser compatibility](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/40ff61795f04159e939bf8a085f04ffd05fab836)

<a name="v2.3.2"></a>
## [v2.3.2](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.3.1...v2.3.2) - 2021-09-22

### Fixed
* [Fix rare stream interruption before end, Closes #40](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/665781bf003ac299ff3d035a3a3c04d0af8e037b)

<a name="v2.3.1"></a>
## [v2.3.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.3.0...v2.3.1) - 2021-08-27

### Fixed
* [Fix error on non-empty body on invalid updates](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/635a283d48e03c6c409d053e44ef77a01e472dc3)

<a name="v2.3.0"></a>
## [v2.3.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.2.0...v2.3.0) - 2021-08-27

### Changed
* [Include response body in error on server errors](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/78047fa66b8fad6d2a1a6f352e0696e91924b0e6)

<a name="v2.2.0"></a>
## [v2.2.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.1.1...v2.2.0) - 2021-08-11

### Added
* [Print stream error in CLI tool](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/b74d360e2f74c79ab837327cd183b2dde5f881b5)

### Changed
* [Migrate to @rdfjs/types](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/ce292ee0829a56d6463431d8a213674e9806b7fa)

<a name="v2.1.1"></a>
## [v2.1.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.1.0...v2.1.1) - 2021-07-09

### Fixed
* [Set Content-Length header on requests (#36)](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/457d543c284baaa7375d360f3516c3d3e1857bfb)

<a name="v2.1.0"></a>
## [v2.1.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.0.2...v2.1.0) - 2021-07-01

### Added
* [Support update queries via the CLI](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/e35539ca30cd01a71c54b73f4ba8b8f93243315f)

### Fixed
* [Fix request cancellation of update queries, Closes #35](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/a2275d3103e8b5dbcc607678d776f1f694e1bdd8)

<a name="v2.0.2"></a>
## [v2.0.2](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.0.1...v2.0.2) - 2021-06-19

### Fixed
* [Fix hanging requests when doing update requests](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/e5c78979c13ecf78a4a69cd6d828f022ed50b48b)

<a name="v2.0.1"></a>
## [v2.0.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v2.0.0...v2.0.1) - 2021-05-04

### Fixed
* [Add missing typings dependencies](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/38ea588f54ce464a5d646b9956e59d7b2f6199cc)

<a name="v2.0.0"></a>
## [v2.0.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.9.0...v2.0.0) - 2021-05-03

### BREAKING CHANGE
* [Send queries with HTTP POST by default](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/6ec3a93774969c075c5d1bf76220b42bbf56ee3d)
    * No breaking API changes are applicable, so this update can be considered minor for the majority of cases.

<a name="v1.9.0"></a>
## [v1.9.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.8.0...v1.9.0) - 2021-01-04

### Added
* [Add getUpdateTypes function](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/d8f6e0b32b96ba4cbc7c495c4fdbbbe92de7729b)

<a name="v1.8.0"></a>
## [v1.8.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.7.0...v1.8.0) - 2020-10-20

### Added
* [Add support for POSTing updates](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/bd44521158f2cdcc556697f402b62857ba94e997)

### Changed

<a name="v1.7.0"></a>
## [v1.7.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.6.2...v1.7.0) - 2020-09-16

### Changed
* [Migrate to cross-fetch](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/73420a57911a427c5845125e26cf54e32b4ba36d)
* [Migrate to rdf-data-factory and @types/rdf-js 4.x](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/b4b1adbee2d959adbdae775f8f0c90eddab23b85)

<a name="v1.6.2"></a>
## [v1.6.2](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.6.1...v1.6.2) - 2020-07-09

### Fixed
* [Fix fetch in browsers still failing, #27](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/72e990e9527d28756e4bb18ac10e02e38b73551e)

<a name="v1.6.1"></a>
## [v1.6.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.6.0...v1.6.1) - 2020-06-19

### Fixed
* [Document and test variables event, Closes #28](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/030fd65a795e2bb3c7d8408702440aced14869b1)
* [Fix fetch failure when run in browser, Closes #27](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/cdf56c15234d0be515bf060d6397946d28b27232)

<a name="v1.6.0"></a>
## [v1.6.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.5.0...v1.6.0) - 2020-06-18

### Changed
* [Reject promise on error server responses](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/99a76d221dc2f3dc9a7c9aae7682085fd36d54f3)

<a name="v1.5.0"></a>
## [v1.5.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.4.1...v1.5.0) - 2019-12-02

### Changed
* [Swap node-web-streams package with web-streams-node](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/2dca4f2f50acc69b823b16ea6144b1d45870471c)
* [Preload require calls for fixing jest issues](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/ae702c6ed211136f8243a9997a7a14c7ac3cd690)
* [Compile to es2017 for improving performance](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/ba44979ae8aa14b9e82b75d9de34935285e41909)

<a name="v1.4.1"></a>
## [v1.4.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.3.3...v1.4.1) - 2019-10-16

### Changed
* [Update sparqljs to version 3.0.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/45a77d3f8bc39d3ab1918e3cf2a60e964bf6d0db)
* [Update is-stream to version 2.0.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/048d51c9ab9bd2e9ee5a2902a76e14fd19ddfb0f)

<a name="v1.4.0"></a>
## [v1.4.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.3.3...v1.4.0) - 2018-11-08

### Changed
* [Update to generic RDFJS typings](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/95256b6cda46a139cb16e1a92bb00bb569d594d9)

<a name="1.3.1"></a>
## [1.3.1](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.3.0...v1.3.1) - 2018-09-05
### Fixes
- [Remove tslib dependency](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/b5805407ac842fdf12d148d9794a82b7be4b34b6)

<a name="1.3.0"></a>
## [1.3.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.2.0...v1.3.0) - 2018-08-23
### Changed
- [Update to sparqlxml-parse without node-gyp dependency](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/aaa75d723adce3f8fd707f41b1578e2c488b8e03)

<a name="1.2.0"></a>
## [1.2.0](https://github.com/rubensworks/fetch-sparql-endpoint.js/compare/v1.1.0...v1.2.0) - 2018-08-22
### Added
- [Support both SPARQL JSON and XML via conneg](https://github.com/rubensworks/fetch-sparql-endpoint.js/commit/d7217939d18fe75948d0e2f6e29f68003f258ce1)

<a name="1.1.0"></a>
## [1.2.0] - 2018-08-06
