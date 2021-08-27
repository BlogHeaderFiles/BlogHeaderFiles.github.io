---
title: Ajuste dinámico de imágenes en QLabels
date: 2021-08-27T13:30:00+01:00
author: Carlos Buchart
layout: post
permalink: /2021/08/27/ajuste-dinamico-imagenes-qlabel/
image: /assets/images/featured/resize_image_qlabel.jpg
excerpt: Estudiamos cómo auto-escalar una imagen dentro de un QLabel.
---
El control para mostrar etiquetas de texto en Qt se llama `QLabel`. Además de texto, puede mostrar una imagen mediante el método `QLabel::setPixmap`, aunque de una forma bastante limitada. Me explico: la imagen se mostrará con una relación 1:1, por lo que estará recortada si es mayor que el widget, mostrándose más o menos dependiendo del tamaño del mismo.

`QLabel` cuenta con una propiedad para _paliar_ el problema descrito arriba (aunque yo creo que lo que logra es confundir más aún): `scaledContents`. Al usar `QLabel::setScaledContents(true)` el pixmap se redimensiona dinámicamente al tamaño de la etiqueta, pero sin respetar la relación de aspecto (adquiere la relación de aspecto del widget).

Si por el contrario lo que queremos es que la imagen se escale dinámicamente respetando la relación de aspecto, entonces este artículo es para ti. La técnica consiste básicamente en crear una segunda versión escalada y centrada de la imagen original cada vez que el widget cambie de tamaño.

## Escalado y posicionamiento

La parte del escalado es sencilla, ya que Qt la incorpora en `QPixmap::scale`. En este caso, usaremos `aspectMode = Qt::KeepAspectRatio` para que la imagen quede dentro de la nueva área. Si por el contrario quisiésemos que la imagen cubriese todo usaríamos `Qt::KeepAspectRatioByExpanding`. Además, usaremos el modo `Qt::SmoothTransformation` para obtener el mejor resultado posible. Es importante recordar que siempre debemos hacer el escalo sobre una copia de la imagen original para evitar degradaciones en la calidad de la misma.

Ahora toca centrar la imagen, ya que el escalado únicamente nos ajusta el tamaño, el posicionamiento es un asunto del renderizado. Para ello crearemos una imagen secundaria con el tamaño de la etiqueta, sobre la que pintaremos centrada la imagen escalada en el paso anterior:

```cpp
auto image = QImage{label->size(), QImage::Format_ARGB32_Premultiplied}; // transparency required to prevent 'black' strips to appear
image.fill(Qt::transparent); // cannot use QPainter::eraseGeometry when working with a QImage as painting device

// Scale image
const auto scaled_pixmap = original_pixmap.scaled(label->size(), aspect_mode, Qt::SmoothTransformation);

// Center image by computing the new origin
const auto size_diff = label->size() - scaled_pixmap.size();
const auto top_left = QPoint{size_diff.width() / 2, size_diff.height() / 2};

// Render the new image
QPainter painter{&image};
painter.drawPixmap(top_left, scaled_pixmap);
painter.end();
```

## Ajuste dinámico

Por último sólo nos toca cambiar el pixmap cada vez que la etiqueta cambie de tamaño. Si bien la herencia es una opción, la forma más sencilla de realizar este procedimiento es mediante un filtro de eventos que capture el evento de cambio de tamaño (`QEvent::Resize`). Una sencilla clase nos puede dar esta funcionalidad:

```cpp
class QLabelPixmapScaler : public QObject
{
public:
  explicit QLabelPixmapScaler(QLabel *label, Qt::AspectRatioMode aspect_mode)
    : QObject{label}, m_pixmap{*label->pixmap()}, m_aspect_mode{aspect_mode}
  {
    label->installEventFilter(this);
  }

  bool eventFilter(QObject *obj, QEvent *event) override {
    if (obj == parent() && event->type() == QEvent::Resize) {
      auto label = (QLabel *)parent();

      // Scale original pixmap and save on 'image'

      label->setPixmap(QPixmap::fromImage(image));
    }

    return false;
  }

private:
  const QPixmap m_pixmap;
  const Qt::AspectRatioMode m_aspect_mode;
};
```

Ahora únicamente nos queda instalar el escalador al `QLabel`. Nótese que el escalador se asocia a la jerarquía de objetos de la etiqueta, por lo que no es necesario preocuparse de eliminarlo; se hará cuando se borre la etiqueta.

```cpp
new QLabelPixmapScaler{label, Qt::KeepAspectRatio};
```

## Retoques finales

La solución anterior es válida si la etiqueta siempre tiene la misma imagen, pero si ha de cambiar entonces podemos vernos en el caso de tener múltiples escaladores instalados. Para solucionarlo bastaría con borrar los anteriores cada vez que se cree uno nuevo:

```cpp
setObjectName("QLabelPixmapScaler");

for (auto prev_scaler : label->findChildren<QLabelPixmapScaler *>(objectName())) {
  label->removeEventFilter(prev_scaler);
}
```

Un ejemplo de cambio de imagen sería algo así como

```cpp
new QLabelPixmapScaler{label, Qt::KeepAspectRatio};

// ...

label->setPixmap(/* ... */);
new QLabelPixmapScaler{label, Qt::KeepAspectRatio};
```

## Ejemplo

En este ejemplo (disponible en [GitHub](https://github.com/BlogHeaderFiles/SourceCode/tree/master/ScalingImagesQLabel)) se comparan los cuatro modos de escalado mencionados: sin escala, usando `scaledContents`, escalado dinámico _por dentro_, y escalado dinámico _por fuera_.

![resize_image_qlabel](/assets/images/resize_image_qlabel.gif)
