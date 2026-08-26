# Horse & Breeder — Informe de evolución técnica

**Idioma:** Español
**Audiencia:** Sammy, la revisión técnica interna futura, y cualquier lector técnico o no técnico de habla hispana que reciba este proyecto.
**Naturaleza del documento:** Una historia técnica sintetizada y un relato de traspaso. **No** es un changelog y **no** es un tablero de estado.
**Generado:** 2026-08-25, a partir del repositorio, los Architecture Decision Records, el registro de trabajo de Linear y el entorno local en ejecución.
**Versionado:** 2026-08-26 bajo **HOR-132**, con el estado del gestor de paquetes releído después de **HOR-124**. Las correcciones están marcadas en el lugar; ninguna afirmación histórica fue reescrita.

---

## 1. Cómo leer este informe

Este informe explica qué es Horse & Breeder, cómo se encontraba cuando el esfuerzo de
ingeniería actual lo adoptó, todo lo que se reconstruyó o endureció desde entonces, y
exactamente dónde está el trabajo hoy.

Dos hábitos atraviesan todo el documento, y son más importantes que cualquier dato
individual.

**Primero: cada término técnico se define la primera vez que aparece.** Si una palabra se
introduce sin explicación, eso es un defecto de este informe, no algo que el lector deba
saber de antemano. Los nombres de producto — Nuxt, Vue, Prisma, MariaDB, Tailwind, Stripe —
se mantienen exactamente como los escriben sus autores, porque son nombres, no conceptos.

**Segundo: cada afirmación lleva una etiqueta según cuánta evidencia la respalda.** Las
reglas de trabajo del propio proyecto prohíben declarar que algo está terminado solo porque
existe código. Este informe usa el siguiente vocabulario, y lo usa de forma estricta.

| Etiqueta | Qué significa |
|---|---|
| **IMPLEMENTADO** | El código existe y está integrado en la rama estable |
| **VERIFICADO** | Implementado *y* comprobado por una prueba, una medición o una regresión manual registrada |
| **PUBLICADO** | Verificado *y* publicado bajo una etiqueta de versión |
| **PLANIFICADO** | Acordado y escrito como trabajo, no iniciado |
| **DIFERIDO** | Pospuesto de forma deliberada, con evidencia registrada del aplazamiento |
| **RIESGO ACEPTADO** | Un problema conocido que conscientemente no se corrige ahora, con sus razones |
| **DESCONOCIDO / REQUIERE REVALIDACIÓN** | La evidencia disponible no alcanza para afirmar nada |

Donde este informe y un documento fuente se contradicen, la contradicción se expone
abiertamente en lugar de disimularse. Se registran tres contradicciones de ese tipo — ver la
sección 26.

---

## 2. Qué es Horse & Breeder — el problema de negocio

### El proceso manual que se reemplaza

Horse & Breeder existe para resolver un trabajo concreto, caro y repetitivo.

Cuando se prepara una subasta de caballos deportivos, cada caballo del remate necesita una
**página de catálogo**. Una página de catálogo es una hoja única que muestra, para un
caballo joven:

1. Una **tabla de pedigrí** — sus padres, abuelos y ancestros más lejanos.
2. **Reseñas de la línea materna** — un párrafo en prosa sobre su madre (la "1st Dam"), su
   abuela por vía materna ("2nd Dam"), su bisabuela ("3rd Dam") y más atrás donde existan
   registros.
3. **Descendencia destacada y resultados deportivos** de cada una de esas yeguas.
4. Un **PDF profesional** lo bastante prolijo como para entregarlo a una casa de remates.

La prosa del punto 2 es la parte cara. Se escribe una vez, a mano, y luego se copia una y otra
vez. Cada potrillo de la misma yegua necesita el mismo párrafo sobre esa yegua. Cada potrillo
de la misma *familia* necesita el mismo párrafo sobre la abuela. Históricamente esto se hacía
abriendo catálogos viejos de Word, buscando el párrafo correcto y pegándolo en el documento
nuevo.

Dos mediciones tomadas de una muestra real y validada de catálogo muestran la escala de la
duplicación:

- Aproximadamente el **37% del texto dentro de un mismo catálogo era contenido duplicado**.
- El marcador literal `(SEE ABOVE)` — una abreviatura humana que significa *"este párrafo ya
  apareció antes en este documento, no lo repitas"* — apareció **19 veces** en ese único
  catálogo.

Estas cifras son la justificación empírica de todo el diseño. Son mediciones, no objetivos.

Una subasta de 25 a 50 potrillos implica entonces horas de copiado, y cada copia es una
oportunidad de pegar la historia de la yegua equivocada en la página del caballo equivocado.

### Qué necesita Marcus

Marcus es el operador de negocio no técnico. Prepara los catálogos, aporta los archivos
fuente de Word y Excel, revisa los casos que el sistema no puede resolver y produce los PDF
finales. Lo que necesita de este sistema es:

- buscar un caballo, o subir el archivo Excel de la subasta;
- recibir de vuelta páginas de pedigrí correctas de forma automática;
- ver únicamente los casos que realmente necesitan una decisión humana;
- recibir un PDF que esté dispuesto a firmar con su nombre;
- y hacer todo eso sin aprender ningún vocabulario técnico.

### Qué se está construyendo

El objetivo es una **cadena de procesamiento reutilizable y trazable** que reemplace el copiar
y pegar manual repetido, de modo que una subasta completa de unos 25 a 50 potrillos se procese
en **minutos en lugar de horas**.

La idea central del diseño es la **biblioteca canónica de reseñas**: un párrafo aprobado por
cada yegua identificada, almacenado una sola vez contra la identidad de esa yegua en la base
de datos, y reutilizado por cada potrillo de su línea. `(SEE ABOVE)` deja de ser una nota que
escribe una persona y pasa a ser una referencia que el sistema resuelve.

---

## 3. La cadena de transformación objetivo

Esta es la cadena hacia la que se construye el producto. Es la referencia contra la cual cada
sección posterior mide el avance.

```txt
ingesta de catálogos Word
  -> datos estructurados de línea materna
  -> biblioteca canónica de reseñas
  -> resolución de identidad del caballo
  -> ensamblado de pedigrí + reseñas
  -> PDF profesional
  -> generación por lotes desde el Excel de la subasta
  -> revisión humana solo para los casos no resueltos
```

La misma cadena, expresada como el flujo que Marcus realiza en la práctica:

```txt
buscar un caballo   O   subir el Excel de la subasta
  -> tabla de pedigrí ensamblada desde las relaciones de parentesco verificadas
  -> reseñas de línea materna tomadas de la biblioteca canónica recorriendo la cadena de madres
  -> PDF profesional, individual o por lotes
  -> una cola de revisión que contiene solo los casos faltantes, ambiguos y en conflicto
```

Tres reglas de dominio gobiernan esa cadena de forma permanente, y ninguna decisión de
ingeniería puede romperlas.

- **La cadena de pedigrí está definida por dos campos de base de datos** — `dam_id` (madre) y
  `sire_id` (padre) en la tabla `storehorse`. Esos dos, y nada más, definen la ascendencia.
- **La línea materna se recorre a través de `dam_id`.** Un campo separado llamado
  `mareline_id` agrupa caballos en familias maternas por comodidad; es una etiqueta de
  agrupación, no la cadena, y nunca debe usarse como sustituto de ella.
- **El archivo de Word es la fuente de verdad de las reseñas históricas** — no los campos de
  texto de la base de datos. Las propias columnas de texto de la base solo guardan fragmentos:
  la tabla `competition_history` tiene la forma correcta pero contiene apenas unas **454
  filas**, y aproximadamente **79 caballos** llevan texto parcial en un campo `remarks`. La
  prosa real vive en los archivos de Word.

De esas invariantes se desprenden seis reglas de negocio, vinculantes para toda
implementación futura.

| Regla | Enunciado |
|---|---|
| **BR-001** | La ascendencia proviene de `dam_id` y `sire_id`, nunca del texto del nombre |
| **BR-002** | La línea materna se recorre a través de `dam_id` |
| **BR-003** | Una yegua tiene como máximo una reseña canónica, indexada por su `horse_id` |
| **BR-004** | Una coincidencia de identidad ambigua nunca se resuelve automáticamente |
| **BR-005** | Una reseña en conflicto nunca se sobrescribe en silencio |
| **BR-006** | Una fila de Excel nunca se descarta en silencio |

---

## 4. Estado técnico inicial al momento de la adopción

Esta sección describe lo que efectivamente se heredó. Aquí nada se llama "legado" u "obsoleto"
salvo que la evidencia lo respalde.

### 4.1 La aplicación en sí

El producto heredado era una aplicación **Nuxt 3** en funcionamiento. Nuxt es un framework
para construir aplicaciones web sobre **Vue**, la biblioteca que renderiza la interfaz de
usuario en el navegador. Nuxt además incluye un motor de servidor llamado **Nitro**, que es
donde vive la lógica de negocio del lado del servidor de este proyecto, bajo un directorio
llamado `server/`.

La aplicación no era un prototipo. Contenía un navegador de pedigríes real, una función de
búsqueda, una vista de árbol genealógico, una vista de familia materna, cuentas de usuario y
una sección de marketplace para caballos ofrecidos en venta. El inventario contabilizó **45
archivos de endpoint de API versionados** y una biblioteca de componentes de tamaño
comparable.

El juicio decisivo tomado en la adopción — registrado como **ADR-001** — fue este: el proyecto
se había estancado no porque el front end fuera inadecuado, sino porque **los datos históricos
de Word nunca se habían transformado en datos estructurados y reutilizables**. La capacidad
faltante nunca fue la interfaz de usuario. Reescribir la aplicación desde cero habría
destruido software que funcionaba para resolver un problema que la reescritura no habría
tocado.

**La decisión fue: adoptar y modernizar. Nunca reescribir.** Esa decisión es vinculante y es
el hecho arquitectónico más importante de este informe.

Existe una versión anterior del sitio en **PHP y MySQL**, conservada en el repositorio bajo un
directorio llamado `_legacy/`. Es **material de referencia de solo lectura**. Nunca se importa
y nunca se ejecuta.

### 4.2 La base de datos

La base de datos de referencia se llama `hbold`. Es una base de datos de la **familia
MariaDB** — MariaDB es un servidor de base de datos de código abierto de la familia MySQL, y
el dump se originó en uno, de modo que localmente se eligió un servidor MariaDB para mantenerse
cerca del origen.

Su estado medido:

| Hecho | Valor |
|---|---|
| Tablas en una restauración limpia | **30** |
| Registros de caballos en `storehorse` | **59.903** (exacto, verificado por conteo directo) |
| Mezcla de motores de almacenamiento | **24 tablas en MyISAM**, el resto en InnoDB |
| Juego de caracteres por defecto de la base | `latin1`, con juegos de caracteres explícitos por tabla |
| Actualidad de los datos | hasta aproximadamente **2024** |

**MyISAM e InnoDB** son dos maneras en que MariaDB puede almacenar físicamente una tabla.
InnoDB es la moderna: admite transacciones (grupos de cambios de todo o nada) y hace cumplir
las claves foráneas (garantías de que una referencia a otra fila apunta realmente a una fila
existente). MyISAM no admite ninguna de las dos. Heredar 24 tablas MyISAM significaba heredar
una base de datos que no podía, a nivel de almacenamiento, hacer cumplir sus propias
relaciones.

También había una **trampa de conteo** en el dump de referencia que ya produjo una conclusión
equivocada durante este proyecto, y se registra aquí para que no produzca más. El dump
contiene **siete bloques `INSERT INTO storehorse` separados**. Cualquier proceso que aplique
solo el primer bloque ve unas **8.700 filas** y concluye que la tabla es pequeña. La cifra
correcta y verificada es **59.903**.

**No había ningún historial de migraciones.** Un historial de migraciones es la lista ordenada
de cambios de esquema que permite reconstruir una base de datos de forma reproducible desde
cero. No existía ninguno — sin tabla de seguimiento, y el único archivo de migración presente
en el repositorio databa de octubre de 2024, nunca había sido aplicado, y no podía aplicarse
contra el esquema real.

### 4.3 Deriva de esquema

El modelo de datos de la aplicación se declara en un archivo llamado `prisma/schema.prisma`.
**Prisma** es el ORM — la capa que traduce entre tablas de base de datos y objetos de
aplicación.

Esa declaración y la base de datos de referencia no coincidían:

- El esquema declaraba **41 modelos**; `hbold` contenía **30 tablas**.
- **Once modelos existían solo en código**, dando soporte a funcionalidades de autenticación,
  vendedores y analítica que se habían construido pero nunca se habían llevado a este conjunto
  de datos.
- Cuatro modelos diferían a nivel de columna. Solo a `storehorse` le faltaban seis columnas:
  `status`, `currency`, `age`, `ad_title`, `created_at` y `seller_id` — un conjunto coherente
  de funcionalidades de marketplace que nunca llegó a estos datos.

El juicio crítico aquí — registrado como **ADR-003** — es que esta deriva es evidencia de que
`hbold` es **anterior** al esquema de la aplicación. **No** es evidencia de que los modelos
que solo existen en código sean basura. Borrarlos eliminaría en silencio capacidad que
funciona. Por eso, quitar algo del esquema requiere evidencia, un elemento de trabajo
dedicado, pruebas y un plan de reversión aprobado.

También había **deriva de capacidad**: una columna que existe pero tiene el tamaño
equivocado. La columna `users.password` era `varchar(50)` en la base de datos mientras el
esquema declaraba 100 caracteres. El hasheo de contraseñas produce un valor de 60 caracteres.
La consecuencia era concreta y total: **todo intento de registrar un usuario nuevo era
rechazado.**

### 4.4 Autenticación y seguridad

Esta era el área más débil del sistema heredado, y vale la pena ser preciso sobre por qué.

- **Los tokens de acceso se firmaban con un secreto de reserva adivinable.** La clave de firma
  se leía de una variable de entorno, pero el código caía en una cadena por defecto escrita
  directamente en el código cuando esa variable faltaba. Cualquiera que conociera ese valor
  por defecto podía falsificar una sesión válida.
- **Los refresh tokens se almacenaban en texto plano.** Un refresh token es una credencial de
  larga duración que se usa para obtener nuevos tokens de acceso de corta duración. Estos se
  persistían en la base de datos como texto legible. Cualquiera con una copia de la base de
  datos tenía las credenciales de todos los usuarios.
- **Una segunda tabla persistía también cada token de acceso en texto plano.**
- **Ninguna de las dos tablas se leía nunca.** Ambas eran de solo escritura. No había
  revocación, ni auditoría, ni ningún lector en toda la base de código — de modo que ese
  almacenamiento no aportaba nada y costaba todo.
- **Una API key compartida quedaba embebida en el paquete público del navegador.** La clave
  viajaba a cada visitante. Medido: **36 apariciones en 20 archivos fuente**, y **36
  apariciones en 19 archivos de la salida pública construida**. Mientras tanto, **30
  manejadores llamaban a la función de validación y descartaban su resultado** — la barrera no
  hacía absolutamente nada.
- **Una tabla de roles tenía una restricción de unicidad global sobre el nombre del rol**, lo
  que significaba que solo un usuario en todo el sistema podía tener el rol `User`.
- **Un endpoint aceptaba una contraseña en la cadena de consulta de la URL y devolvía el hash
  de la contraseña almacenada en su respuesta.**
- **Los fallos se devolvían como HTTP 200.** El código de estado decía éxito mientras el
  cuerpo decía fallo, así que ningún llamador podía detectar un error de forma fiable.

### 4.5 Front-end y estilos

- **Tailwind CSS 3**, conectado mediante un módulo de Nuxt. Tailwind es un sistema de estilos
  construido a partir de pequeñas clases utilitarias aplicadas directamente en el marcado. El
  proyecto usaba **1.128 asignaciones de clase en 62 componentes**, todas estáticas — sin
  construcción dinámica de clases en ningún lado.
- Existía un archivo `tailwind.config.js`, pero era el **esqueleto sin tocar del generador**.
  Sin tokens de diseño personalizados, sin `@apply`, sin `@layer`, sin llamadas a `theme()`.
  El proyecto usaba los valores por defecto de Tailwind y nada más.
- **PrimeVue**, una biblioteca de componentes de interfaz de usuario, estaba conectada
  mediante un módulo de Nuxt obsoleto.
- **Quill** (un editor de texto enriquecido) y **html2pdf** (un generador de PDF en el
  navegador) estaban declarados como dependencias.
- Una **capa de polyfills heredada** — `node-fetch`, `core-js`, `regenerator-runtime` — se
  cargaba en tiempo de ejecución para proveer funcionalidades del navegador que los motores
  modernos ya traen de forma nativa.
- **crypto-js** cifraba los identificadores numéricos de caballos dentro de las rutas de las
  URL, usando una frase de paso provista a través de una variable de entorno visible en el
  navegador.

### 4.6 Pagos

Stripe estaba integrado para una oferta de suscripción premium. Tres fallas importaban:

- **El cliente enviaba el importe a cobrar.** El navegador le decía al servidor cuánto dinero
  tomar. Una petición modificada podría haber fijado cualquier precio.
- Un **token de método de pago de prueba estaba escrito directamente en el código** de la ruta
  del servidor.
- **Se registraba en el log el objeto de error completo de Stripe** ante un fallo. Ese objeto
  contiene un campo que incluye el client secret del pago.

La interfaz de precios ofrecía suscripciones *Monthly* y *Annually*, mientras que la
implementación creaba un **cobro único** sin facturación recurrente y sin registro de quién
había pagado qué.

### 4.7 Herramientas, pruebas y proceso

| Área | Estado en la adopción |
|---|---|
| Gestor de paquetes | Mixto; estandarizado a **pnpm** como una de las primeras acciones (ADR-004) |
| Runtime de Node.js | Por debajo de la línea de Long Term Support vigente |
| Pruebas automatizadas | Un arnés mínimo; la línea base registrada más antigua es **3 archivos, 28 pruebas** |
| Integración Continua | Presente, pero necesitaba endurecerse para convertirse en una barrera real de merge |
| Proceso de publicación | Manual |
| Decisiones de arquitectura documentadas | Ninguna |

---

## 5. Estrategia y filosofía de modernización

El enfoque de ingeniería es tanto parte del valor de este proyecto como el código mismo. Se
resume aquí porque explica *por qué* el trabajo tiene la forma que tiene.

### Adoptar, no reescribir

Establecido en ADR-001 y nunca revisado. La aplicación es la base del producto. Reescribir
habría descartado comportamiento verificado que funcionaba para resolver un problema de datos
que la reescritura no habría abordado.

### Un asunto a la vez

La modernización se ejecutó como **diez etapas secuenciales, de la A a la J**, y la secuencia
fue deliberada: primero las herramientas externas, luego el runtime, luego la higiene de
metadatos, luego la eliminación de peso muerto, luego la capa de datos acotada, luego las
actualizaciones acotadas de una biblioteca por vez, luego el framework mismo (el eje), luego
CSS, luego pagos, y por último la cola diferida y arquitectónicamente pesada.

Las reglas vinculantes eran: **una etapa por vez**; una etapa no comienza simplemente porque
la anterior terminó; y **la siguiente etapa nunca arranca automáticamente**.

### Medir el artefacto, no confiar en las notas de versión

Se aprendieron dos lecciones duraderas por la vía difícil y quedaron escritas.

> *Un barrido de cambios rompientes acotado por extensión de archivo no es un barrido.*
> *Una matriz de cambios rompientes construida a partir de notas de versión no es un análisis
> de cambios rompientes — hay que medir el artefacto que el build realmente emite.*

Ambas surgieron de casi-errores reales. Las notas de versión omiten correctamente los cambios
que no ocurrieron entre las versiones mayores que documentan — y un valor por defecto puede
moverse en una versión **de parche**, algo que ninguna guía de actualización de versión mayor
mencionará jamás.

### Una actualización de versión no cambia el diseño

Esta es una regla general y vinculante, registrada en ADR-009. Cuando la actualización de una
dependencia alteraría el aspecto de la aplicación, eso es **una decisión del dueño del
producto, no un hallazgo que un ingeniero deba absorber**. Se presenta la medición; se toma la
decisión; entonces la línea base se mueve con esa decisión. Nunca se restaura un valor viejo
solo para que una comparación pase.

### Nada se borra sin prueba

Cada eliminación en este proyecto pasó por una **barrera de borrado seguro**: probar cero
consumidores en el código fuente, en la salida generada y en el historial de control de
versiones; probar que ningún aviso de seguridad, licencia o capacidad depende de ello; y
recién entonces borrar. La barrera se aplicó por igual a dependencias, a tablas de base de
datos y a código.

### Los datos se preservan por defecto

Ningún cambio de datos de producción sin aprobación. Ningún reinicio de base de datos.
Respaldos verificados antes de cualquier operación irreversible. Donde una eliminación tocaba
datos persistidos, la barrera se elevó, no se bajó.

### Investigar desde fuentes primarias, LTS primero

Los objetivos de dependencias se revalidan **al inicio de cada etapa**, desde fuentes
primarias — primero el servicio de documentación Context7, corroborado contra las páginas
oficiales de versiones y los datos del registro. Los números de una auditoría anterior se
tratan como una foto del momento, nunca como una instrucción. **Las versiones preliminares
están prohibidas** — nada de alpha, beta, release candidate, nightly, canary ni preview.
Node.js se mantiene en una línea de **Long Term Support**.

### Todo cambio recorre el mismo camino

```txt
rama de issue  ->  DEV  ->  QA  ->  main
```

Tres Pull Requests, **solo merge commits**, cada uno con su propio check `Test / Build`
genuinamente en verde. Ninguna etapa puede saltearse. "Sin checks reportados" nunca se
considera aprobado.

### Las decisiones de arquitectura se registran, no se recuerdan

Existen dieciséis Architecture Decision Records. Un ADR aceptado es vinculante hasta que otro
ADR lo reemplace — nunca por una edición del original.

### El registro de trabajo se mantiene separado del conocimiento

El gestor de issues Linear guarda el registro detallado de ejecución — qué se hizo, qué se
ejecutó, qué se demostró. Los documentos duraderos guardan el conocimiento que debe sobrevivir
sin ningún contexto de sesión. Los dos nunca se copian uno dentro del otro.
---

## 6. El Programa de Modernización — Etapas A a J

