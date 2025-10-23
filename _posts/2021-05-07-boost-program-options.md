---
title: Introducción a boost::program_options
date: 2021-05-07T16:16:16+01:00
author: Carlos Buchart
layout: post
permalink: /2021/05/07/boost-program-options
excerpt: Un pequeño tutorial acerca del módulo program_options de Boost para gestionar argumentos por línea de comandos.
categories: c++ boost cli
---
Toda aplicación de C++ (y C) tienen una función que sirve de _punto de entrada_, es decir, es la función que el sistema operativo llama cuando ha terminado de preparar al proceso y va a comenzar la ejecución del código propiamente dicho (puede que ocurran algunas cosas antes, pero no entraremos en eso). Esta función es la tradicionalmente conocida como _main_, y tiene la siguiente sintaxis base:

```cpp
int main(int argc, char *argv[]) {}
```

Donde el valor de retorno es el valor de retorno del proceso, y los dos parámetros son el número de argumentos recibidos, y una lista de dichos argumentos previamente separados por espacios. El primer argumento es el nombre del ejecutable (aunque puede variar dependiendo cómo haya sido lanzado el proceso).

C y C++ no limitan la forma de utilizar los argumentos de entrada, pero cada sistema operativo tiene sus estándares (_costumbres_). Por ejemplo, en Windows lo normal es usar `/` como prefijo para indicar opciones, mientras que Unix y Linux usan `-` para opciones en formato corto (una sola letra), y `--` para el formato largo. Pero de nuevo, cada programador es libre de usar el formato que desee, aunque lo mejor es adherirse al estándar del sistema.

