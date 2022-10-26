---
title: Mostrar la fecha de compilación
date: 2020-08-17T09:12:44+02:00
author: Carlos Buchart
layout: post
permalink: /2020/08/17/mostrar-fecha-compilacion/
image: /assets/images/featured/build_timestamp.jpg
excerpt: 'Un dato importante cuando se está investigando un fallo o probando una nueva funcionalidad en un software es saber sobre qué versión del código estamos trabajando. Veamos un poco qué otra información nos puede ayudar.'
categories: c++ build
---
## Introducción

Un dato importante cuando se está investigando un fallo o probando una nueva funcionalidad en un software es saber sobre qué versión del código estamos trabajando. Además del _número de versión_ (más adecuado para versiones públicas) o el número de compilación, una forma de identificar la versión actual del código es usando la fecha de compilación del mismo. Este dato tiene varias ventajas inherentes: no necesita de ningún contador que haya que incrementar, viene de _fábrica_, y es natural usarlo tanto en conversaciones (en la compilación de hace dos días...) como al buscar el _commit_ relacionado.

## Posibles soluciones

C y C++ proveen de tres macros relacionadas que son de utilidad:

- [`__DATE__`](https://www.cprogramming.com/reference/preprocessor/__DATE__.html): devuelve la fecha de compilación del fichero en formato `mmm dd yyyy` (por ejemplo: `Aug 17 2020`).
- [`__TIME__`](https://www.cprogramming.com/reference/preprocessor/__TIME__.html): devuelve la hora de compilación del fichero en formato `hh:mm:ss` (por ejemplo: `08:31:45`).
- [`__TIMESTAMP__`](https://www.cprogramming.com/reference/preprocessor/__TIMESTAMP__.html): devuelve la fecha y hora de modificación del fichero en formato `Ddd Mmm Date hh:mm:ss yyyy` (por ejemplo `Mon Aug 17 08:31:45 2020`).

Nótese que `__TIMESTAMP__` es la fecha/hora de modificación del fichero, mientas que `__DATE__` / `__TIME__` muestran la fecha/hora en la que se compiló (una explicación extendida puede encontrarse en [Stack Overflow](https://stackoverflow.com/q/27691101/1485885)). Usualmente nos interesa es tener una referencia de los cambios, por lo que la fecha de modificación puede ser suficiente (de ahí que generalice el uso de _fecha de compilación_). Siempre podemos obligar a que el fichero se modifique como un paso de _pre-build_, por ejemplo mediante un _touch_.

Para una inspección rápida simplemente debemos mostrarlos cuando consideremos adecuado:

```cpp
std::cout << "Source timestamp: " << __TIMESTAMP__ << '\n';
```

Ahora bien, para trazas más elaboradas, tales como mensajes al usuario que deban estar traducidos o simplemente para dejarlos en el formato estándar de fecha de nuestra empresa.

La siguiente función extrae los componentes de fecha y hora y construye una nueva cadena de texto en base al formato presentado (los especificadores de formato son estándar y están listados [acá](http://www.cplusplus.com/reference/ctime/strftime/)). Dejo al lector la modificación del código para usar `__DATE__` y `__TIME__` en lugar de `__TIMESTAMP__`.

```cpp
std::string getFormattedBuildDatetime(const std::string &format)
{
  // Build timestamp, uses Boost to allow conversion from the compiler
  // __TIMESTAMP__ string to a custom format
  namespace bt = boost::posix_time;

  // Normalize timestamp
  std::string timestamp(__TIMESTAMP__);
  const auto it_dblspace = timestamp.find("  ");
  if (it_dblspace != std::string::npos) { // replace day with leading space by
                                          // day with leading zero
    timestamp.replace(it_dblspace, 2, " 0");
  }

  // Extract individual components
  std::istringstream is(timestamp);
  const std::locale ts_locale(std::locale::classic(), new bt::time_input_facet("%a %b %d %H:%M:%S %Y"));
  is.imbue(ts_locale);
  bt::ptime pt;
  is >> pt;

  // Format output
  std::ostringstream os;
  os.imbue(std::locale(std::locale::classic(), new bt::time_facet(format.c_str())));
  os << pt;

  return os.str();
}
```

Ejemplo de uso:

```cpp
std::cout << "Formatted: " << getFormattedBuildDatetime("%Y/%m/%d %H:%M:%S") << '\n';
```

Un ejemplo completo puede encontrarse en [GitHub](https://github.com/BlogHeaderFiles/SourceCode/tree/master/BuildDateTime).

## Créditos

La imagen del reloj de la cabecera es obra de [www.flaticon.es](https://www.flaticon.es/).
