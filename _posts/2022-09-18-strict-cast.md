---
title: Strict casting
date: 2022-09-18T00:22:00+02:00
author: Carlos Buchart
layout: post
permalink: /2022/09/18/strict-cast
image: /assets/images/featured/strict_cast.jpg
excerpt: Alternativas expresivas al type casting y con detección de cambios de API.
categories: c++ casting expressiveness
---
Es bien sabido que, en términos generales, los _warnings_ del compilador son más que mensajes de un _puritano del lenguaje_; casi siempre son una señal de que algo no está del todo bien y que deberíamos revisar: asignaciones en lugar de comparaciones, valores de un _enum_ que no se han tomado en cuenta en un _switch_, variables sin utilizar (si hay muchas para una misma función puede ser una señal de que necesitamos un _refactoring_), funciones que no devuelven valor cuando su declaración dice que sí, uso de funciones inseguras, etc.

Uno de los _warnings_ que seguramente más hayamos visto es el de conversión de un tipo más _grande_ a uno más _chico_ (o entre enteros con y sin signo), con la posible pérdida de precisión o valores inesperados.

Esto suele darse muy especialmente cuando pasamos un valor entre dos módulos que fueron diseñados con requerimientos diferentes y ahora tienen la mala suerte de vivir juntos. Algunas veces no pasará nada y será seguro su uso; en otros tendremos que recurrir a una función de conversión, o refactorizar uno de los módulos para ajustarnos a esta nueva comunicación.

En los casos en los que la conversión se considere segura probablemente querramos deshacernos del mensaje: bien sea por seguir una regla del equipo de no tener _warnings_, bien para poder seguir la compilación en caso de que se traten como errores, o por simple manía de no querer que el compilador nos _contamine_ frente a otros mensajes más relevantes. En cualquier caso esto se puede hacer mediante un `static_cast`, que además nos asegurará en tiempo de compilación que los tipos son "compatibles" entre sí, y pongo las comillas porque esto tiene una coletilla que veremos más adelante.

Antes de proseguir, comentar que todos los ejemplos serán compilados teniendo habilitados los _warnings_ de conversión entre tipos:

```shell
g++ -std=c++20 -Wconversion -Wsign-conversion -Wall main.cpp
```

## Caso de estudio

Supongamos pues el caso de que necesitemos unir dos módulos: el motor físico de un simulador de conducción y el controlador de actuadores de la cabina de entrenamiento. El primero debe pasarle al segundo la velocidad del vehículo. Ambos módulos fueron diseñados por separado y ahora nos toca integrarlos.

```cpp
#include <iostream>

using namespace std;

int16_t get_speed(int16_t time)
{
    return time;
}

void write_to_register(uint16_t reg, uint16_t value)
{
    cout << "Write " << value << " to 0x" << uppercase << hex << reg << endl;
}

int main()
{
    auto const speed = get_speed(-1);

    cout << "Speed factor: " << speed << endl;
    write_to_register(0xFF, speed);

    return 0;
}
```

### Problema y solución inicial

Todo _marcha sobre ruedas_ hasta que vemos un _warning_ que el actuador usa registros de 16 bits _sin signo_, mientras que la velocidad del simulador se devuelve como un entero de 16 bits _con signo_ (negativo indica retroceso).

```shell
main.cpp: In function 'int main()':
main.cpp:26:29: warning: conversion to 'uint16_t' {aka 'short unsigned int'} from 'short int' may change the sign of the result [-Wsign-conversion]
   26 |     write_to_register(0xFF, speed);
      |                             ^~~~~
```

Consultando el manual vemos que no es un problema del hardware sino del API del controlador (el hardware _considera_ los valores desde el 32.768 hasta el 65.535 como negativos en complemento a 2, es decir, con signo, sólo que la API fue mal escrita).

```shell
Speed factor: -1
Write 65535 to 0xFF
```

Pasado este susto decidimos silenciar el _warning_ con un `static_cast`:

```cpp
int main()
{
    auto const speed = get_speed(-3);

    cout << "Speed factor: " << speed << endl;
    write_to_register(0xFF, static_cast<uint16_t>(speed));

    return 0;
}
```

Como nota adicional, y a efectos de facilitar el entendimiento de lo que sucede, añadiremos un mensaje adicional para mostrar el valor con signo correspondiente:

