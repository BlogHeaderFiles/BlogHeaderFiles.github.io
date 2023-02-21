---
title: Cómo cambiar una bombilla
date: 2023-02-21T08:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2023/02/21/how-to-change-a-light-bulb
image: /assets/images/featured/light_bulb.jpg
excerpt: ¿Qué hecho en falta en muchos cursos de programación y no cambia nada incluso con los últimos progresos de la IA?
categories: algorithm education opinion
---
## Introducción

Llevo más de 20 año desarrollando software y durante muchos otros he impartido o colaborado en diversas asignaturas relacionadas con la programación: Informática I (en diversas modalidades, pero siempre como ayudante), Diseño de Sistemas Operativos (tanto en Venezuela como en España), y Seguridad de Redes.

En todas ellas he visto el mismo patrón: la mayoría de los estudiantes (incluso algunos de los _brillantes_) les costaba pasar de un simple _caletreo_ en lo que a programación se refería: aprendían muy bien los conceptos teóricos de las instrucciones de control de flujo, sabían lo que estaban haciendo los programas que veíamos en clase y muchas veces salían de los atolladeros de errores de compilación de C++ por cuenta propia. Pero cuando tocaba realizar un programa desde cero o incluso modificar (sustancialmente) un programa dado, no hacían más que comenzar a poner bucles "for" acá y allá sin razón, o a preguntar si debían usar un "if" o una función. Parecía que todo lo demás hubiese sido una farsa. Con el tiempo he llegado a ver ese comportamiento no sólo en alumnos, sino en "profesionales" del sector.

Después de muchas reflexiones y de comentarlo con colegas de la academia y de la industria, he concluido que el problema radica en que se han saltado un paso en su formación.

Un servidor lleva programando desde bastante joven, y cuando entré en la facultad que me di cuenta de que había _algo raro_, y que además le pasaba a casi la totalidad de los que llevaban un tiempo programando por cuenta propia. Pasados unos meses, noté que _eso_ se apoderaba de todos mis compañeros de estudios. Los que más _contagiados_ estaban solían ser los que lograban que sus proyectos funcionasen más rápidamente, los que destacaban en los maratones de programación. Y lo mismo he observado con el tiempo en otras escuelas de informática y en las diferentes empresas por donde he pasado.

Pero, ¿qué era _eso_ que se propagaba como una epidemia? Creo que cualquiera que haya tenido un mínimo trato con un desarrollador de software lo ha podido _oler_ y me sabrá entender. Sencillamente nuestro cerebro estaba sufriendo un daño irreparable, permanente y significativamente visible; y no, no es que no pudiésemos pensar, es que lo hacíamos diferente, ya no como un ser humano, sino como una máquina.

## Cambiar una bombilla

Había un ejercicio que se solía proponer en muchos cursos de Algoritmos I y, que si bien tiene sus variantes, en esencia es el mismo. Digo _solía_ porque hasta donde he visto ya no se expone en muchas facultades ni cursos de programación. Lo dejaré escrito y daré unos momentos para que reflexionen sobre ello:

_Diseñe un algoritmo para cambiar una bombilla._ (Para los no _iniciados_, un algoritmo es un conjunto de pasos para hacer algo, el plan de trabajo).

⌛️ Tiempo de reflexión...

Muy bien. A ver vuestros trabajos, veamos, tomemos el primero que tenemos acá:

1. Comprar bombilla nueva
2. Poner una escalera debajo de la lámpara
3. Subir la escalera
4. Desenroscar bombilla vieja
5. Enroscar bombilla nueva
6. Bajar escalera
7. Tirar bombilla vieja
8. Guardar escalera

### Revisión

Bien, ahora veamos lo que podría decir un ordenador sobre la línea 2

- Ordenador: Fenomenal, ¡gracias! a ver ¿qué es escalera?
- Programador: Una escalera es un conjunto de peldaños o escalones que enlazan dos planos a distinto nivel, y que sirven para subir y bajar.
- O: Vale, ¿qué es peldaño?
- P: Un peldaño es un trozo de madera, hierro, plástico, cemento, en el que se apoya el pie para subir o bajar.
- O: Muy bien, ¿qué es subir? ¿qué es madera? ¿qué es hierro? ¿que es bajar? ¿qué es pie?...

¿Y sobre la línea 5?

- O: ¡Me encanta! Antes de seguir, ¿me explicas qué es eso de enroscar?
- P (ya en alerta después de la experiencia con la línea 3): Consiste en cuatro pasos: primero sujetar la bombilla con la mano dominante con la fuerza suficiente para que no se caiga y que podamos vencer el rozamiento de la rosca en el sócate, pero sin ser demasiada como para romperla y hacernos daño; segundo, ubicar la rosca de la bombilla en la entrada del sócate; tercero, realizar un movimiento repetitivo de unos 170° cada uno en dirección antihoraria de la bombilla (ayudarse con la otra mano mientras la bombilla aún no esté sujeta por el sócate); cuarto, repetir el paso tres hasta que la bombilla esté firme en el sócate.
- O: ¡Estupendo! ¿Qué es un sócate?
- P: 😒😒😒