Diez etapas, ejecutadas estrictamente en orden, cada una con su propio elemento de trabajo en
Linear, su propia rama, su propia cadena de promoción y su propio check de Integración
Continua en verde.

| Etapa | Asunto | Elemento(s) de trabajo | Estado |
|---|---|---|---|
| **A** | Versiones mayores de GitHub Actions | HOR-42 | **Done** |
| **B** | Runtime de Node.js y herramientas pnpm | HOR-50 | **Done** |
| **C** | Higiene de metadatos de `package.json` | HOR-54 | **Done** |
| **D** | Quitar el módulo de Nuxt obsoleto de PrimeVue | HOR-55 | **Done** |
| **E** | Versión mayor del cliente Prisma — solo cliente | HOR-58 | **Done** |
| **F** | Seis versiones mayores acotadas de una biblioteca | HOR-59 … HOR-64 | **Done** |
| **G** | Versión mayor del framework Nuxt — el eje | HOR-67, HOR-68 | **Done** |
| **H** | Migración mayor de Tailwind CSS | HOR-69 | **Done** |
| **I** | Modernización de la integración con Stripe | HOR-72 | **Done** |
| **J** | La cola diferida y cargada de ADR | HOR-83 (+ diez hijos) | **Done** |

Estado: **las diez etapas están PUBLICADAS.**

### Etapa A — Herramientas de Integración Continua (HOR-42)

| | |
|---|---|
| **ANTES** | Las cuatro GitHub Actions usadas por los flujos de build y publicación estaban en versiones mayores antiguas |
| **CAMBIO** | Cada una pasó a su última versión mayor soportada, verificada contra las publicaciones oficiales de la propia acción en lugar de asumirla |
| **DESPUÉS** | Solo higiene de flujos de trabajo. Ningún cambio de aplicación, dependencia, esquema, base de datos o entorno. Lo que los flujos *hacen* quedó igual. Se revisaron los logs de una ejecución real buscando avisos de obsolescencia de Node.js |
| **POR QUÉ IMPORTA** | Se ejecutó primero de forma deliberada: es independiente de todo lo demás, y reduce el riesgo del sistema de Integración Continua del que toda etapa posterior depende como prueba |

### Etapa B — Runtime y gestor de paquetes (HOR-50)

| | |
|---|---|
| **ANTES** | Node.js y pnpm por debajo de las líneas soportadas; dos declaraciones, en `package.json` y en el flujo de Integración Continua, discrepaban con aquello sobre lo que el proyecto debía correr |
| **CAMBIO** | Se movieron exactamente dos declaraciones: `packageManager` y el `node-version` del flujo. Nada más |
| **DESPUÉS** | El lockfile no requirió ningún cambio — la instalación congelada siguió siendo válida. Ninguna dependencia de aplicación se actualizó. Barrera aprobada con **3 archivos, 28 pruebas** |
| **POR QUÉ IMPORTA** | Toda etapa posterior necesitaba una base soportada y estable. Aquí también es donde los números dejaron de escribirse a mano en la documentación: los números de versión viven en `package.json` y en el flujo, y nunca se repiten en prosa |

Los valores históricos que la Etapa B adoptó el 2026-08-08 fueron Node.js 24.19.0 y pnpm
11.20.0. Se registran como *lo que ese issue adoptó en esa fecha* — un hecho histórico, no una
política vigente. Las versiones en vigor hoy son las que declaren ahora los archivos
ejecutables.

### Etapa C — Higiene de metadatos (HOR-54)

| | |
|---|---|
| **ANTES** | **Veinticinco dependencias directas declaraban un piso de versión por debajo de la versión que ya se resolvía.** El proyecto nunca había declarado qué runtime de Node.js soporta |
| **CAMBIO** | Cada piso elevado a la versión ya instalada. Se agregó `engines.node`. Las líneas `specifier:` del lockfile sincronizadas por pnpm, nunca editadas a mano |
| **DESPUÉS** | **Ninguna versión resuelta se movió.** El árbol instalado es idéntico antes y después: 51 dependencias directas, ninguna agregada, ninguna quitada, ni una versión resuelta distinta |
| **POR QUÉ IMPORTA** | Un piso declarado que va por detrás de la versión resuelta es una promesa que el repositorio no cumple. Le dice a una instalación nueva que es aceptable una versión que nadie verificó, y esconde qué actualizaciones le quedan por hacer a una etapa posterior |

Una consecuencia se registró de forma deliberada en lugar de descubrirse después: pnpm hace
cumplir `engines` de forma **estricta** para el propio proyecto. Un runtime de Node.js
incompatible ahora hace fallar la instalación en lugar de emitir una advertencia. Ese es el
efecto buscado — es la razón por la que vale la pena agregar el campo — pero es un cambio de
comportamiento real dentro de una etapa por lo demás etiquetada como higiene.

### Etapa D — Quitar el módulo obsoleto de PrimeVue (HOR-55)

| | |
|---|---|
| **ANTES** | Un módulo de Nuxt declarado obsoleto por su propio editor, que arrastraba una **segunda versión mayor, más antigua, de PrimeVue** junto a la soportada, de modo que dos versiones mayores de la misma biblioteca se resolvían a la vez |
| **CAMBIO** | **Una dependencia quitada.** El commit toca `package.json` y el lockfile y **ningún archivo fuente** |
| **DESPUÉS** | El conteo de paquetes bajó exactamente en dos — el módulo y la versión mayor antigua que traía. Nada agregado, ninguna versión resuelta cambiada. Ocho rutas respondieron `200` después de la eliminación |
| **POR QUÉ IMPORTA** | La conclusión salió del **grafo real de dependencias**, no de una búsqueda de texto. La auditoría había ofrecido "conectar el módulo soportado *o* confirmar la ruta del resolver"; el repositorio probó la segunda, así que no había nada que conectar y la configuración se dejó intacta de forma deliberada |

Aquí se plantearon tres hallazgos y se **registraron en lugar de repararse**, porque
corregirlos dentro de un issue de dependencias habría hecho imposible revisar ese diff como
una actualización. El más importante fue la API key compartida embebida en el paquete del
navegador — atendida más tarde por HOR-56 bajo ADR-007.

### Etapa E — Versión mayor del cliente Prisma (HOR-58)

| | |
|---|---|
| **ANTES** | El cliente de Prisma una versión mayor por detrás, con el esquema, la base de datos de referencia y la capa de compatibilidad entre ellos, todo en su lugar |
| **CAMBIO** | **Dos líneas de dependencia.** Ningún archivo de código, prueba, configuración, flujo de trabajo, esquema o activo tocado |
| **DESPUÉS** | El esquema demostrado **idéntico byte a byte** antes y después, y otra vez al releerlo desde la rama estable. La base de datos de referencia no modificada de ninguna manera. Barrera aprobada con **4 archivos, 61 pruebas** |
| **POR QUÉ IMPORTA** | Este es el movimiento *acotado* de la capa de datos: la versión mayor del cliente que puede cruzarse sin un adaptador de driver, sin cambiar el generador y sin tocar la base de datos. Eso fue lo que permitió que aterrizara antes del eje del framework y no dentro de él |

Dos cosas que esta etapa registró vale la pena llevarlas adelante.

**Un cambio rompiente latente.** Los campos `Bytes` dejan de tiparse como el `Buffer` de Node
y pasan a ser `Uint8Array`. Tres campos del esquema están afectados y solo uno es alcanzable
desde el código de aplicación. Un conteo de solo lectura estableció que **ninguna fila lleva
hoy un valor en él**, así que ninguna forma de respuesta cambió ese día. El riesgo es latente,
no ausente — y se convirtió en trabajo activo dos etapas después.

**Una expectativa cerrada con evidencia.** La auditoría anticipaba aquí una limpieza de una
bandera de vista previa de búsqueda de texto completo. Esa configuración **no existe en este
repositorio**. El ítem se cerró como una operación nula verificada y quedó registrado en lugar
de descartarse en silencio, de modo que la brecha entre la expectativa de la auditoría y la
realidad sigue siendo trazable.

### Etapa F — Seis versiones mayores acotadas de bibliotecas (HOR-59 … HOR-64)

Un elemento de trabajo, una rama, una serie de commits y una cadena de tres Pull Requests
**cada uno**, estrictamente de a uno por vez. Ningún Pull Request llevó dos bibliotecas.

| Biblioteca | Elemento de trabajo | Resultado |
|---|---|---|
| `primeicons` | HOR-59 | **Quitada** |
| `dotenv` | HOR-60 | **Quitada** |
| `uuid` | HOR-61 | Una versión mayor cruzada |
| `nodemailer` | HOR-62 | Una versión mayor cruzada |
| `bcrypt` | HOR-63 | Una versión mayor cruzada |
| `@heroicons/vue` | HOR-64 | Una versión mayor cruzada |

| | |
|---|---|
| **ANTES** | Seis bibliotecas por detrás de sus versiones mayores vigentes, lo bastante entrelazadas como para que un único cambio de "actualizar las dependencias" hubiera sido imposible de revisar |
| **CAMBIO** | Seis cruces independientes, secuenciados de modo que el mayor diff de código fuente — la biblioteca de íconos, cuya versión mayor renombró los puntos de entrada del paquete y alcanzó quince archivos de componente — fuera el último |
| **DESPUÉS** | Cada cruce revisable y reversible por sí solo. Dos de los seis fueron **quitados en lugar de actualizados**. Dos siguen por debajo de su línea vigente, diferidos deliberadamente a la Etapa J |
| **POR QUÉ IMPORTA** | Esta es la lección duradera de la etapa: a veces la respuesta honesta a *"¿qué versión mayor adoptamos?"* es *"ninguna — esta dependencia no debería estar acá."* Una etapa de modernización que no puede llegar a esa conclusión va a seguir actualizando cosas que el proyecto no necesita |

El paquete de íconos se quitó porque su siguiente versión mayor **cambia la licencia de una
licencia de código abierto a una comercial**. Se decidió no adoptar esa licencia, e igualmente
no fijar la versión mayor vieja solo para conservar la abierta. Después se demostró de forma
exhaustiva que la dependencia no se usaba — a través de rutas de importación, puntos de
entrada de estilos, configuración de build y salida renderizada, no por una búsqueda de
nombre — y se quitó. Una biblioteca bloqueada detenía la etapa en lugar de saltearse para
pasar a la siguiente, que es exactamente lo que pasó acá.

### Etapa G — La versión mayor del framework Nuxt (HOR-67, HOR-68)

El eje. Cada etapa anterior existió para reducir el riesgo de esta.

| | |
|---|---|
| **ANTES** | Nuxt 3, con un módulo de contenido que no servía nada, y un componente que importaba un paquete que el proyecto nunca declaró — resolviéndose solo porque pnpm eleva dependencias |
| **CAMBIO** | La versión mayor del framework cruzada en un único elemento de trabajo. La versión mayor del router cruzó con ella, y la biblioteca de gestión de encabezados cruzó de forma transitiva. La cadena de build — la versión mayor del empaquetador y el paquete de servidor renombrado — se movió por debajo del framework en lugar de por decisión. **Vue mismo no se movió** |
| **DESPUÉS** | **El diff de código fuente es de tres líneas en dos archivos.** Toda aserción de la capa de datos idéntica a través de la versión mayor; respuestas de pedigrí, línea materna, descendencia y búsqueda coincidiendo nodo por nodo |
| **POR QUÉ IMPORTA** | Una versión mayor de framework se prueba segura comparando el comportamiento antes y después. Esa comparación solo tiene sentido cuando es lo bastante pequeña como para leerla |

Tres cosas hicieron que esta etapa fuera lo que es.

**El módulo de contenido se cerró primero, por eliminación.** La versión sin mantenimiento no
tenía ninguna ruta de actualización soportada que no requiriera una base de datos embebida,
una capa de conectores, colecciones de contenido y un archivo de configuración nuevo. Una
auditoría de cuatro capas — código fuente, grafo de dependencias, salida de build y rutas en
ejecución — confirmó que el módulo servía **cero documentos**. Se quitó en lugar de migrarse.
Nada de esa infraestructura valía la pena introducirla para no servir nada.

**Se rechazó la reubicación por defecto — ADR-008.** La nueva versión mayor del framework
reubica el código de aplicación por defecto. Adoptar ese valor por defecto habría movido casi
todos los directorios del repositorio en el mismo cambio que intercambiaba el framework. Se
rechazó mediante configuración soportada, y la regla se hizo general: **una migración mayor de
framework nunca funciona a la vez como una reorganización de directorios del repositorio.** La
razón es la verificación, no la preferencia — un diff de cientos de renombrados esconde el
puñado de líneas que realmente cambiaron el framework, y cualquier regresión se vuelve
imposible de atribuir.

**Apareció una diferencia y se persiguió hasta su causa en lugar de aceptarse.** Cada página
renderizada en el servidor volvía drásticamente más pequeña después de la actualización. Eso
se parece exactamente a que el renderizado en servidor se hubiera roto en silencio, así que se
investigó como si así fuera: se contó el marcado, se confirmó la presencia de encabezados,
navegación e imágenes, y se descargó y midió la hoja de estilos enlazada. La versión mayor del
framework cambió **cómo se entrega el CSS** — de estar embebido en el HTML renderizado en
servidor a una hoja de estilos externa — y los bytes faltantes se explican casi exactamente
por la hoja que ahora se sirve por separado. No se perdió contenido. Queda registrado porque
es benigno pero **no invisible**: una hoja de estilos externa es una petición que bloquea el
renderizado en el primer pintado, cosa que el CSS embebido no era.

Esta etapa también produjo la lección del barrido: la única constante de tiempo de build que
la auditoría inicialmente pasó por alto se encontró solo cuando el barrido se volvió a
ejecutar **sin un filtro de extensión**.

### Etapa H — Versión mayor de Tailwind CSS (HOR-69)

| | |
|---|---|
| **ANTES** | Tailwind 3 a través de un módulo de Nuxt, más un `tailwind.config.js` que era el esqueleto sin tocar del generador, y una herramienta de prefijos de proveedor declarada directamente |
| **CAMBIO** | La versión mayor de Tailwind cruzada. El módulo de Nuxt **quitado** — su línea estable no puede resolver la nueva versión mayor y además todavía depende del kit del framework anterior. La integración de build propia y de primera parte de Tailwind **agregada**, exactamente como prescribe su guía de instalación. La herramienta de prefijos de proveedor **quitada como dependencia directa**, porque el constructor del framework ya depende de ella y la aplica por defecto. El archivo de configuración y el bloque de procesamiento de estilos, ambos borrados — la nueva versión mayor se configura en CSS y detecta sus propios archivos fuente |
| **DESPUÉS** | La misma salida visual, entregada por una integración soportada con tres piezas móviles menos |
| **POR QUÉ IMPORTA** | No había una elección real entre módulo y plugin. La línea estable del módulo fijaba la versión mayor anterior, así que conservarlo habría significado no actualizar en absoluto |

La Etapa H produjo la segunda lección duradera, y es más fuerte que la de la Etapa G:

> Una matriz de cambios rompientes construida a partir de notas de versión no es un análisis
> de cambios rompientes.
> **Hay que medir el artefacto que el build realmente emite.**

Las notas de versión omiten correctamente los cambios que no ocurrieron entre las versiones
mayores que documentan — y un valor por defecto puede moverse en una versión **de parche**,
algo que ninguna guía de actualización de versión mayor mencionará jamás. La medición que
importó acá comparó la hoja de estilos construida antes y después, porque este proyecto
*enlaza* su hoja de estilos en lugar de embeberla, de modo que comparar el HTML servido no
habría probado nada.

### Etapa I — Modernización de Stripe (HOR-72)

Cubierta por completo en la sección 14.

### Etapa J — La cola diferida y cargada de ADR (HOR-83, diez hijos)

Autorizada después de que cerró el ciclo de publicación v1.3.1 y comenzada el **2026-08-17**.
Diez hijos, de US-089 a US-098, cada uno con su propio elemento de trabajo y su propia cadena
de promoción.

| Hijo | Elemento de trabajo | Qué hizo |
|---|---|---|
| US-089 | HOR-84 | Versión mayor de la biblioteca de correo cruzada |
| US-090 | HOR-85 | Quitó dos generadores de PDF en navegador sin uso y toda su cadena portadora de avisos de seguridad |
| US-091 | HOR-86 | Quitó el editor de texto enriquecido sin uso y su envoltorio |
| US-092 | HOR-87 | Quitó la capa de polyfills heredada |
| US-093 | HOR-88 | Versiones mayores de bibliotecas de identificadores cruzadas |
| US-094 | HOR-89 | PrimeVue **quitado en lugar de migrado** |
| US-095 | HOR-90 | Quitó el cifrado de identificadores en la URL y lo reemplazó por identificadores numéricos planos validados |
| US-096 | HOR-91 | Versión mayor de Prisma cruzada hacia la arquitectura de adaptador de driver — ADR-015 |
| US-097 | HOR-92 | El servidor de base de datos pasó a la siguiente línea de Long Term Support — ADR-016 |
| US-098 | HOR-93 | Barrido de cierre: eliminaciones finales, refresco transitivo, reducción de avisos de seguridad |

Cada uno se describe donde corresponde: las eliminaciones de dependencias en la sección 15, la
capa de datos en la sección 10, la base de datos en la sección 11, el cambio de identificadores
en la sección 12, y el resultado sobre avisos de seguridad en la sección 16.

**La Etapa J está completa. Los diez hijos están en la rama estable, lo que cierra el
programa: cada etapa de la A a la J está Done.** Dos ítems quedan deliberadamente abiertos
*fuera* de la etapa, y ambos están registrados — ver la sección 26.

---

## 7. Runtime, gestor de paquetes y cadena de build

### La decisión sobre el gestor de paquetes

**pnpm es el único gestor de paquetes**, registrado en ADR-004. Esto no es una preferencia; es
una invariante. La regla que lo vuelve duradero es que `package.json` guarda la versión fijada
como su **única fuente de verdad**, y ese número nunca se duplica en un segundo lugar que
después se desincronice. El paso de preparación de la Integración Continua deliberadamente **no
recibe ninguna entrada de versión** — lee el valor fijado de `package.json` — de modo que el
build y la máquina del desarrollador no pueden discrepar.

Esa regla se puso a prueba dentro de la Etapa C, cuando se consideró y se rechazó agregar una
segunda declaración de pnpm, precisamente porque habría recreado la desincronización que
ADR-004 existe para prevenir.

### La regla del runtime

Node.js se mantiene en una línea de **Long Term Support** — una serie de publicaciones que
recibe correcciones durante años en lugar de meses. Una publicación *Current* queda
explícitamente excluida incluso cuando es más nueva. Desde la Etapa C la regla no es
documentación sino algo que la cadena de herramientas hace cumplir: el rango de motor declarado
tiene un piso en el runtime adoptado y un techo que impide que una publicación Current se cuele
por la máquina de un colaborador.

### Qué está verificado hoy

Leído de las fuentes ejecutables el 2026-08-25; la fila del gestor de paquetes releída el
2026-08-26, después de **HOR-124**:

| Declaración | Fuente de verdad | Valor actual |
|---|---|---|
| Rango de Node.js | `package.json` → `engines.node` | `^24.19.0` |
| Node.js en Integración Continua | `.github/workflows/ci.yml` | `24.19.0` |
| Gestor de paquetes | `package.json` → `packageManager` | `pnpm@11.23.0` (versionado) |
| Sistema de módulos | `package.json` → `type` | `module` |

> **Actualizado el 2026-08-26.** Cuando este informe se generó por primera vez, el árbol de
> trabajo llevaba un cambio **sin commitear** que elevaba `packageManager` a `pnpm@11.23.0` y
> que no pertenecía a ningún elemento de trabajo. **HOR-124** lo formalizó desde entonces: el
> valor está commiteado, promovido a `main` y gobernado por ADR-004. La fila de arriba es el
> valor que declara `main`. No hizo falta ningún cambio en la Integración Continua, porque el
> paso de preparación lee la versión fijada de `package.json` — la regla descrita arriba
> haciendo exactamente aquello para lo que existe.

### La cadena de build

| Capa | Qué hace | Versión actual |
|---|---|---|
| **Vite** | Empaqueta y sirve el código del navegador | 8.2.1 |
| **Rollup** | El empaquetador de módulos sobre el que se construye Vite | 4.62.2 |
| **Nitro** | El motor de servidor que Nuxt produce y ejecuta | 2.13.4 |
| **h3** | La capa HTTP que Nitro usa para manejar peticiones | 1.15.11 |
| **Unhead** | Gestiona títulos y metadatos de página; **solo transitiva, nunca declarada** | 3.3.1 |

La última fila es una decisión deliberada, no una omisión. Un componente alguna vez importó
funciones de gestión de encabezados desde un paquete que el proyecto nunca declaró, y que se
resolvía solo porque pnpm eleva dependencias. Cuando la biblioteca cruzó una versión mayor, ese
accidente se convirtió en una decisión. **La importación se borró en lugar de declararse el
paquete** — la función es una importación automática del framework, así que el número correcto
de dependencias directas es cero. Declarar el paquete para legitimar el accidente lo habría
escrito en `package.json` de forma permanente.

---

## 8. Modernización de Nuxt y Vue

### Qué se movió y qué no

| Paquete | Versión actual | Nota |
|---|---|---|
| `nuxt` | **4.5.2** | El framework sobre el que corre toda la aplicación |
| `vue` | **3.5.41** | No cruzó una versión mayor; movió una línea menor más tarde, en la Etapa J |
| `vue-router` | **5.2.0** | Cruzó una versión mayor junto al framework, como su objetivo requería |

Vue deliberadamente **no** se movió durante la versión mayor del framework. Una versión mayor
es suficiente para un elemento de trabajo.

### La decisión estructural — ADR-008

La versión mayor del framework reubica el código de aplicación por defecto: los directorios
fuente pasan bajo un nuevo padre. El proyecto **optó por no hacerlo**, mediante configuración
soportada y no mediante una capa de compatibilidad.

En concreto, la configuración mantiene la raíz de código en la raíz del repositorio y apunta al
directorio de aplicación de forma explícita, de modo que la estructura del repositorio quedó
plana. El interruptor más amplio de "versión de compatibilidad" del framework se consideró y se
**rechazó** — es un parche que retiene comportamiento viejo, mientras que el objetivo era
adoptar el framework nuevo y declinar únicamente el movimiento de directorios.

