---
title: Introducción a los QProxyStyle
date: 2019-03-23T11:29:09+01:00
author: Carlos Buchart
layout: post
permalink: /2019/03/23/introduccion-a-los-qproxystyle/
excerpt: Los QProxyStyle son un gran aliado a la hora de personalizar la apariencia de nuestra aplicación, sin tener que reimplementar por completo un estilo nuevo.
categories: c++ qt gui style
---
## Introducción

Son muchos los momentos en los que es necesario cambiar detalles específicos de nuestra interfaz gráfica en Qt (usualmente la apariencia de un control). Qt ofrece muchas opciones al respecto:

- Usar las propiedades del widget. Desafortunadamente no siempre están expuestas todos los parámetros de renderizado del control.
- Heredar el control y especiar sus métodos de dibujado. Normalmente es la más complicada de las opciones.
- Heredar y exponer las variables protegidas. Acá dos problemas: primero, que al no formar parte del API es más fácil que en futuras versiones de Qt se rompa la compilación; segundo, que muchos de los controles usan [_pimpl_](https://en.cppreference.com/w/cpp/language/pimpl) para ocultar los detalles internos.
- Usar [hojas de estilo](https://doc.qt.io/qt-5/stylesheet.html) (_stylesheets_): habitualmente es mi opción preferida, aunque tiene sus limitaciones: la interacción entre la hoja de estilos y el estado actual de la aplicación es limitado, y si usamos un `QStyle` puede que haya elementos no soportados. Hablaré más sobre las hojas de estilo en Qt en otro momento.
- Crear un estilo propio (`QStyle`), pero que, para cambios puntuales, es normalmente bastante trabajoso.
- Usar un `QProxyStyle`, que trae un poco lo mejor de varios mundos y que es el centro de este artículo.

Como mencioné antes, soy muy amigo de las hojas de estilo, pero hay momentos en los cuales simplemente no es posible realizar ciertos cambios con ellas. Es cuando los [`QProxyStyle`](https://doc.qt.io/qt-5/qproxystyle.html) entran en acción.

Un clase que herede [`QProxyStyle`](https://doc.qt.io/qt-5/qproxystyle.html) simplemente tiene que indicar un estilo base y reimplementar los métodos que necesite, y el proxy se encargará de redirigir todos los demás al estilo padre. Si bien es necesario saber qué parte del estilo reimplementar, no es difícil conseguir esa información desde la documentación de los estilos ([estos ejemplos](https://doc.qt.io/qt-5/qtwidgets-widgets-styles-example.html) están muy bien para empezar) o incluso examinando el código fuente ([https://code.qt.io/cgit/qt/]) para casos más extremos.

## Ejemplo: `QMessageBox` con icono personalizado

El siguiente código muestra un caso de uso: cambiar el icono de los `QMessageBox` (usaremos los _warning_ para simplificar el ejemplo). Así luce un _message box_ con el estilo por defecto (en Windows 10) y con el estilo _fusion_:

![QMessageBox](/assets/images/Screenshot-2019-03-23-12.18.08-e1553340296606.png)

![QMessageBox](/assets/images/Screenshot-2019-03-23-12.21.17-e1553340277115.png)

Comencemos con la definición del proxy:

```cpp
class MyProxyStyle : public QProxyStyle {
public:
  explicit MyProxyStyle(const QString& name)
    : QProxyStyle(name), // definimos acá el estilo padre
      m_warning_icon(":/resources/warning.png") {
  }

public:
  virtual QIcon standardIcon(StandardPixmap standard_icon,
                             const QStyleOption* option,
                             const QWidget* widget) const override {
    switch (standard_icon) { // cambiamos sólo el icono del Warning MB
    case SP_MessageBoxWarning: return m_warning_icon;
    }

    // Solicitamos el comportamiento por defecto
    return QProxyStyle::standardIcon(standard_icon, option, widget);
  }

private:
  QIcon m_warning_icon; // guardamos el icono en caché para no tener que cargarlo cada vez
};
```

A continuación, simplemente fijamos el estilo de nuestra aplicación en algún momento antes de usar los _message boxes_:

```cpp
int main(int argc, char* argv[]) {
  QApplication a(argc, argv);
  // ...

  qApp->setStyle(new MyProxyStyle("fusion")); // usamos "fusion" como estilo padre

  // ...
}
```

¡Listo! A partir de este momento todos los `QMessageBox::warning(...)` mostrarán nuestro icono en lugar del por defecto.

![QMessageBox](/assets/images/Screenshot-2019-03-23-12.22.41-e1553340253450.png)

El proyecto completo (VS) de este ejemplo está disponible en [GitHub](https://github.com/BlogHeaderFiles/SourceCode/tree/master/QProxyStyles_example).

## Otro ejemplo: quitar el cuadro de foco de todos los controles

Para esto necesitaremos reimplementar `QProxyStyle::drawPrimitive` y evitar el dibujado de los elementos `PE_FrameFocusRect`:

```cpp
void MyProxyStyle::drawPrimitive(PrimitiveElement element, const QStyleOption* option,
                                 QPainter* painter, const QWidget* widget) const
{
  if (element != PE_FrameFocusRect) { // dibujamos cualquier cosa que no sea el foco
    QProxyStyle::drawPrimitive(element, option, painter, widget);
  }
}
```

Como se ve, los proxy de estilo son técnicas sencillas de extender la forma en la que se renderiza el interfaz gráfico en Qt.

## Enlaces relacionados

- [Remove arrow from disabled QComboBox while respecting style (SO)](https://stackoverflow.com/q/53504309/1485885)
- [Where does QMessageBox get its styleguide, font-size, … from? (SO)](https://stackoverflow.com/q/26098337/1485885)
- [QHeaderView style each column (SO)](https://stackoverflow.com/q/44303603/1485885)
- [Change color of single QTabWidget tab (SO)](https://stackoverflow.com/q/54070408/1485885)
