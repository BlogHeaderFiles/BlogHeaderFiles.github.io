---
title: Propiedades dinámicas de Qt y algunos usos en interfaces de usuario
date: 2020-02-09T16:20:38+01:00
author: Carlos Buchart
layout: post
permalink: /2020/02/09/propiedades-dinamicas-de-qt-y-algunos-usos-en-interfaces-de-usuario/
excerpt: 'Qt ha implementado, como parte de la la estructura de meta-objetos, un sistema de propiedades bastante completo y potente. Como resumen rápido, y dejando muchas cosas en el tintero, se trata de una forma de guardar datos a nivel de objeto sin tener que modificar su implementación, es decir, de forma dinámica.'
categories: c++ qt properties
---
## Introducción

Qt ha implementado, como parte de la la estructura de meta-objetos, un [sistema de propiedades](https://doc.qt.io/qt-5/properties.html) bastante completo y potente. Como resumen rápido, y dejando muchas cosas en el tintero, se trata de una forma de guardar datos a nivel de objeto sin tener que modificar su implementación, es decir, de forma dinámica:

- Podemos darle un valor mediante `objeto->setProperty("nombre", valor)`, donde `valor` es un [`QVariant`](https://doc.qt.io/qt-5/qvariant.html).
- Podemos leer el valor almacenado usando `objeto->property("nombre")` (devuelve, de nuevo, un `QVariant`).
- Por último, podemos borrar la propiedad pasando un `QVariant` nulo: `objeto->setProperty("nombre", {})`.

En esta entrada comentaremos algunos usos de las propiedades durante la implementación de interfaces gráficas de usuario: como ayudante de máquinas de estado, indicar el estado de un control, automatizar la conexión entre interfaz y modelo de datos, y restaurar valores.

## Ayudante de máquinas de estado

Cuando se programan interfaces de usuario es común hacer uso de máquinas de estado para gestionar los diferentes escenarios en los que el usuario puede incurrir, tal y como desactivar determinados controles que no aplican a la selección actual. Asimismo, en interfaces más complejas es posible que sea necesario usar un estado _temporal_ mientras dure una acción, pero que deba volver al estado anterior una vez finalice dicha acción.

Como ejemplo de lo anterior, consideremos la opción de _Enfoque_ de la ventana de configuración de cámara de [Cycling 2DMA](https://www.stt-systems.com/motion-analysis/2d-optical-motion-capture/cycling-2dma/). Cuando se pulsa el botón asociado, el sistema cambia la visualización de la cámara para eliminar todo filtro y escalado, de forma que se obtiene una relación de píxel 1:1 entre la cámara y la pantalla, permitiendo un mejor enfoque de la misma. Durante este proceso es necesario, además, desactivar cualquier opción adicional que tenga seleccionada el usuario, tal y como la cuadrícula de alineación y detección de marcadores, y restaurarlas al salir del modo de enfoque. Veamos cómo podemos resolverlo.

### Solución usando variables miembro

La primera opción es la de usar dos variables miembro a la clase que gestione la ventana de configuración, tales como `m_previous_grid_state` y `m_previous_marker_detection_state`. Estas variables se usarían para guardar el estado actual de dichas opciones (gestionadas por un `QPushButton` con [`setCheckable(true)`](https://doc.qt.io/qt-5/qabstractbutton.html#checkable-prop)) y restaurarlo al finalizar. Ahora bien, esto lleva a complicar el diseño de la clase fruto de la gestión de un único estado. Imaginemos si además hay otros escenarios similares en la misma ventana.

Otra opción sería la de tener un controlador específico de ese estado, que guarde y restaure los valores necesarios, pero ahora tenemos una dependencia más fuerte entre ese controlador y el diseño del interfaz.

### Solución usando propiedades de Qt

Las propiedades nos son de gran ayuda en nuestro problema: necesitamos guardar un valor de forma temporal, estrechamente asociado a un control, sin tener que _contaminar_ el resto de nuestro código. Así, podemos cambiar la _variable_ temporal por una _propiedad_ temporal guardada en cada control del interfaz afectado:

```cpp
#define LAST_CHECK_STATE "last_check_state"

void saveAndSetLastCheckedState(QAbstractButton *button, bool checked)
{
  if (button->isCheckable()) {
    button->setProperty(LAST_CHECK_STATE, button->isChecked());
    button->setChecked(checked);
  }
}

void restoreLastCheckedState(QAbstractButton *button)
{
  if (button->isCheckable()) {
    button->setChecked(button->property(LAST_CHECK_STATE).toBool());
    button->setProperty(LAST_CHECK_STATE, {});
  }
}

// Función para simplificar el uso de las anteriores
enum class Phase {
  Save,
  Restore,
};
void setCheckedState(QAbstractButton *button, bool state_on_save, Phase phase)
{
  if (phase == Phase::Save) {
    saveAndSetLastCheckedState(button, state_on_save);
  } else {
    restoreLastCheckedState(button)
  }
}
```

Así, nuestra función de gestión del botón de enfoque sería algo como:

```cpp
void CameraConfigurationWidget::onFocusChecked(bool checked)
{
  const auto phase = checked ? Phase::Save : Phase::Restore
  setCheckedState(ui.gridButton, false, phase);
  setCheckedState(ui.markersDetectionButton, false, phase);

  // ...
}
```

De esta forma evitamos bajar demasiado en el nivel de abstracción del método `onFocusChecked` y de toda la clase involucrada.

Como comentario de la función de ayuda `setCheckedState`: no se implementa directamente toda la lógica acá, sino que se divide en dos funciones, para permitir su uso (limpio) en momentos diferentes. Un caso de uso podría ser el de comenzar un proceso de cálculo que requiere, de nuevo, forzar ciertos estados, pero que al terminar o cancelarse deben ser restaurados; es decir, que el cambio de estado ocurre en dos métodos diferentes.

## Indicar el estado de un control

Otro posible uso de las propiedades dinámicas es para identificar rápidamente cierto conjunto de controles en las hojas de estilo. En una hoja de estilo en Qt podemos seleccionar aquellos objetos que cumplan con cierta propiedad ([ver documentación](https://doc.qt.io/Qt-5/stylesheet-syntax.html#selector-types). Por ejemplo, podemos indicar mediante un borde rojo aquellas cajas de texto obligatorias de un formulario que no han sido rellenadas:

```cpp
void Dialog::validateFields()
{
  const bool valid = !ui.lastName->text().isEmpty();
  ui.lastName->setProperty("valid", valid ? "yes" : "no");
}
```

[css]
QLineEdit[valid="no"] {
  border: 1px solid red;
}
[/css]

## Automatizar la conexión con el modelo de datos

En este ejemplo podemos automatizar la conexión entre el interfaz y el modelo de datos subyacente guardando en una propiedad el nombre del campo al que se debe asociar (se puede hacer desde el [Qt Designer](https://doc.qt.io/qt-5/designer-widget-mode.html#the-property-editor)), y usar [`QObject::findChildren`](https://doc.qt.io/qt-5/qobject.html#findChildren) para recorrer todos los controles de una ventana y leer / escribir los datos:

![Propiedades dinámicas en Qt Designer](/assets/images/dynamic_property_in_qt_designer.jpg)

```cpp
void FormWidget::updateUIFromModel()
{
  const auto line_edits = findChildren<QLineEdit*>();
  for (auto line_edit : line_edits) {
    line_edit->setText(my_model->getField(line_edit->property("field").toString()));
  }
}
```

## Restaurar valores

El último uso es parecido al primero, pero más pensando en formularios. Por ejemplo, tenemos un formulario con una serie de datos, mostrados en `QLineEdit` en sólo lectura, y el usuario clica en un botón _Editar_. En ese momento se habilita la capacidad de escritura en todos los controles. Lo más probable es que tengamos un par de acciones finales posibles: aceptar los cambios o descartarlos. En el segundo caso tenemos que restaurar los valores originales, lo cual puede hacerse obviamente re-consultando el modelo. Existen dos escenarios en los cuales esta opción no es la más conveniente:

- La consulta es costosa (servidor lento, ancho de banda reducido, formulario complejo que une datos de diferentes fuentes).
- Los datos anteriores aún no habían sido enviados al modelo (diferencia entre _aceptar cambios_ y _guardarlos_).

En este caso, como imagináis, las propiedades dinámicas nos pueden ayudar, sirviéndonos de almacén temporal de los valores originales en caso de tener que restaurarlos:

```cpp
void Form::edit()
{
  const auto line_edits = findChildren<QLineEdit*>();
  for (auto line_edit : line_edits) {
    line_edit->setProperty("prev_value", line_edit->text());
    line_edit->setReadOnly(false);
  }
}

void Form::accept()
{
  const auto line_edits = findChildren<QLineEdit*>();
  for (auto line_edit : line_edits) {
    line_edit->setProperty("prev_value", {});
    line_edit->setReadOnly(true);
  }

  // ...
}

void Form::reject()
{
  const auto line_edits = findChildren<QLineEdit*>();
  for (auto line_edit : line_edits) {
    line_edit->setText(line_edit>property("prev_value").toString());
    line_edit->setReadOnly(true);
  }
}
```

Dado que las propiedades almacenan `QVariant`s, podemos extender esta técnica sin mucho esfuerzo a otros controles tales como `QDateEdit`, `QSpinBox`, `QComboBox`, etc.

## Conclusión

Las propiedades dinámicas de Qt abren un mundo de posibilidades a la hora de solucionar problemas típicos de interfaces gráficas. ¿Qué otros escenarios se os ocurren? Envíamelos a <a href="https://twitter.com/intent/tweet?screen_name=carlosbuchart&ref_src=twsrc%5Etfw" data-show-count="false">@carlosbuchart</a>