Luego la regla se generalizó para que aplique también a la próxima versión mayor del framework:

> **Una migración mayor de framework nunca funciona a la vez como una reorganización de
> directorios del repositorio.**

Adoptar una nueva disposición sigue siendo trabajo legítimo. Es trabajo *separado*, sin ningún
cambio de versión adentro.

### Qué probó la auditoría antes de que la versión cambiara

La auditoría de migración clasificó cada uso de una interfaz modificada **contra el
repositorio**, no contra las notas de versión. El resultado fue que los cambios rompientes más
comentados del framework no tenían nada que romper en esta base de código: sin declaraciones de
metadatos de página, sin el composable de estado compartido, sin acceso al payload, y sin
mutación profunda de datos obtenidos — de modo que el cambio que convierte los datos obtenidos
en una referencia superficial compartida resultó inerte acá.

La única importación de router que no es composable conserva su firma a través de la versión
mayor del router.

**Por eso una versión mayor de framework produjo un diff de código fuente de tres líneas.** No
por suerte: por una auditoría ejecutada *antes* de que la versión cambiara y no después de que
el build se rompiera.

### Superficie actual del front-end

| Ítem | Cantidad |
|---|---|
| Componentes Vue | **44** |
| Páginas Vue (rutas) | **21** |
| Archivos de endpoint de API del servidor (sin contar pruebas) | **44** |
| Archivos de middleware del servidor | **2** |

---

## 9. Modernización de Tailwind CSS

Tailwind es el sistema de estilos: en lugar de escribir hojas de estilo separadas, se aplican
clases pequeñas de propósito único directamente en el marcado. `p-4` significa relleno,
`text-red-600` significa texto rojo. Las clases provienen de una paleta fija de tokens de
diseño.

### La medición que dio forma a la decisión

Antes de cambiar nada, el uso se midió en lugar de asumirse:

| Medición | Valor |
|---|---|
| Asignaciones de clase en la biblioteca de componentes | **1.128** |
| Componentes que las llevan | **62** |
| Construcción dinámica de clases | **ninguna** — cada asignación estática |
| Tokens de diseño personalizados, `@apply`, `@layer`, llamadas a `theme()` | **ninguno** |
| `tailwind.config.js` | presente, pero el **esqueleto sin tocar del generador** |

Esa última fila es la importante. El proyecto usaba los valores por defecto de Tailwind y nada
más, lo que significaba que todo el riesgo de la migración vivía en una sola pregunta:
**¿cambiaron los valores por defecto?**

### Sí cambiaron — y el cambio se midió, no se adivinó

Comparando la hoja de estilos construida antes y después:

| Medición | Valor |
|---|---|
| Tokens de paleta que difieren | **35 de 43** |
| Diferencia perceptual media de color | **ΔE 4,22** |
| Tokens con ΔE ≥ 5 (una diferencia que la mayoría percibe lado a lado) | **15** |
| Peor desplazamiento individual | **ΔE 16,08**, en `indigo-600` |
| Puntos de uso de anillo de foco afectados | **82** |

*ΔE es una medida estándar de cuán distintos se ven dos colores para el ojo humano. Por debajo
de aproximadamente 2 es imperceptible en uso normal; 5 y más es claramente visible cuando los
dos se muestran juntos.*

Esta medición es la razón por la que la lección de la Etapa H está escrita como está. **Ninguno
de estos desplazamientos aparece en la guía de actualización de versión mayor**, porque algunos
de ellos aterrizaron en versiones de parche de la versión mayor anterior.

### La decisión, y la regla que produjo — ADR-009

Se registraron dos decisiones.

**Decisión 1: cambiar la integración.** Se quitó el módulo de Nuxt y se adoptó la integración
de build propia y de primera parte de Tailwind. No había una elección real: la línea estable
del módulo fijaba la versión mayor anterior, así que conservarlo significaba no actualizar en
absoluto.

**Decisión 2, y es la vinculante:**

> **Una actualización de versión no cambia el diseño.**

Cuando una actualización alteraría la apariencia, se presenta la medición y **decide el dueño
del producto**. La Etapa H mantuvo la apariencia existente detrás de una capa de compatibilidad
para que el cambio de la cadena de build pudiera verificarse en sus propios términos.

### Después la capa de compatibilidad se retiró de forma deliberada — HOR-70

Retener valores viejos para siempre no es modernización, es un parche permanente. Una vez
probado el cambio de herramientas, la cuestión de la apariencia se planteó en sus propios
términos y se **adoptaron los valores por defecto nativos**: la capa de compatibilidad se
borró, **142 líneas** eliminadas. La apariencia oficial de Horse & Breeder es ahora **Tailwind
4 nativa**, y la línea base se movió con la decisión.

La regla duradera correspondiente es:

> Cuando se adopta un nuevo valor por defecto, la línea base se mueve con él. **Nunca se
> restaura un valor viejo solo para que una comparación pase.**

### Qué cubre y qué no cubre la verificación — dicho con claridad

La verificación fue **estructural**: valores de tokens declarados comparados, atributos de
clase renderizados comparados ruta por ruta, hojas de estilo construidas comparadas byte a
byte.

**No se comparó el renderizado a nivel de píxel.** No se tomaron capturas de pantalla y no se
compararon renderizados de navegador. La evidencia prueba que las declaraciones y el marcado
son lo que deberían ser. **No** prueba que cada página se vea idéntica a nivel de píxel, y este
informe no afirma que así sea.

Versiones actuales: `tailwindcss` **4.3.3**, `@tailwindcss/vite` **4.3.3**.
---

## 10. Modernización de Prisma y del acceso a datos

**Prisma** es el ORM — la capa que se ubica entre la aplicación y la base de datos. El
desarrollador escribe un esquema que describe tablas y sus relaciones; Prisma genera un
cliente tipado que la aplicación invoca en lugar de escribir SQL en crudo.

Esta es una de las áreas de mayor consecuencia de todo el proyecto, porque es donde se
encuentran el código de aplicación, el esquema versionado y una base de datos de referencia
de doce años.

### 10.1 La regla fundacional — ADR-003

El esquema declaraba **41 modelos**; la base de datos de referencia contenía **30 tablas**.
Once modelos existían solo en código.

El movimiento tentador — borrar los modelos que "no están en la base de datos" — se rechazó,
y el rechazo se volvió vinculante:

> **La ausencia en la base de datos de referencia es evidencia de que la base de datos es
> anterior al esquema de la aplicación. No es evidencia de que el modelo sea obsoleto.**

De ahí se desprenden dos reglas operativas.

**Nunca ejecutar una introspección de esquema contra el esquema versionado.** El comando que
lee una base de datos en vivo y regenera el archivo de esquema reescribe ese archivo **en el
lugar** y descarta en silencio cada modelo que la base de datos no contiene. Ejecutarlo una
sola vez habría destruido once modelos de capacidad funcional en un único comando. Las formas
seguras — imprimir el resultado en la terminal, o apuntar el comando a un archivo descartable
que contenga solo los bloques de generador y datasource — son las únicas permitidas.

**Toda eliminación de esquema requiere una barrera completa:** evidencia confirmada, un
elemento de trabajo dedicado, criterios de aceptación explícitos, pruebas, y un plan de
migración y reversión aprobado.

### 10.2 Historial de migraciones — ADR-012

No había ningún historial de migraciones. El proyecto no podía reconstruirse de forma
reproducible.

La respuesta fue una **línea base**, no una reescritura:

- El único archivo de migración preexistente, fechado en octubre de 2024, nunca se había
  aplicado y no podía aplicarse contra el esquema real. Se **archivó sin modificar** en lugar
  de borrarse, de modo que su existencia sigue siendo trazable.
- Se creó una nueva migración de línea base como una captura **fiel y solo de estructura** de
  la base de 30 tablas, **preservando las 24 tablas MyISAM exactamente como estaban**. Una
  línea base que modernizara motores de almacenamiento en silencio habría sido una migración
  disfrazada de línea base.
- La modernización de motores de almacenamiento se organizó por separado. **La Ola 1
  convirtió exactamente una tabla** — `users`, la tabla de autenticación — a InnoDB, porque
  esa era la tabla para la que el trabajo de autenticación realmente necesitaba transacciones.

Hoy hay **seis migraciones aplicadas**:

```txt
0_init                                          la línea base fiel de 30 tablas
20260815092729_users_engine_innodb              Ola 1: una tabla a InnoDB
20260815092730_modernise_auth_foundation        base del esquema de autenticación
20260815101514_modern_auth_sessions             sesiones de refresco rotativas; elimina access_tokens
20260815161716_storehorse_height_varchar12      reconciliación de capacidad
20260819120000_storehorse_status_active_backfill  la corrección de ADR-014
```

### 10.3 Deriva de capacidad — ADR-011

Se identificó y se le puso nombre a un modo de falla distinto: una columna que **existe** pero
tiene el **tamaño** equivocado.

La columna `users.password` era `varchar(50)`. El hasheo de contraseñas produce un valor de
**60 caracteres**. Todo intento de registro era rechazado — una caída total de una función
central, causada por diez caracteres faltantes.

La regla establecida es que la deriva de capacidad se repara mediante **parches SQL
versionados** guardados en `db/patches/`, revisados como código, nunca mediante un comando de
consola improvisado. Hoy existe uno de esos parches, y lleva un README que explica para qué
sirve el directorio. La altura se reconcilió del mismo modo más tarde, como una migración
versionada apropiada.

### 10.4 La migración al adaptador de driver — ADR-015

El cambio de capa de datos arquitectónicamente más significativo del proyecto.

| | |
|---|---|
| **ANTES** | Prisma 6, con el generador anterior emitiendo el cliente dentro del directorio de paquetes instalados, y un ajuste del gestor de paquetes en `.npmrc` forzando una disposición de instalación plana para que eso resolviera |
| **CAMBIO** | Prisma **7.9.1**. El generador cambió al que emite un cliente real en un directorio de salida versionado-pero-ignorado. Se agregaron un **adaptador de driver** y el driver de base de datos subyacente, ambos fijados. Los **44 archivos de servidor que poseen un cliente** recableados |
| **DESPUÉS** | El diff del esquema es de **dos líneas**. La diferencia residual entre esquema y base de datos es **idéntica byte a byte antes y después** — las mismas 19 sentencias diferidas |
| **POR QUÉ IMPORTA** | Un adaptador de driver significa que Prisma ya no trae su propio conector de base de datos; el proyecto provee uno de forma explícita. Eso hace que el comportamiento de conexión sea visible y configurable en lugar de oculto |

Varios detalles vale la pena llevarlos adelante.

**El cliente generado es determinista.** Se emite a un directorio excluido del control de
versiones, y la regeneración produce un resultado **idéntico en hash**. El build no puede
desviarse entre máquinas.

**El archivo de configuración carga las variables de entorno por su cuenta** y declara su
datasource de forma **condicional**, de modo que la generación del cliente funcione en un
entorno limpio de Integración Continua donde no existe ninguna base de datos. Esta es la
diferencia entre un build que funciona en una laptop y un build que funciona en cualquier
lado.

**El pool de conexiones se fijó en paridad con la versión anterior, no en los nuevos valores
por defecto** — límite de conexiones 10, tiempo de conexión 5 segundos, tiempo de adquisición
10 segundos, tiempo de inactividad 300 segundos. Una migración de adaptador de driver no es el
lugar para además cambiar cuántas conexiones a la base de datos abre la aplicación.

**El cambio latente de `Bytes` se volvió activo.** La nueva versión mayor devuelve
`Uint8Array` donde la anterior devolvía `Buffer`. El SQL en crudo de un endpoint quedó
afectado. En lugar de cambiar la forma de respuesta de ese endpoint, una pequeña utilidad
restaura la forma anterior en el límite, y una prueba fija el contrato. El riesgo que la Etapa
E registró como latente se presentó exactamente donde se había predicho.

**La topología de cliente por petición se preservó de forma deliberada.** Alrededor de 44
módulos de servidor construyen cada uno su propio cliente, y unos 20 se desconectan por
petición. Esa no es la forma que elegiría un proyecto nuevo. Un adaptador compartido o un
cliente único se **rechazaron explícitamente para este elemento de trabajo**, porque cambiar
la topología de conexión dentro de una actualización mayor habría hecho imposible atribuir
cualquier regresión. Queda registrado como una característica conocida, no contrabandeado como
una corrección.

**Se cerró un ajuste del gestor de paquetes.** El ajuste de instalación plana en `.npmrc`
existía solo para que la salida del generador viejo resolviera. Una vez cambiado el generador,
se auditó el ajuste en busca de otros consumidores, se comprobó que no tenía ninguno, y se
borró.

**Un defecto específico de plataforma se corrigió como corresponde.** En Windows, la capa de
compatibilidad del cliente generado producía un error de URL de archivo inválida bajo el motor
de servidor. Está protegido por una transformación acotada de tiempo de build en la
configuración del proyecto, y no por un rodeo global.

Se agregaron trece pruebas nuevas. La suite pasó de 34 archivos / 425 pruebas a **36 archivos
/ 438 pruebas**.

### 10.5 Estado actual, verificado

| Paquete | Versión |
|---|---|
| `prisma` | 7.9.1 |
| `@prisma/client` | 7.9.1 |
| `@prisma/adapter-mariadb` | 7.9.1 |
| `@prisma/config` | 7.9.1 |
| `mariadb` (driver) | 3.4.5, fijado de forma exacta |

El esquema declara un datasource de la familia MySQL y genera a través del generador de
cliente moderno hacia un directorio de salida ignorado.

> **Reportado con honestidad — un hallazgo de deriva documental.** El archivo de esquema hoy
> declara **40 modelos**, no 41. La diferencia es la tabla histórica de tokens de acceso,
> eliminada por migración bajo ADR-013 como se describe en la sección 12. Dos documentos —
> `docs/architecture/existing-assets.md` §6 y `docs/data/hbold-baseline.md` §6 — siguen
> diciendo 41. **Este informe no los corrige**, porque corregirlos queda fuera de su límite de
> cambios. Registra la discrepancia para que la próxima persona no tenga que redescubrirla.
> Ver la sección 26.

---

## 11. Modernización de la base de datos

### 11.1 La decisión de motor — ADR-002

El dump de referencia provino de un servidor de la familia MySQL. La decisión fue **quedarse
en esa familia** y **conservar los nombres existentes de tablas y columnas**, por
inconsistentes que se vean.

Nombres como `storehorse`, `diciplinevalues` (una grafía real en el esquema) y
`users_has_storehorse` no son prolijos. Renombrarlos significaría tocar cada consulta, cada
modelo y cada migración en el mismo cambio — y rompería lo único que permite que el dump de
referencia se restaure siquiera. **Los nombres son un contrato de compatibilidad, no una
elección de estilo.**

### 11.2 Qué contiene realmente la base de datos de referencia

Cifras verificadas:

| Hecho | Valor |
|---|---|
| Tablas base tras la reconciliación | **42** = 30 heredadas + 11 solo en código + 1 tabla de seguimiento de migraciones |
| Filas de `storehorse` | **59.903** |
| Motor de almacenamiento de `storehorse` | MyISAM |
| Juego de caracteres de `storehorse` | `latin1` |
| Filas de `users` | **661** (identificadores 1 a 728) |
| Motor de almacenamiento de `users` | InnoDB, convertida en la Ola 1 |
| Filas de `competition_history` | **≈ 454** |
| `storehorse.remarks` con contenido | **≈ 79 caballos**, solo texto parcial |
| Actualidad de los datos | hasta aproximadamente **2024** |

Las últimas tres filas son la justificación de negocio de todo este proyecto expresada como
datos. La tabla diseñada para guardar el historial deportivo tiene la forma correcta y está
**esencialmente vacía**. **Llenarla desde el archivo de Word es el trabajo central del
producto.**

Si existe una copia más reciente de la base de datos es **DESCONOCIDO**. Está registrado como
HOR-32 y está **BLOQUEADO a la espera de Marcus**.

### 11.3 La diferencia residual — exactamente 19 sentencias

Tras la reconciliación, la diferencia entre el esquema versionado y la base de datos en vivo
es una lista conocida y enumerada de **19 sentencias SQL**:

- **17 restricciones de clave foránea** que tocan tablas MyISAM. MyISAM no puede hacer cumplir
  claves foráneas, así que estas no pueden aplicarse sin convertir las tablas. Dos de ellas
  fallarían de plano contra los datos actuales.
- **2 claves primarias compuestas** que no pueden crearse porque los datos contienen
  duplicados: `storehorse_has_approvedby` tiene **52 pares duplicados**, y
  `studbook_has_storehorse` tiene **16.696**.

Ese conteo era de **20** hasta que la reconciliación de altura quitó una.

La regla asociada a esta lista es la razón por la que vale la pena escribirla:

> **Cualquier cosa fuera de esta lista que aparezca en la diferencia residual es un defecto,
> no una deriva aceptada.**

Eso convierte un vago "el esquema y la base no coinciden del todo" en una barrera precisa y
verificable. Toda migración desde entonces se verificó contra ella, y tanto la migración al
adaptador de driver como la actualización de servidor la probaron **idéntica byte a byte antes
y después**.

### 11.4 El incidente de `storehorse.status` — ADR-006 y ADR-014

Esta es la falla más instructiva de la historia del proyecto, y queda registrada en lugar de
enterrada.

**Acto uno — la capa de compatibilidad (ADR-006).** El esquema declaraba una columna `status`
que la base de datos de referencia no tenía. Toda consulta que filtrara por ella fallaba con
un error de columna desconocida. Se construyó una capa de compatibilidad: detecta en tiempo de
ejecución si la columna existe y no aporta nada al filtro cuando no existe. Esa capa permitió
que el desarrollo continuara contra una base de datos que no podía modificarse.

**Acto dos — la caída (ADR-014).** Una migración posterior agregó la columna correctamente —
como `INTEGER NULL`, **sin relleno de datos**. Las **59.903 filas existentes** recibieron
`NULL`. Como los caballos activos se seleccionan con `status = 1`, y `NULL` no es igual a nada
en SQL, **cada consulta de pedigrí, búsqueda e informe devolvía vacío**. Una caída total de la
cadena central del producto, causada por una columna nullable sin valor por defecto.

**Acto tres — la corrección.** Dos sentencias, aplicadas como una migración versionada:

```sql
UPDATE storehorse SET status = 1 WHERE status IS NULL;
ALTER TABLE storehorse MODIFY status INTEGER NOT NULL DEFAULT 1;
```

Cada fila pasó a activa; la columna ya no puede ser nula; las filas nuevas quedan activas por
defecto. La sonda de compatibilidad se retiró entonces, porque la condición para sobrevivir a
la cual existía había desaparecido. **ADR-014 reemplaza a ADR-006.**

La semántica ahora es explícita: `status = 1` significa un caballo activo, `status = -1`
significa un anuncio de marketplace.

Se encontraron tres defectos al corregir esto y quedaron **registrados en lugar de corregirse
en silencio**, porque cada uno es una cuestión de comportamiento y no de migración: los dos
valores de estado son particiones mutuamente excluyentes de la tabla; el endpoint de edición
de caballo omite `status` de su guarda de actualización; y los endpoints de pedigrí y
descendencia nunca filtran por `status` en absoluto.

### 11.5 La migración de servidor Long Term Support — ADR-016

| | |
|---|---|
| **ANTES** | MariaDB **10.11 LTS**, soportada hasta febrero de 2028 |
| **CAMBIO** | MariaDB **12.3 LTS**, soportada hasta **junio de 2029**, migrada **en paralelo** y nunca en el lugar |
| **DESPUÉS** | Línea de servidor en vivo verificada a través de la propia ruta de adaptador de la aplicación: **12.3.2** |
| **POR QUÉ IMPORTA** | El horizonte de soporte se duplicó aproximadamente, y la migración demostró que los datos de referencia sobreviven intactos a un cruce mayor de servidor |

Los candidatos se mapearon en lugar de asumirse:

| Candidato | Fin del soporte | Veredicto |
|---|---|---|
| 10.11 LTS | 2028-02-16 | El punto de partida |
| 11.4 LTS | 2029-05-29 | Termina antes que 12.3 — sin ventaja |
| 11.8 LTS | 2028-06-04 | El horizonte más corto entre las opciones LTS |
| **12.3 LTS** | **2029-06-12** | **Elegida** — el horizonte mantenido más largo |
| 13.x | continua | Excluida: no es una línea de Long Term Support |

La verificación fue inusualmente exhaustiva, y de forma deliberada — estos son los datos del
proyecto.

- Una **matriz de invariantes antes-y-después de 464 líneas**, idéntica salvo por dos hechos
  explicados a nivel de servidor: los servidores más nuevos cambiaron el juego de caracteres y
  la colación por defecto a nivel de *servidor*, y el servidor más nuevo expone un alias para
  el ajuste de aislamiento de transacciones. Ninguno toca los valores por defecto declarados
  por esta base de datos.
- **Checksums de tabla completa idénticos en las 41 tablas.**
- La diferencia residual **idéntica byte a byte** — las mismas 19 sentencias.
- Una **sonda de tiempo de ejecución desechable de 9 pruebas** a través del nuevo cliente
  Prisma: lecturas, paginación, búsquedas por unicidad compuesta, registro, la ruta de error
  de clave duplicada, un viaje de ida y vuelta de `Bytes`, una reversión de transacción
  interactiva, y rotación de refresh token. Todas en verde.
- Una **batería de regresión de producción de 18 consultas**, idéntica en hash entre ambas
  líneas de servidor.
- El cambio en sí: detener el contenedor viejo y renombrarlo, levantar el canónico sobre la
  etiqueta de la nueva serie con un volumen **nombrado** y las mismas credenciales, y
  verificar la versión del servidor **a través de la ruta del adaptador de la aplicación** en
  lugar de una consola de base de datos — porque lo que importa es lo que ve la aplicación.
- **La reversión se probó en vivo**, no solo se documentó: se volvió al servidor viejo, se
  verificó, y se avanzó de nuevo.

En todo el proceso, `hbold` **nunca se mutó**: 59.903 caballos, checksums idénticos, y el
valor por defecto `latin1` de la base de datos preservado.

