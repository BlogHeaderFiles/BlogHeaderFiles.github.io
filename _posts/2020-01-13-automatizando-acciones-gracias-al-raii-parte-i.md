---
title: Automatizando acciones gracias al RAII (parte I)
date: 2020-01-13T09:30:15+01:00
author: Carlos Buchart
layout: post
permalink: /2020/01/13/automatizando-acciones-gracias-al-raii-parte-i/
excerpt: 'Uno de los aspectos que más me gusta de C++ es el RAII (Resource Acquisition Is Initialization). Introducida por Bjarne Stroustrup, esta técnica hace uso de los constructores y destructores para la correcta gestión de recursos.'
---
Como mencioné en una entrada anterior, uno de los aspectos que más me gusta de C++ es el [RAII](https://es.wikipedia.org/wiki/RAII) (Resource Acquisition Is Initialization). Introducida por Bjarne Stroustrup (creador de C++), esta técnica hace uso de los constructores y destructores para la correcta gestión de recursos. Tiene como bases las siguientes premisas:

 -  Un constructor siempre se ejecuta antes de que el objeto pueda ser usado, por lo que es un lugar seguro para reservar, inicializar, preparar los recursos a ser utilizados posteriormente.
 -  Los destructores son llamados implícitamente cuando el objeto, bueno, se destruye, y es lo último que hace el objeto antes de liberar su propia memoria. Es el momento adecuado de liberar otros recursos usados.
 -  Lo único que está garantizado que se ejecutará después de una excepción son los destructores de los objetos ya creados.

Además, recordar que:

 -  Los miembros de una clase se destruyen automáticamente al destruir un objeto (y a su vez los miembros de los miembros, etc).
 -  Las variables locales y parámetros, por estar en el _stack_, son destruidos automáticamente al finalizar su alcance.

Lo que implica que podemos automatizar la gestión de gran parte de los recursos de nuestra aplicación únicamente con esta técnica. Casi todo C++ hace uso de la misma; acá algunos ejemplos:

### Colecciones dinámicas (_arrays_ dinámicos)
[`std::vector<T>`](https://es.cppreference.com/w/cpp/container/vector) permite sustituir el duo `new[]` / `delete[]` cuando se necesitan colecciones contiguas de elementos homogéneos, por no decir que añade características adicionales como poder añadir/quitar elementos, consultar su tamaño, etc.

#### Usando `new[]` / `delete[]`
```cpp
C* foo(size_t n) {
  auto old_style = new C[n];

  size_t count = 0;
  for (size_t ii = 0; ii < n; ++ii) {
    if (!old_style[ii].is_valid()) {
      delete[] old_style;
      return nullptr;
    }

    if (old_style[ii].bar()) {
      ++count;
    }
  }

  if (count < n / 2) {
    delete[] old_style;
    return nullptr;
  }

  return old_style;
}

int main() {
  auto c = foo(100);

  delete[] c;
}
```

He acá los principales _defectos_ de este código:

 -  El programador es el encargado de gestionar la memoria para cada punto de salida de la función `foo` (3 en este caso).
 -  La función que llame a `foo` hereda esta responsabilidad.
 -  Adicionalmente, es fácil perder el contexto y no saber cuántos elementos tiene `c`, teniendo que guardarlo para evitar errores de acceso fuera de límites.

#### Usando `std::vector<T>`
```cpp
std::vector<C> foo(size_t n) {
  std::vector<C> vector_style(n);

  size_t count = 0;
  for (const auto& c : vector_style) {
    if (!c.is_valid()) { return {}; }

    if (old_style[ii].bar()) {
      ++count;
    }
  }

  if (count < n / 2) { return {}; }

  return old_style;
}

int main() {
  auto c = foo(100);
}
```

Como se ve, gracias al RAII hemos podido simplificar muchísimo nuestro código, automatizando (delegando) la gestión de los recursos al propio lenguaje.

### Propiedad del recurso
Uno de los principales dolores de cabeza que suelo tener al diseñar software es el reparto de responsabilidades entre los diferentes componentes del software: el _quién_ hace _qué_. Entre estas responsabilidades está _quién es dueño del recurso_, es decir, quién se encarga de inicializarlo y liberarlo.

#### Gestión manual
Imaginemos un gestor de cámaras de vídeo:

```cpp
class CameraManager {
public:
  Camera* create_camera(int device_id) const {
    auto camera = new Camera();
    if (!camera->init(device_id)) {
      delete camera;
      return nullptr;
    }

    if (!camera->check_hardware()) {
      delete camera;
      return nullptr;
    }

    return camera;
  }
};

void foo(Camera* cam) { /* ... */ }

int main() {
  auto cam = CameraManager.create_camera(1);

  foo(cam);

  delete cam;
}
```

Vale, nada del otro mundo pero, como en el ejemplo anterior vemos que hay muchos `delete` debido a la gestión de errores. Además, una vez creada la cámara, es responsabilidad del programador gestionarla, saber en todo momento quién es el _dueño_ de la cámara y, por ende, quién es el encargado de destruirla. Esto no siempre es fácil cuando la cámara va pasando de mano en mano, terminando con múltiples copias del puntero.

#### Centralización
Igual un primer pensamiento es que el gestor sea el dueño de las cámaras:

```cpp
class CameraManager {
  std::map<int, Camera*> m_cameras;
public:
  ~CameraManager() {
    for (auto cam : m_cameras) {
      delete cam.second;
    }
  }

  Camera* create_camera(int device_id) const {
    auto it = m_cameras.find(device_id);
    if (it != m_cameras.end()) { return it->second; }

    auto camera = new Camera();
    if (!camera->init(device_id)) {
      delete camera;
      return nullptr;
    }

    if (!camera->check_hardware()) {
      delete camera;
      return nullptr;
    }

    m_cameras[device_id] = camera;

    return camera;
  }
};
```

Bajo un correcto contrato entre clases esto podría resolver el problema de la gestión de memoria siempre que no se necesita que las cámaras sean destruidas en mitad del proceso. Podríamos entonces agregar un método `destroy_camera` al gestor, pero ¿no estaríamos complicando el diseño demasiado ya?

#### Usando punteros inteligentes
Desde C++11 el lenguaje ofrece varias soluciones a este problema. Aunque me centraré en el `std::unique_ptr<T>`, otra posible opción es [`std::shared_ptr<T>`](https://es.cppreference.com/w/cpp/memory/shared_ptr).

Como su nombre indica, con [`std::unique_ptr<T>`](https://es.cppreference.com/w/cpp/memory/unique_ptr) sólo existe un dueño del recurso; cualquier otro puntero tiene un rol de usuario del mismo, no de dueño. Además, `std::unique_ptr<T>` se encarga automáticamente de liberar la memoria al destruirse.

```cpp
class CameraManager {
public:
  std::unique_ptr<Camera> create_camera(int device_id) const {
    auto camera = std::make_unique<Camera>();

    if (!camera->init(device_id)) { return nullptr; }
    if (!camera->check_hardware()) { return nullptr; }

    return std::move(camera);
  }
};

void foo(Camera* cam) { /* ... */ }

int main() {
  auto cam = CameraManager.create_camera(1);
  foo(cam.get());
}
```

Podemos ver cómo nos hemos quitado las destrucciones manuales en la gestión de errores (simplicando el código enormemente) así como la liberación de recursos por parte del dueño. Además, el propio código `foo(cam.get());` grita a voces "oye, te estoy _prestando_ el objeto, pero _es mío_".

### Otros ejemplos clásicos
Enumeraré otros casos en los cuales se usa el RAII ampliamente, para que los tengáis en cuenta en vuestros desarrollos:

 -  Entrada / salida por ficheros: [`std::ifstream`](https://es.cppreference.com/w/cpp/io/basic_ifstream) / [`std::ofstream`](https://es.cppreference.com/w/cpp/io/basic_ofstream) automáticamente cierran el fichero cuando son destruidos.
 -  Mutex (otro de mis favoritos): [`std::lock_guard<Mutex>`](https://es.cppreference.com/w/cpp/thread/lock_guard), [`std::scoped_lock<...>`](https://en.cppreference.com/w/cpp/thread/scoped_lock).

### Próximamente
En el [siguiente artículo]({{url}}/2020/01/17/automatizando-acciones-gracias-al-raii-parte-ii/) utilizaremos el RAII para automatizar otro tipo de acciones en nuestro código. Mientras tanto, os dejo con una reflexión al respecto de parte de Jonathan Boccara, autor de Fluent C++, [To RAII or not to RAII](https://www.fluentcpp.com/2018/02/13/to-raii-or-not-to-raii/).