La forma de extraer e interpretar los argumentos también se deja a merced de cada programador, y normalmente es un proceso tedioso ya que hay que lidiar con listas de opciones, formato de cada una, comandos no reconocidos, argumentos inválidos, etc. Por suerte, hay algunas ayudas como [`getopt`](https://www.gnu.org/savannah-checkouts/gnu/libc/manual/html_node/Getopt.html) en sistemas GNU, [`QCommandLineParser`](https://doc.qt.io/qt-5/qcommandlineparser.html) de Qt, y [`boost::program_options`](https://www.boost.org/doc/libs/1_76_0/doc/html/program_options.html), que es mi preferida y de la que hablaré hoy. Aunque no pueda cubrirla al 100%, ya que es bastante extensa, trataré de indicar algunos de los casos de uso más frecuentes.

### Gestión de opciones

Antes que nada, comentar una metodología de trabajo habitual cuando se desarrolla una aplicación con argumentos por línea de comandos: delegar todo este trabajo en una clase. Esto reduce la cantidad de código en el `main` (recomendable), desacopla la gestión de parámetros de su interpretación, abstrae de los detalles de implementación (nombre del parámetro, biblioteca para interpretarlos, tipo de dato, gestión de errores, etc.), y centraliza toda la variabilidad propia de los parámetros de ejecución. Así, un ejemplo (aleatorio) sería:

```cpp
// command_line_options.h
#include <string>

struct CommandLineOptions {
    std::string input_path;
    std::string output_path;

    std::string lang;

    int error_level = 0;
    bool verbose = false;

    bool parse(int argc, char* argv[]);
};
```

```cpp
#include "command_line_options.h"

int main(int argc, char* argv[]) {
    CommandLineOptions options;

    if (!options.parse(argc, argv)) { return 1; }

    // Use 'options'
    setLanguage(options.lang);
    initLog(options.error_level, options.verbose);
    // ...
}
```

## `boost::program_options`

[Boost](https://www.boost.org/), como en muchas cosas, es la gran navaja suiza de C++ (otro tanto es la biblioteca [Poco](https://pocoproject.org/), que la dejo para quien no la conozca, así como mi querido [Qt](https://www.qt.io/)). De entre todos sus módulos, suelo sacar mucho provecho de [`program_options`](https://www.boost.org/doc/libs/1_76_0/doc/html/program_options.html), que simplifica la gestión de argumentos de entrada de un programa. A lo largo del artículo usaré el alias `po` para referirme a este espacio de nombres.

Su funcionamiento podríamos dividirlo en tres partes:

- Definición de opciones
- Análisis de los argumentos
- Uso de las opciones

### Definición de opciones

Acá listaremos todas las opciones que nuestra aplicación reconoce, indicando su nombre, tipo y descripción. Para ello usamos la clase `options_description`.

En el siguiente ejemplo definimos los posibles comandos `-? / --help`, `--input / -i`, `--output / -o`, `--language`, `--error-level`, `-v / --verbose`:

```cpp
po::options_description po_desc("Allowed options");
po_desc.add_options()
  ("help,?", "shows this help message")
  ("input,i", po::value<std::string>()->required(), "input path")
  ("output,o", po::value<std::string>()->required(), "output path")
  ("language", po::value<std::string>()->default_value("en"), "UI language")
  ("error-level", po::value<int>()->default_value(0), "error level")
  ("verbose,v", po::bool_switch()->default_value(false), "show verbose log")
  ;
```

Cada opción se define con el nombre de la misma, pudiendo añadir el formato corto. A continuación se puede especificar el tipo (con un valor por defecto si fuese el caso), o si es obligatoria. Por último, se añade una descripción de la opción, que será la mostrada en la línea de comandos al solicitar la ayuda.

En lo particular me gusta darle valores por defecto a las opciones no obligatorias; de esta forma se simplifica el flujo posterior, la validación de la entrada y hace nuestro código un poco más robusto ante omisiones.

Un ejemplo de argumentos para nuestra aplicación anterior sería: `app --input file.txt -o output.txt --error-level 5 -v`.

#### Parámetros ocultos

Es posible definir los parámetros en diversos `options_description`. Los principales usos son el de poder discriminar cuáles se usan (por ejemplo, en base a la versión del sistema anfitrión, licencia del cliente, variables de entorno, etc.), o el de definir parámetros ocultos (ya veremos a qué me refiero).

Boost sólo puede interpretar un único conjunto de opciones, así que la solución pasa por unificar las que necesitemos como paso previo a la interpretación:

```cpp
po::options_description po_desc_hidden("Hidden options");
po_desc_hidden.add_options()
  ("gold", po::bool_switch()->default_value(false), "give you a lot of gold")
;

po::options_description cmdline_options;
cmdline_options.add(po_desc).add(po_desc_hidden);
```

#### Sugerencia👀

Como nota de experiencia, sugiero desactivar el formateo automático de código para esta sección, a fin de mantener cada opción en una línea. Esto mejora la lectura del código y mantiene más limpio el historial de cambios en el repositorio. Por ejemplo, si usáis `clang-format` se puede hacer de la siguiente forma:

```cpp
// clang-format off
po_desc.add_options()
  // ...
  ;
// clang-format on
```

### Análisis de los argumentos

El siguiente paso es _parsear_ (analizar gramaticalmente) la línea de comandos:

```cpp
po::variables_map po_vm;
try {
  po::store(po::command_line_parser(argc, argv).options(cmdline_options).run(), po_vm);
  po::notify(po_vm);
} catch (po::error &e) {
  std::cout << e.what() << '\n';
  std::cout << po_desc << '\n';
  return false;
} catch (...) {
  std::cout << "Unknown error\n";
  std::cout << po_desc << '\n';
  return false;
}
```

Si la línea de comandos tiene algún error (normalmente parámetros desconocidos o formato incorrecto), capturaremos la excepción (mostrando el error si lo conocemos) y luego mostramos una ayuda para que el usuario sepa cuál es la sintaxis correcta (`std::cout << po_desc << '\n'`). Nótese que en esta línea _no_ usamos `cmdline_options` sino `po_desc`, que es la que contiene la lista de opciones pública; si mostrásemos `cmdline_options` estaríamos revelando todas las opciones del programa (y en este ejemplo no nos interesa). Por último, indicamos que la función `parse` ha fallado devolviendo un `false`.

### Uso de las opciones

Ahora tenemos la línea de comandos descompuesta en las opciones que hemos definido, y almacenadas en la variable `po_vm`; solamente nos queda poner los valores correctos a las variables.

Existen varias formas de acceder a estas opciones, aunque las tres más comunes son:

- Verificando si la opción ha sido escrita por el usuario: `po_vm.count("option_name") > 0`.
- Sabiendo que existe (bien por el método anterior, o porque hemos indicado que siempre tenga un valor por defecto), podemos acceder a su valor: `po_vm["option_name"].as<T>`, donde `T` es el tipo de datos que hemos indicado en la definición. Aviso⚠: acceder de esta forma a una opción no definida o sin valor lanza una excepción. Por mi parte, en lo posible trato de que todas las opciones no obligatorias tengan un valor por defecto.
- Asociando una opción a una variable: esta opción es muy práctica, aunque no la suelo usar simplemente porque me gusta separar mentalmente el análisis de la interpretación, sabiendo que no tengo valores a medias en caso de error. Para asociar una opción a una variable solamente tenemos que indicarlo en la definición de la opción: `("language", po::value<std::string>(&lang), "UI language")`.

```cpp
if (po_vm.count("help")) {
  std::cout << po_desc << '\n';
  return false;
}

input_path = po_vm["input"].as<std::string>();
output_path = po_vm["output"].as<std::string>();

lang = po_vm["language"].as<std::string>();

error_level = po_vm["error-level"].as<int>();
verbose = po_vm["verbose"].as<bool>();
```

### Otros tópicos

#### Argumentos posicionales

Los argumentos posicionales son aquellos cuya semántica viene dada por su posición en la lista de argumentos. Por ejemplo `app input.txt output.txt` podría tener dos argumentos posicionales, donde el primero representa al ruta del fichero de entrada y el segundo la ruta del de salida.

De nuestro ejemplo anterior, supongamos queremos que el fichero de entrada y el de salida sean posicionales:

```cpp
po::positional_options_description po_pos;
po_pos.add("input", 1);
po_pos.add("output", 1);
```

Los argumentos se seleccionan en el orden en el que se definen, y se asocian a la opción que se indica. El número después del nombre indica cuántos argumentos de ese tipo se esperan, donde `-1` indica ilimitados (como sugiere la lógica, no se pueden definir nuevos argumentos posicionales una vez se define uno ilimitado).

Por último, es necesario añadirlos al analizador:

```cpp
po::store(po::command_line_parser(argc, argv).options(cmdline_options).positional(po_pos).run(), po_vm);
```

#### Argumentos en UNICODE

Me gustaría hacer un comentario aparte acerca de cuando los argumentos no usan una codificación ANSI: si necesitamos leer un fichero y su ruta (_path_) viene dado como argumento de la línea de comandos, es probable que dicha ruta contenga caracteres fuera del espectro de ANSI: vocales acentuadas, la española Ñ, caracteres en cirílico, un nombre de usuario en chino tradicional, etc. Por supuesto, aunque este quizá sea el escenario más tradicional, podríamos encontrar el mismo problema en muchos otros.

Este problema lo planteé en [Stack Overflow](https://stackoverflow.com/q/59143297/1485885) hace ya un tiempo; expongo acá la respuesta como complemento del artículo. Importante⚠: esta solución está enfocada a Windows.

- Cambiar el punto de entrada para que acepte cadenas de texto en UNICODE: `int wmain(int argc, wchar_t* argv[])`.
- Usar `boost::program_options::wvalue` en lugar de `boost::program_options::value` cuando el argumento espere valores en UNICODE.
- Usar un tipo de datos `std::wstring` para estos argumentos.
- Usar `boost::program_options::wcommand_line_parser` en lugar de `boost::program_options::command_line_parser` para aceptar la lista de argumentos en `wchar_t*`.

#### Aun más

Este breve tutorial deja por fuera algunas otras opciones, que enumero a continuación:

- Uso de sintaxis no estándar).
- Permitir argumentos no registrados (por ejemplo, para re-enviarlos a otro comando).
- Uso de argumentos provenientes del punto de entrada `WinMain`.
- Validadores personalizados (por ejemplo, que sea requiera un e-mail y sea el propio Boost el que compruebe que la entrada corresponde con un formato de e-mail válido).

Estos tópicos están documentados en [este anexo de Boost](https://www.boost.org/doc/libs/1_76_0/doc/html/program_options/howto.html).

## Ejemplo completo

Se puede probar la mayoría del código de este artículo [en vivo](https://coliru.stacked-crooked.com/a/83a138e425388a46).
