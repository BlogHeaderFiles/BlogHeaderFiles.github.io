---
title: Una forma sencilla, rápida y cuasi-automática de medir tiempos de ejecución en funciones
date: 2020-01-08T12:20:59+01:00
author: Carlos Buchart
layout: post
permalink: /2020/01/08/una-forma-sencilla-rapida-y-cuasi-automatica-de-medir-tiempos-de-ejecucion-en-funciones/
categories: c++ benchmarking
---
Una tarea típica del programador es la de saber si una función es eficiente o no, tanto desde el punto de vista algorítmico como de tiempo de ejecución real. Creo necesario matizar que ambos valores son importantes, ya que el primero nos dirá el comportamiento del algoritmo a medida que el conjunto de datos crezca, y el segundo un valor más _palpable_, _cercano_ a lo que el usuario final percibirá.

Por otro lado, no es necesario partirse el cerebro optimizando nuestro código a diestra y siniestra, ya que la mayoría de las veces el tiempo real de ejecución es bueno para el grueso de nuestro código, y el cuello de botella se encuentra en pequeñas porciones de código: búsquedas sobre conjuntos enormes de datos no-ordenados, repeticiones innecesarias, funciones que se llaman decenas de miles de veces por segundo, accesos a disco, fallos de caché... Esto se resume en la famosa regla del 90-10 (el 90% del tiempo de ejecución se gasta en el 10% del código, más información [acá](https://softwareengineering.stackexchange.com/q/334528/266565)).

### Medir

Una de las primeras fases de la optimización es la medición: optimizar algo sin medirlo previamente (tiempo, espacio, etc.) puede hacer que perdamos el tiempo en algo que no era necesario. Esto nos ha pasado (¿pasa?) a todos:

- 3 horas de trabajo para hacer que una función se ejecute 85% más rápido, pero esa función tardaba 1 segundo y se ejecutaba en segundo plano una vez cada 5 horas... venga, que básicamente hemos perdido el tiempo de trabajo.
- 4 horas en mejorar el rendimiento de un fragmento de código sólo en un 25%, pero ese código de media tarda 20 ms y se llama 50 veces por segundo durante el proceso de grabación de vídeo: ¡20 ms * 50 = 1 segundo! Ese 25% permite aligerar considerablemente la CPU en un momento crítico, evitando seguramente la pérdida de fotogramas.

Medir. ¿Cómo? Un herramienta de _profiling_ suele ser una de las mejores alternativas, ya que presenta información agrupada y ordenada sobre el rendimiento de las funciones críticias. Pero otras veces simplemente nos interesa medir un pequeño puñado de funciones en específico, o medirlas en cliente, donde no hay herramientas de _profiling_ disponibles.

### TicToc

Este artículo presenta una pequeña clase, `TicToc` (¿se nota que he usado [Matlab](https://www.mathworks.com/help/matlab/ref/tic.html)?), para medir el tiempo de ejecución de una función de forma automática y sencilla. Dicha clase usa una de las máximas de C++ (y una de mis favoritas, [RAII](https://es.wikipedia.org/wiki/RAII)), para automatizar la medición y la impresión de la duración por consola.

Y aunque ya sé que el uso de macros debe limitarse, ésta es una de esas situaciones en las cuales resultan útiles: automatizar acciones. La macro `TICTOC()` genera automáticamente un punto de medición que se mostrará al finalizar el contexto en el que se use.

#### Código

```cpp
#include <string>
#include <chrono>
#include <iostream>

class TicToc {
public:
  explicit TicToc(std::string label = {}) : m_label(label),
    m_begin(std::chrono::high_resolution_clock::now()) {}
  ~TicToc() {
    print();
  }

public:
  void print() const {
    using namespace std::chrono;
    const auto end = high_resolution_clock::now();
    const auto duration = duration_cast<microseconds>(end - m_begin).count();
    const auto duration_in_ms = duration / 1000.0;

    std::cout << m_label << duration_in_ms << " ms";
  }

private:
  const std::string m_label;
  std::chrono::time_point<std::chrono::steady_clock> m_begin;
};

// Más información acá: https://stackoverflow.com/q/1489932/1485885
#define HELPER_JOIN(a, b) HELPER_JOIN2(a, b)
#define HELPER_JOIN2(a, b) a ## b
// Genera un nombre único de variable dentro del fichero actual
// Usa como etiqueta de medición el nombre de la función desde la que se llama y el número de línea
#define TICTOC() STT::TicToc HELPER_JOIN(tic_toc_, __LINE__)(std::string(__FUNCTION__) + "@" + std::to_string(__LINE__) + " = ");

void run() {
  TICTOC(); // esto es todo!

  for (int i = 0; i < 1000000; ++i) {
    do_something(); // por ejemplo ;)
  }
}

int main() {
  run();
}
```

¡Y ya está! La salida sería algo así como

```text
::run@33 = 154.2 ms
```

### Boost (actualización)

Si nuestra aplicación depende de Boost, una posible mejora sería usar `boost::timer::auto_cpu_timer`, similar al comando `time` de Linux. Esta clase, similar al `TicToc` presentado, muestra el tiempo de ejecución entre la declaración del objeto y su destrucción:

```cpp
#include <boost/timer/timer.hpp>

void run() {
  boost::timer::auto_cpu_timer t;

  for (int i = 0; i < 1000000; ++i) {
    do_something();
  }
}

int main() {
  run();
}
```

La salida podría ser algo como:

```text
 0.148997s wall, 0.078125s user + 0.062500s system = 0.140625s CPU (94.4%)
```

Por supuesto, se podría modificar `TicToc` para usar este medidor preservando el etiquetado automático de `TicToc`:

```cpp
class TicToc2 {
public:
  explicit TicToc2 (std::string label = {}) : m_label(label) {}
  ~TicToc2() {
    std::cout << m_label;
  }

private:
  const std::string m_label;
  boost::timer::auto_cpu_timer m_timer;
};
```

### Otras posibles mejoras

- Usar relojes de mayor resolución / precisión.
- Añadir un interruptor para deshabilitar la medición por completo, o a niveles, de forma que no es necesario suprimir el código en producción.
- Poder redirigir la salida a, por ejemplo, un fichero de log.
- ¿Algo más?
