---
title: Efectos colaterales de los menús contextuales en Qt
date: 2019-03-31T21:42:08+02:00
author: Carlos Buchart
layout: post
permalink: /2019/03/31/efectos-colaterales-de-los-menus-contextuales-en-qt/
excerpt: Cuando se despliega un menú contextual en un widget de Qt, éste se apropia del mouse lo que evita que los otros widgets que han solicitado seguir continuamente el movimiento del cursor no reciban el evento mientras el menú contextual esté desplegado. En esta entrada explicamos cómo solucionar este problema.
---
Esta publicación es más bien corta y casi más a modo de _para que no se me olvide_ que otra cosa, pero acá va.

Cuando se despliega un menú contextual en un widget de Qt, éste se apropia del mouse ([`grabMouse`](https://doc.qt.io/qt-5/qwidget.html#grabMouse)) lo que evita que los otros widgets que han solicitado seguir continuamente el movimiento del cursor ([`QWidget::mouseTracking`](https://doc.qt.io/qt-5/qwidget.html#mouseTracking-prop)) no reciban el evento mientras el menú contextual esté desplegado.

Como ejemplo práctico, imaginemos un widget que renderiza elementos gráficos propios, como un widget de OpenGL, y que mediante eventos `MouseMove` cambia el estado de los elementos que están debajo del cursor (como resaltar el elemento actual). Al desplegar el menú contextual para ese elemento, el widget deja de recibir el evento de `MouseMove` por lo que, si cuando se oculta el menú contextual el mouse está en otra posición, se tiene una incoherencia entre el elemento resaltado y el cursor, ya que la posición de éste no ha sido notificada al widget para actualizar el estado de la escena.

Como solución, los menús tienen una señal [`QMenu::aboutToHide()`](https://doc.qt.io/qt-5/qmenu.html#aboutToHide) que, como su nombre indica, se emite justo antes de ocultarse el menú, bien sea por seleccionar una entrada del menú o por desactivar el menú. Con esta señal se puede actualizar el estado de los elementos forzando un evento `MouseMove` con la posición actual del cursor. Ahora bien, este evento se emite _antes_ de llamar al método asociado a la entrada del menú, por lo que si éste necesita del estado actual (por ejemplo, el elemento resaltado) debe tenerse este hecho en cuenta. Obviamente esto no aplica al caso de que el menú haya sido desactivado.
