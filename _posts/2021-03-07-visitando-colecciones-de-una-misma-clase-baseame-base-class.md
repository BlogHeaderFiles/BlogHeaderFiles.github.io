---
title: Visitando colecciones de una misma clase base
date: 2021-03-07T17:20:39+01:00
author: Carlos Buchart
layout: post
permalink: /2021/03/07/visitando-colecciones-de-una-misma-clase-base
image: /assets/images/featured/filtered_visitor.jpg
excerpt: En esta entrada estudiamos una variante del tradicional patrón visitor, aplicado a colecciones de objetos pertenecientes a la misma jerarquía de clases.
---
Se dice que uno de los grandes _defectos_ de los programadores es que somos _perezosos_, ya que no nos gusta tener que hacer las cosas más de una vez: cuando eso ocurre creamos un _script_, separamos en una función, hacemos una aplicación. Como extensión, no nos gusta reinventar la rueda: ¿por qué lo voy a hacer una vez si ya alguien lo ha hecho antes? Esto se llama reutilización de código, y puede venir en forma de bibliotecas de funciones, bibliotecas, _frameworks_ (o entradas de blogs que nos expliquen las cosas 😉). Existen además muchos problemas recurrentes en los que la solución no es un código específico sino la manera de abordar el problema, donde todas las soluciones tienen la misma forma, el mismo _patrón de diseño_. Existen multitud de patrones de diseño, pero hoy nos centraremos en una variante del patrón [_visitor_](https://es.wikipedia.org/wiki/Visitor_(patr%C3%B3n_de_dise%C3%B1o)) (para más información sobre otros patrones recomiendo [la lectura de un clásico](https://www.amazon.es/Design-Patterns-Object-Oriented-professional-computing/dp/0201633612)).

De forma resumida, el patrón _visitor_ aplica, a unos o más objetos de clases heterogéneas, una función que es específica para ese objeto (aunque la función no necesariamente pertenezca al objeto).

## `std::visit`

La biblioteca estándar de C++ (17) proporciona la función [`std::visit`](https://en.cppreference.com/w/cpp/utility/variant/visit), que se asocia siempre a la clase [`std::variant`](https://en.cppreference.com/w/cpp/utility/variant). `std::visit` ejecuta la versión correcta de la función visitante depeniendo del tipo de dato almacenado (recordad que un `variant` es una clase cuyo valor puede ser de distintos tipos de datos).

```cpp
std::variant<int, std::string, double> val = 3.141592;

std::visit(overloaded {
  [](int x) { std::cout << "int\n"; },
  [](const std::string& x) { std::cout << "string\n"; },
  [](double x) { std::cout << "double\n"; },
});
```

De forma análoga, se podría iterar sobre un vector de _variants_:

```cpp
for (auto &v : vec) {
  std::visit( /* ... */ );
}
```

Una característica de la implementación del `std::variant` es que los tipos de datos disponibles se definen en tiempo de compilación. Si queremos algo más de flexibilidad, podemos usar la tradicional herencia para utilizar cuantos tipos específicos queramos: todos los objetos heredan de un tipo base sobre el que se definen todas las operaciones comunes. Desgraciadamente esto no siempre puede hacerse ya que no pueden preveerse todas las acciones a realizarse sobre los objetos, ni sería conveniente ya que la complejidad final sería abrumadora.

Aun así, es posible diseñar una variante del patrón _visitor_ que sea más flexible en cuanto a tipos de datos. Más en concreto, esta solución aplica sobre una colección de objetos que heredan de la misma clase pero donde no es necesario definir las acciones concretas de una clase hija como función virtual de la clase base.

## `filtered_visit`

Una diferencia entre el patrón _visitor_ tradicional y el que propongo en este artículo, es que el patrón tradicional es capaz de aplicar una acción específica dependiendo del tipo de dato, mientras que en este caso es más bien una ejecución _filtrada_ por el tipo de dato que soporte la acción solicitada (aunque puede actuar como en el primer caso usando métodos polimórficos).

### Ejemplo de clases

Veamos una estructura de clases de ejemplo:

```cpp
// Worker classes
struct BaseWorker {
  explicit BaseWorker(int value_) : value{value_} {}
  virtual ~BaseWorker() {}
  
  virtual void run() = 0;
  
  int value = 0;
};

struct Worker1 : BaseWorker {
  using BaseWorker::BaseWorker;
  
  void run() override {
    std::cout << "Worker1::run " << value << '\n';
  }
  
  void convert(const std::string& path) {
    std::cout << "Converting " << value << " to " << path << '\n';
  }
};

struct Worker2 : BaseWorker {
  using BaseWorker::BaseWorker;

  void run() override {
    std::cout << "Worker2::run " << value << '\n';
  }
  
  void print() {
    std::cout << "Printing " << value << '\n';
  }
};

std::vector<BaseWorker*> workers;
```

Como vemos, existen métodos comunes a todos los objetos (`BaseWorker::run`), y otros que no lo son (`Worker1::convert`, `Worker2::print`). Además, pudiese darse el caso de tener que realizar acciones sobre una clase no contempladas en el diseño de la misma (por ejemplo, para destruir todos los objetos al terminar su uso, o guardar una copia de los objetos de tipo `Worker1`). En consecuencia, el objetivo es diseñar una forma de visitar todos los objetos del contenedor aplicando la misma acción a todos los tipos compatibles (excluyendo de dicha visita a los tipos incompatibles).

### Pre-requisitos

Lo primero que tenemos que hacer es poder distinguir el tipo exacto sobre el que actuaremos. Después, necesitaremos diferenciar el tipo de acción a ejecutar sobre el objeto: si es una función (incluyendo lambdas, `std::function` y cualquier [_functor_](https://www.geeksforgeeks.org/functors-in-cpp/) en general) o un método de una clase. El siguiente _template_ nos dará el 75% de esa información: si se trata de un método miembro y, en ese caso, de qué clase es, o si es una función ([créditos](https://stackoverflow.com/q/42175294/1485885)):

```cpp
template<typename T>
struct ClassOf
{
  using type = void;
};
template<typename Return, typename Class>
struct ClassOf<Return(Class::*)>
{
  using type = Class;
};
```

En el caso de las funciones, necesitaremos saber el tipo sobre el que actuará. Para ello vamos a suponer que se recibirá el objeto como primer argumento (algo bastante lógico y fácil de establecer como regla). El siguiente fragmento nos devuelve el tipo de datos del primer argumento ([créditos](https://stackoverflow.com/q/6512019/1485885)):

```cpp
template<typename Ret, typename Arg, typename... Rest>
Arg first_argument_helper(Ret(*) (Arg, Rest...));

template<typename Ret, typename F, typename Arg, typename... Rest>
Arg first_argument_helper(Ret(F::*) (Arg, Rest...));

template<typename Ret, typename F, typename Arg, typename... Rest>
Arg first_argument_helper(Ret(F::*) (Arg, Rest...) const);

template <typename F>
decltype(first_argument_helper(&F::operator())) first_argument_helper(F);

template <typename T>
using first_argument = decltype(first_argument_helper(std::declval<T>()));
```

### Implementación final

Por último, sólo nos queda la función _filtered_visit_ que recorrerá el contenedor:

```cpp
template<typename T, typename F, typename... Ts>
void filtered_visit(T&& cont, F f, Ts... args)
{
  using Class = typename ClassOf<F>::type;
  if constexpr (std::is_void_v<Class>) { // it is a function, lambda or std::function
    for (auto &obj : cont) {
      if (auto t = dynamic_cast<first_argument<F>>(obj)) { f(t, args...); }
    }
  } else { // it is a pointer to member
    for (auto &obj : cont) {
      if (auto t = dynamic_cast<Class *>(obj)) { (t->*f)(args...); }
    }
  }
}
```

Su uso sería el siguiente:

```cpp
int main() {
  std::vector<BaseWorker*> workers = {
    new Worker1{10},
    new Worker2{20},
    new Worker1{30},
  };
  
  filtered_visit(workers, &BaseWorker::run);
  filtered_visit(workers, &Worker1::convert, "path");
  filtered_visit(workers, &Worker2::print);
  filtered_visit(workers, [](Worker1* obj) { obj->value += 5; });
  filtered_visit(workers, &BaseWorker::run);
  filtered_visit(workers, &foo);
  
  filtered_visit(workers, [](BaseWorker* obj) { delete obj; });
}
```

👨🏻‍💻El código completo se puede probar en vivo en [Wandbox](https://wandbox.org/permlink/FozfuCrUQs7hple4).

## Conclusiones

El patrón _visitor_ es ampliamente utilizado en muchos diseños ya que simplifica el tratamiento de datos heterogéneos. Con esta variante podemos expandir su uso a otros escenarios donde se requieren acciones específicas sobre un determinado sub-tipo de elementos de una colección.

## Comentarios finales

Una de las limitaciones de este _visitor_ es que no puede aplicar un método de la clase base a un único tipo heredado, ya que las reglas de deducción utilizadas llevarán a la clase base. En este caso basta con utilizar un _lambda_.

Por otro lado, habréis visto que uso `dynamic_cast` para determinar si un objeto del contenedor es del tipo que soporta el _visitor_. Bien se podría cambiar por algún método estático de cada clase que devuelva un identificador de tipo y compararlo con el que devuelve la clase del _visitor_, o cualquier otra estrategia de identificación de tipos en tiempo de ejecución.