---
title: Devolviendo cadenas, los punteros colgantes de Babilonia
date: 2020-01-27T23:58:38+01:00
author: Carlos Buchart
layout: post
permalink: /2020/01/27/devolviendo-cadenas-los-punteros-colgantes-de-babilonia/
excerpt: Comentamos los problemas de memoria que pueden surgir al devolver cadenas del estilo C.
categories: c++ pointers memory
---
## Introducción

En mis clases de Sistemas Operativos suelo dedicar un apartado a problemas de gestión de memoria, especialmente en el lado del programador: pérdidas de memoria (_memory leaks_), accesos fuera de límites (_out-of-bound access_), punteros colgantes (_dangling pointers_), entre otros. De los dos primeros ya hablaremos en otra ocasión, esta entrada versará sobre el último, los _dangling pointers_.

Un puntero colgante es, básicamente, un puntero que contiene una dirección de memoria inválida (cuando digo puntero me refiero también, si aplica, a referencias a objetos). Una dirección inválida puede ser:

- una dirección basura, normalmente un puntero sin inicializar,
- un puntero a una zona de memoria que ya no nos pertenece, tal como puntero a un objeto destruido,
- en la captura de un lambda una referencia a un objeto que es destruido mientras el lambda sigue siendo utilizado,
- un puntero a una zona de memoria del proceso pero incorrectamente interpretada; similar al segundo caso pero donde una reserva posterior hizo que la dirección del puntero volviese a estar dentro de las reservas del proceso, pero, claro, ahora con otro significado. Cabe destacar que este último caso es raro, especialmente en aplicaciones de 64 bits, salvo que el puntero estuviese apuntando al _stack_.

Sin entrar en detalle, podemos enumerar algunas soluciones o ayudas a estos problemas:

