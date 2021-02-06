---
title: Argumentos expresivos
date: 2021-02-067T00:00:00+01:00
author: Carlos Buchart
layout: post
permalink: /2021/02/07/expressive-args/
image: /assets/images/featured/expressive_args.jpg
---
Una de las tareas a las que más me enfrento cuando leo código heredado, o mi propio código antiguo (donde antiguo puede ser de hace un par de semanas), es saber qué es cada parámetro de una función: en `Rectangle::computeArea(4.5, 3.1)` ¿qué representa 4.5 y qué 3.1? ¿área y altura, o al revés? O en `car.setSpeed(50)`, ¿son kilómetros por hora, millas por hora, metros por segundo?

Para el segundo caso, C++11 viene en nuestra ayuda con literales definidos por el usuario, al que otro día igual dedicamos un tiempo. Mientras tanto os recomiendo [esta presentación de Bjarne Stroustrup](https://youtu.be/0iWb_qi2-uI?t=1130) al respecto (aunque luego habla de más cosas interesantes, como el extenso uso del RAII en C++ moderno).

Por otro lado, en el primer ejemplo no me refiero a métodos para fijar propiedades (`setVisible(bool)`, `setWidth(int)`), sino a esos argumentos cuyo significado sólo se puede saber mirando la declaración de la función (y rezando para que tenga un nombre con sentido), por ejemplo: `void showAnalysisWidget(bool read_only, bool maximized)`, donde una llamada `showAnalysisWidget(true, true)` poco nos dice.

Adicionalmente, tenemos algunas posibles fuentes de errores, como intercambiar los nombres de los argumentos en la clase base durante un _refactoring_, pero olvidarse de hacerlo en las subclases; problema que no sería detectado por ningún compilador y que de seguro pasaría inadvertido en muchos escenarios de prueba. Además, podríamos toparnos con conversiones implícitas de enteros o punteros a booleanos.

### Posibles soluciones
Lenguajes como Python ayudan en este problema mediante la posibilidad de usar el nombre del argumento en la llamada. De hecho, se quería que dicha funcionalidad fuese incluida en C++20, pero al final no ha entrado en el estándar (de momento). La sintaxis propuesta era similar a `showAnalysisWidget(.read_only=true, .maximized=true)`.

En C++ podemos atacar el problema con una combinación de tipeado fuerte y de bloquear las conversiones implícitas. Como ejemplo tomaré el caso de argumentos booleanos, donde el problema se reduce en poder indicar si el argumento es verdadero o falso. En este caso además, interesa poder dar contexto a la vez que no añadimos demsiado ruido a nuestro código.

Los siguientes dos artículos de [FluenCpp](https://www.fluentcpp.com/2018/05/04/passing-booleans-to-an-interface-in-an-expressive-way/) y [Andrzej's](https://akrzemi1.wordpress.com/2017/02/16/toggles-in-functions/) abordan el problema en cuestión con diferentes técnicas (los comentarios también aportan algunas interesantes).

#### Enumeraciones
Una de las ténicas que más se usan es la de definir enumeraciones con dos posibles valores `False`y `True`, y usar el tipo de dicha enumeración en lugar del booleano. Por ejemplo

```cpp
enum class ReadOnly { False, True };
enum class Maximized { False, True };
void showAnalysisWidget(ReadOnly read_only, Maximized maximized);

// ...
showAnalysisWidget(ReadOnly::True, Maximized::False);
```

Esto documentaría muy bien el contexto de cada argumento, evitaría confusiones de tipo así como conversiones implícitas. Las pocas _pegas_ son que si queremos usar el argumento en un condicional debemos hacer una comparación "tipográficamente más larga": `if (read_only == ReadOnly::True)` o `if (static_cast<bool>(read_only))`, o al querer convertir una expresión booleana en argumento de nuestra función. Un ejemplo en vivo puede verse [acá](https://wandbox.org/permlink/cTOU2txr974xyW7D).

#### Clase TrueFalse
Esta solución también es bastante corta y sencilla de recordar, y no tiene los inconvenientes antes vistos con los _castings_, y particularmente es mi preferida. Básicamente se trata de construir una pequeña clase que sólo pueda ser construida con un booleano y que se convierte implícita en booleano si hace falta. Además, una sencilla macro nos facilita la vida a la hora de declarar nuevos tipos.


```cpp
struct TrueFalse
{
  const bool value;

  explicit TrueFalse(bool value) : value{value} {}

  operator bool() const { return value; }
};
#define DEF_TRUE_FALSE(name) struct name : TrueFalse { using TrueFalse::TrueFalse; }

DEF_TRUE_FALSE(ReadOnly);
DEF_TRUE_FALSE(Maximized);

void showAnalysisWidget(ReadOnly read_only, Maximized maximized);

// ...
showAnalysisWidget(ReadOnly{true}, Maximized{false});
```

Ahora bien, puede que nos interese deshabilitar las conversiones de otros tipos a booleano, para ello simplemente eliminamos dichos constructores:

```cpp
explicit TrueFalse(int value) = delete;
explicit TrueFalse(const void* value) = delete;
explicit TrueFalse(double value) = delete;
```

Una versión completa de este código puede ser probada [acá](https://wandbox.org/permlink/hwRgYk9oxKdIKVpL).

Esta técnica además puede ser replicada para crear tipos básicos como la mencionada "velocidad", que unido a los literales definidos por el usuario, dotan a nuestro código de una expresividad y robustez casi insuperables.

Como nota final, documentándome mientras escribía esta entrada me topé con la biblioteca [explicit](https://github.com/akrzemi1/explicit), que entre otras cosas, tiene una variante de esta solución algo más completa (`tagged_bool`).