Un detalle operativo vale la pena conocerlo. La configuración local deliberadamente **no** le
pide al servidor que cree la base de datos, porque en servidores más nuevos cambió el juego de
caracteres por defecto. La base de datos debe venir de restaurar el dump de referencia, cuya
sentencia de creación lleva el valor por defecto `latin1` correcto de forma explícita.

### 11.6 Estado en vivo verificado

```txt
contenedor  hb-mysql                  imagen mariadb:12.3    en ejecución
contenedor  hb-mysql-1011-rollback    imagen mariadb:10.11   detenido, conservado
versión de servidor reportada         12.3.2-MariaDB-ubu2404
```

---

## 12. Modernización de la autenticación y la seguridad

Esta es la sección que un desarrollador futuro debería leer primero, y aquella donde la
diferencia entre el sistema heredado y el actual es mayor.

### 12.1 Qué se heredó, dibujado con claridad

```txt
ANTES
  navegador ──── login ────► servidor
                               │
                               ├─ firma un token con:
                               │    SECRET del entorno
                               │    ...o la cadena literal "your_jwt_secret"
                               │       si la variable de entorno falta
                               │
                               ├─ guarda el refresh token EN TEXTO PLANO
                               │
                               └─ guarda cada token de acceso EN TEXTO PLANO
                                    en una segunda tabla

  ninguna de las dos tablas era leída jamás por nada
```

Seis fallas concretas:

1. **Un secreto de firma de reserva adivinable.** Si la variable de entorno faltaba, el código
   firmaba con un valor por defecto escrito en el código. Cualquiera que conociera ese valor
   podía acuñar una sesión válida para cualquier usuario.
2. **Refresh tokens persistidos en texto plano.** Un refresh token es una credencial de larga
   duración. Cualquiera con una copia de la base de datos tenía las credenciales de todos los
   usuarios.
3. **Los tokens de acceso también se persistían en texto plano**, en una segunda tabla.
4. **Ambas tablas eran de solo escritura.** Sin revocación, sin auditoría, sin ningún lector.
   Riesgo puro, beneficio cero.
5. **Una API key compartida embebida en el paquete del navegador** — medida en 36 apariciones
   en 20 archivos fuente, y 36 en 19 archivos de la salida pública construida. **30
   manejadores llamaban a la función de validación y descartaban su resultado.**
6. **Una tabla de roles con una restricción de unicidad global sobre el nombre del rol**, de
   modo que solo un usuario en todo el sistema podía tener el rol `User`.

### 12.2 Qué lo reemplazó — ADR-013

```txt
DESPUÉS
  navegador ──── login ────► servidor
                               │
                               ├─ requireJwtSecret()
                               │     ausente, vacío o de relleno -> LANZA ERROR
                               │     no existe ninguna reserva
                               │
                               ├─ TOKEN DE ACCESO  (corta duración, 1 hora)
                               │     firmado HS256
                               │     claims: userId, email, mobile, jti
                               │     NUNCA se almacena en ningún lado
                               │
                               └─ SESIÓN DE REFRESCO  (7 días)
                                     32 bytes aleatorios -> base64url -> 43 caracteres
                                     enviada al navegador UNA SOLA VEZ
                                     solo se almacena su RESUMEN SHA-256
                                     refresh_tokens.token_hash BINARY(32) UNIQUE

  refresco:  el navegador envía la credencial
             el servidor la hashea, encuentra la sesión, y dentro de UNA transacción
             invalida la sesión vieja y emite una nueva
```

El diseño en palabras, para un lector no técnico:

- **Un token de acceso es un pase de corta duración.** Prueba quién sos durante una hora. Está
  firmado, así que el servidor puede verificarlo sin consultar nada — por eso no necesita
  almacenarse en absoluto. Almacenarlo era pura responsabilidad sin contrapartida.
- **Una sesión de refresco es una llave de larga duración.** Permite obtener pases nuevos
  durante siete días sin volver a iniciar sesión. El servidor almacena solo una **huella
  unidireccional** de ella. Una huella puede confirmar una llave que se le muestra; no puede
  convertirse de vuelta en la llave. **Una base de datos robada, por lo tanto, no entrega
  credenciales utilizables.**
- **Rotación** significa que cada uso de la llave de larga duración la reemplaza por una nueva,
  dentro de una única transacción de todo o nada. Una llave vieja reutilizada es detectable en
  lugar de silenciosamente válida.

Decisiones específicas de endurecimiento:

- **No existe ningún secreto de reserva.** La función que lee el secreto de firma **lanza un
  error** si está ausente, vacío, o todavía puesto en un valor de relleno. La aplicación se
  niega a correr de forma insegura en lugar de correr insegura y confiar en la suerte.
- **La tabla de tokens de acceso en texto plano se eliminó** por migración, bajo la barrera de
  borrado seguro más estricta del proyecto: probar que nada la lee, probar que nada escribe
  algo que alguien necesite, probar que la capacidad que parecía proveer se provee realmente
  en otro lado, y recién entonces quitarla. Los tokens de acceso son de corta duración y sin
  estado, así que no había nada que conservar.
- **El defecto de unicidad de roles se corrigió**, de modo que los nombres de rol ya no son
  únicos globalmente y más de un usuario puede tener el mismo rol.

### 12.3 El límite de confianza de la API — ADR-007

La "protección" heredada era una única clave compartida verificada por un middleware. Como se
entregaba al navegador, **cada visitante ya la tenía**. No era autenticación; era un timbre.

La respuesta no fue esconder mejor la clave. Fue **clasificar cada ruta** y hacer cumplir cada
clase en el servidor, donde el control no puede ser inspeccionado ni evitado por el cliente.

Las **44 rutas** se clasificaron de forma explícita:

| Clase | Cantidad | Significado |
|---|---|---|
| Lecturas públicas de referencia | **30** | Datos que el sitio está pensado para mostrarle a cualquiera |
| Con alcance por rol | **5** | Requiere un usuario autenticado que tenga un rol y alcance específicos |
| Intercambio público de credenciales | **2** | Login y refresco — públicos por necesidad |
| Autoservicio público | **4** | Registro y similares |
| Solo servidor | **2** | Nunca alcanzables desde un navegador |
| Autenticadas | **1** | Requiere una sesión válida, sin rol específico |

La regla vinculante es el **valor por defecto**: una ruta `/api` que **no está clasificada** se
trata como **solo servidor** y se rechaza antes del enrutamiento. Un endpoint nuevo queda por
lo tanto cerrado hasta que alguien lo abra deliberadamente. Ese es un diseño que falla cerrado,
y es el correcto.

### 12.4 Quitar el teatro de seguridad — HOR-90

Los identificadores numéricos de caballos se cifraban dentro de las rutas de URL usando una
frase de paso provista mediante una variable de entorno **visible en el navegador**. El
empaquetador incrusta esas variables en el paquete público, así que **la frase de paso viajaba
a cada visitante**. El cifrado no protegía nada de nadie que hubiera cargado la página — es
decir, de todos.

Era peor que inútil de una segunda manera: el texto cifrado **ni siquiera era estable**. Cada
llamada derivaba su clave sobre una sal aleatoria nueva, así que el mismo caballo producía una
URL distinta cada vez.

Se quitó. La URL canónica es ahora el identificador público numérico plano, por ejemplo
`/pedigree/erne-alert/1003`. Esto fue seguro porque se confirmó que **la aplicación nunca fue
desplegada públicamente**, de modo que no existía ningún contrato de URL externa que romper.

La eliminación fue exhaustiva y cerró un error real en el camino:

- **13 productores de URL** dejaron de llamar al cifrado.
- **9 consumidores de rutas** reemplazaron el descifrado por un nuevo analizador de
  identificadores que valida el valor contra un patrón numérico estricto y confirma que es un
  entero seguro. Esto cerró un agujero genuino: el análisis permisivo anterior aceptaba `12abc`
  como el número 12.
- El centinela de identificador inválido quedó idéntico byte a byte, así que el comportamiento
  posterior no se desplazó.
- Después se **midieron** los artefactos emitidos: en los **261 archivos** de salida pública y
  de servidor construidos, **cero apariciones** de la variable de frase de paso, la biblioteca
  de criptografía, su marcador de sobre de texto cifrado, o cualquiera de los dos nombres de
  función.

### 12.5 Otras correcciones de seguridad

| Corrección | Elemento de trabajo | Qué cambió |
|---|---|---|
| Transporte de credenciales | HOR-98 | Un endpoint aceptaba una contraseña en la cadena de consulta de la URL y devolvía el hash de la contraseña almacenada en su respuesta. Ambos eliminados |
| Renderizado de mensajes de estado | HOR-99 | Los mensajes de estado de la API se renderizaban como HTML. Ahora se renderizan como **texto**, cerrando una vía de inyección de scripts |
| Atomicidad del registro | HOR-77 | El registro pasó a ser una única transacción de todo o nada |
| Filtración de errores internos | HOR-78 | Los errores internos en crudo dejaron de devolverse a los clientes |
| Payload de error renderizado en servidor | HOR-118 | Se investigó y remedió la exposición de información de error del framework en el payload de producción renderizado en servidor |
| Validación de identificadores | HOR-103 | Los identificadores de caballos se validan **antes** de llegar a la capa de base de datos |
| Límite de recursión | HOR-107 | La profundidad de selección de pedigrí está acotada, cerrando una petición que devolvía un error de desbordamiento de pila |

### 12.6 Reglas de seguridad vigentes

- La autenticación se hace cumplir en los endpoints protegidos, **del lado del servidor**.
- Los cuerpos de petición, parámetros, cadenas de consulta y subidas se validan. **La entrada
  de Excel y de Word nunca se considera confiable.**
- Las credenciales nunca se escriben en el código ni se registran en logs — ni tokens, ni URLs
  de base de datos, ni contenidos de documentos privados.
- Las trazas de pila internas nunca se devuelven a un cliente.
- Los errores de base de datos nunca se esconden detrás de respuestas vacías. **Los datos
  faltantes, ambiguos y en conflicto deben ser explícitos.**
- Los documentos reales de clientes viven bajo un directorio privado ignorado. Nunca se colocan
  en directorios públicos, nunca se commitean, y nunca se citan en documentación — incluido
  este informe.

---

## 13. Contrato HTTP, autorización y manejo de errores

Un conjunto de elementos de trabajo convirtió la API de algo que *informaba* fallos en algo que
los *señaliza*.

### El problema

HTTP tiene códigos de estado por una razón. `200` significa éxito. Un cliente — un navegador,
un script, una herramienta de monitoreo, una integración futura — decide qué hacer en función
de ese número.

La aplicación heredada devolvía **`200` con un fallo descrito en el cuerpo**. Cada llamador
tenía que analizar el cuerpo para descubrir que la petición había fallado, y cualquier llamador
que no lo hiciera trataba el fallo como éxito.

### Las correcciones, en orden

| Elemento de trabajo | Publicado en | Qué corrigió |
|---|---|---|
| HOR-56 | 1.1.0 | Clasificó el acceso a `/api` y lo hizo cumplir del lado del servidor |
| HOR-95 | 1.3.3 | La autorización por rol y alcance ahora devuelve **401** y **403** |
| HOR-96 | 1.3.4 | **Códigos de estado HTTP veraces** — cada manejador que señalaba fallo en el cuerpo ahora lanza un error |
| HOR-98 | 1.3.5 | Quitó el transporte de credenciales en URLs y respuestas |
| HOR-99 | 1.3.6 | Los mensajes de estado de la API se renderizan como texto, no como HTML |
| HOR-107 | 1.3.7 | Acotó la recursión de pedigrí que producía un 500 |
| HOR-103 | 1.3.8 | Valida los identificadores de caballos antes de que lleguen a la capa de base de datos |
| HOR-111 | 1.3.9 | Quitó un campo de petición que el endpoint nunca leía |
| HOR-108 | 1.3.10 | Informa el fallo real del origen en lugar de romperse sobre una variable no declarada |
| HOR-116 | 1.3.11 | Informa una búsqueda de pedigrí fallida en lugar de tragársela; rechaza una búsqueda malformada en lugar de responder 500 |
| HOR-119 | 1.3.12 | Quitó un estado de error que nadie leía; lee el número de página de la ruta como número para que la paginación avance de a uno |

### El contrato actual

Los códigos de estado esperados son explícitos:

```txt
400  la petición está malformada
401  no hay sesión válida
403  autenticado, pero no permitido
404  la cosa no existe
409  un conflicto con el estado existente
422  la petición está bien formada pero los valores no son aceptables
500  el servidor falló
```

El cuerpo todavía lleva un campo de estado para los llamadores existentes. Lo que cambió es que
**el estado de transporte ahora es la verdad**.

### Dos principios relacionados

**No esconder errores de base de datos.** Una fila faltante, una coincidencia ambigua y un
registro en conflicto deben ser visibles cada uno como lo que es. Un resultado vacío que
significa indistintamente "no encontrado", "no tenés permiso" y "la consulta se rompió" es peor
que un error, porque nadie puede saber cuál ocurrió.

**No filtrar internos.** Veraz *hacia el cliente* significa el código de estado correcto y un
mensaje sobre el que una persona pueda actuar — no una traza de pila, no una cadena de error de
base de datos, no una ruta interna.

### Un cabo suelto deliberado

El helper de errores compartido todavía lleva textos que no coinciden con su propio estado: la
rama de reserva devuelve correctamente un **500** mientras le dice al llamador "Bad request", y
la rama de error deliberado lleva un mensaje de error interno de servidor sobre lo que
habitualmente es un 400. Ambas cadenas son **anteriores** al trabajo de estados veraces y se
**dejaron sin cambiar a propósito**, para que ningún texto de cara al usuario se desplazara
dentro de una corrección de transporte. Está registrado como **HOR-101**, y la redacción se
decidirá pensando en cómo la lee Marcus más que en el criterio de un ingeniero.

---

## 14. Modernización de Stripe y los pagos

### El defecto del límite de confianza

El hecho más importante sobre el código de pagos heredado:

> **El navegador le decía al servidor cuánto dinero cobrar.**

Una petición modificada podía fijar cualquier precio. La interfaz de usuario ofrecía planes; el
servidor obedecía cualquier número que llegara.

### Qué cambió — ADR-010

```txt
ANTES                                 DESPUÉS
navegador: "cobrá 4900"         navegador: "nivel 1, mensual"
   │                                │
   ▼                                ▼
servidor: cobra 4900            servidor: busca el nivel 1 en SU PROPIO catálogo
                                          calcula el importe él mismo
                                          IGNORA cualquier importe que envíe el cliente
```

**El servidor es dueño del importe. De forma permanente.** El cliente nombra un plan; el
servidor decide cuánto cuesta ese plan.

Junto con eso:

- La versión de la API de Stripe está **fijada**, de modo que el proveedor de pagos no puede
  cambiar el comportamiento por debajo de la aplicación sin una actualización deliberada.
- El token de método de pago de prueba escrito en el código se quitó.
- El registro de errores se acotó. Registrar el objeto de error completo del proveedor venía
  imprimiendo un campo que contiene el client secret del pago.
- Existían tres copias del precio. **La copia que calculaba el cobro se eliminó.** Quedan dos
  copias de visualización, registradas como duplicación preexistente en lugar de corregirse
  dentro de un elemento de trabajo de pagos.

### Cómo se demostró

El límite de confianza se demostró **de extremo a extremo**, lo cual es más fuerte que
afirmarlo.

Se envió una petición con un payload deliberadamente deshonesto — nivel 1, mensual, **importe
1**, moneda usd, nombre de plan "free". El cobro resultante fue de **4900 unidades menores en
EUR, Pro Access**. Los números del cliente se ignoraron exactamente como estaba diseñado.

También se ejercitaron los rechazos: **400** para un nivel malformado, y **422** para un nivel
fuera de catálogo, una frecuencia desconocida, y un valor de frecuencia con mayúscula.

El manejo de claves se auditó **por estructura, nunca por valor**: ambas claves presentes,
ambas en modo TEST, y el paquete de cliente construido escaneado en **263 archivos** buscando
una clave secreta — **cero apariciones**. Toda la interacción fue en modo TEST; sin clave en
vivo, sin tarjeta real, sin cobro en vivo, y los client secrets nunca se registraron.

La suite de pruebas pasó de **62 a 100 pruebas** a lo largo de este trabajo, todas escritas en
ROJO antes que en VERDE.

### Qué deliberadamente **no** cambió

Esto es importante, porque es una contradicción viva del producto y no un ítem de deuda
técnica.

**La interfaz de usuario vende suscripciones *Monthly* y *Annually*. La implementación crea un
cobro único.** No hay registro de cliente, ni suscripción, ni sesión de checkout, ni webhook, ni
persistencia de quién pagó qué. No existe nada recurrente detrás de una oferta recurrente.

Eso se dejó intacto **a propósito**: cerrarlo es una decisión de producto sobre qué se está
vendiendo, no una corrección técnica para contrabandear dentro de un elemento de trabajo de
modernización. Está registrado como **HOR-73** y está **abierto**.

También sin cambios: sin clave de idempotencia en la llamada de pago, sin cambio de esquema ni
de base de datos, y solo pagos con tarjeta.

### Qué no cubre la verificación — dicho con claridad

**No se tipeó ninguna tarjeta en el formulario de pago dentro de un navegador real.** El paso
final de confirmación que ocurre entre el navegador y Stripe **no** está cubierto por una
ejecución de extremo a extremo en navegador. Todo lo anterior sí lo está.

Versiones actuales: `stripe` **22.5.0** (servidor), `@stripe/stripe-js` **9.14.0** (navegador).
---

## 15. Limpieza de dependencias y borrado seguro

Parte del trabajo de mayor valor de este proyecto fue **borrar**. Una dependencia que el
proyecto no usa igual arrastra avisos de seguridad, igual restringe actualizaciones, igual hay
que auditarla, e igual confunde a quien lea el manifiesto la próxima vez.

### La barrera de borrado seguro

Ninguna dependencia se quitó jamás porque "pareciera sin uso". Cada eliminación demostró:

1. **Cero consumidores**, en archivos fuente, en la salida de build generada *y* en el
   historial de control de versiones — nunca mediante una búsqueda literal de nombre, que no
   prueba nada.
2. **Ningún aviso de seguridad, licencia ni capacidad** depende de ella.
3. **Ningún dato persistido** depende de ella — y donde se tocaron datos, la barrera se
   elevó.
4. El **cambio en el archivo de bloqueo es completamente atribuible**: cada entrada que
   desapareció está justificada.

### Qué se quitó, y qué se ganó

| Quitado | Elemento de trabajo | Evidencia y consecuencia |
|---|---|---|
| Módulo Nuxt de PrimeVue, obsoleto | HOR-55 | Arrastraba una segunda versión mayor, más vieja, de la misma biblioteca al árbol. El conteo de paquetes bajó exactamente en dos |
| Paquete de fuente de iconos | HOR-59 | Su siguiente versión mayor **relicenció de código abierto a comercial**. Ni adoptar la licencia ni fijar la versión para conservar la vieja era aceptable, y se demostró que el paquete no se usaba |
| Cargador de archivos de entorno | HOR-60 | El framework ya carga archivos de entorno. Una dependencia directa redundante más su único consumidor |
| Módulo de contenido | HOR-67 | Una auditoría de cuatro capas demostró que servía **cero documentos**. Se quitó en lugar de migrarlo a una versión que exigía una base de datos embebida e infraestructura de conectores |
| Dos generadores de PDF en navegador | HOR-85 | Su cadena compartida cargaba **2 avisos críticos, 7 altos y 3 moderados**. Todos borrados. La ruta de exportación en vivo es la propia función de impresión del navegador más un escritor DOCX |
| Editor de texto enriquecido y su envoltorio | HOR-86 | **Muerto desde el inicio** en el commit de línea base. El archivo de bloqueo perdió exactamente la clausura de **31 entradas**. Se verificó que ningún contenido persistido guarda el formato de documento de ese editor ni sus clases de marcado |
| Capa de polyfill heredada | HOR-87 | Tres paquetes, cada uno demostrado de forma independiente. Antes de la eliminación, exactamente un chunk construido contenía el polyfill *registrándose a sí mismo*, **cero chunks lo llamaban**, y había **cero** de las transformaciones que existe para soportar. El archivo de bloqueo perdió exactamente la clausura de ocho entradas |
| PrimeVue en sí | HOR-89 | **228 eliminaciones incluyendo el archivo de bloqueo, cero adiciones, 19 paquetes fuera del almacén.** Tamaño de build **idéntico byte a byte** |
| Biblioteca de cifrado de URL | HOR-90 | Teatro de seguridad — ver la sección 12.4 |
| Biblioteca cliente HTTP | HOR-93 | Cada sitio de llamada ya había migrado al fetch propio del framework |
| Módulo de validación de formularios, declaración de procesamiento de estilos, módulo de almacenamiento de archivos | HOR-93 | Cada uno con barrera de cero consumidores |

### Dos eliminaciones que vale la pena leer dos veces

**PrimeVue se quitó en lugar de migrarse (HOR-89).** El plan había programado una
actualización mayor. Revalidar al inicio de la etapa — como exigen las reglas — reveló que **la
siguiente versión mayor ya no es de código abierto**: la biblioteca, su módulo de framework y su
paquete de temas habían pasado todos a una licencia comercial. Eso cambió la pregunta de *"¿cómo
actualizamos?"* a *"¿queremos esto siquiera?"*.

Una auditoría exhaustiva demostró entonces **cero consumidores**: el manifiesto de componentes
generado contenía solo los dos componentes propios del enrutador. Todo el cableado estaba
muerto. El resultado fue 228 eliminaciones, cero adiciones, y un **tamaño de build idéntico byte
a byte** — la prueba más clara posible de que no se perdió nada.

**La eliminación del polyfill muestra qué significa "demostrado" (HOR-87).** Habría sido fácil
buscar el nombre del polyfill, encontrar una coincidencia, y concluir que se usaba. En cambio se
**midió el artefacto construido**: la única aparición era el polyfill registrándose *a sí mismo*,
y nada en ningún lado lo llamaba. Esa distinción es la diferencia entre una eliminación segura y
una caída de producción.

### Una conservación deliberada, plenamente razonada — HOR-123

`vue3-carousel` se queda en la línea **0.4** mientras existe la **0.17**. Esto es una decisión,
no un descuido, y la evidencia se reunió en un entorno descartable:

