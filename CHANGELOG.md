# Changelog

## [1.3.11](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.10...v1.3.11) (2026-08-23)


### Bug Fixes

* **report:** report a failed pedigree lookup instead of swallowing it (HOR-116) ([97f340b](https://github.com/Sammy-Maldonado/horseandbreeding/commit/97f340b19d36a9f4fc92c4515d81e3761b343550))
* **search:** refuse a malformed search request instead of answering 500 (HOR-116) ([745c70e](https://github.com/Sammy-Maldonado/horseandbreeding/commit/745c70e846c7f78fe9bb440ce19ffae8f781786d))

## [1.3.10](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.9...v1.3.10) (2026-08-22)


### Bug Fixes

* **pages:** report the real /api/horse failure in getCompetitionHistory (HOR-108) ([60ad408](https://github.com/Sammy-Maldonado/horseandbreeding/commit/60ad4084a248caf1ad9a812ec3cda6b40f6eac21))

## [1.3.9](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.8...v1.3.9) (2026-08-22)


### Bug Fixes

* **api:** drop the inert body.level from POST /api/horse (HOR-111) ([0e0b7d1](https://github.com/Sammy-Maldonado/horseandbreeding/commit/0e0b7d1358986da4e9828f6d32468dea626dbeef))

## [1.3.8](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.7...v1.3.8) (2026-08-22)


### Bug Fixes

* **api:** validate horse ids before they reach Prisma (HOR-103) ([bcc381a](https://github.com/Sammy-Maldonado/horseandbreeding/commit/bcc381a721f4db18a47133533bab1ac0e9f9690f))

## [1.3.7](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.6...v1.3.7) (2026-08-22)


### Bug Fixes

* **api:** bound the pedigree select recursion in POST /api/horse (HOR-107) ([9ef570b](https://github.com/Sammy-Maldonado/horseandbreeding/commit/9ef570b8687a5a874211cd55de8cd6ee2e894ce5))

## [1.3.6](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.5...v1.3.6) (2026-08-22)


### Bug Fixes

* **security:** render API status messages as text, not HTML (HOR-99) ([56c3491](https://github.com/Sammy-Maldonado/horseandbreeding/commit/56c34912b6030f7172875f96e16bb731a11d3205))

## [1.3.5](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.4...v1.3.5) (2026-08-22)


### Bug Fixes

* **security:** remove credential transport in URLs and responses (HOR-98) ([8b060c4](https://github.com/Sammy-Maldonado/horseandbreeding/commit/8b060c4b467e934b15e9e6f6b48cc6987d852eae))

## [1.3.4](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.3...v1.3.4) (2026-08-22)


### Bug Fixes

* **api:** HOR-96 return truthful HTTP status codes for failed requests ([672e60d](https://github.com/Sammy-Maldonado/horseandbreeding/commit/672e60dabe440c64c3e75d86dc92579d5244470b))

## [1.3.3](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.2...v1.3.3) (2026-08-21)


### Bug Fixes

* **auth:** HOR-95 return 401 and 403 from role and scope authorization ([2e6cc53](https://github.com/Sammy-Maldonado/horseandbreeding/commit/2e6cc5360fe8fe93d1865797db1f0a7aa3b13777))

## [1.3.2](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.1...v1.3.2) (2026-08-19)


### Bug Fixes

* backfill storehorse.status and retire the capability probe (HOR-94) ([750278c](https://github.com/Sammy-Maldonado/horseandbreeding/commit/750278c0daa288d0fd7360187eb4b7eedfac1a28))

## [1.3.1](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.3.0...v1.3.1) (2026-08-15)


### Bug Fixes

* **prisma:** widen storehorse.height to varchar(12) (HOR-82) ([bcd7b87](https://github.com/Sammy-Maldonado/horseandbreeding/commit/bcd7b87d86774a6381d7c3bfac6dcb7990287eef))
* **prisma:** widen storehorse.height to varchar(12) (HOR-82) ([c6ca6cd](https://github.com/Sammy-Maldonado/horseandbreeding/commit/c6ca6cd854783da6d5926ace915e57bbffda8e32))

## [1.3.0](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.2.1...v1.3.0) (2026-08-15)


### Features

* **auth:** HOR-76 modern access JWTs and rotating digest-only refresh sessions ([c4a094d](https://github.com/Sammy-Maldonado/horseandbreeding/commit/c4a094d93c7514e7f92663a609b1717b8b422c0b))
* **auth:** HOR-76 modern access JWTs and rotating digest-only refresh sessions ([8db61af](https://github.com/Sammy-Maldonado/horseandbreeding/commit/8db61afcf4f8e8c938a2a83f2521fb5085a59521))
* **prisma:** HOR-79 adopt a faithful Prisma Migrate baseline ([d847da2](https://github.com/Sammy-Maldonado/horseandbreeding/commit/d847da2e1e3c82711fc98876fa03952c9ded197a))
* **prisma:** HOR-79 InnoDB authentication database foundation ([3208257](https://github.com/Sammy-Maldonado/horseandbreeding/commit/320825761ba372d72f0ccdeebc93bca93ec1be5d))
* **prisma:** HOR-79 users InnoDB conversion and auth foundation ([1d8a180](https://github.com/Sammy-Maldonado/horseandbreeding/commit/1d8a180f01cd57a11b5b968c05b0897df19ef7a8))


### Bug Fixes

* **auth:** HOR-77 make user registration atomic ([da8f35c](https://github.com/Sammy-Maldonado/horseandbreeding/commit/da8f35c208eb6b1c460b7e0e4c089543dda457b7))
* **auth:** HOR-77 make user registration atomic ([bab5554](https://github.com/Sammy-Maldonado/horseandbreeding/commit/bab555406834a7e5077ced48adf07ee0d55a9386))
* **auth:** HOR-78 stop sign-up returning raw internal errors to the client ([8e2f084](https://github.com/Sammy-Maldonado/horseandbreeding/commit/8e2f0847a046581e9ffc6eb483210456178b09e1))
* **auth:** HOR-78 stop sign-up returning raw internal errors to the client ([8c0a8e3](https://github.com/Sammy-Maldonado/horseandbreeding/commit/8c0a8e357c7799ab3bc42fe5d903b4ac40812d40))
* **db:** HOR-74 promote the users.password column reconciliation to main ([a54d595](https://github.com/Sammy-Maldonado/horseandbreeding/commit/a54d595e8c224887a9800c804cda824bd0434806))
* **db:** HOR-74 promote the users.password column reconciliation to QA ([abefac2](https://github.com/Sammy-Maldonado/horseandbreeding/commit/abefac246016a6864ac69a3a1887659602013640))
* **db:** HOR-74 reconcile the drifted users.password column ([d13a235](https://github.com/Sammy-Maldonado/horseandbreeding/commit/d13a235fe66f176e81e75d5d49377492d5468899))
* **db:** HOR-74 reconcile the drifted users.password column ([3a0dee5](https://github.com/Sammy-Maldonado/horseandbreeding/commit/3a0dee59b2ae050a254d91a6c579c7af1e1439ce))
* **prisma:** HOR-80 normalise the invalid database-generated defaults ([f35e08d](https://github.com/Sammy-Maldonado/horseandbreeding/commit/f35e08dc46577079fea649028042f42fda8e6bf2))
* **prisma:** HOR-80 normalise the invalid database-generated defaults ([e057055](https://github.com/Sammy-Maldonado/horseandbreeding/commit/e057055794385030eef80b15a2d0930ae2a04af6))
* **prisma:** HOR-80 promote the database-generated default normalisation to QA ([bd9b490](https://github.com/Sammy-Maldonado/horseandbreeding/commit/bd9b490766f907f2f6176b674d50a42487fbdaf7))
* **prisma:** HOR-80 release the database-generated default normalisation ([3996e23](https://github.com/Sammy-Maldonado/horseandbreeding/commit/3996e233de8aaf0b835ac542c9f8abfb2f576be5))

## [1.2.1](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.2.0...v1.2.1) (2026-08-13)


### Bug Fixes

* **payments:** HOR-72 modernise Stripe and move the payment amount authority to the server ([000bafc](https://github.com/Sammy-Maldonado/horseandbreeding/commit/000bafc5f76aa35453251424ae847a1d4ad305df))
* **payments:** HOR-72 move payment amount authority to the server ([c37a559](https://github.com/Sammy-Maldonado/horseandbreeding/commit/c37a559e31e6a03858158ebeb6f5e00eee4691d8))

## [1.2.0](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.1.0...v1.2.0) (2026-08-13)


### Features

* **ui:** HOR-70 adopt Tailwind 4 native visual defaults ([9e1ea5e](https://github.com/Sammy-Maldonado/horseandbreeding/commit/9e1ea5e895ac74c6ae1a7e3b0d4e81e889c5c9d5))
* **ui:** HOR-70 adopt Tailwind 4 native visual defaults ([91515e8](https://github.com/Sammy-Maldonado/horseandbreeding/commit/91515e8483cc6fb25a0ae47341e078dd0045d2cf))

## [1.1.0](https://github.com/Sammy-Maldonado/horseandbreeding/compare/v1.0.0...v1.1.0) (2026-08-09)


### Features

* **security:** HOR-56 classify /api access and enforce it server-side ([3562826](https://github.com/Sammy-Maldonado/horseandbreeding/commit/3562826b73de83320305d0979779d326d6a7c38b))


### Bug Fixes

* **security:** HOR-56 remove the shared api-key gate from client and server ([c108a10](https://github.com/Sammy-Maldonado/horseandbreeding/commit/c108a1097f5fdc08ca3ae8afc4f246a131c480ab))
* **security:** HOR-56 replace the shared api-key gate with per-route access control ([e46cd65](https://github.com/Sammy-Maldonado/horseandbreeding/commit/e46cd652d633b99a772c97c51405f811c2f572eb))

## 1.0.0 (2026-07-22)


### Bug Fixes

* point server tsconfig extends at the generated nuxt config (HOR-31) ([cb57ded](https://github.com/Sammy-Maldonado/horseandbreeding/commit/cb57ded3de89173a5b570296d9fcb9449d58e41a))
* route storehorse status filters through a compatibility layer (HOR-35) ([8cf91e5](https://github.com/Sammy-Maldonado/horseandbreeding/commit/8cf91e5fe18f33753f9c63f2d72d4626718220cd))
