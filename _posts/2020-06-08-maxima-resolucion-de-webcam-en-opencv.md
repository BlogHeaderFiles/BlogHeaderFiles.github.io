---
title: Máxima resolución de webcam en OpenCV
date: 2020-06-08T23:54:21+02:00
author: Carlos Buchart
layout: post
permalink: /2020/06/08/maxima-resolucion-de-webcam-en-opencv/
excerpt: En este artículo nos ocuparemos de un aspecto en específico, las resoluciones soportadas, o mejor dicho, la máxima resolución que una webcam puede soportar y cómo obtenerla usando OpenCV.
categories: c++ opencv webcam
---
Desde que comencé a usar ordenadores allá por 1992 (😱), siempre me pareció que el lado más oscuro e incomprensible de la informática se llamaba _impresoras_. Esta opinión cambió ligeramente desde que añadimos soporte para webcams en nuestras aplicaciones; ¡ahora hay un segundo lado oscuro e incomprensible! Cada webcam es, como se dice coloquialmente, de su padre y de su madre, con ajustes y especificaciones propios y casi únicos. Para poner peor las cosas, OpenCV (la biblioteca por antonomasia para procesamiento de imágenes) es bastante básica, o mejor dicho, genérica, en cuanto a captura de vídeo se refiere. En este artículo nos ocuparemos de un aspecto en específico: las resoluciones soportadas, o mejor dicho, la máxima resolución que una webcam puede soportar y cómo obtenerla usando OpenCV.

## Solución

Para comenzar, OpenCV trata las cámaras y los vídeos como una fuente de imágenes genérica, bajo el objeto [`cv::VideoCapture`](https://docs.opencv.org/4.3.0/d8/dfe/classcv_1_1VideoCapture.html), y como un vídeo no tiene _resolución máxima_, solamente tiene _resolución_, de forma que no podemos saber la resolución máxima que permite nuestra cámara consultando una [propiedad](https://docs.opencv.org/4.3.0/d4/d15/group__videoio__flags__base.html#gaeb8dd9c89c10a5c63c139bf7c4f5704d) del vídeo.

Para solucionar este problema, puede hacerse uso de un comportamiento colateral: cuando se asigna una resolución inválida la cámara decae a la resolución válida más cercana (640 x 481 pasa a ser 640 x 480), por lo que el truco consiste en solicitar una resolución descomunalmente alta y luego simplemente mirar la resolución a la que quedó fijada la cámara:

```cpp
std::tuple<int, int> query_maximum_resolution(cv::VideoCapture* camera)
{
  // Save current resolution
  const int current_width = (int)(camera->get(cv::CAP_PROP_FRAME_WIDTH));
  const int current_height = (int)(camera->get(cv::CAP_PROP_FRAME_HEIGHT));

  // Get maximum resolution: set a out-of-range resolution and let the camera set itself to the maximum allowed
  camera->set(cv::CAP_PROP_FRAME_WIDTH,  10000);
  camera->set(cv::CAP_PROP_FRAME_HEIGHT, 10000);
  const int max_width = (int)(camera->get(cv::CAP_PROP_FRAME_WIDTH));
  const int max_height = (int)(camera->get(cv::CAP_PROP_FRAME_HEIGHT));

  // Restore resolution
  camera->set(cv::CAP_PROP_FRAME_WIDTH, current_width);
  camera->set(cv::CAP_PROP_FRAME_HEIGHT, current_height);

  return {max_width, max_height};
}
```

## Créditos

La técnica la vi por primera vez en [Stack Overflow](https://stackoverflow.com/q/18458422/1485885).