- **Ningún aviso de seguridad nombra al paquete.** No es una actualización forzada por
  seguridad.
- Habilitar el desplazamiento continuo emite **diapositivas clonadas**, lo que cambia el
  significado de un índice de diapositiva — y el consumidor en vivo es una **tira de
  miniaturas** ligada directamente al índice de diapositiva.
- La receta oficial para ese patrón migró a un mecanismo completamente distinto.
- La altura de diapositiva pasó a ser configuración obligatoria; las métricas de los botones de
  navegación cambiaron; la hoja de estilos más nueva usa anidamiento nativo de CSS.
- **No existe cobertura visual automatizada** para el componente afectado, y el consumidor en
  vivo está de cara al cliente.

El registro del elemento de trabajo es explícito en dos puntos, y ambos se preservan acá: **la
migración no es imposible y no debe describirse como tal**; y un segundo componente de carrusel
que *aparenta* no tener consumidor **no debe clasificarse para eliminación sobre esa base** —
cero consumidores observados no es autorización de borrado.

### Una dependencia transitiva legítima, registrada para que nadie la "limpie"

Una versión mayor más vieja de una biblioteca de fetch permanece en el árbol. **No** es código
de aplicación — llega por la propia cadena de dependencias de la cadena de build. Quitarla
significaría quitar el framework. Se registra acá precisamente para que un futuro barrido de
limpieza no la confunda con un resto olvidado.

---

## 16. Resultado de los avisos de seguridad

### Dónde empezó y dónde está

```txt
inicio de la Etapa J   ────►   8 avisos   (7 altos, 1 moderado)
fin de la Etapa J      ────►   1 aviso
```

La mayor parte de esa reducción vino de **borrar, no de actualizar**. Los dos generadores de PDF
en navegador por sí solos cargaban una cadena con 2 avisos críticos, 7 altos y 3 moderados, y
quitarlos los borró todos. El resto vino de refrescar cadenas transitivas durante el barrido de
cierre.

### El que queda — un RIESGO ACEPTADO

| Hecho | Valor |
|---|---|
| Paquete | `deepmerge-ts` |
| Versión | 7.1.5 |
| Se alcanza a través de | `@prisma/config` |
| Por qué no puede moverse | `@prisma/config` lo declara en una versión **exacta**. Ningún refresco del archivo de bloqueo puede moverlo |
| Dónde se ejecuta | **Solo en la cadena de herramientas** — ausente tanto de la salida de build del cliente como de la del servidor |
| Qué fusiona realmente | El **propio archivo de configuración versionado** del repositorio, y nada más |

Vale la pena decir el razonamiento con claridad, porque "queda un aviso" suena peor de lo que es.

El código vulnerable es una utilidad de fusión profunda. En este proyecto, el único grafo de
objetos que llega a fusionar es un archivo de configuración que vive en el repositorio, bajo
control de versiones, escrito por el equipo. No hay ninguna ruta por la que entrada no confiable
llegue hasta él. No se envía a los navegadores y no está presente en el paquete de servidor
desplegado.

**Está bloqueado aguas arriba.** La corrección tiene que venir del paquete que lo fija.

La decisión fue **aceptar el riesgo de forma explícita en lugar de silenciarlo** — sin
anulación, sin entrada de exclusión, sin trucos de fijación que hicieran que el reporte se vea
limpio mientras el paquete se queda exactamente donde está. Un aviso silenciado es uno que nadie
revisa. Uno aceptado lleva una razón adjunta y un nombre para verificar cuando el paquete aguas
arriba se mueva.

---

## 17. Sistema de pruebas y calidad

### De casi nada a una barrera real

| Momento | Archivos de prueba | Pruebas |
|---|---|---|
| Línea base registrada más temprana | 3 | 28 |
| Después de la etapa contenida de capa de datos | 4 | 61 |
| Después de la etapa de pagos | — | 100 |
| Antes de la migración al adaptador de driver | 34 | 425 |
| **Verificado hoy** | **36** | **438** |

La última fila se **ejecutó, no se recordó**, el 2026-08-25:

```txt
$ pnpm test
 RUN  v4.1.11
 Test Files  36 passed (36)
      Tests  438 passed (438)
   Duration  14.57s
```

### Cómo está construido el arnés

**Vitest** es el ejecutor de pruebas. Corre sin interfaz gráfica, desde **un solo comando**, en
**dos proyectos aislados**:

| Proyecto | Sufijo de archivo | Propósito |
|---|---|---|
| **node** | `*.test.ts` | Lógica pura, sin framework |
| **nuxt** | `*.nuxt.test.ts` | Pruebas que genuinamente necesitan el runtime del framework |

La convención de nombres **es** el mecanismo de enrutamiento: el sufijo es el único interruptor
que envía un archivo a exactamente un proyecto. No hay un registro separado que mantener
sincronizado, así que los dos no pueden desviarse. De los 36 archivos, **4** son pruebas de
framework.

Hay instalado un simulador de entorno de navegador; una segunda alternativa, más pesada,
**deliberadamente no** está instalada, de modo que hay una sola manera de hacer esto en lugar de
dos.

Los archivos de prueba viven **junto al código que protegen**. Una utilidad y su prueba están en
el mismo directorio, así que quien lee encuentra el contrato al lado de la implementación, y un
borrado que quite uno y no el otro es inmediatamente visible.

**Las pruebas de componentes y unitarias nunca se conectan a la base de datos real.**

### La disciplina de desarrollo

**ROJO → VERDE → REFACTOR → CALIDAD** es obligatorio en las áreas donde un defecto silencioso
corrompería la salida del producto:

```txt
Lógica del analizador de Word
Resolución de identidad
Reglas de write-ups canónicos
Ensamblado de pedigrí e informes
Migraciones de datos
Correcciones de compatibilidad que afectan consultas
```

Las reglas asociadas son lo que lo hace real: nada de código de implementación sin una prueba
concreta en fallo en esas áreas; las pruebas derivan de criterios de aceptación escritos, **no de
la imaginación**; las pruebas cubren caminos felices, casos borde, estados de error y riesgos de
regresión; ninguna prueba llama a una red externa ni a un servicio de producción; y **los
documentos reales de clientes nunca se usan como fixtures**.

### Las barreras

**Localmente**, antes de que un elemento de trabajo pueda marcarse como completo:

```txt
pnpm install --frozen-lockfile
pnpm test
pnpm build
```

**En Integración Continua**, la verificación requerida se llama `Test / Build`. Corre sobre el
evento de Pull Request hacia cada rama permanente, con un tiempo límite de 15 minutos, un grupo
de concurrencia que cancela ejecuciones en curso, y permisos de solo lectura sobre el
repositorio.

Dos reglas son vinculantes, y ambas existen porque ambas fueron puestas a prueba por la realidad:

- **"Sin verificaciones reportadas" nunca es una verificación aprobada.**
- **Una ejecución disparada manualmente no es autorización de merge.** No satisface el conjunto
  de reglas del repositorio. Esto se hizo cumplir durante un incidente real de la plataforma
  GitHub que descartó eventos disparadores de workflows — no se relajó ningún conjunto de
  reglas, no se usó ningún merge administrativo, y no se creó ningún commit artificial para
  disparar el build.

> **Reportado con honestidad:** los scripts `lint` y `typecheck` **no están configurados** en
> este proyecto. En este informe no se afirma que alguno haya corrido, porque ninguno existe.

### La barrera de modernización de dependencias

Todo cambio de versión de framework o dependencia debe superar una barrera más pesada.
**Automatizada:** instalación congelada, ambos proyectos, la suite completa **sin reducción** en
conteo de archivos ni de pruebas contra su propia línea base previa al cambio, el build de
producción, y una verificación de espacios en blanco — con la verificación requerida en verde en
**cada uno de los tres Pull Requests de promoción**.

La **regresión manual** se describe en la sección siguiente.

**Regresión de presentación**, donde una actualización puede cambiar la apariencia: capturar la
hoja de estilos construida antes y después y comparar **valores, no versiones**; comparar los
atributos de clase renderizados ruta por ruta; y **declarar qué no cubre la evidencia**. Comparar
el HTML servido es explícitamente insuficiente acá, porque este proyecto enlaza su hoja de
estilos en lugar de incrustarla.

---

## 18. Protección de regresión del producto central

Cada actualización de dependencias de este proyecto se verifica contra **un caballo real**.

### La regresión, exactamente como se ejecuta

```txt
búsqueda "ERNE ALERT"      -> 1 fila, horse_id 1003, año de nacimiento 1997
padre                      -> ABLE ALBERT
madre                      -> SPRINTER
ancestros conocidos        -> ABWAH, POLLY PEACHUM, ikt, UNKNOWN IKT
línea materna vía dam      -> SPRINTER -> UNKNOWN IKT
línea de yeguas            -> primer ancestro UNKNOWN IKT, 17 descendientes
descendencia               -> 4 potrillos para SPRINTER; 0 para ERNE ALERT (correcto)
error de storehorse.status -> ausente
```

Ejecuciones posteriores, una vez maduro el trabajo de pedigrí, registraron **13 ancestros
distintos** en la vista de pedigrí y **30 nombres** devueltos por la línea materna.

### Por qué un caballo alcanza

No es un caballo. Es **un caballo elegido porque ejercita toda la cadena**: resolución de
identidad por nombre, la relación paterna, la relación materna, el recorrido multigeneracional,
la agrupación de familia materna, la búsqueda de descendencia, y el comportamiento de
compatibilidad que ya causó una caída total una vez.

Si ERNE ALERT resuelve correctamente, la tubería de la que depende el producto está intacta. Si
no, algo fundamental se rompió — y quien desarrolla se entera **antes** de que el cambio llegue a
la rama estable, no después.

### Tres reglas vinculantes sobre esto

**Se ejecuta antes y después, y las capturas se comparan.** No "se verificó que sigue
funcionando" — se comparan, contador por contador. Varias etapas registraron resultados como
*conteos de nodos* idénticos precisamente porque esa es una afirmación más fuerte que "se veía
bien".

**Corre localmente, nunca en Integración Continua.** El build automatizado nunca debe conectarse
a la base de datos de referencia local.

**Sus datos nunca se convierten en fixtures.** La base de datos de referencia son datos reales de
clientes. Se mantiene fuera del repositorio y fuera del build automatizado. Esta es una regla de
privacidad, no de conveniencia.

### Qué demostró

La caída de la columna de estado — 59.903 filas devolviendo nada en silencio — es exactamente la
clase de falla que esta regresión existe para atrapar. Cada etapa desde entonces confirmó de
forma explícita que **"el error de `storehorse.status` no volvió."**

---

## 19. Lógica de dominio de informes y pedigrí

### Qué existe hoy

La aplicación ya renderiza pedigríes, y los endpoints y componentes que lo hacen están
inventariados:

| Endpoint | Rol |
|---|---|
| `pedigree.post.ts` | La tabla de pedigrí |
| `pedigree-detail.post.ts` | Detalle detrás de una entrada de pedigrí |
| `family-tree-of-horse-by-id.post.ts` | Recorrido del árbol genealógico |
| `familyHorseStore.post.ts` | Ensamblado de datos de familia |
| `mareline.post.ts` | Recorrido de la familia materna |
| `progeny.post.ts` | Búsqueda de descendencia |
| `report-horses-ids.post.ts` | Ensamblado de informes multi-caballo |

| Componente | Rol |
|---|---|
| `Pedigree.vue`, `PedigreeCard.vue`, `PedigreeDetail.vue` | Renderizado de pedigrí |
| `HorseFamilyTree.vue`, `GenerateHorseFamilyTree.vue` | Renderizado de árbol genealógico |
| `MarelineTree.vue` | Renderizado de familia materna |
| `RecursiveCompetitionHistory.vue` | **El análogo existente más cercano al renderizado de write-ups que el producto necesita** |

Esa última fila es la observación arquitectónica clave del inventario: la forma de lo que el
producto debe construir ya existe en la aplicación, en un componente que renderiza historial
anidado de forma recursiva.

### Las reglas que debe obedecer cualquier implementación

- La ascendencia viene de `dam_id` y `sire_id`. **Nunca de coincidir texto de nombres.**
- La línea materna se recorre a través de `dam_id`. El campo de agrupación de familia materna es
  una etiqueta, no la cadena.
- **Un identificador faltante para un descendiente lejano no es un error de extracción.** No debe
  disparar la creación de un registro de caballo especulativo. Los caballos ausentes de la base de
  datos pueden legítimamente permanecer como **descendientes solo de texto**.
- `(SEE ABOVE)` es una **referencia de reutilización**, no contenido nuevo.
- Una yegua tiene **como máximo un** write-up canónico, con clave en su `horse_id`.
- Los write-ups en conflicto se **preservan como variantes y se encolan para revisión**, nunca se
  sobrescriben.

### Qué se corrigió en esta área

Se encontraron y corrigieron tres defectos en el código de pedigrí existente:

- **HOR-107** — la selección de pedigrí recursaba sin límite y devolvía un error de desbordamiento
  de pila como un 500. La profundidad ahora está acotada.
- **HOR-103** — los identificadores de caballos llegaban a la capa de base de datos sin validar y
  rompían un helper de conversión. Ahora se validan primero.
- **HOR-116** — una búsqueda de pedigrí fallida se tragaba en lugar de reportarse.

### Qué sigue roto acá — y es honesto decirlo

**HOR-110** está abierto. Medido contra un build local de producción con un identificador de
caballo inexistente:

```txt
/api/pedigree                     200  "[[]]"     correcto
/api/familyHorseStore             200  "[]"       correcto
/api/pedigree-detail              200             correcto
/api/mareline                     500  Error: No horse found with dam_id: null
/api/family-tree-of-horse-by-id   500  el mismo error
```

Dos endpoints llevan **copias privadas del mismo helper de búsqueda de ancestros** que lanzan un
error donde los otros devuelven un resultado vacío. Existe una **tercera copia** en el endpoint de
ensamblado de informes y debe auditarse dentro del mismo elemento de trabajo.

Este no es el defecto de recursión sin límite que corrigió HOR-107. Es una inconsistencia
separada y todavía abierta sobre cómo se expresa "sin ancestro" — y está justo en el recorrido de
línea materna del que depende el producto.

---

## 20. Requisitos funcionales del MVP de automatización — estado

Esta es la sección que más importa para fijar expectativas, y es sobre la que este informe es más
cuidadoso.

El documento de requisitos define doce requisitos funcionales. **Cada uno de ellos está
actualmente NO IMPLEMENTADO.**

Eso no es una inferencia por leer código. Es el estado del gestor de trabajo:

| EPIC | Título | Estado |
|---|---|---|
| HOR-1 | EPIC 0 — Foundation & Setup | **Done** |
| HOR-6 | EPIC 1 — Database Redesign & Migration | **Backlog** |
| HOR-10 | EPIC 2 — Word Extractor | **Backlog** |
| HOR-15 | EPIC 3 — Report Generation | **Backlog** |
| HOR-19 | EPIC 4 — Review UI & Modern UX | **Backlog** |
| HOR-23 | EPIC 5 — Hardening & Handover | **Backlog** |

Cada hijo de los EPICs 1 a 5 está también en Backlog. **Todo el trabajo entregado hasta la fecha
está bajo el EPIC 0**: fundación, las diez etapas de modernización, el programa de seguridad, las
correcciones del contrato HTTP, y las correcciones de errores.

### Requisito por requisito

| Req | Qué exige | Estado |
|---|---|---|
| **FR-001** | Importar un catálogo de Word y producir un informe de extracción — identificador de documento, caballos y secciones detectadas, entradas analizadas, entradas omitidas, estructuras no soportadas, referencias ambiguas, conflictos, errores — sin modificar ningún archivo fuente | **NO IMPLEMENTADO** — EPIC 2 en Backlog |
| **FR-002** | Analizar secciones de madres (1st a 5th Dam y más profundas), conservando encabezado, orden de origen y una referencia cruda a la fuente | **NO IMPLEMENTADO** — EPIC 2 en Backlog |
| **FR-003** | Analizar entradas de write-up: nombre del caballo, disciplina, altura y nivel de competencia, año de nacimiento, jinete, país, año del evento, ubicación, nombre del evento, clase, aprobación y studbook, `dam of:`, `(SEE ABOVE)`, `etc.` | **NO IMPLEMENTADO** — EPIC 2 en Backlog |
| **FR-004** | Resolver la identidad del caballo por cascada: nombre exacto normalizado → año de nacimiento → nombre del padre → nombre de la madre → revisión humana | **NO IMPLEMENTADO** — EPIC 2 en Backlog |
| **FR-005** | Crear write-ups canónicos: como máximo uno por yegua resuelta; los conflictos preservan todas las variantes, crean un ítem de revisión, y nunca sobrescriben en silencio | **NO IMPLEMENTADO** — EPIC 2 en Backlog |
| **FR-006** | Preservar la procedencia: documento de origen, sección, referencia de posición, ejecución de extracción, marca temporal de importación, versión del analizador | **NO IMPLEMENTADO** — EPIC 2 en Backlog |
| **FR-007** | Ensamblar un informe de caballo | **NO IMPLEMENTADO** — EPIC 3 en Backlog. *El ensamblado de pedigrí existe en la aplicación y la regresión lo ejercita; el ensamblado de informes según este requisito no existe* |
| **FR-008** | Generar un PDF profesional, validado visualmente por Marcus, evitando truncamiento silencioso | **NO IMPLEMENTADO** — EPIC 3 en Backlog. *Existe una ruta de exportación DOCX y la ruta de impresión del navegador; ninguna es este requisito* |
| **FR-009** | Importar un Excel de subasta — nombre, edad, padre, madre, color, sexo — previsualizar filas, hacer coincidir contra la base de datos, encolar los casos no encontrados y los de revisión, **nunca descartar una fila en silencio**, producir PDFs por lote | **NO IMPLEMENTADO** — EPIC 3 en Backlog |
| **FR-010** | Cola de revisión para casos faltantes, ambiguos y en conflicto | **NO IMPLEMENTADO** — EPIC 4 en Backlog |
| **FR-011** | Búsqueda y detalle de caballo | **A REVALIDAR EN EL PUNTO DE CONTROL DEL ROADMAP FUNCIONAL.** La búsqueda y el detalle de caballo **existen y funcionan** en la aplicación, y la regresión los ejercita. Si satisfacen este requisito tal como está escrito no se evaluó formalmente contra sus criterios de aceptación, y su EPIC está en Backlog |
| **FR-012** | Ingesta repetible — idempotente, reanudable, auditable, segura de re-ejecutar | **NO IMPLEMENTADO** — EPIC 2 en Backlog |

### El resumen honesto

La **plataforma** es moderna, segura, probada y publicable. El **producto** — la extracción de
Word, la biblioteca de write-ups canónicos, la resolución de identidad, la cola de revisión y la
generación de PDFs por lote — **todavía no se construyó.**

Esas dos frases deben leerse juntas. Ninguna es la historia completa, y a ninguna se le debe
permitir implicar la otra.

Dos hechos de apoyo muestran por qué el trabajo de fundación no fue un desvío. La tabla
`competition_history` tiene la forma correcta y contiene **≈ 454 filas** — está esencialmente
vacía, y llenarla desde el archivo de Word es el trabajo central. Y la pregunta de actualidad de
los datos (**HOR-32**) está **BLOQUEADA a la espera de Marcus**: si existe una copia de la base de
datos más nueva que aproximadamente 2024 es **DESCONOCIDO**, y esa respuesta condiciona el EPIC 1.
---

## 21. Flujo de releases y de Git

### Tres ramas permanentes

```txt
rama de issue  ──►  DEV  ──►  QA  ──►  main
   (una por        │        │         │
    elemento       │        │         └─ estable, publicable
    de trabajo)    │        └─ validación funcional y técnica
                   └─ integración de desarrollo
```

`DEV`, `QA` y `main` son **permanentes**. Nunca se borran, ni local ni remotamente. **Ninguna
acepta un commit directo ni un push directo.** Sin force push. Sin historia reescrita.

Cada paso es un Pull Request. **Ninguna etapa puede saltearse.** No hay ruta desde una rama de
issue a `main`, ni desde `DEV` a `main`. Un hotfix nace de `main` y se **retropropaga a `QA` y
`DEV` por Pull Request** — nunca queda solo en `main`.

Cada rama lleva el identificador de su elemento de trabajo en el nombre, y **cada mensaje de
commit lo incluye**. Eso es lo que hace posible, meses después, preguntar por qué cambió una
línea y obtener una respuesta.

### Solo merge commits — y por qué esto no es una preferencia de estilo

**El squash merge y el rebase merge están prohibidos.**

La razón es mecánica. El squash reescribe los commits de una rama en un objeto *nuevo* que no
existe en la rama de origen. Las ramas entonces divergen por identidad en lugar de por contenido,
y **cada promoción posterior reporta diferencias fantasma** — cambios que ya están presentes pero
que parecen ausentes. La herramienta de release además lee conventional commits, y el squash
destruye los commits individuales que necesita.

De ese mismo razonamiento se desprende una regla relacionada: **las tres ramas no están obligadas
a compartir un hash de commit.** Cada promoción produce su propio merge commit, así que hashes
distintos entre `DEV`, `QA` y `main` son el **estado normal y esperado**. La contención se
verifica por ascendencia, nunca por igualdad de hash, y **nunca** se crea un commit vacío para que
los hashes coincidan.

La alineación directa entre ramas permanentes está prohibida en todas sus formas — sin push de
avance rápido entre ellas, sin actualización directa de referencia a través de la API de la
plataforma, y sin reset sobre una rama permanente.

### La Integración Continua como barrera real

La verificación requerida se llama **`Test / Build`**. Corre sobre el evento de Pull Request
hacia cada rama permanente. En el repositorio existen solo dos workflows: la verificación de build
y la herramienta de release.

La cadena de pasos del build es deliberadamente mínima: checkout, configurar el gestor de paquetes
**sin entrada de versión** para que lea el valor fijado en `package.json`, configurar el runtime
con caché de dependencias, instalar con archivo de bloqueo congelado, ejecutar las pruebas,
ejecutar el build.

**El cierre automático por una integración de Git no es evidencia de aceptación.** Si una
integración mueve un elemento de trabajo a Done, cada criterio de aceptación se verifica de forma
independiente, y el elemento vuelve a In Progress si alguno está incompleto.

