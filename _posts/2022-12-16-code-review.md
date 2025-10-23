---
title: Revisión de código
date: 2022-12-16T16:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2022/12/16/code-review
excerpt: Reflexiones sobre los procesos de revisión de código y su impacto en la calidad del software y del equipo.
categories: code-review good-practices
---
En los últimos años he tenido la oportunidad de trabajar con grandes profesionales del desarrollo de software, y de todos ellos he aprendido muchísimo. Asímismo, en las empresas donde he trabajado he podido comprobar cómo ese conocimiento se transfiere de forma natural de un miembro del equipo a otro, día a día, logrando una verdadera simbiosis.

Esta transferencia tiene lugar de muchas formas, desde charlas formales sobre un tema dado y discusiones acerca de un proyecto o problema puntual, hasta anécdotas contadas durante un café o una cerveza. Además, muchas veeces ocurría de forma indirecta, o inclusivo podríamos decir que _pasiva_, durante los procesos de revisión de código.

## Revisión de código

La revisión de código, para aquellos que no la conozcan, consiste en una actividad en la que otros miembros del equipo ven, estudian, evalúan, critican y proponen mejoras sobre la tarea que tenemos en ese momento entre manos.

Esto se puede hacer de muchas formas, por ejemplo, solicitando directamente a un colega su opinión acerca de una determinada solución; pero la más común es mediante comentarios sobre los cambios en una _pull request_ (o _merge request_, dependiendo de la plataforma).

![Comment in code review](/assets/images/code-review-comment.png)

Así, durante la revisión, otros miembros del equipo tienen la oportunidad de conocer, cuestionar y proponer mejoras a nuestro código antes de que éste sea integrado (se entiende con estas palabras que nuestros cambios está en una rama y aún no se ha hecho un _merge_ a la rama de desarrollo).

Algunos equipos llevan este proceso un paso más allá y requieren de una aprobación explícita antes de poder incluir los cambios hechos en la rama destino (_develop_, _master_...). De esta forma se garantiza que el código ha sido revisado antes de completarse la tarea. Se puede definir que se requiera un mínimo de aprobaciones (por ejemplo 2), y además se puede definir quién puede dar esa aprobación. Así por ejemplo, en ramas normales la aprobación podría ser dada por cualquier miembro del equipo, mientras que la integración con _master_ u otras ramas de producción requerirían la aprobación de los responsables del producto.

Pero, ¿en qué consiste exactamente una revisión de código? Durante una retrospectiva, hace unos meses atrás, salió este tema y, después de hablarlo por un rato, llegué a la conclusión que podríamos dividir las revisiones de código en 3 niveles: rápida (o general), detallada, y en profundidad; o sencillamente, como las solíamos llamar: de nivel 1, 2 y 3. Esta clasificación nos ayudó mucho a centrar los esfuerzos de revisión, pudiendo exprimir al máximo esta gran herramienta.

### Nivel 1: revisión rápida o general

En este nivel el revisor mira el código como un conjunto de líneas casi independientes entre sí: no revisa la tarea como tal sino aspectos genéricos, entre ellos:

- Conformidad con la guía de estilo
- Buenas prácticas de programación para el lenguaje utilizado
- Detección de funciones sin ningún _test_ asociado
- Falta de documentación
- Errores en la documentación, en traducciones, fallos en los recursos

De cara a la guía de estilo de código, si bien no es algo obligatorio, y en muchas empresas no la hay, también es cierto que permite centrar la atención en lo importante en lugar de perderlo pensando en cómo indentar una función. Además, si todo el código tiene el mismo estilo, el paso de varios programadores por el mismo no se notará y reducirá el número de cambios entre _commits_ a lo escencial.

Por otro lado, detectar que se han introducido nuevas funciones sin sus correspondientes _tests_ nos ayuda a aumentar la cobertura del mismo de forma natural y por anticipado. Y si lo que se ve es que se ha modificado el comportamiento del código sin tener que actualizar las pruebas existentes, nos da una clara señal de que dichas pruebas no eran tan buenas como creíamos y que deberíamos dedicarles un tiempo a revisarlas.

Pero lo más importante de estas revisiones es que pueden ser hechas por cualquier miembro del equipo ya que no requieren de un especial entendimiento ni de la tarea ni de la solución. Es particularmente útil para los _juniors_ (ayudándoles a ver código más maduro), como a nuevas incorporaciones (adquiriendo familiaridad con el proyecto y las tareas); y dado que pueden hacerse sólo sobre una parte del código, es posible realizarla en cualquier momento libre, o incluso para despejar la mente de otra tarea.

Además de la importante ganancia que tiene para un desarrollador que cualquier miembro del equipo (o de otro equipo incluso) pueda mejorar su código, está el hecho de que los revisores se _empapan_ del trabajo de sus compañeros, tanto de la tarea que se etá llevando a cabo, como del aprendizaje que puedan sacar de ver código ajeno.

Hay que tener en cuenta que este nivel de revisión es suceptible de ser automatizado en gran medida mediante analizadores estáticos, formateadores de código (`clang-format` ejecutado durante el pre-commit, por ejemplo), herramientas de _coverage_ automático, etc. Estas automatizaciones no eliminan por inutilizan por completo este nivel de revisión, sino que permiten dedicar el tiempo a otro tipo de comentarios (por ejemplo, decidir si la documentación actual es entendible o si ha quedado desactualizada).

