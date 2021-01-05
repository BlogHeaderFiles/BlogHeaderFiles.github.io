---
title: Bloqueando señales en Qt
date: 2020-12-30T00:52:40+01:00
author: Carlos Buchart
layout: post
permalink: /2020/12/30/bloqueando-senales-qt/
image: /assets/images/featured/blocksignals.jpg
---
En entradas anteriores hemos visto cómo realizar una conexión entre una señal y un _slot_ en Qt ([1]({{url}}/2019/04/26/signals-y-slots-en-qt-parte-i/) y [2]({{url}}/2019/05/14/signals-y-slots-en-qt-parte-ii/)). Ahora bien, hay casos en los que no deseamos que el _slot_ sea llamado al emitirse la señal, como por ejemplo si debemos actualizar programáticamente una propiedad de un _widget_ en base a un cambio en el estado de nuestro modelo, pero hacerlo haría que el modelo volviese a cambiar ya que el _widget_ ha emitido una señal de cambio. Para ello algunos _widgets_ proveen dos señales diferentes para estos casos, una que se emite siempre que se cambia el valor (ya sea mediante acción directa del usuario con el _widget_, o bien programáticamente), y otra señal que se emite sólo cuando el cambio se genera desde el interfaz de usuario. En este caso, es fácil hacer la separación.

Desafortunadamente, no todos los controles nos dan las mismas facilidades. Por ejemplo, los _sliders_ sólo proporcionan la señal [`valueChanged`](https://doc.qt.io/qt-5/qabstractslider.html#valueChanged), que se genera tanto al cambiar el valor del _slider_ programáticamente como al hacerlo por interfaz de usuario. En estos casos, es fácil caer en una cascada recursiva de llamadas, en una serie de acciones duplicadas (con el respectivo impacto en el rendimiento) o, para evitar esto último, en un diseño poco elegante y legible, en el que dar un valor al _slider_ implica implícitamente ejecutar una serie de acciones (en el _slot_). Esto último puede ser peligroso si la conexión ejecuta el _slot_ de forma asíncrona, lo que lleva a un código más oscuro y críptico, con _truquillos_ (chapuzas) tales como actualizar manualmente el bucle de eventos con el fin de que dicho _slot_ se ejecute.

Pues bien, una forma de evitar esto es desconectando temporalmente al _widget_ para que dicha señal no ejecute ningún _slot_. Desafortunadamente esto no siempre es sencillo por varias razones: hay que volver a conectar las señales (que pueden ser varias, y con varios _slots_ cada una), puede que haya señales que sólo se conectan bajo determinadas circunstancias (por lo que tendríamos que duplicar la lógica de conexión, y extraerla a una función, de nuevo, no siempre es posible), o tendríamos que [guardar las conexiones](https://doc.qt.io/qt-5/qmetaobject-connection.html) y estar activándolas y desactivándolas cada vez.

Todo esto suena muy complicado para algo tan simple. ¿Y si hubiera una forma de hacer el cambio de estado sin que se emitiese ninguna señal, y ahorrarnos tanto lío?

¡Pues resulta que la hay! Es el método [`blockSignals`](https://doc.qt.io/qt-5/qobject.html#blockSignals) que todo `QObject` tiene. Basta con activar el bloqueo antes de cambiar el estado, y desactivarlo al finalizar:

```cpp
ui.slider->blockSignals(true);
ui.slider->setValue(0);
ui.slider->blockSignals(false);
// call here the slot, if necessary
```

Este método tiene la sencillez y expresividad que buscábamos: es rápido, no necesita que almacenemos listas de conexiones, ni que tengamos que modificar nuestro código en varios sitios si conectamos una nueva señal del _widget_, ni tener que hacer peripecias con el bucle de eventos, a la vez que deja muy patente lo que estamos haciendo. Por contraparte, esta técnica obviamente tiene la desventaja de que bloquea _todas_ las señales (actualmente no hay forma de bloquear una señal en concreto), pero en el tipo de escenario que hemos comentado no suele ser un problema.

A partir de Qt 5.3 está disponible la clase [`QSignalBlocker`](https://doc.qt.io/qt-5/qsignalblocker.html), que facilita este proceso mediante el uso del [RAII]({{url}}/2020/01/13/automatizando-acciones-gracias-al-raii-parte-i/), a la vez que garantiza que las señales son restauradas incluso ante una excepción.

Para el que quiera profundizar un poco más sobre el tema, le recomiendo [esta pregunta de Stack Overflow](https://stackoverflow.com/q/3556687/1485885) donde explican y discuten estas soluciones.