### Releases

Release Please corre sobre la rama estable, lee los conventional commits, y abre un Pull Request
de release que lleva el incremento de versión y el changelog generado. Cuando un **humano** lo
mergea, se crean la etiqueta y el release.

Lo rigen cuatro reglas: apunta a `main`; debe pasar `Test / Build` como cualquier otro cambio; se
revisa y mergea **manualmente**; y nunca debe saltear la Integración Continua ni la protección de
ramas.

> **Nunca se mergea sin autorización explícita de Sammy.**

Después de que un release se mergea, la **retropropagación es obligatoria antes de la siguiente
promoción**. El botón propio de la plataforma para "actualizar rama" no puede hacerlo — se rechaza
porque se espera la verificación requerida. La única ruta es una rama desde `QA`, un merge de
`main` hacia ella, y un Pull Request; luego los mismos dos pasos de `QA` a `DEV`.

### El registro de releases

Diecinueve releases, desde **1.0.0 el 2026-07-22** hasta **1.3.14 el 2026-08-24**, con todas las
etiquetas presentes.

| Versión | Fecha | Titular |
|---|---|---|
| 1.0.0 | 2026-07-22 | Corrección de configuración de servidor (HOR-31); capa de compatibilidad de estado (HOR-35) |
| 1.1.0 | 2026-08-09 | **Clasificar el acceso a `/api` y hacerlo cumplir del lado del servidor** (HOR-56) |
| 1.2.0 | 2026-08-13 | **Adoptar los valores visuales nativos de Tailwind 4** (HOR-70) |
| 1.2.1 | 2026-08-13 | **Mover la autoridad del importe de pago al servidor** (HOR-72) |
| 1.3.0 | 2026-08-15 | **Tokens de acceso modernos y sesiones de refresco rotativas solo-resumen** (HOR-76); línea base de migraciones y fundación InnoDB (HOR-79); registro atómico (HOR-77); dejar de devolver errores internos en crudo (HOR-78); reconciliación de capacidad de contraseña (HOR-74); valores por defecto del esquema (HOR-80) |
| 1.3.1 | 2026-08-15 | Ampliar la columna de altura (HOR-82) |
| 1.3.2 | 2026-08-19 | **Rellenar `storehorse.status` y retirar la sonda de capacidad** (HOR-94) |
| 1.3.3 | 2026-08-21 | Devolver 401 y 403 desde la autorización por rol y alcance (HOR-95) |
| 1.3.4 | 2026-08-22 | **Códigos de estado HTTP veraces** (HOR-96) |
| 1.3.5 | 2026-08-22 | Quitar el transporte de credenciales en URLs y respuestas (HOR-98) |
| 1.3.6 | 2026-08-22 | Renderizar los mensajes de estado de la API como texto, no como HTML (HOR-99) |
| 1.3.7 | 2026-08-22 | Acotar la recursión de pedigrí (HOR-107) |
| 1.3.8 | 2026-08-22 | Validar los identificadores de caballos antes de que lleguen a la capa de datos (HOR-103) |
| 1.3.9 | 2026-08-22 | Quitar un campo de petición inerte (HOR-111) |
| 1.3.10 | 2026-08-22 | Informar el fallo real del origen (HOR-108) |
| 1.3.11 | 2026-08-23 | Informar una búsqueda de pedigrí fallida; rechazar una búsqueda malformada (HOR-116) |
| 1.3.12 | 2026-08-23 | Quitar un estado de error que nadie leía; corregir la paginación de búsqueda (HOR-119) |
| 1.3.13 | 2026-08-24 | Ordenar correctamente los pasos posteriores a la instalación (HOR-91) |
| **1.3.14** | **2026-08-24** | **Refrescar dependencias transitivas vulnerables** (HOR-93) |

El ciclo v1.3.14 está **completamente cerrado**: el Pull Request de release lo mergeó manualmente
Sammy hacia `main` el 2026-08-25, y se retropropagó `main` → `QA` → `DEV` bajo HOR-122.

### Un defecto conocido en las propias notas de release — HOR-97

El changelog generado **lista la misma corrección más de una vez por release**. Es un defecto real
y abierto, y es honesto nombrarlo en un informe que cita ese changelog.

La causa raíz es precisa: la plataforma coloca el **título** de un Pull Request en el **cuerpo**
del merge commit, y la herramienta de release analiza el cuerpo de un asunto
`Merge pull request #N from …` como si fuera el conventional commit real. El conteo de
duplicaciones equivale, por lo tanto, a cuántos de los cuatro commits de una cadena de promoción
llevan un asunto **o** un cuerpo convencional.

Es sistemático desde 1.1.0. En 1.3.0, dos entradas aparecen **cuatro veces cada una**. El release
1.3.2 salió limpio **por accidente** — sus Pull Requests resultaron estar titulados en prosa.

Hay dos restricciones registradas sobre la corrección. **No debe cambiarse el método de merge** —
eso cambiaría un defecto cosmético por el problema de divergencia de ramas que la sección 21
existe para prevenir. Y **las entradas históricas del changelog no deben reescribirse.**

---

## 22. Architecture Decision Records — resumen

Dieciséis registros. Un registro aceptado es vinculante hasta ser **reemplazado por otro
registro** — nunca por una edición al original.

| ADR | Decisión | Por qué | Efecto actual |
|---|---|---|---|
| **ADR-001** | Adoptar y modernizar la aplicación existente. **Nunca reescribir** | El proyecto se estancó por la transformación de *datos* faltante, no por un frontend inadecuado. Una reescritura habría destruido software funcionando sin tocar el problema real | **Vinculante y fundacional.** Cada etapa del programa existe por esto |
| **ADR-002** | Quedarse en la familia MySQL/MariaDB; **conservar los nombres existentes de tablas y columnas** | El dump de referencia solo se restaura contra estos nombres. Renombrar significa tocar cada consulta, modelo y migración de una vez | **Vinculante.** Nombres extraños como `diciplinevalues` son un contrato de compatibilidad, no una elección de estilo |
| **ADR-003** | **Preservar el esquema de Prisma.** La ausencia en la base de datos de referencia es deriva, no obsolescencia | Once modelos existían solo en código. Borrarlos habría borrado capacidad funcional | **Vinculante.** La introspección de esquema contra el esquema versionado está prohibida; toda eliminación requiere una barrera de evidencia completa |
| **ADR-004** | **pnpm es el único gestor de paquetes**, fijado en un solo lugar | Una segunda declaración de la versión se desvía de la primera | **Vinculante.** El paso de configuración de Integración Continua no toma entrada de versión; lee el valor fijado |
| **ADR-005** | **Biblioteca de write-ups canónicos de yeguas** — un write-up aprobado por yegua, reutilizado en toda su línea | ≈37% de un catálogo real era texto duplicado; `(SEE ABOVE)` aparecía 19 veces | **Vinculante y todavía no construido.** Es el diseño central del producto; el EPIC 2 está en Backlog |
| **ADR-006** | Capa de compatibilidad en tiempo de ejecución para la columna `storehorse.status` faltante | Cada consulta que filtraba por ella fallaba con un error de columna desconocida contra una base de datos que no podía modificarse | **REEMPLAZADO POR ADR-014.** La sonda está retirada |
| **ADR-007** | **Clasificar cada ruta `/api` y hacer cumplir el acceso del lado del servidor** | La clave compartida se incrustaba en el paquete del navegador — 36 apariciones en 20 archivos fuente — y 30 manejadores descartaban el resultado de la validación | **Vinculante.** 44 rutas clasificadas; una ruta sin clasificar es por defecto **solo servidor** y se rechaza |
| **ADR-008** | **Una migración mayor de framework nunca funciona además como reorganización de directorios** | Un diff de cientos de renombres esconde las líneas que realmente cambiaron el framework; las regresiones se vuelven inatribuibles | **Vinculante.** La estructura del repositorio permanece plana mediante configuración soportada; el shim de versión de compatibilidad del framework se rechazó |
| **ADR-009** | Adoptar la integración de build oficial de Tailwind; **una actualización de versión no cambia el diseño** | 35 de 43 tokens de paleta se desplazaron, ΔE medio 4,22, peor caso 16,08 — nada de eso estaba en la guía de actualización | **Vinculante.** La capa de compatibilidad se retiró con HOR-70 (142 líneas eliminadas); los valores nativos son ahora los oficiales, y la línea base se mueve con un valor por defecto adoptado |
| **ADR-010** | **El servidor es dueño del importe de pago**; la versión de la API del proveedor está fijada | Antes el navegador le decía al servidor cuánto cobrar | **Vinculante.** Demostrado de extremo a extremo: un payload deshonesto del cliente produjo el precio catalogado |
| **ADR-011** | Reconciliar la **deriva de capacidad** mediante parches SQL versionados | Una columna de contraseña `varchar(50)` contra un hash de 60 caracteres rechazaba **todos** los registros | **Vinculante.** Los parches viven bajo `db/patches/`, revisados como código |
| **ADR-012** | **Línea base de migraciones más modernización escalonada de motores de almacenamiento** | No existía historial de migraciones; la base de datos no podía reconstruirse de forma reproducible | **Vinculante.** La línea base preserva las 24 tablas MyISAM; la Ola 1 convirtió exactamente una tabla |
| **ADR-013** | **Tokens de acceso sin estado y de corta duración; sesiones de refresco rotativas solo-resumen** | Los tokens se firmaban con una reserva adivinable y se persistían en texto plano en dos tablas de solo escritura | **Vinculante.** Tokens de acceso de 1 hora nunca almacenados; solo un resumen SHA-256 de la credencial de refresco persistido; la tabla en texto plano eliminada por migración |
| **ADR-014** | **Rellenar `storehorse.status` y retirar la sonda de compatibilidad** | Una columna nullable sin relleno dejó las 59.903 filas en `NULL` y produjo una caída total de la cadena central | **Vinculante. Reemplaza a ADR-006.** La columna es `NOT NULL DEFAULT 1` |
| **ADR-015** | **Arquitectura de adaptador de driver de Prisma 7**; preservar la topología de cliente por petición | La nueva versión mayor necesita un adaptador explícito; cambiar la topología de conexión dentro de una actualización mayor haría inatribuibles las regresiones | **Vinculante.** Pool fijado en paridad con la versión anterior; la forma por petición es una característica conocida registrada, no oculta |
| **ADR-016** | **MariaDB 12.3 LTS, migrada en paralelo** | 12.3 se mantiene hasta el 2029-06-12, el horizonte más largo entre los candidatos LTS | **Vinculante.** El entorno previo a la migración se conserva como contenedor detenido; su conservación es un disparador de revisión explícito |

Dos hechos de reemplazo importan y se declaran una sola vez, con claridad: **ADR-014 reemplaza a
ADR-006.** Ningún otro registro de este conjunto está reemplazado.

---

## 23. Cronología de hitos

Curada — los cambios que alteraron lo que el sistema *es*, no cada elemento de trabajo.

| Fecha | Elemento de trabajo | Hito |
|---|---|---|
| — | HOR-2 (US-001) | **Arranque del proyecto.** La aplicación adoptada en lugar de reescrita |
| — | HOR-27 (US-001b) | **pnpm estandarizado** como único gestor de paquetes |
| — | HOR-4 (US-002) | **Base de datos de referencia local restaurada** — 59.903 caballos disponibles para regresión real |
| — | HOR-3 (US-003) | **Arnés de pruebas establecido** — Vitest, dos proyectos aislados |
| — | HOR-5 (US-004) | **Línea base de seguridad** |
| — | HOR-35 | **Capa de compatibilidad de estado** — la aplicación corre contra una base de datos a la que le falta una columna declarada |
| — | HOR-38, HOR-39, HOR-40 | **Flujo de promoción, verificaciones reales de Integración Continua, protección de ramas** |
| — | HOR-41 | **Release Please adoptado** |
| — | HOR-46, HOR-47 | **Arnés de pruebas endurecido; estrategia de pruebas escrita** |
| 2026-07-22 | — | **Release 1.0.0** |
| — | HOR-48 (US-055) | **La modernización de dependencias de 2026 auditada y planificada** — el origen de las Etapas A a J |
| — | HOR-42 | **Etapa A** — herramientas de Integración Continua |
| 2026-08-08 | HOR-50 | **Etapa B** — runtime y gestor de paquetes movidos a líneas soportadas |
| — | HOR-54 | **Etapa C** — 25 pisos de dependencias elevados; el rango de runtime declarado y aplicado |
| — | HOR-55 | **Etapa D** — el módulo obsoleto del framework quitado; **la API key incrustada descubierta** |
| 2026-08-09 | HOR-56 | **Release 1.1.0 — el límite de confianza de la API.** 44 rutas clasificadas y aplicadas del lado del servidor (ADR-007) |
| — | HOR-58 | **Etapa E** — versión mayor del cliente Prisma, esquema idéntico byte a byte |
| — | HOR-59 … HOR-64 | **Etapa F** — seis versiones mayores de bibliotecas contenidas; **dos quitadas en lugar de actualizadas** |
| — | HOR-67, HOR-68 | **Etapa G — el giro.** Nuxt 4 cruzado con un diff de tres líneas de código fuente; **ADR-008** escrito |
| — | HOR-69 | **Etapa H** — Tailwind 4 mediante su integración oficial; **ADR-009** escrito |
| 2026-08-13 | HOR-70 | **Release 1.2.0 — valores nativos de Tailwind 4 adoptados**, capa de compatibilidad eliminada (142 líneas) |
| 2026-08-13 | HOR-72 | **Release 1.2.1 — Etapa I.** La autoridad del importe de pago movida al servidor (**ADR-010**) |
| 2026-08-15 | HOR-74, HOR-76 … HOR-80 | **Release 1.3.0 — la reconstrucción de la autenticación.** Tokens de acceso modernos y sesiones de refresco rotativas solo-resumen (**ADR-013**); línea base de migraciones y fundación InnoDB (**ADR-012**); reconciliación de capacidad (**ADR-011**) |
| 2026-08-15 | HOR-82 | **Release 1.3.1** — altura reconciliada; la diferencia residual baja de 20 sentencias a **19** |
| 2026-08-17 | HOR-83 | **Etapa J autorizada e iniciada** — la cola diferida, cargada de ADRs |
| 2026-08-19 | HOR-94 | **Release 1.3.2 — la corrección de `storehorse.status`** (**ADR-014**, reemplazando a ADR-006). Una caída total de la cadena central cerrada |
| 2026-08-21 | HOR-95 | **Release 1.3.3** — 401 y 403 devueltos desde la autorización |
| 2026-08-22 | HOR-96 | **Release 1.3.4 — códigos de estado HTTP veraces.** Los fallos dejan de reportarse como éxito |
| 2026-08-22 | HOR-98, HOR-99 | **Releases 1.3.5 y 1.3.6** — transporte de credenciales quitado; mensajes de estado renderizados como texto |
| 2026-08-22 | HOR-107, HOR-103, HOR-111, HOR-108 | **Releases 1.3.7 a 1.3.10** — recursión de pedigrí acotada; identificadores validados; campo inerte quitado; fallos reales reportados |
| 2026-08-22 | HOR-89 | **PrimeVue quitado en lugar de migrado** — su siguiente versión mayor ya no es de código abierto. 228 eliminaciones, build idéntico byte a byte |
| 2026-08-22 | HOR-90 | **Cifrado de URL quitado.** Las URLs canónicas pasan a ser identificadores numéricos planos y validados; se cierra un agujero de análisis permisivo |
| 2026-08-23 | HOR-116, HOR-119 | **Releases 1.3.11 y 1.3.12** |
| — | HOR-118 (SEC-001) | **Exposición de información de error del framework en el payload de producción renderizado en servidor investigada y remediada** |
| 2026-08-24 | HOR-91 | **Release 1.3.13 — arquitectura de adaptador de driver de Prisma 7** (**ADR-015**). 44 archivos de servidor recableados; diff de esquema de dos líneas |
| — | HOR-92 | **MariaDB 12.3 LTS adoptada en paralelo** (**ADR-016**). Checksums idénticos en las 41 tablas; reversión probada en vivo |
| 2026-08-24 | HOR-93 | **Release 1.3.14 — la Etapa J cierra.** Los avisos bajan de 8 a 1; **el programa de modernización está completo** |
| 2026-08-25 | HOR-122 | v1.3.14 retropropagada `main` → `QA` → `DEV` |
| 2026-08-26 | HOR-124 | **pnpm 11.23.0 formalizada como la versión fijada del gestor de paquetes** (**ADR-004**). Una línea en `package.json`; no hizo falta ningún cambio en la Integración Continua, porque el paso de preparación lee la versión fijada del manifiesto |

---

## 24. Arquitectura actual del sistema

```txt
                        ┌───────────────────────────────────┐
                        │            NAVEGADOR              │
                        │  componentes Vue 3 · Vue Router 5 │
                        │  Tailwind 4 (hoja de estilos      │
                        │  enlazada)                        │
                        │  21 páginas · 44 componentes      │
                        └────────────────┬──────────────────┘
                                         │  HTTP
                        ┌────────────────▼──────────────────┐
                        │      NUXT 4 · SERVIDOR NITRO      │
                        │                                   │
                        │  middleware/apiAccessControl.ts   │
                        │     ruta sin clasificar = RECHAZO │
                        │  middleware/auth.ts               │
                        │                                   │
                        │  44 archivos de endpoint de API   │
                        │  22 utilidades de servidor        │
                        │     (cada una con su prueba al    │
                        │      lado)                        │
                        └────────────────┬──────────────────┘
                                         │
                     ┌───────────────────┼───────────────────┐
                     │                   │                   │
          ┌──────────▼─────────┐  ┌──────▼───────┐  ┌────────▼────────┐
          │  CLIENTE PRISMA 7  │  │    STRIPE    │  │  CORREO (SMTP)  │
          │  cliente generado  │  │  el servidor │  │                 │
          │  + adaptador del   │  │  es dueño    │  │                 │
          │    driver MariaDB  │  │  del importe │  │                 │
          └──────────┬─────────┘  └──────────────┘  └─────────────────┘
                     │
          ┌──────────▼──────────────────────────────────────┐
          │            MariaDB 12.3 LTS  (hb-mysql)         │
          │  hbold · 59.903 caballos · 42 tablas base       │
          │  6 migraciones aplicadas                        │
          │  diferencia residual: exactamente 19 sentencias │
          └─────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────┐
          │   extractor/   Python 3.14 · python-docx        │
          │   MÓDULO SEPARADO — aislado del árbol de Node   │
          │   (previsto para el EPIC 2; aún sin implementar)│
          └─────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────┐
          │   _legacy/   sitio viejo en PHP + MySQL          │
          │   REFERENCIA DE SOLO LECTURA — nunca importado,  │
          │   nunca ejecutado                                │
          └─────────────────────────────────────────────────┘

          ┌─────────────────────────────────────────────────┐
          │   data/private/   documentos reales de clientes  │
          │   IGNORADO POR GIT — nunca commiteado, nunca     │
          │   citado                                         │
          └─────────────────────────────────────────────────┘
```

### Las reglas estructurales que codifica el diagrama

- **La lógica de negocio del lado del servidor vive en Nitro**, bajo `server/`. No migra hacia
  código de navegador.
- **El extractor de Python es un módulo separado**, deliberadamente aislado de la cadena de
  herramientas de Node y su árbol de dependencias. Dos ecosistemas, dos árboles de dependencias,
  sin filtración entre ellos.
- **`_legacy/` es referencia de solo lectura.** Nunca se importa en tiempo de ejecución.
- **El código específico de una funcionalidad permanece local a esa funcionalidad.** El código
  usado por dos o más funcionalidades puede volverse compartido. La estructura grita
  funcionalidad, no agrupación técnica.
- **Los contenedores son dueños del estado y la orquestación; los componentes de presentación
  reciben datos y emiten eventos.**
- **Los documentos reales de clientes viven bajo un directorio privado ignorado** — nunca en
  directorios públicos, nunca en el extractor, nunca en `_legacy/`.

---

## 25. Stack tecnológico actual

Cada versión de abajo se **leyó de una fuente ejecutable o de un entorno en vivo el 2026-08-25**,
no se recordó. La fila de pnpm se releí el **2026-08-26**, después de que **HOR-124** elevara
la versión fijada.