```cpp
void write_to_register(uint16_t reg, uint16_t value)
{
    auto const signed_value = static_cast<std::make_signed_t<decltype(value)>>(value);
    cout << "Write " << value << " to 0x" << uppercase << hex << reg << dec <<
        ". Signed value: " << signed_value << endl;
}
```

Podemos ejecutar este ejemplo inicial en [Coliru](https://coliru.stacked-crooked.com/a/f92216805b2a4a9c).

## Primer problema: cambios en la API emisora (valor de retorno)

Como ejercicio, supongamos que el equipo de diseño del motor físico ha aumentado la potencia del sistema y ahora es capaz de reportar un mayor rango de velocidad, pasando de 16 bits a 32:

```cpp
int32_t get_speed(int32_t time);

// ...

int main()
{
    auto const speed = get_speed(-128000);

    cout << "Speed: " << speed << endl;
    write_to_register(0xFF, static_cast<uint16_t>(speed));

    return 0;
}
```

Cuando ejecutamos el sistema todo va bien, pero ya en producción algunos clientes reportan un comportamiento errático cuando el sistema alcanza grandes velocidades: ¡de repente el vehículo se ralentiza en lugar de acelerar!

```shell
Speed: -128000
Write 3072 to 0xFF. Signed value: 3072
```

Como podemos imaginar, el problema reside en que el `static_cast<uint16_t>` está ocultado un _warning_ que, de estar activo, nos habría alertado del _downcastings_ de 32 a 16 bits. El escenario completo se puede ver [acá](https://coliru.stacked-crooked.com/a/5828f9dfc9738dfd).

### Solución propuesta: `strict_cast`

Tenemos entonces dos problemas en simultáneo: silenciar el _warning_ pero recuperándolo cuando haya cambiado el escenario en el que fue silenciado. Desafortunadamente esto no es posible con ninguno de los operadores de `casting` estándar de C++, así que presentaremos uno que nos permite todo esto. Por iniciativa propia he decidido nombrar a esta solución `strict_cast`, y se puede definir como

```cpp
template<typename ExpectedFrom, typename To, typename From>
constexpr To strict_cast(From&& from)
{
    static_assert(std::is_same_v<ExpectedFrom, From>, "Invalid expected type");
    return static_cast<To>(from);
}
```

Para los más curiosos, acá no hay riesgo de deducción de tipos ya que, aunque se puede deducir el argumento no se puede deducir el tipo de retorno, por lo que hay que indicarlo explícitamente y, como es el segundo argumento del _template_, nos obliga entonces a indicar también el tipo esperado. El último tipo sí lo deducimos automáticamente para asegurar que siempre tenemos el tipo original.

Además, podemos notar cómo hemos forzado los errores mediante el `static_assert`. Así, si estamos usando este operador podemos desentendernos de la configuración del compilador y de _warnings_ ignorados.

Incorporando esta solución a nuestro ejemplo anterior (la versión `int32_t`), tenemos:

```cpp
#include <iostream>

using namespace std;

int32_t get_speed(int16_t speed)
{
    return speed;
}

void write_to_register(uint16_t reg, uint16_t value)
{
    auto const signed_value = static_cast<std::make_signed_t<decltype(value)>>(value);
    cout << "Write " << value << " to 0x" << uppercase << hex << reg << dec <<
        ". Signed value: " << signed_value << endl;
}

template<typename ExpectedFrom, typename To, typename From>
constexpr To strict_cast(From const& from)
{
    static_assert(std::is_same_v<ExpectedFrom, From>, "Invalid expected type");
    return static_cast<To>(from);
}

int main()
{
    auto const speed = get_speed(-1);

    cout << "Speed: " << speed << endl;
    write_to_register(0xFF, speed); // <-- warning here
    write_to_register(0xFF, static_cast<uint16_t>(speed)); // <-- no warning here
    write_to_register(0xFF, strict_cast<int16_t, uint16_t>(speed)); // <-- error here

    return 0;
}
```

El código completo se puede ver, como antes, en [Coliru](https://coliru.stacked-crooked.com/a/7994971a47b1ee59).

## Segundo problema: cambios en la API receptora (argumentos)

El operador propuesto funciona únicamente con los tipos conocidos _antes_ de ejecutarse el operador (el tipo de retorno esperado y el tipo de retorno real), pero no puede hacer nada con el tipo real del argumento en el que se usará el resultado, por lo que todavía quedan casos en los cuales podemos tener un error.

Para ilustrarlo digamos que, pasado un tiempo, nos anuncian que se cambiará el controlador de los actuadores por uno más moderno de 32 bits: nos dan acceso a la nueva API, todo compila sin problemas y se pasan los _tests_, pero poco después las pruebas de integración revelan un fallo: el coche no es capaz de retroceder, en su lugar acelera a tope y por fuera de los límites físicos de los actuadores.

Rápidamente pensamos en un problema por el cambio de plataforma y poco después encontramos que, efectivamente, la función de escritura al hardware cambió a:

```cpp
void write_to_register(uint16_t reg, uint32_t value);
```

El _casting_ (incluso nuestro ya amado `strict_cast`) pasó a escribir siempre valores en el rango de velocidades positivas para 32 bits; y claro, como -1 con signo es 65535 sin signo, pues el sistema se salía de rango a la mínima.

Acá la cosa se complica porque la conversión es válida y el error viene del _doble casting_ que hemos aplicado (el explícito del `strict_cast` y el implícito de 16 a 32 bits). Aún así, tenemos una forma de detectarlo pero su uso es menos intuitivo.

### Solución propuesta: `strict_args`

Lo primero que necesitamos es poder extraer el tipo de los argumentos de una función. Para ello construiremos un _invocador_ que recibirá la función que queremos llamar y sus argumentos. Luego usaremos una función _template_ que nos devolverá una tupla con los argumentos de la función en cuestión (créditos a [Cassio Neri](https://stackoverflow.com/a/18872019/1485885)), y la compararemos con una construida en base a los tipos de los valores pasados. Si todo va bien, llamamos a la función:

```cpp
template <typename R, typename... Args>
std::tuple<Args...> extract_args(R(Args...));

template<typename Function, typename... ExpectedArgs>
constexpr auto strict_args(Function&& f, ExpectedArgs... args)
{
    using function_args_t = decltype(extract_args(f));
    using expected_args_t = std::tuple<ExpectedArgs...>;
    static_assert(std::is_same_v<function_args_t, expected_args_t>, "Invalid expected types");
    return f(std::forward<ExpectedArgs>(args)...);
}
```

Como se podrá ver a continuación, su uso es un poco más _artificial_, aunque muy explícito. El ejemplo completo en [Coliru](https://coliru.stacked-crooked.com/a/a8db1f1dce2263fd).

```cpp
strict_args(write_to_register, static_cast<uint16_t>(0xFF), strict_cast<int16_t, uint16_t>(speed));
```

Puede notarse que he tenido que añadir un `strict_cast<uint16_t>` para el número del registro, que antes no hemos necesitado. Esto se debe a que en los ejemplos anteriores el compilador es lo suficientemente listo como para saber que `0xFF` _cabe_ perfectamente dentro de un `uint16_t`, mientras que con el `strict_call` debe deducir el tipo de `0xFF` _antes_ de saber que debe usarlo como 16-bits, por lo que deduce su tipo normal, un `int`. Eso sí, como se trata de un literal no me he molestado en usar el `strict_cast` en esta ocación ;).

## Otras posibles soluciones

En el caso de que dispongamos de control de la API conflictiva (`get_speed` o `write_register`), podríamos mejorar la solución aún más sin necesidades de los operadores presentados, mediante el uso de tipos fuertemente tipados (para más información se pueden consultar los artículos sobre [booleanos fuertemente tipados](https://headerfiles.com/2021/02/07/expressive-args/) y [argumentos fuertemente tipados](https://headerfiles.com/2021/07/06/expressive-args-2/)).

## Conclusiones

Hemos comentado la importancia de prestar atención a los _warnings_ de compilación y de los problemas que nos puede atraer el silenciarlos. Para resolverlo hemos presentado dos operadores: `strict_cast` para asegurarnos que el tipo del dato origen coincide con el que esperamos, y `strict_args` para comprobar si los tipos de datos de los argumentos han cambiado.

_Nota final:_ la solución propuesta es compatible con C++17. Si se quisiese usar en C++14 deberíamos cambiar las líneas del tipo `std::is_same_v<T, U>` por `std::is_same<T, U>::value`.
