---
title: Automatizando acciones gracias al RAII (parte II)
date: 2020-01-17T18:22:21+01:00
author: Carlos Buchart
layout: post
permalink: /2020/01/17/automatizando-acciones-gracias-al-raii-parte-ii/
excerpt: En la entrada anterior estudiamos lo que es el RAII, cómo es una de las técnicas bases de C++11 y algunos ejemplos. En esta segunda parte comentaremos otros usos del RAII y cómo podemos hacer pequeños apaños mediante wrappers cuando el RAII no está disponible por la razón que sea.
categories: c++ raii
---
En la [entrada anterior](/2020/01/13/automatizando-acciones-gracias-al-raii-parte-i/) estudiamos lo que es el [RAII](https://es.wikipedia.org/wiki/RAII), cómo es una de las técnicas bases de C++11 y algunos ejemplos.

En esta segunda parte comentaremos otros usos del RAII y cómo podemos hacer pequeños apaños mediante _wrappers_ cuando el RAII no está disponible por la razón que sea.

## Inicializaciones complejas

Supongamos el siguiente código:

```cpp
class Database {
  Connection* m_connection = nullptr;

public:
  bool init(const std::string& url) {
    m_connection = new Connection(url);

    if (!m_connection) {
        return false;
    }

    if (!m_connection->connect()) {
      delete m_connection;
      m_connection = nullptr;

      return false;
    }

    if (!m_connection->login()) {
      delete m_connection;
      m_connection = nullptr;

      return false;
    }

    return true;
  }
};
```

_(Como nota al margen, recordad que es legal hacer un `delete` sobre un puntero nulo.)_

Un problema de este código es que, como vimos anteriormente, tiene una gestión de fallos complicada, mucho código repetido por si ocurriese algo (hay que dejar el objeto en un estado coherente). Obviamente podríamos condensar los condicionales mediante un _and_ pero a largo plazo eso no haría sino dificultar la lectura del código.

Una opción sería usar excepciones, pero en caso de que la clase `Connection` no lanzase ninguna veamos qué puede hacer el RAII (y C++11) por nosotros:

```cpp
class Database {
  std::unique_ptr<Connection> m_connection;

public:
  bool init(const std::string& url) {
    auto connection = std::make_unique<Connection>(url);

    if (!connection) { return false; }
    if (!connection->connect()) { return false; }
    if (!connection->login()) { return false; }

    // A partir de este punto ya no hay opción a fallos y podemos 'guardar' los cambios
    m_connection.swap(connection);

    return true;
  }
};
```

Nos queda un código más limpio, directo, expresivo. Este método ya lo vimos en la entrada anterior aunque aplicado al caso de que necesitásemos devolver un objeto. Recordad que un `std::unique_ptr<T>` libera la memoria automáticamente al destruirse. El método [`swap`](https://es.cppreference.com/w/cpp/memory/unique_ptr/swap) intercambia los objetos de cada `unique_ptr`.

## RAII donde no hay RAII

Algunas (¿muchas?) veces tenemos que trabajar con bibliotecas que tienen una API que no provee RAII de forma nativa. Una en particular pudiese ser la API de Windows y sus _handles_. Tomemos el caso de los mutex (documentación oficial [acá](https://docs.microsoft.com/en-us/windows/win32/sync/using-mutex-objects)), donde no existe el equivalente al [`std::lock_guard`](https://en.cppreference.com/w/cpp/thread/lock_guard) (RAII):

```cpp
HANDLE mutex = CreateMutex(NULL, FALSE, NULL);

void foo() {
  WaitForSingleObject(mutex, INFINITE);
  // Sección crítica
  ReleaseMutex(mutex);
}
```

Es fácil intuir que usar mal el mutex no es muy difícil; por ejemplo, si hay varios puntos de salida y nos olvidamos el `ReleaseMutex` en alguno, gestión de excepciones, etc. Para solucionarlo, podemos programar nuestro propio `lock_guard` que _habilite_ el RAII para nosotros:

```cpp
class LockGuard {
  HANDLE m_mutex;

public:
  explicit LockGuard(HANDLE mutex) : m_mutex{mutex} {
    // Asumiendo siempre que queremos poner un timeout infinito
    WaitForSingleObject(mutex, INFINITE);
  }

  ~LockGuard() {
    ReleaseMutex(m_mutex);
  }
}

void foo() {
  LockGuard guard{mutex};

  // Sección crítica
}
```

De igual forma podemos hacer clases individuales basadas en RAII para nuestras diferentes necesidades. En lo particular nunca me ha gustado eso de escribir _código similar que difiere en pocas cosas_, por lo que comparto una solución genérica que nos ahorrará el crear estas clases intermedias:

```cpp
#include <iostream>
#include <functional>

class RAII_Helper {
public:
  explicit RAII_Helper(std::function<void(void)> on_finish)
    : m_finish_handler{std::move(on_finish)} {
  }

  explicit RAII_Helper(std::function<void(void)> on_start,
                       std::function<void(void)> on_finish)
    : m_finish_handler{std::move(on_finish)} {
    if (on_start) on_start();
  }

  RAII_Helper(const RAII_Helper&) = delete;
  RAII_Helper(const RAII_Helper&&) = delete;

  ~RAII_Helper() {
    if (m_finish_handler) m_finish_handler();
  }

private:
  const std::function<void(void)> m_finish_handler;
};

int main()
{
  RAII_Helper raii_saluda{[](){ std::cout << "Hola\n"; },
                          [](){ std::cout << "¡Adiós!\n"; }};
  std::cout << "Esperando...\n";
}
```

```text
Hola
Esperando...
¡Adiós!
```

Código disponible en [Coliru](https://coliru.stacked-crooked.com/a/419f157c75cf09fc).