| Tecnología | Versión actual | Responsabilidad | Por qué está acá |
|---|---|---|---|
| **Node.js** | `^24.19.0` declarado; `24.19.0` en Integración Continua | El runtime sobre el que se ejecuta todo lo del servidor | Línea Long Term Support, aplicada por la cadena de herramientas desde la Etapa C |
| **pnpm** | `11.23.0` (versionado) | Gestor de paquetes | El único permitido (ADR-004); fijado en exactamente un lugar; elevado desde `11.20.0` por **HOR-124** el 2026-08-26 |
| **Nuxt** | **4.5.2** | Framework de aplicación — enrutamiento, renderizado, motor de servidor | Adoptado, no reescrito (ADR-001); el giro de la Etapa G |
| **Vue** | **3.5.41** | Renderiza la interfaz de usuario | El modelo de componentes en el que está escrito todo el frontend |
| **Vue Router** | **5.2.0** | Mapea URLs a páginas | Requerido por la versión mayor del framework |
| **Vite** | **8.2.1** | Construye y sirve el código de navegador | Llegó con la versión mayor del framework |
| **Rollup** | **4.62.2** | El empaquetador sobre el que se construye Vite | Transitivo de Vite |
| **Nitro** | **2.13.4** | El motor de servidor; **donde vive toda la lógica de negocio del servidor** | Producido por el framework; mantiene la lógica de servidor fuera del código de navegador |
| **h3** | **1.15.11** | Manejo de peticiones HTTP dentro de Nitro | Transitivo de Nitro |
| **Unhead** | **3.3.1** | Títulos de página y metadatos | **Solo transitivo, deliberadamente nunca declarado** |
| **Tailwind CSS** | **4.3.3** | Estilos | Los valores nativos son el diseño oficial (ADR-009) |
| **@tailwindcss/vite** | **4.3.3** | Integración de build oficial de Tailwind | Reemplazó a un módulo que no podía resolver la nueva versión mayor |
| **Prisma** | **7.9.1** | ORM — esquema, migraciones, cliente generado | Preservación del esquema (ADR-003); arquitectura de adaptador de driver (ADR-015) |
| **@prisma/client** | **7.9.1** | El cliente de base de datos generado | Emitido de forma determinista a un directorio ignorado |
| **@prisma/adapter-mariadb** | **7.9.1** | Conecta Prisma con el driver de base de datos | Requerido por la arquitectura de la versión 7 |
| **mariadb** (driver) | **3.4.5**, fijado de forma exacta | La conexión real a la base de datos | Fijado deliberadamente bajo ADR-015 |
| **Servidor MariaDB** | **12.3.2** (imagen `mariadb:12.3`) | La base de datos | LTS hasta el 2029-06-12 (ADR-016) |
| **Stripe** (servidor) | **22.5.0** | Procesamiento de pagos | Versión de API fijada; **el servidor es dueño del importe** (ADR-010) |
| **@stripe/stripe-js** | **9.14.0** | Formulario de pago en el navegador | Recolecta datos de tarjeta sin que lleguen a este servidor |
| **bcrypt** | **6.0.0** | Hasheo de contraseñas | Produce el hash de 60 caracteres que motivó ADR-011 |
| **jsonwebtoken** | **9.0.3** | Firma y verifica tokens de acceso | ADR-013; **no existe ningún secreto de reserva** |
| **jwt-decode** | **4.0.0** | Lee claims de tokens en el navegador | Solo lectura, nunca verificación |
| **uuid** | **14.0.2** | Identificadores para archivos subidos | Los identificadores de autenticación usan la criptografía propia de la plataforma en su lugar |
| **nodemailer** | **9.0.5** | Correo saliente | |
| **Vitest** | **4.1.11** | Ejecutor de pruebas | Un comando, dos proyectos aislados |
| **@nuxt/test-utils** | **4.1.0** | Integración de pruebas con el framework | Impulsa las 4 pruebas de framework |
| **@vue/test-utils** | **2.4.11** | Montaje de componentes en pruebas | |
| **happy-dom** | **20.11.6** | Simulación de entorno de navegador | La alternativa más pesada **deliberadamente no está instalada** |
| **@headlessui/vue** | **1.7.23** | Componentes interactivos sin estilos | Sobrevivió a la eliminación de PrimeVue porque realmente se usa |
| **@heroicons/vue** | **2.2.0** | Iconos | Su versión mayor renombró puntos de entrada y alcanzó 15 archivos de componentes |
| **vue3-carousel** | **0.4.0** | Carrusel de imágenes | **Retenido deliberadamente.** Ver HOR-123 |
| **vue3-popper** | **1.5.0** | Tooltips y popovers | |
| **multiparty** | **4.3.0** | Análisis de subida de archivos | |
| **file-saver** | **2.0.5** | Dispara descargas en el navegador | Parte de la ruta de exportación en vivo |
| **html-docx-js-typescript** | **0.1.5** | Exportación DOCX | La ruta de exportación en vivo, junto con la función de impresión del navegador |
| **prettier** | **3.9.6** | Formateo | Actualizado **sin reformatear todo el repositorio** |
| **Python** | línea **3.14** | Runtime del extractor | Módulo separado, aislado del árbol de Node |
| **python-docx** | **1.2.0** | Lee catálogos de Word | Fijado a la versión verificada localmente |

### Superficie de la aplicación, contada

| Elemento | Cantidad |
|---|---|
| Archivos de endpoint de API de servidor (excluyendo pruebas) | **44** |
| Archivos de middleware de servidor | **2** |
| Módulos de utilidad de servidor | **22**, cada uno con una prueba al lado |
| Componentes Vue | **44** |
| Páginas Vue | **21** |
| Archivos de prueba | **36** (4 de ellos pruebas de framework) |
| Pruebas | **438**, todas en verde |
| Modelos de Prisma | **40** |
| Migraciones aplicadas | **6** |

---

## 26. Deuda técnica actual y trabajo diferido

Todo lo de abajo es **conocido, registrado y rastreado**. Nada de esto es una sorpresa, y nada de
esto está oculto.

### 26.1 DEUDA TÉCNICA

| Elemento | Rastreado como | Detalle |
|---|---|---|
| **Las notas de release listan cada corrección más de una vez** | **HOR-97** (Backlog) | La plataforma pone el título de un Pull Request en el cuerpo del merge commit, y la herramienta de release lo analiza como si fuera un commit real. Sistemático desde 1.1.0; dos entradas aparecen **cuatro veces** en 1.3.0. **La corrección no es cambiar el método de merge**, y las entradas históricas no deben reescribirse |
| **Un endpoint de escritura lee su entrada de la cadena de consulta de la URL** | **HOR-100** (Backlog) | `server/api/vendor.post.ts` crea una fila a partir de parámetros de consulta, los convierte con una aserción de tipo que no es cierta, y **no ejecuta ninguna validación**. Una escritura guiada por la URL queda registrada por servidores, proxies e historial del navegador. La clasificación pública de la ruta es deliberada y no está en discusión; la ausencia de validación en una escritura pública sí lo está |
| **Dos endpoints lanzan error donde sus hermanos devuelven vacío** | **HOR-110** (Backlog) | `/api/mareline` y `/api/family-tree-of-horse-by-id` llevan cada uno una **copia privada** del mismo helper de búsqueda de ancestros que lanza error ante un ancestro faltante, devolviendo **500** donde los otros endpoints de pedigrí devuelven correctamente un resultado vacío. Una **tercera copia** en el endpoint de ensamblado de informes debe auditarse en el mismo elemento de trabajo |
| **Una página se rompe durante el renderizado en servidor ante un caballo inexistente** | **HOR-109** (Backlog) | La capa de API es correcta — ambos endpoints devuelven `200` con cuerpo vacío. La **página** se rompe, produciendo un **500**. Más alcanzable desde que los identificadores pasaron a ser numéricos planos y editables a mano |
| **Un llamador hace POST a un endpoint que no existe** | **HOR-102** (Backlog) | `pages/callback.vue` hace POST a una ruta sin manejador. Peor que un 404: como la ruta no está clasificada, el middleware de control de acceso la rechaza antes del enrutamiento. El registro dice con claridad que **el resultado correcto probable es la eliminación, no la implementación** — no construir un endpoint de autenticación para satisfacer a un llamador que nadie pidió |
| **El texto del error no coincide con el significado del error** | **HOR-101** (Backlog) | La rama de reserva del helper compartido devuelve correctamente **500** mientras le dice al llamador "Bad request"; la rama deliberada lleva un mensaje de error interno de servidor sobre lo que suele ser un 400. Ambas cadenas son anteriores al trabajo de estados veraces y se **dejaron sin cambiar a propósito**. La redacción se decidirá pensando en cómo la lee Marcus |
| **Iconos de Compartir y Guardar intercambiados** | **HOR-65** (Backlog) | Encontrado durante la actualización de la biblioteca de iconos y deliberadamente **no** corregido dentro de ella, para que el diff de la actualización siguiera siendo revisable como una actualización |
| **Topología de cliente de base de datos por petición** | Registrado en **ADR-015** | Alrededor de 44 módulos de servidor construyen cada uno su propio cliente; unos 20 se desconectan por petición. **Preservado** explícitamente, no oculto — cambiar la topología de conexión dentro de una actualización mayor haría inatribuibles las regresiones |
| **Precio mostrado en dos componentes** | Registrado bajo **HOR-72** | Duplicación de visualización anterior a la etapa de pagos. La tercera copia — la que **calculaba el cobro** — se eliminó |
| **Sin clave de idempotencia en la llamada de pago** | Registrado bajo **HOR-72** | Deliberadamente fuera del alcance de esa etapa |
| **Deriva documental: conteo de modelos** | *Actualmente sin rastrear* | El esquema declara **40** modelos. `docs/architecture/existing-assets.md` §6 y `docs/data/hbold-baseline.md` §6 siguen diciendo **41**. La diferencia es la tabla de tokens de acceso eliminada bajo ADR-013 |
| **Deriva documental: conteo de endpoints y versión del framework** | *Actualmente sin rastrear* | `existing-assets.md` §4 dice **45** archivos de endpoint; el conteo actual es **44**. §3 todavía describe la base como **Nuxt 3**; el proyecto corre **Nuxt 4.5.2** |

### 26.2 TRABAJO DE PRODUCTO

| Elemento | Rastreado como | Detalle |
|---|---|---|
| **Todo el MVP de automatización** | HOR-6, HOR-10, HOR-15, HOR-19, HOR-23 y todos sus hijos | **Todos en Backlog.** FR-001 a FR-012 sin implementar. Extracción de Word, resolución de identidad, biblioteca de write-ups canónicos, procedencia, ensamblado de informes, PDF profesional, importación por lote desde Excel y la cola de revisión |
| **La contradicción de las suscripciones** | **HOR-73** (Backlog, sin padre) | La interfaz vende **Monthly y Annually**; la implementación crea un **cobro único**. Sin registro de cliente, sin suscripción, sin sesión de checkout, sin webhook, sin persistencia de quién pagó qué. Una **decisión de producto**, no una corrección técnica |
| **Deriva de columnas de marketplace** | **HOR-37** (Backlog) | Seis columnas — `status`, `currency`, `age`, `ad_title`, `created_at`, `seller_id` — forman un conjunto coherente de funcionalidad de marketplace que nunca llegó a este conjunto de datos. `status` se resolvió desde entonces con ADR-014; el resto sigue pendiente |
| **Vacíos de comportamiento de `storehorse.status`** | Registrado en **ADR-014** | Los dos valores de estado son particiones mutuamente excluyentes; el endpoint de edición de caballo omite `status` de su guarda de actualización; los endpoints de pedigrí y descendencia nunca filtran por `status` |

### 26.3 RIESGO ACEPTADO

| Elemento | Detalle |
|---|---|
| **Aviso de `deepmerge-ts` 7.1.5** | Se alcanza solo a través de `@prisma/config`, que lo declara en una versión **exacta**, así que ningún refresco del archivo de bloqueo puede moverlo. **Solo cadena de herramientas** — ausente de la salida de cliente y de servidor. El único grafo de objetos que fusiona es el propio archivo de configuración versionado del repositorio. **Bloqueado aguas arriba. Aceptado en lugar de silenciado**, para que siga visible y se vuelva a revisar cuando el paquete aguas arriba se mueva |
| **El contrato del tipo `Bytes`** | La versión mayor actual de Prisma devuelve un arreglo de bytes donde la anterior devolvía un buffer. Una utilidad de límite restaura la forma anterior para el único endpoint afectado, y una prueba fija el contrato. Todo consumidor **nuevo** de un campo `Bytes` debe manejar la forma de arreglo de bytes directamente |
| **Entrega de CSS en el primer pintado** | Desde la versión mayor del framework, la hoja de estilos se **enlaza en lugar de incrustarse**, lo que la convierte en una petición que bloquea el renderizado en el primer pintado. Benigno, medido, y registrado para que no se redescubra como un misterio. Ajustarlo quedó fuera de alcance |
| **Los datos de pedigrí están desactualizados** | La base de datos de referencia contiene datos hasta aproximadamente **2024**. Si existe una copia más nueva es **DESCONOCIDO** y se rastrea como **HOR-32**, que está **BLOQUEADO a la espera de Marcus** |
| **No existe verificación visual a nivel de píxel** | La verificación de Tailwind fue estructural: valores de tokens, atributos de clase renderizados y hojas de estilos construidas comparadas. **No se compararon capturas de pantalla.** Este informe no afirma un renderizado idéntico a nivel de píxel |
| **El paso final del pago no está cubierto de extremo a extremo** | No se tipeó ninguna tarjeta en el formulario de pago dentro de un navegador real, así que el paso final de confirmación entre navegador y proveedor no tiene una ejecución de extremo a extremo que lo respalde |

### 26.4 LIMPIEZA DIFERIDA

| Elemento | Rastreado como | Detalle |
|---|---|---|
| **`vue3-carousel` 0.4 → 0.17** | **HOR-123** (Backlog) | Separado del barrido de cierre de la Etapa J con una recomendación de separarlo. **Ningún aviso nombra al paquete**, así que no está forzado por seguridad. Las diapositivas clonadas cambian la semántica del índice para una tira de miniaturas ligada al índice de diapositiva; la receta oficial migró a un mecanismo distinto; la altura de diapositiva pasó a ser obligatoria; las métricas de navegación cambiaron; **no hay cobertura visual automatizada** y el consumidor está de cara al cliente. **La migración no es imposible y no debe describirse como tal.** Un segundo componente de carrusel sin consumidor observado **no debe clasificarse para eliminación** sobre esa base |
| **El entorno de reversión de MariaDB 10.11** | Registrado en **ADR-016** | Ver la sección 27 |
| **Las 19 sentencias SQL residuales** | Registrado en la línea base de la base de datos | 17 claves foráneas que tocan tablas MyISAM (2 fallarían de plano) y 2 claves primarias compuestas bloqueadas por datos duplicados — 52 pares duplicados en una tabla, 16.696 en otra. **Cualquier cosa fuera de esta lista es un defecto, no una deriva aceptada** |
| **La migración archivada de octubre de 2024** | Registrado en **ADR-012** | Conservada **sin modificar** en lugar de borrada, para que su existencia siga siendo trazable |
| **Candidatos a eliminación de esquema** | Registrado en el inventario de activos | Dos tablas aparentemente en desuso y algunos valores por defecto desprolijos de columnas son una **lista de candidatos solo para una futura propuesta de esquema** — explícitamente **no** una autorización de borrado |
| **Hechos de línea base no revalidados** | Registrado en la línea base de la base de datos | La completitud de la tabla de deriva de capacidad **no está establecida**; las cifras de historial de competencia y de observaciones **no están revalidadas**; y la procedencia en control de versiones de los once modelos solo-en-código **no tiene discriminación disponible**. Los tres son **DESCONOCIDO / REQUIERE REVALIDACIÓN** |
---

## 27. El entorno de reversión de MariaDB 10.11

### Qué es

Un **contenedor Docker detenido** llamado `hb-mysql-1011-rollback`, que contiene la base de
datos exactamente como estaba antes de la migración a MariaDB 12.3 LTS.

| | |
|---|---|
| Contenedor | `hb-mysql-1011-rollback` |
| Imagen | `mariadb:10.11` |
| Estado | **Detenido, conservado** — no borrado |
| Contraparte en vivo | `hb-mysql`, imagen `mariadb:12.3`, versión de servidor en ejecución `12.3.2` |

### Por qué existe

La migración se realizó **en paralelo**, no en el lugar. El servidor nuevo se levantó junto al
viejo, los datos se cargaron en él, y ambos se compararon antes de conmutar nada. El entorno
viejo se detuvo entonces, en lugar de eliminarse.

Esa es la diferencia entre una migración que se puede deshacer y una que no. Una actualización
en el lugar reescribe los archivos de datos; si sale mal, no queda nada a lo que volver salvo un
backup y una ventana de restauración. Una migración en paralelo mantiene intacto el sistema
anterior, así que la reversión es *arrancar un contenedor*, no *restaurar un backup*.

**No se asumió que la reversión funcionaba. Se probó en vivo.**

### Qué demostró la comparación

Se tomaron checksums de **las 41 tablas** en ambos servidores y coincidieron de forma
**idéntica**. Esa es la evidencia más fuerte disponible de que la migración movió los datos y
nada más.

### La regla

> **No borrar este contenedor.**

Su conservación está registrada en ADR-016, y el registro lleva un **disparador de revisión**
explícito — el contenedor no se conserva para siempre por defecto, y tampoco se elimina a la
ligera. Alguien decide, deliberadamente, cuándo se cierra la ventana de reversión.

### Por qué le debería importar a un lector de negocio

La base de datos de pedigríes es el activo. La aplicación puede reconstruirse; **59.903 registros
de caballos con relaciones parentales verificadas no**. Mantener la base de datos anterior intacta
y demostrada idéntica es el seguro más barato disponible sobre la única cosa de este proyecto que
es genuinamente irreemplazable.

---

## 28. Impacto de negocio

Esta sección está escrita para Marcus. Sin jerga.

### Qué se compró realmente con este trabajo

**1. El sistema dejó de mentir sobre los fallos.**
Antes de este trabajo, una petición rota podía volver con aspecto de éxito. La pantalla mostraba
una página vacía, o un resultado en blanco, y no había forma de distinguir "no hay caballos que
coincidan con eso" de "el sistema se acaba de romper". Ahora un fallo parece un fallo. Suena
menor. Es la diferencia entre un problema que se puede reportar y un problema que nadie nota
durante seis meses.

**2. Se encontró y corrigió una caída total de la funcionalidad central.**
En un momento **cada búsqueda de caballo, cada consulta de pedigrí y cada informe devolvía
absolutamente nada** — no un error, solo vacío — porque faltaba un dato requerido en los 59.903
registros. Esto era invisible desde afuera. Se detectó, se encontró la causa, se reparó el dato, y
ahora existe una prueba que atraparía que vuelva a ocurrir.

**3. A nadie se le puede cobrar el importe equivocado.**
Antes, el navegador le decía al servidor cuánto cobrar. Cualquiera que supiera editar una página
web podría haber pagado un precio distinto. Ahora el **servidor** decide el precio a partir del
catálogo, y esto se demostró enviando una petición deliberadamente deshonesta y confirmando que
igual se cobró el importe correcto.

**4. Las contraseñas y los inicios de sesión se reconstruyeron como corresponde.**
Las credenciales de acceso se guardaban en un formato legible, y el sistema tenía una reserva
débil que podía adivinarse. Ahora los inicios de sesión expiran rápido, nunca se guardan en el
servidor, y la parte de larga duración de una sesión se guarda solo como una huella irreversible
— si alguien robara la base de datos, aun así no podría iniciar sesión como usuario.

**5. Nadie puede llegar a datos a los que no debería.**
Cada uno de los **44 lugares desde los que se puede llamar al sistema** se revisó y clasificó:
quién puede llamarlo, y desde dónde. Uno nuevo que nadie clasifique se **rechaza por defecto**.
La respuesta segura es la automática.

**6. Todo el sistema está sobre software soportado y mantenido.**
Cada componente mayor — el runtime, el framework, los estilos, la capa de base de datos, la base
de datos misma, la biblioteca de pagos — está en una versión actual y soportada. La base de datos
está en una versión soportada hasta **junio de 2029**. Esto importa comercialmente: el software
sin soporte deja de recibir correcciones de seguridad, y en ese punto la elección es una
actualización de emergencia o un riesgo aceptado.

**7. Los problemas de seguridad conocidos pasaron de ocho a uno.**
El que queda está en una herramienta de build, no llega a nadie que use el sitio, y no puede
corregirse acá — tiene que corregirlo quien lo publica. Está registrado y se revisa periódicamente
en lugar de esconderse.

**8. Ahora hay una red de seguridad.**
**438 pruebas automatizadas** corren en cada cambio, y ningún cambio llega a la versión estable
sin que pasen. El registro de caballo específico que expuso la caída de arriba — **ERNE ALERT** —
es ahora una prueba permanente.

**9. La base de datos vieja sigue ahí, intacta.**
La base de datos se movió a una versión nueva en paralelo, se demostró que ambas copias eran
idénticas, y la vieja se **conservó, no se borró**. Si algo sale mal, volver es cuestión de
minutos.

### Qué NO se compró — dicho con claridad

**El producto de automatización de catálogos todavía no existe.**

Todo lo de arriba es la **plataforma**: la fundación sobre la que se construirá el producto. El
trabajo que usted realmente pidió — leer los catálogos de Word, hacer coincidir caballos con la
base de datos, construir la biblioteca reutilizable de write-ups de yeguas, ensamblar pedigríes y
producir el PDF terminado a partir de una planilla de subasta — **no se construyó.** Ni
parcialmente. Ni casi. Está planificado en detalle y está esperando.

Eso no es un fracaso. La fundación estaba genuinamente rota — se encontró una funcionalidad
central completamente rota, junto con precios equivocados, inicios de sesión inseguros y software
sin soporte — y construir un producto sobre eso habría significado construirlo dos veces. Pero sí
significa que la respuesta honesta a "¿puede producir un catálogo hoy?" es **no**.

### Una decisión que espera por usted

Los datos de pedigrí del sistema actualmente llegan hasta aproximadamente **2024**. Si existe una
copia más nueva es genuinamente desconocido acá. **Esa pregunta está registrada y bloqueada,
esperando por usted.** Cada parte del producto que resuelve la identidad de un caballo depende de
la respuesta.

### Una contradicción que necesita su decisión

La página de suscripción ofrece **Monthly** y **Annually**. El sistema por debajo cobra un **pago
único** — no hay suscripción, no hay renovación, y no hay registro de quién pagó qué. Eso no es un
error para corregir en silencio; es una decisión de producto sobre qué quiere vender realmente.

---

## 29. Resumen Antes / Después

