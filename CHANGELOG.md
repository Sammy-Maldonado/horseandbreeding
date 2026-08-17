# Changelog

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