### Nivel 2: revisión detallada

Acá ya se requiere un nivel de lectura más detallado, buscando entender mejor los cambios propuestos y lo que de ellos se deriva:

- Efectos secundarios
- Posibles interacciones con otros componentes
- Cobertura
- Relación con otras tareas (pasadas, en curso, o planificadas)
- Propuestas de mejora (optimizaciones, _refactorings_)

Se busca entender si los cambios aplicados pueden generar efectos en otras partes del código o alterar comportamientos existentes. Ejemplos: cambios de un API, nuevos valores por defecto, comportamientos ocultos, código no documentado con soluciones _hackeos_ históricos, etc. Sería recomendable revisar la cobertura de código en caso de que se encuentren efectos secundarios o cambios indirectos.

Se puede analizar el impacto en otros componentes, por ejemplo, proponiendo un _refactoring_ para evitar la duplicidad de código o exponer funcionalidades útiles. Asímismo, esta labor puede extenderse a traer experiencia de tareas pasadas, buscar coordinación o ayuda con tareas en curso, o definir mejor tareas futuras.

Debido al mejor entendimiento del código es posible para los revisores proponer optimizaciones que generen un impacto positivo (se entiende acá además de que se puede reportar cualquier presunta degradación del rendimiento).

Es un buen momento además, aprovechando la dedicación de tiempo, para realizar una prueba de cobertura más a fondo (en el caso de que no esté automatizada).

Puede verse que este nivel requiere de una dedicación mayor que el nivel 1 y un mejor entendimiento tanto de los cambios como del código en general. Si bien todavía podríamos decir que cualquiera puede hacerlas, estas revisiones suelen ser realizadas más por miembros _senior_ del equipo así como afines a la tarea.

### Nivel 3: revisión en profundidad

Este último nivel suele estar reservado a personas afines a la tarea y a arquitectos de software, ya que requiere un fuerte conocimiento tanto del trabajo que ha de realizarse como del producto en general. En este nivel es más difícil definir una lista de comentarios posibles, ya que dependen de cada tarea, pero sí podemos resumir los objetivos que persiguen:

- Validación de la solución
- Discusión a fondo de la misma
- Preparación para producción

Más allá de la implementación detallada, se ha de revisar que la tarea se resuelva por completo (de nada sirve un código maravilloso si no soluciona el problema que debe). Esto implica haber analizado el problema (requerimientos, posibles implementaciones, causas del error, etc.), así como su validación por parte del equipo de QA. Bien podría decirse que la primera parte debe formar parte más del _definition of ready_ que de la revisión de código, pero es importante que esté hecha y entenderla para poder analizar la solución propuesta. Del mismo modo la validación es clave para saber que _la teoría se ha llevado a la práctica_, por lo que la cobertura de los _tests_ unitarios debe ser adecuada y considerar todos los casos borde posibles.

En este nivel se pueden sugerir mejoras globales de la arquitectura, optimizaciones más agresivas, modificaciones en los procesos de validación para mejorar la cobertura funcional, así como posibles tareas relacionadas pero que se salen del ámbito del problema actual.

Asímismo, hay que mantener la atención en que la solución debe ser _production ready_ (salvo el caso de pruebas de concepto o tareas parciales). Esto incluye verificar que todos los aspectos que rodean al cambio, tales como traducciones, instalación de dependencias, _feature flags_, mecanismos de despliegues a tener en cuenta, notificación de cambio de APIs, entre otros, hayan sido tenidos en cuenta (obviamente, si existe una tarea diferente para ello se ha de relegar a la misma).

## Consideraciones finales

La revisión de código es una herramienta técnica que atañe principalmente a los implicados en la ejecución de la tarea (desarrolladores principalmente, aunque podríamos considerar a DevOps y QAs si el código está relacionado con dichas áreas). No tiene mucho sentido que los _product owners_ o _managers_ se paseen por las revisiones de código de normal: para saber lo que hace el equipo se disponen de otras herramientas, tales como las _Scrum dailies_.

Por otro lado, si bien la implicación de un QA en la revisión de código genérico no es obligatoria, personalmente siempre he obtenido mejores resultados cuando están en contacto cercano con la tarea. En algunos casos se puede definir una tarea de validación explícita antes de dar por bueno el desarrollo, que podría implicar, _per se_, el desarrollo de nuevas pruebas automatizadas, _tests_ de regresión, etc. En otros casos el _ticket_ se reenvará a los equipos de validación y pruebas para su consideración para el siguiente lanzamiento.

Para finalizar, es importante hablar acerca de los modales: la revisión de código es una parte de nuestro trabajo, y debe realizarse con la misma profesionalidad y respeto hacia nuestros colegas. Así, si hay que decir que un cambio no es correcto o incluso dañino, se dice, pero con respeto y amabilidad. De la misma forma también se puede aprovechar para valorar positivamente un buen trabajo. De cara a recibir comentarios, recordad que el objetivo de los comentarios no es el autor sino la mejora del código, del producto y de la empresa; por lo que hay que tomarlos de forma constructiva. En lo personal, creo que he aprendido tanto durante las revisiones de código como de Stack Overflow 😉.

## Conclusiones

Hemos visto una breve introducción a las revisiones de código y su importancia, así como un breve esquema de los diferentes tipos de revisiones que podemos hacer para sacarles el mayor beneficio posible.