| Área | Antes | Ahora | Valor de negocio |
|---|---|---|---|
| **Fundación** | Aplicación funcionando, estancada — la pieza faltante era la transformación de datos, no la interfaz | Adoptada y modernizada, nunca reescrita | Años de comportamiento funcionando preservados en lugar de descartados |
| **Runtime y gestor de paquetes** | Sin fijar, a la deriva, dos gestores posibles | Node 24 LTS declarado y **aplicado**; pnpm 11 fijado en exactamente un lugar | Una máquina incompatible falla la instalación en lugar de producir un build sutilmente distinto |
| **Framework** | Nuxt 3 | **Nuxt 4.5.2**, cruzado con un **diff de tres líneas de código fuente** | Sobre una línea soportada, con la migración revisable |
| **Cadena de build** | Empaquetador más viejo | **Vite 8**, llegando con el framework | Builds más rápidos, cadena de herramientas soportada |
| **Estilos** | Tailwind 3 mediante un módulo que no podía resolver la nueva versión mayor | **Tailwind 4.3.3** mediante su propia integración oficial; valores nativos adoptados, capa de compatibilidad eliminada | Una dependencia abandonada menos; el diseño ahora es oficial, no accidental |
| **Acceso a datos** | Prisma más viejo, sin adaptador | **Prisma 7.9.1** con un adaptador explícito del driver de MariaDB; esquema **idéntico byte a byte** a través de la actualización del cliente | Capa de datos soportada con el esquema demostrablemente intacto |
| **Base de datos** | MariaDB 10.11 | **MariaDB 12.3 LTS**, migrada en paralelo, checksums idénticos en las 41 tablas, reversión probada en vivo y conservada | Soportada hasta **junio de 2029**; el activo irreemplazable está demostrablemente intacto |
| **Reconstruibilidad de la base de datos** | Sin historial de migraciones — no podía reconstruirse de forma reproducible | **Línea base más 6 migraciones aplicadas**; una diferencia residual documentada de exactamente **19 sentencias** | La base de datos puede reconstruirse desde el código, y la deriva es una lista finita y nombrada |
| **Autenticación** | Credenciales guardadas en texto plano; tokens firmados con una reserva adivinable | **Tokens de acceso de 1 hora nunca almacenados**; sesiones de refresco rotativas guardadas solo como **resumen SHA-256**; no existe secreto de reserva | Una base de datos robada ya no entrega inicios de sesión funcionales |
| **Control de acceso a la API** | Una clave compartida incrustada en el paquete del navegador — 36 apariciones en 20 archivos; 30 manejadores descartaban la verificación | **Las 44 rutas clasificadas**; las rutas sin clasificar **rechazadas por defecto** | El resultado seguro es el automático, no el que alguien recuerde |
| **Veracidad HTTP** | Fallos devueltos como éxito; un `401` en el cuerpo de un `200` | **Códigos de estado reales**: 400, 401, 403, 404, 409, 422, 500 | Los fallos son reportables, monitoreables y depurables |
| **Pagos** | El navegador le decía al servidor cuánto cobrar | **El servidor es dueño del importe**, versión del proveedor fijada; demostrado con un payload deshonesto de cliente | A nadie se le puede cobrar el precio equivocado |
| **Funcionalidad central del producto** | **Caída total** — las 59.903 filas sin un valor requerido; cada búsqueda, pedigrí e informe vacío en silencio | Datos reparados, columna `NOT NULL DEFAULT 1`, sonda de compatibilidad retirada, **ERNE ALERT fijado como prueba de regresión** | La única funcionalidad de la que depende el negocio está funcionando y protegida |
| **Pruebas** | Mínimas | **438 pruebas en 36 archivos**, dos proyectos aislados, requeridas en cada Pull Request | Los cambios son demostrablemente seguros antes de llegar a la versión estable |
| **Proceso de release** | Improvisado | **Tres ramas permanentes, solo merge commits, barrera real de CI, 19 releases etiquetados**, Pull Requests de release mergeados manualmente | Cada línea trazable a un elemento de trabajo; nada llega a estable sin revisión |
| **Vulnerabilidades conocidas** | **8** | **1**, bloqueada aguas arriba, solo en la cadena de herramientas, registrada como riesgo aceptado | Exposición real cerrada; el resto visible en lugar de silenciado |

---

## 30. No deshacer accidentalmente estas decisiones

Cada una de estas fue cara de establecer y es barata de destruir por accidente. Esta lista existe
para que nadie tenga que redescubrir por qué.

**1. Nunca reescribir la aplicación desde cero.** El proyecto se estancó por la transformación de
datos faltante, no por una interfaz inadecuada. Una reescritura destruye software funcionando sin
tocar el problema real. *(ADR-001)*

**2. Nunca ejecutar introspección de esquema contra el esquema versionado de Prisma.** Reescribe
el archivo en el lugar y descarta en silencio los modelos que existen solo en código. Usar la
forma de impresión o un esquema descartable. *(ADR-003)*

**3. Nunca borrar un modelo o campo de Prisma solo porque está ausente de la base de datos de
referencia.** La ausencia es **deriva**, no obsolescencia. Once modelos existen solo en código, y
son capacidad funcional. Toda eliminación necesita evidencia, un elemento de trabajo, pruebas, y
un plan de migración y reversión aprobado. *(ADR-003)*

**4. Nunca renombrar una tabla o columna para que quede más prolija.** El dump de referencia solo
se restaura contra los nombres existentes. Los nombres extraños son un **contrato de
compatibilidad**. *(ADR-002)*

**5. Nunca hacer squash merge ni rebase merge de un Pull Request de promoción.** Reescribe los
commits que lee la herramienta de release y hace que cada promoción posterior reporte diferencias
que no son reales. Esto también significa: **no "corregir" las entradas duplicadas del changelog
cambiando el método de merge.** *(Sección 21, HOR-97)*

**6. Nunca hacer avance rápido, reset, ni alinear por la fuerza las ramas permanentes.** Hashes de
commit distintos entre `DEV`, `QA` y `main` son **normales**. Verificar la contención por
ascendencia. Nunca crear un commit vacío para que los hashes coincidan.

**7. Nunca mergear un Pull Request de release generado sin la autorización explícita de Sammy.**

**8. Nunca agregar una segunda declaración de la versión del gestor de paquetes.** Existe en
exactamente un lugar, y el paso de configuración de Integración Continua **no toma entrada de
versión** para que no pueda desviarse. *(ADR-004)*

**9. Nunca volver a declarar Unhead como dependencia directa.** El número correcto de dependencias
directas sobre él es **cero** — el único import que existía resolvía solo por accidente del izado
de paquetes y se borró, no se declaró.

**10. Nunca reintroducir un importe de pago provisto por el cliente.** El servidor lee el precio
del catálogo. *(ADR-010)*

**11. Nunca reintroducir un secreto de firma de reserva, y nunca guardar una credencial de refresco
en forma legible.** Solo se persiste su resumen SHA-256. *(ADR-013)*

**12. Nunca dejar una ruta de API nueva sin clasificar y asumir que está bien.** Sin clasificar
significa **rechazada**. Ese valor por defecto es la protección. *(ADR-007)*

**13. Nunca combinar una actualización mayor de framework con una reorganización de directorios.**
Un diff de cientos de renombres esconde el puñado de líneas que realmente cambiaron el framework, y
las regresiones se vuelven inatribuibles. *(ADR-008)*

**14. Nunca tratar "sin verificaciones reportadas" como una verificación aprobada**, y nunca tratar
el cierre automático de un elemento de trabajo por una integración de Git como evidencia de
aceptación.

**15. Nunca borrar a la ligera el contenedor de reversión de MariaDB 10.11.** Su conservación tiene
un disparador de revisión registrado. *(ADR-016, sección 27)*

**16. Nunca commitear documentos privados de clientes, archivos de entorno, dumps de base de datos
ni catálogos fuente reales.** Los documentos reales viven en un directorio privado ignorado y nunca
se citan, nunca se colocan en directorios públicos, y nunca se usan como fixtures de prueba.

**17. Nunca importar nada del directorio heredado en tiempo de ejecución.** Es referencia de solo
lectura.

**18. Nunca silenciar el aviso restante.** Se acepta **de forma visible** para que se vuelva a
revisar cuando el paquete aguas arriba se mueva.

**19. Nunca implementar el endpoint que una página huérfana llama actualmente.** El registro dice
que el resultado correcto probable es la **eliminación**, no la implementación. No construir un
endpoint de autenticación para satisfacer a un llamador que nadie pidió. *(HOR-102)*

**20. Nunca clasificar el segundo componente de carrusel como eliminable porque nada parece
usarlo.** Esa conclusión específica está señalada como insegura. *(HOR-123)*

---

## 31. Glosario

Términos usados en este informe, en lenguaje llano.

| Término | Qué significa |
|---|---|
| **ADR (Architecture Decision Record)** | Un documento corto que registra una decisión técnica importante y por qué se tomó. Vinculante hasta que otro ADR lo reemplace — nunca editando el original |
| **Aviso de seguridad (advisory)** | Una notificación publicada de que una versión específica de un paquete de software tiene una debilidad de seguridad conocida |
| **API (Application Programming Interface)** | El conjunto de direcciones que el navegador puede llamar para pedirle datos al servidor o hacer que haga algo |
| **Retropropagación** | Copiar un cambio que aterrizó en la rama estable de vuelta hacia las ramas de validación y desarrollo, para que no se queden atrás |
| **Relleno (backfill)** | Completar un valor para filas que ya existen, después de agregar una columna nueva |
| **Paquete (bundle)** | El archivo empaquetado único de código de navegador que produce el build. Todo lo que se coloca en él es legible por cualquiera que visite el sitio |
| **bcrypt** | Un método de hasheo de contraseñas deliberadamente lento. La lentitud es el punto — encarece adivinar contraseñas |
| **Checksum** | Una huella corta del contenido de una tabla. Dos tablas con el mismo checksum contienen los mismos datos |
| **Integración Continua (CI)** | Automatización que construye el proyecto y corre sus pruebas en cada cambio propuesto, antes de que un humano lo mergee |
| **Conventional commits** | Un formato de mensaje de commit que la herramienta de release lee para decidir el siguiente número de versión y escribir el changelog |
| **Dam / Sire** | La madre y el padre de un caballo |
| **Contenedor Docker** | Un entorno empaquetado y aislado que ejecuta una pieza de software — acá, la base de datos — de la misma forma en cualquier máquina |
| **Adaptador de driver** | El componente que conecta la capa de datos con el driver real de base de datos. Requerido por la versión mayor actual de Prisma |
| **Archivo de bloqueo congelado** | Un modo de instalación que se niega a cambiar las versiones de dependencias registradas. El build obtiene exactamente lo que se revisó, o falla |
| **Hash / resumen** | Una huella unidireccional de unos datos. Se puede producir a partir de los datos, pero no se pueden recuperar los datos a partir de ella |
| **Código de estado HTTP** | El número que devuelve un servidor describiendo el resultado: 200 éxito, 400 petición incorrecta, 401 no autenticado, 403 no permitido, 404 no encontrado, 409 conflicto, 422 no procesable, 500 error del servidor |
| **Idempotente** | Seguro de ejecutar más de una vez. Ejecutarlo dos veces produce el mismo resultado que ejecutarlo una vez |
| **JWT (JSON Web Token)** | Un fragmento de texto firmado que prueba quién es un usuario. El servidor puede verificarlo sin guardar nada |
| **LTS (Long Term Support)** | Una línea de versión de software que recibe correcciones durante un período publicado e inusualmente largo |
| **Archivo de bloqueo (lockfile)** | El archivo que registra la versión exacta de cada dependencia, incluidas las que traen consigo tus dependencias |
| **Línea materna** | La cadena de madres: la madre de un caballo, la madre de esa madre, y así sucesivamente. Se recorre a través de la relación `dam_id` |
| **Migración** | Un script versionado y revisable que cambia la estructura de la base de datos, para que pueda reconstruirse de forma reproducible |
| **MyISAM / InnoDB** | Dos motores de almacenamiento de base de datos. InnoDB es el moderno y soporta relaciones aplicadas entre tablas; MyISAM no |
| **Nitro** | El motor de servidor dentro de Nuxt. Toda la lógica de negocio del lado del servidor vive acá, nunca en código de navegador |
| **ORM (Object-Relational Mapper)** | Una herramienta que permite al código de aplicación trabajar con filas de base de datos como objetos tipados. Acá, Prisma |
| **Pedigrí** | La ascendencia de un caballo — el árbol de madres y padres |
| **pnpm** | El gestor de paquetes usado acá, y el único permitido |
| **Procedencia (provenance)** | El registro de dónde vino una pieza de contenido importado, guardado junto al contenido |
| **Pull Request** | Una propuesta de mergear una rama en otra, revisada y verificada antes de aceptarse |
| **Regresión** | Algo que funcionaba y dejó de funcionar |
| **Renderizado en servidor (SSR)** | Construir el HTML de la página en el servidor antes de enviarla, en lugar de ensamblarla en el navegador |
| **SHA-256** | Un método específico de huella unidireccional. Usado acá para la credencial de refresco almacenada |
| **Storehorse** | La tabla principal de la base de datos que contiene los registros de caballos, incluidas las relaciones verificadas `dam_id` y `sire_id` |
| **Tailwind** | El sistema de estilos. El diseño se expresa como pequeñas clases utilitarias en el marcado |
| **TDD (Test-Driven Development)** | Escribir primero la prueba que falla, después el mínimo código que la hace pasar, después mejorar la estructura |
| **Dependencia transitiva** | Un paquete que no pediste, instalado porque algo que sí pediste lo necesita |
| **Límite de confianza** | La línea donde la entrada no confiable se encuentra con el código confiable. Todo lo que la cruza debe validarse |
| **Write-up** | El párrafo descriptivo sobre una yegua y su producto, impreso en un catálogo de subasta |
| **`(SEE ABOVE)`** | Una convención de catálogo que significa "el write-up de esta yegua está impreso más arriba en este documento". Una **referencia de reutilización**, nunca contenido nuevo |

---

## 32. Línea de tiempo cronológica

Las fechas aparecen solo donde un release, un contenedor o un registro las establece. Donde no hay
fecha establecida, la entrada se ubica por secuencia y se deja sin fecha — **ninguna fecha de este
informe está inferida.**

### Fase 1 — Fundación *(fechas no establecidas)*

```txt
HOR-2    Aplicación adoptada, no reescrita                (ADR-001)
HOR-27   pnpm estandarizado como único gestor             (ADR-004)
HOR-4    Base de datos de referencia restaurada — 59.903 caballos  (ADR-002)
HOR-3    Arnés de pruebas establecido
HOR-5    Línea base de seguridad
HOR-31   Configuración de servidor corregida
HOR-35   Capa de compatibilidad de storehorse.status      (ADR-006)
HOR-38   Flujo de promoción
HOR-39   Verificaciones reales de Integración Continua
HOR-40   Protección de ramas
HOR-41   Release Please adoptado
HOR-46   Arnés de pruebas endurecido
HOR-47   Estrategia de pruebas escrita
```

### Fase 2 — El programa de modernización

```txt
2026-07-22   Release 1.0.0
             HOR-48   La auditoría de dependencias de 2026 — Etapas A a J definidas
             HOR-42   Etapa A — herramientas de Integración Continua
2026-08-08   HOR-50   Etapa B — Node 24.19.0 y pnpm 11.20.0 adoptados
             HOR-54   Etapa C — 25 pisos de dependencias elevados; rango de runtime aplicado
             HOR-55   Etapa D — módulo obsoleto quitado; API key incrustada descubierta
2026-08-09   Release 1.1.0
             HOR-56   El límite de confianza de la API — 44 rutas clasificadas   (ADR-007)
             HOR-58   Etapa E — versión mayor del cliente Prisma; esquema idéntico byte a byte
             HOR-59 … HOR-64   Etapa F — seis versiones mayores de bibliotecas; dos quitadas de plano
             HOR-67   @nuxt/content quitado antes de la versión mayor del framework
             HOR-68   Etapa G — Nuxt 4 en un diff de tres líneas de código      (ADR-008)
             HOR-69   Etapa H — Tailwind 4 vía integración oficial              (ADR-009)
2026-08-13   Release 1.2.0
             HOR-70   Valores nativos de Tailwind adoptados; 142 líneas eliminadas
2026-08-13   Release 1.2.1
             HOR-72   Etapa I — el servidor es dueño del importe de pago        (ADR-010)
```

### Fase 3 — Autenticación, integridad de datos y veracidad

```txt
2026-08-15   Release 1.3.0
             HOR-76   Tokens de acceso modernos; refresco rotativo solo-resumen  (ADR-013)
             HOR-79   Línea base de migraciones y fundación InnoDB               (ADR-012)
             HOR-74   Reconciliación de capacidad de contraseña                  (ADR-011)
             HOR-77   Registro atómico
             HOR-78   Errores internos ya no devueltos en crudo
             HOR-80   Valores por defecto del esquema
2026-08-15   Release 1.3.1
             HOR-82   Columna de altura ampliada; DDL residual 20 → 19
2026-08-17   HOR-83   Etapa J autorizada — la cola diferida, cargada de ADRs
2026-08-19   Release 1.3.2
             HOR-94   storehorse.status rellenado; sonda retirada                (ADR-014)
                      Una caída total de la cadena central cerrada
2026-08-21   Release 1.3.3
             HOR-95   401 y 403 devueltos desde la autorización
2026-08-22   Release 1.3.4
             HOR-96   Códigos de estado HTTP veraces
2026-08-22   Releases 1.3.5 – 1.3.10
             HOR-98   Transporte de credenciales quitado de URLs y respuestas
             HOR-99   Mensajes de estado de la API renderizados como texto
             HOR-107  Recursión de pedigrí acotada
             HOR-103  Identificadores de caballos validados antes de la capa de datos
             HOR-111  Campo de petición inerte quitado
             HOR-108  Fallos reales del origen reportados
2026-08-22   HOR-89   PrimeVue quitado en lugar de migrado — 228 eliminaciones
2026-08-22   HOR-90   Cifrado de URL quitado; identificadores planos y validados
2026-08-23   Releases 1.3.11 – 1.3.12
             HOR-116  Búsqueda de pedigrí fallida reportada; búsqueda malformada rechazada
             HOR-119  Estado de error no leído quitado; paginación de búsqueda corregida
             HOR-118  Exposición de error del framework en el payload renderizado remediada
```

### Fase 4 — La Etapa J cierra

```txt
2026-08-24   Release 1.3.13
             HOR-91   Arquitectura de adaptador de driver de Prisma 7           (ADR-015)
                      44 archivos de servidor recableados; diff de esquema de dos líneas
             HOR-92   MariaDB 12.3 LTS en paralelo                              (ADR-016)
                      Checksums idénticos en las 41 tablas
                      Reversión probada en vivo y conservada
2026-08-24   Release 1.3.14
             HOR-93   Dependencias transitivas vulnerables refrescadas
                      Avisos 8 → 1
                      EL PROGRAMA DE MODERNIZACIÓN ESTÁ COMPLETO
2026-08-25   HOR-122  v1.3.14 retropropagada main → QA → DEV
2026-08-26   HOR-124  pnpm 11.23.0 formalizada como gestor de paquetes fijado  (ADR-004)
                      La Integración Continua lee la versión fijada de package.json
                      Una línea cambiada; ningún workflow requirió edición
```

### Dónde está el proyecto al escribirse este informe — 2026-08-25

```txt
EPIC 0  Foundation & Setup                Done
EPIC 1  Database Redesign & Migration     Backlog
EPIC 2  Word Extractor                    Backlog
EPIC 3  Report Generation                 Backlog
EPIC 4  Review UI & Modern UX             Backlog
EPIC 5  Hardening & Handover              Backlog
```

**La plataforma está completa. El producto no empezó.**

---

## 33. Trazabilidad

De dónde viene cada afirmación de este informe, para que cualquier declaración pueda verificarse en
lugar de creerse.

### Fuentes consultadas

| Fuente | Qué se tomó de ella |
|---|---|
| `package.json` (versionado) | Versión declarada 1.3.14, gestor de paquetes fijado, rango de runtime, tipo de módulo |
| `pnpm-lock.yaml` | **Cada versión resuelta citada en la sección 25** |
| `prisma/schema.prisma` | Conteo de modelos (40), tipos de campos, los campos `Bytes` |
| `prisma/migrations/` | Las 6 migraciones aplicadas |
| `extractor/requirements.txt` | La versión de la biblioteca de lectura de Word |
| `nuxt.config.ts` | Fecha de compatibilidad, configuración de directorio fuente, plugins de build |
| `.github/workflows/` | Los dos workflows; la verificación `Test / Build`; los pasos de configuración |
| `CHANGELOG.md` | **Los 19 releases y sus fechas** |
| `docs/adr/` | Los dieciséis registros; el reemplazo de ADR-006 por ADR-014 |
| `docs/modernisation/modernisation-plan.md` | **El mapeo de Etapas A–J y cada detalle de etapa** |
| `docs/architecture/existing-assets.md` | El inventario de activos; dos de los hallazgos de deriva |
| `docs/data/hbold-baseline.md` | Las 19 sentencias residuales; los hechos de línea base no revalidados |
| `docs/requirements/automation-mvp.md` | FR-001 … FR-012; BR-001 … BR-006 |
| `docs/testing/testing-strategy.md` | La división en dos proyectos; las barreras de regresión |
| `docs/git-workflow.md` | Reglas de promoción; método de merge; manejo de releases |
| Linear | Cada número, título y estado de elemento de trabajo citado; los estados de los EPICs |
| Docker | Ambos contenedores, sus imágenes y sus estados |
| La base de datos en ejecución | Versión de servidor en vivo `12.3.2-MariaDB-ubu2404` |
| `pnpm test` | **Ejecutado el 2026-08-25: 36 archivos, 438 pruebas, todas en verde** |
| Git | Estado de rama; las puntas de las tres ramas permanentes |

### Qué se verificó en lugar de recordarse

Cada número de versión de la sección 25 se leyó de un archivo de bloqueo, un manifiesto, un archivo
de requisitos o un servidor en vivo el **2026-08-25**. Ninguno se escribió de memoria. El resultado
de pruebas de la sección 17 viene de una ejecución real, no de un registro previo de una ejecución.

El mapeo de Etapas A–J a elementos de trabajo se leyó de los propios encabezados del plan de
modernización en lugar de reconstruirse — un primer intento de la sección 9 atribuyó la etapa de
Tailwind al elemento de trabajo equivocado, y la fuente primaria lo corrigió antes de que llegara a
esta página.

### Qué deliberadamente no afirma este informe

- **No** afirma que ningún requisito funcional del MVP de automatización esté implementado.
- **No** afirma un renderizado idéntico a nivel de píxel después de la migración de estilos. No se
  compararon capturas de pantalla.
- **No** afirma que el flujo de pago esté cubierto de extremo a extremo. El paso final de navegador
  a proveedor no tiene detrás una ejecución con tarjeta real.
- **No** fecha la fase de fundación. Esos elementos de trabajo no tienen release ni contenedor que
  establezca una fecha, y **no se infirió ninguna fecha**.
- **No** resuelve los tres hallazgos de deriva documental de la sección 26.1. Esta tarea era solo de
  documentación y no tenía autoridad para editar esos archivos. **Están reportados, no reparados.**

### No contiene datos privados

Este informe no cita valores de entorno, ni credenciales, ni tokens, ni cadenas de conexión, ni
datos personales, ni contenido de ningún catálogo o documento fuente real de clientes. El único
registro de caballo nombrado a lo largo del texto — **ERNE ALERT, `horse_id` 1003** — es dato de
referencia de la base de datos de pedigríes usado como fixture de regresión, no material privado de
clientes.
