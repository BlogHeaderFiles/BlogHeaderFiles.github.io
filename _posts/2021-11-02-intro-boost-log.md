---
title: Introducción a Boost.Log
date: 2021-11-02T19:19:19+01:00
author: Carlos Buchart
layout: post
permalink: /2021/11/02/intro-boost-log
image: /assets/images/featured/boost_log.jpg
excerpt: Un pequeño tutorial acerca del módulo Boost.Log, del que se deriva el proyecto yalog.
categories: c++ boost log
---
## Introducción

Un sistema de log es de una gran utilidad a la hora de localizar errores en nuestras aplicaciones de una forma rápida. Esto es especialmente cierto en código en producción, en donde normalmente no tenemos acceso a las herramientas habituales de depuración, o donde ni siquiera tenemos acceso al sistema en cuestión sino que dependemos de que el usuario nos diga o mande _cosas_.

En este artículo describimos tanto [un log muy sencillo](#soluciones-básicas) (de esos de andar por casa), así como una introducción a [Boost.Log](#boostlog). Primero detallemos algunos requerimientos que deberíamos tener en cuenta.

## Requerimientos básicos

El objetivo de un log es el de proporcionarnos información persistente sobre el estado del sistema en un punto dado, así como el flujo de ejecución que llevó hasta dicho punto. Adicionalmente, suele ser interesante poder contar con datos adicionales de diagnóstico como la configuración de la aplicación, características del ordenador, etc.

Cada entrada (o mensaje) del log suele contar con una marca de tiempo (_timestamp_), lo que nos permitie asociar sucesos entre módulos, además de poder saber con más certeza cuáles mensajes pertenecen a una misma acción y cuáles a otras.

Otro factor importante a tener en cuenta es que no todos los mensajes del log son siempre útiles: algunos nos dan información sobre configuraciones inválidas o errores del sistema, mientras que otros nos indicarán las llamadas a diferentes funciones. Estas segundas son útiles cuando se quiere encontrar un error, pero de normal suponen una sobrecarga innecesaria. Esto nos lleva a que es importante poder discriminar entre niveles de mensajes (normalmente llamada _severidad_ del mensaje).

Por otro lado, es interesante contar con un log limpio por ejecución, de forma que sea fácil poder seguir los pasos del usuario. Además, normalmente no son útiles los logs antiguos, por lo que nuestra aplicación debería ser capaz de deshacerse de ellos automáticamente. A todo esto se le llama _rotación_.

¿Más en la lista a los Reyes Magos? Inspeccionar un log largo no es divertido, por no decir que difícil, así que cualquier ayuda viene bien. Una forma es guardar el log en un formato que nos permita su estudio: por ejemplo un XML correctamente etiquetado, de forma que podemos filtrar los mensajes por tipo, rango de tiempo, módulo. Otro podría ser un HTML que visualmente nos separe mensajes de información de errores.

Algo parecido podría decirse si queremos ver el log en tiempo real durante la ejecución del programa. Para ello se muestra el log por pantalla (consola, o una ventana separada). Esto permite activar una especie de modo _depuración_ sin tener que recurrir a un _debugger_ propiamente dicho (por no decir que a veces, como en aplicaciones concurrentes, abrir el depurador rompe el estado del sistema y no nos permite seguir correctamente la pista de un fallo).

## Soluciones básicas

Obviamente no todo sistema de logging debe cumplir con todo los requisitos expuestos anteriormente, y un subconjunto puede perfectamente cubrir nuestras necesidades. Recuerdo uno que solía tener siempre a la mano un antiguo compañero de trabajo, y que podría resumirse en un pequeño fichero de cabecera tipo

```cpp
#ifndef LOG_H
#define LOG_H

#include <iostream>

#ifndef NO_LOG
# define LOG(msg) std::cerr << msg << std::endl;
#else
# define LOG(msg)
#endif

#endif
```

Luego añadía variantes del `LOG` para diferentes niveles de severidad y estaba servido. No necesitaba más. Lo podía usar en desarrollo, y se podía sacar de cliente mandando una versión nueva del ejecutable y redirigiendo el error estándar a un fichero. No cumple con todo lo expuesto anteriormente pero sirve, es portable e incluso puede ser escrito sobre la marcha si se necesita. Si queréis ver la versión completa está disponible en el [repositorio del miniLogger](https://github.com/RDCH106/miniLogger).

## Boost.Log

Ahora bien, en este artículo quiero exponer una solución más completa. Usaré Boost.Log (`boost::log`), para no reinventar la rueda (bueno, al menos no toda la rueda). Como todos sabemos, Boost es uno de esos casi-inseparables de C++: mucho de lo que le falta a la biblioteca estándar se puede encontrar en Boost, hasta el punto que muchas de las nuevas adiciones a la biblioteca estándar toman como inspiración (o copia directa) a Boost.

Como muchas cosas en Boost, Boost::log es _enorme_ y _complejo_, por lo que limitaré este artículo a introducir aquellas funcionalidades que encajen con los requerimientos arriba mencionados.

### Namespaces

Para simplificar el código y hablar el mismo lenguaje, renombraremos algunos espacios de nombre y tipos:

```cpp
namespace logging = boost::log;
namespace expr = logging::expressions;
namespace attrs = logging::attributes;
namespace sinks = logging::sinks;
namespace keywords = logging::keywords;

using severity_t = logging::trivial::severity_level;
```

Boost provee varias severidades por defecto bajo `logging::trivial::severity_level`: `trace`, `debug`, `info`, `warning`, `error` y `fatal`.

### Uso básico

```cpp
logging::sources::severity_logger<severity_t> log;

BOOST_LOG_SEV(log, severity_t::info) << "Message to show";
```

Normalmente se simplifica su uso mediante macros como

```cpp
#define LOG_INFO() BOOST_LOG_SEV(log, severity_t::info)
#define LOG_DEBUG() BOOST_LOG_SEV(log, severity_t::debug)
// ...

LOG_INFO() << "Message to show";
```

### Log a consola

Siendo la configuración más simple, comenzaremos por acá. Existen varias formas de configurar el log para mostrar los mensajes por pantalla, pero la más directa es mediante:

```cpp
logging::add_console_log(std::cout, logging::keywords::format = formatter);
```

Donde `formatter` puede ser desde una simple cadena de formato tipo `>> %Message%`, a una función que lo haga. Optaremos por la segunda versión.

### Función de formateo

Esta función recibe un registro del mensaje, con atributos como el mensaje, marca de tiempo, etc., y un _stream_ al que escribir la entrada del log. Es en esta función donde podemos definir qué campos mostramos y cómo, formato del documento final (se usa el mismo tipo de función para consola que para fichero), coloreado, etc.

Abajo se muestra un ejemplo para un formateo de mensaje a mostrar por consola, con el formato `[severity] timestamp: message`. Cada mensaje además se colorea de una forma distinta dependiendo de su severidad para facilitar la lectura del mismo.

```cpp
void formatter(logging::record_view const& rec, logging::formatting_ostream& strm)
{
    strm << ">> ";

    // Severity
    static const auto s_severity_labels = std::vector<std::string>{
        "trace"s, "debug"s, "info"s, "warning"s, "error"s, "fatal"s,
    };
    static const auto s_severity_colours = std::vector<std::string>{
        "\033[37m"s, "\033[32m"s, "\033[36m"s, "\033[33m"s, "\033[31m"s, "\033[37;41m"s,
    };

    auto severity = rec[logging::trivial::severity];
    if (severity) {
        if (static_cast<std::size_t>(severity.get()) < s_severity_colours.size()) {
            // Colorize based on severity
            strm << s_severity_colours[severity.get()];

            // Show severity aligning messages
            strm << "[" << std::left << std::setw(7) << std::setfill(' ') << s_severity_labels[severity.get()] << "] ";
        }
    }

    // Timestamp and message
    strm << rec[attr_timestamp] << ": " << rec[expr::smessage];

    // Reset color
    if (severity) { strm << "\033[0m"; }
}
```

Para el estilo visual en consola se han usado códigos [ANSI/VT100](https://domoticx.com/terminal-codes-ansivt100/).

Para el uso del _timestamp_ es necesario definir el atributo en algún punto global:

```cpp
BOOST_LOG_ATTRIBUTE_KEYWORD(attr_timestamp, "TimeStamp", attrs::local_clock::value_type)
```

### Log a fichero

La configuración para guardar el log a fichero es algo más larga y conlleva crear un objeto `backend` con información como nombre de los ficheros de log y datos de rotación, y adjuntarlo a un objeto `sink` junto al formato del mismo.

```cpp
auto backend = boost::make_shared<sinks::text_file_backend>(
    keywords::file_name = dir + "/" + prefix + "_%Y%m%d_%H%M%S.html", // filename
    keywords::rotation_size = max_file_size, // maximum file size
    keywords::time_based_rotation = sinks::file::rotation_at_time_point(0, 0, 0) // rotate every day
);

backend->set_file_collector(
    sinks::file::make_collector(keywords::target = dir, keywords::max_files = max_file_count));
backend->scan_for_files(sinks::file::scan_all);

// Setup log format (HTML in this case), and messages format
// You could add your own stylesheet here for extended decoration
backend->auto_flush(true);
backend->set_open_handler(boost::lambda::_1 << "<html><h1>Log</h1><ul>\n");
backend->set_close_handler(boost::lambda::_1 << "</ul></html>\n");

sink = boost::make_shared<file_sink_t>(backend);

sink->set_formatter(formatter);

logging::core::get()->add_sink(sink);
```

En el `set_open_handler` y `set_close_handler` es posible instalar los texto a añadir al log al principio de cada fichero y al final. En el ejemplo de arriba se usa un formato HTML, pero bien se podría describir cualquier otro formato.

## Yalog

Este artículo se ha nutrido de la biblioteca de log [`yalog`](https://github.com/cbuchart/yalog), la cual podéis ojear para encontrar más detalles de implementación y usar en vuestros proyectos (está publicada bajo [licencia MIT](https://es.wikipedia.org/wiki/Licencia_MIT)).

## Otras soluciones

El objetivo de esta entrada era mostrar cómo hacer un sistema de logging usando Boost. Existen otras soluciones muy buenas disponibles. Por ejemplo, una de las que más me gusta es [spdlog](https://github.com/gabime/spdlog), por su simplicidad y eficiencia. Como nota, usa cadenas de formato tipo `fmt` en lugar de flujos de datos (`<<`).

Pueden encontrarse más en este [listado de GitHub](https://github.com/topics/logging?l=c%2B%2B&o=desc&s=updated).

## Más opciones que se pueden implementar

Este artículo no pretende cubrir al completo Boost.Log, sino ofrecer un primer acercamiento al mismo (aunque bastante completo). Como ideas futuras que se pueden agregar están:

- Clasificación de los mensajes en módulos o espacios de nombre, de forma que se puedan habilitar bajo demanda.
- Soporte para múltiples formatos de ficheros (XML, HTML, logs del sistema, etc.)