- usar `std::unique_ptr`, `std::shared_ptr`, `std::weak_ptr` para gestionar correctamente la propiedad del recurso,
- inicializar todas las variables (particularmente me gusta la [nueva sintaxis de C++11](https://en.cppreference.com/w/cpp/language/data_members#Member_initialization) para variables miembro, ya que se ve cuáles no han sido inicializados, además de simplificar los constructores),
- no usar referencias por defecto en las captura de los lambdas, entre otros.

## Devolviendo cadenas como punteros a `char`

En este artículo me gustaría comentar un caso un poco oculto de _dangling pointer_. Consideremos que tenemos una biblioteca que debe proveer una API usando únicamente PODs ([_plain old data_](https://stackoverflow.com/q/146452/1485885)) (ver al final del artículo un posible escenario para necesitar esta solución):

```cpp
class Dict {
public:
  void setValue(const char* field_name, const char* value) {
    assert(field_name);
    assert(value);
    m_values[field_name] = value;
  }

  const char* getValue(const char* field_name) const {
    assert(field_name);
    if (const auto it = m_values.find(field_name); it != end(m_values)) return it.second.c_str(); // requiere C++17
    return nullptr;
  }

private:
  std::map<std::string, std::string> m_values;
};
```

El método [`std::string::c_str`](https://en.cppreference.com/w/cpp/string/basic_string/c_str) devuelve el puntero a la cadena de caracteres (terminada en nulo). Este puntero se garantiza que es válido siempre y cuando no se efectúen operaciones que puedan modificar de alguna forma la cadena, ya que en ese caso la clase podría requerir reservar un nuevo bloque de memoria.

Ahora, supongamos que la biblioteca debe proveer un mecanismo para serializar la clase en un JSON:

```cpp
class Dict {
public:
  // ...
  const char* toJSON() const {
    std::string json = '{' + std::accumulate(begin(m_values), end(m_values), std::string{},
      [](const std::string& s, const std::pair<std::string, std::string>& p) {
        const auto e = '\"' + p.first + "\":\"" + p.second + '\"';
        if (s.empty()) return e;
        return s + ',' + e;
      }) + '}';

     return json.c_str(); // < ???
  }
  // ...
};
```

En este caso, `Dict::toJSON` está devolviendo un puntero inválido, ya que el objeto local `json` es destruido al finalizar la ejecución de la función, y por lo tanto su memoria es liberada.

## Primera aproximación

Una posible solución sería usar una variable estática o miembro, que no es destruida al terminar la función:

```cpp
class Dict {
public:
  // ...
  const char* toJSON() const {
    static std::string json;

    json = '{' + std::accumulate(begin(m_values), end(m_values), std::string{},
      [](const std::string& s, const std::pair<std::string, std::string>& p) {
        const auto e = '\"' + p.first + "\":\"" + p.second + '\"';
        if (s.empty()) return e;
        return s + ',' + e;
      }) + '}';

    return json.c_str();
  }
  // ...
};
```

En este caso ya no tendríamos el puntero inválido, pero sí una posible condición de carrera en caso de que el método fuese invocado de forma concurrente (lo mismo podría pasar si la cadena fuese miembro del objeto). Y no cambia mucho el escenario si protegiésemos el objeto para solucionar la condición de carrera, ya que sólo sería válido el último puntero devuelto.

## Solución usando un buffer por hilo

La siguiente función resuelve el problema por completo, creando una pequeña lista circular _por hilo_ en la que se almacena una copia de la cadena y devolviendo un puntero a dicha copia.

```cpp
const char *saveString(std::string str)
{
  if (str.empty()) return ""; // no gastes espacio en el buffer circular

  thread_local std::array<std::string, 16> s_buffer;
  thread_local size_t s_next_string = s_buffer.size() - 1;

  s_next_string = (s_next_string + 1) % s_buffer.size();
  s_buffer[s_next_string] = std::move(str);

  return s_buffer[s_next_string].c_str();
}

const char *foo()
{
  std::string bar;
  // ...
  return saveString(bar);
}

std::string foobar = foo();
```

Lo interesante de esta función es el uso de [`thread_local`](https://en.cppreference.com/w/cpp/language/storage_duration), un especificador de duración de almacenamiento similar a `static` pero que en lugar de establecer la destrucción de las variables al finalizar el proceso, éstas son destruidas al terminar el hilo. De esta forma garantizamos una lista circular por cada hilo. Una explicación más completa puede encontrarse [acá](https://stackoverflow.com/q/11983875/1485885).

Como nota final, el número de elementos normalmente no debería ser muy elevado, ya que la misión de esta función es la de servir de puente, no de almacenamiento a largo plazo.

## Ejemplo completo

Se puede ejecutar online en [Coliru](https://coliru.stacked-crooked.com/a/8621b4e3a77e14ac).

```cpp
#include <iostream>
#include <cassert>
#include <vector>
#include <string>
#include <map>
#include <numeric>
#include <thread>
#include <mutex>
#include <sstream>

const char *saveString(std::string str)
{
  if (str.empty()) return ""; // no gastes espacio en el buffer circular

  thread_local std::vector<std::string> s_buffer(16);
  thread_local size_t s_next_string = s_buffer.size() - 1;

  s_next_string = (s_next_string + 1) % s_buffer.size();
  s_buffer[s_next_string] = std::move(str);

  return s_buffer[s_next_string].c_str();
}

class Dict {
public:
  void setValue(const char* field_name, const char* value) {
    assert(field_name);
    assert(value);
    m_values[field_name] = value;
  }

  const char* getValue(const char* field_name) const {
    assert(field_name);
    if (const auto it = m_values.find(field_name); it != end(m_values))
      return it->second.c_str(); // requiere C++17
    return nullptr;
  }

  const char* toJSON() const {
    std::string json = '{' + std::accumulate(begin(m_values), end(m_values), std::string{},
      [](const std::string& s, const std::pair<std::string, std::string>& p) {
        const auto e = '\"' + p.first + "\":\"" + p.second + '\"';
        if (s.empty()) return e;
        return s + ',' + e;
      }) + '}';

     return saveString(json);
  }

private:
  std::map<std::string, std::string> m_values;
};

std::mutex cout_mutex;
void print(Dict d)
{
  std::stringstream ss;
  ss << std::this_thread::get_id();
  d.setValue("id", ss.str().c_str());

  const auto json = d.toJSON();

  std::lock_guard lock(cout_mutex);
  std::cout << json << '\n';
}

int main()
{
  Dict d;
  d.setValue("firstname", "Carlos");
  d.setValue("lastname", "Buchart");
  d.setValue("website", "https://headerfiles.com");

  std::vector<std::thread> threads(20);
  for (auto &t : threads) {
    t = std::thread{print, d};
  }

  for (auto &t : threads) {
    t.join();
  }
}
```

## Actualización

Un comentario que ha surgido a raíz del artículo es sobre por qué complicarse la vida devolviendo el puntero en lugar del `std::string` directamente y usar luego el método `std::string::c_str` en local. Aunque pueden haber distintos escenarios, el que motiva este artículo es la integración de módulos que usan [_runtimes_](https://en.wikibooks.org/wiki/C_Programming/Standard_libraries#Common_support_libraries) distintos (normalmente uno estático y otro dinámico).

Explicado brevemente, el problema es que cada _runtime_ tiene sus propias estructuras de gestión de memoria, por lo que si un módulo reserva memoria en un _runtime_, ésta no puede ser liberada en otro _runtime_, ya que el segundo no conoce la reserva del primero (más información [acá](https://stackoverflow.com/q/12215681/1485885)). Es por ello que las interfaces entre estos módulos no comunican objetos, para evitar que la construcción la realice un _runtime_ y la destrucción otro.