Y así podríamos continuar hasta que el ordenador ya lo tuviera todo claro. Veríamos entonces que nuestro algoritmo es realmente un tratado completo acerca de la anatomía de la mano y el brazo, de la estructura de una bombilla y de la lámpara, un inventario de herramientas y utensilios, y toda una orquesta de movimientos humanos de sujeción y desplazamiento, por no decir un glosario de los términos más básicos que cualquier niño de 3 años conoce.

## El tonto más rápido del condado

Creo que queda claro el punto nuclear: el ordenador no es más que una pieza tonta de silicio al que hay que explicárselo todo. Eso sí, es el tonto más rápido del lugar. De la misma forma que nuestro ejemplo anterior, el más simple programa de ordenador puede terminar siendo bastante complejo desde el punto de vista del usuario.

Cuando uno empieza a programar descubre que uno tiene el poder de hacer que el ordenador haga lo que uno quiera, que sólo protestará en la medida de si puede hacerlo o no, pero no tendrá pereza, ni dirá que ya ha hecho mucho, ni criticará la decisión que uno ha tomado y, si uno ha metido la pata, el ordenador no dirá nada y lo hará, siendo uno el responsable de ello. De hecho, se suele decir que los ordenadores siguen un modelo GIGO (_garbage in, garbage out_), si les damos la orden correcta, harán lo que uno quiera, pero si uno da la orden equivocada, el ordenador no hará lo que uno quería. El ordenador no tiene _telepatía_, sólo sigue órdenes concretas y precisas.

## Evolucionando

El día que un aspirante a desarrollador cae en la cuenta de tod esto, automáticamente se hace mejor, ¡evoluciona!, ya que entenderá que no debe esperar ni por asomo que el ordenador haga mágicamente lo que él quería, sino que sabrá que debe dar todas y cada una de las instrucciones de una forma detallada y ordenada. Su mente dejará de funcionar como la de un humano provisto de un alma inteligente y libre, con experiencia, iniciativa, curiosidad, y empezará a contar ciclos de reloj, a no asumir nada, a no dar nada por sabido de antemano, a ser muy explícito y cuadriculado_¡.

En estos últimos días hemos sido testigos del gran avance en materias de _deep learning_, con los modelos de procesamiento de lenguaje GPT-3 (y pronto GPT-4) y generación de imágenes _stable diffusion_, y su aplicación en prácticamente cualquier ámbito profesional y artístico. Además, desde hace años incluso los ordenadores más sencillos cuentan con una potencia de cálculo bastante superior a la de un cerebro humano. Cada segundo se procesa una cantidad inimaginable de datos. Las herramientas cada vez hacen más cosas que antes hacían las personas (bueno, es lo que ha pasado siempre desde la invención de la rueday  la palanca, la domesticación de caballos, el motor de vapor, la electrónica hasta la IA). Hay quienes ven amenazas, otros oportunidades, otros un cambio de paradigma.

Pero incluso con todo esto, el ordenador no ha cambiado en sus fundamentos: no piensa, no tiene voluntad, no es libre, sólo sigue instrucciones, aunque éstas sean complejísimas, se nutran de toda la información mundial y se retroalimenten continuamente.

El tonto del condado es cada vez más rápido y tiene mejores instrucciones y datos sobre los que trabajar, pero sigue siendo el tonto y necesita de seres racionales -personas- que entiendan esto y que puedan _pensar_ (procesar sería una mejor palabra) como lo hace un ordenador para poder progresar.

_Pensar como un ordenador_ es, a su vez, un término que varía con el tiempo en el cómo, mas no en el qué: ya lo hizo del paso de ensamblador a lenguajes de alto nivel y luego a las aplicaciones web y móviles, lo hizo del cambio de programación mono-hilo a software altamente concurrente, de las tarjetas perforadas a las interfaces gráficas y a la realidad aumentada / virtual. Pero siempre necesitaremos saber que el ordenador no es más que eso, una máquina de cómputo, por muy rápido y complejo que sea.

## Encendamos la luz

Volvamos al ejercicio inicial y dediquemos unos momentos a pensar cómo le explicaríamos a un ordenador que cambie una bombilla, sin asumir nada, sin dejar cabos sueltos... Es un ejercicio sin fin, y es su razón de ser. Realmente pienso que si este ejercicio se volviese a exponer en los cursos de programación veríamos un cambio sustancial de calidad; y que, independientemente del lenguaje de desarrollo, _framework_, tecnología, entenderíamos que no hay magia, no hay intuición, no hay libre albedrío en la informática, sólo instrucciones explícitas, sin dobles sentidos, con todos los datos, lógicos, binarios (hace una cosa o no la hace).
