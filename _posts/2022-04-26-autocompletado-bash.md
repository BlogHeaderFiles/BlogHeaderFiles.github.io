---
title: Extendiendo el autocompletado en Bash
date: 2022-04-26T07:45:00+01:00
author: Carlos Buchart
layout: post
permalink: /2022/04/26/autocompletado-bash
image: /assets/images/featured/bash_autocomplete.jpg
excerpt: Explicamos cómo extender la función de autocompletado de Bash para soportar nuestras propias aplicaciones.
categories: bash cli
---
Personalmente creo que hay cuatro acciones de teclado que consumen el 70% de mi tiempo en una terminal: <kbd>Enter</kbd>, <kbd>Control-C</kbd>, <kbd>Arriba</kbd> y <kbd>Tab</kbd>. Las dos primeras para iniciar y parar comandos, y las dos últimas para agilizar la escritura, bien sea buscando en el historial o bien completando el nombre del comando actual.

Respecto al autocompletado, algunas _shell_, como Bash, permiten además hacer un autocompletado contextual, es decir, que una vez introducido el nombre del comando que se quiere ejecutar el motor de autocompletado ofrecerá las opciones pertinentes en base a dicho comando y a las opciones previamente seleccionadas. Esto no sólo ahorra tiempo de escritura, sino que además sirve de complemento a la ayuda del propio comando.

En esta entrada expondremos cómo crear un _script_ de autocompletado propia, de forma que podamos incluirlo en nuestros proyectos. Aunque me centraré en la _shell_ Bash, esta funcionalidad también es posible para otras: en cmd (Windows) mediante [clink](https://github.com/mridgers/clink) (usando Lua), PowerShell mediante funciones TabExpansion, zsh mediante [zsh-autocomplete](https://github.com/marlonrichert/zsh-autocomplete) (aunque en este caso habría que extender el proyecto base).

## Pre-requisitos

Además de tener Bash como _shell_ activa, necesitaremos el paquete `bash-completion` y activarlo en nuestra sesión. Podemos seguir las instrucciones listadas [acá](https://askubuntu.com/a/545578/1057035).

## Diseñando el _script_

Comenzaremos detallando el comando al que queremos dar soporte, para luego mostrar y explicar el _script_ en cuestión.

### Sintaxis del comando

Vamos a suponer que nuestro comando se llama `headerfiles` y tiene la siguiente sintaxis:

```shell
headerfiles [-h --help -j -f <nombre_de_fichero> -e [-x|-p] -o [slow|fast]]
```

Particularidades:

- `-x` y `-p` sólo están disponible si `-e` ha sido definido previamente.
- `-x` y `-p` son mutuamente excluyentes.
- `-f <nombre_de_fichero>` puede ser especificado varias veces.
- `-j -e` no presentan problems si se indican varias veces, pero es equivalente a que sólo se indicasen una vez.
- `-o` sólo puede ser especificado una vez.
- `-h --help` tienen prioridad sobre cualquier otra opción.

### El _script_

El primer paso será crear un fichero para guardar las funciones del _script_. Personalmente los suelo guardar en una ruta del tipo `<proyecto>/scripts/autocomplete/headerfiles.bash`, pero queda a vuestra discreción.

Hay, como es imaginable, varias formas de programar este autocompletado personalizado, pero mostraré la que a mí particurmente me resulta más sencilla mentalmente, aunque no necesariamente sea la más eficiente: definir una función que fije la variable de entorno `COMPREPLY`. y pasar dicha función como argumento de `complete`, junto con el nombre de nuestro comando (Bash usará este nombre para determinar si debe llamar a nuestro autocompletado particular o a algún otro). La variable `COMPREPLY` es usada por `complete` como la lista de opciones que se mostrarán. Como ayuda, usaremos el comando `compgen` para generar, de forma amigable, dicha lista de opciones.

Presento el _script_ correspondiente a la sintaxis antes mencionada y luego procedo a su explicación:

```bash
#/usr/bin/env bash

# Prints 1 if the given option has already been specified, 0 otherwise
has_option() {
    for i in "${COMP_WORDS[@]}"; do
        if [[ "$i" == "$1" ]]; then
            echo "1"
            return
        fi
    done

    echo "0"
}

# Function to be called when auto-completing
_headerfiles() {
    COMPREPLY=()

    # These options have the highest precedence, so ignore any other if they've been specified
    if [[ "$(has_option -h)" == "1" || "$(has_option --help)" == "1" ]]; then
        return 0
    fi

    local cur=${COMP_WORDS[COMP_CWORD]}
    local prev=${COMP_WORDS[COMP_CWORD - 1]}

    case $prev in
        # Options with additional arguments
        "-f") COMPREPLY=(`compgen -f -- $cur`) ;;
        "-o") COMPREPLY=(`compgen -W "slow fast" -- $cur`) ;;
        # Any other option
        *)
            # This variable will contain the list of available options
            local AVAILABLE_OPTIONS=()

            # List of supported options that can be used only once
            local ALL_ONCE_OPTIONS=("-e -o -h --help")

            # Add dependant options
            if [[ "$(has_option -e)" == "1" ]]; then
                # Mutually exclusive options
                # Do not remove current word in shell to allow finishing its autocompletion
                if [[ "$(has_option -x)" == "1" ]]; then
                    ALL_ONCE_OPTIONS=("${ALL_ONCE_OPTIONS[0]} -x")
                elif [[ "$(has_option -p)" == "1" ]]; then
                    ALL_ONCE_OPTIONS=("${ALL_ONCE_OPTIONS[0]} -p")
                else
                    ALL_ONCE_OPTIONS=("${ALL_ONCE_OPTIONS[0]} -x -p")
                fi
            fi

            # Most options are allowed only once, so remove the ones already in use,
            # but do not remove current word in shell to allow finishing its autocompletion
            local PREV_COMP_WORDS=("${COMP_WORDS[@]}")
            unset "PREV_COMP_WORDS[-1]"
            for i in ${ALL_ONCE_OPTIONS}; do
                for j in "${PREV_COMP_WORDS[@]}"; do
                    if [[ "$i" == "$j" ]]; then
                        continue 2
                    fi
                done
                AVAILABLE_OPTIONS+=("$i")
            done

            # The -f option can be used several times
            AVAILABLE_OPTIONS=("${AVAILABLE_OPTIONS[*]} -f")

            COMPREPLY=(`compgen -W "${AVAILABLE_OPTIONS[*]}" -- $cur`)
            ;;
    esac
}

complete -F _headerfiles headerfiles
```

Como notas particulares:

- Las opciones de máxima prioridad, aquéllas que cuando se especifican dejan sin efecto a las demás, se procesan de primero y con un _early return_.
- Las opciones con argumentos adicionales se procesan de forma independiente, pudiendo generar un autocompletado específico para dicha opción:
  - `compgen -f`: nombres de ficheros.
  - `compgen -d`: nombres de directorios.
  - `compgen -W "..."`: una lista de palabras (nótese que éste es el mismo método empleado en otras partes del _script_).
  - La opción anterior puede usarse en conjunto con una función que extraiga los términos disponibles (de un fichero, de otro comando, etc). Por ejemplo, Git lo hace cuando detecta una línea tipo `git checkout`, entonces el siguiente autocompletado son nombres de las ramas disponibles, que son extraídas de una consulta a `git branch -a`.
- Cuando hay que listar las opciones disponibles, primero se enumeran las que se pueden elegir una única vez y se filtran para quitar las ya introducidas. Posteriormente se añaden las que pueden repetirse

### Activando el _script_ de autocompletado

Para activarlo bash con que carguemos el _script_: `source /path/to/script.bash`. Además, podemos agregar esta línea en nuestro `.bashrc` para que esté disponible en cualquier nueva sesión Bash que ejecutemos.

Si nuestro proyecto incluye un comando de instalación o un paquete, deberemos añadir el _script_ en el mismo e instalarlo en `/usr/share/bash-completion/completions/`.

## Conclusiones

Hemos estudiado cómo extender el autocompletado de Bash con algunas de las opciones más frecuentes. Otras combinaciones más complicadas pueden resolverse con una extensión de éstas (por ejemplo, el caso de que la lista de subvalores de una opción deba ser extraída de un fichero o comando). Para más información podemos consultar [la documentación oficial](https://www.gnu.org/savannah-checkouts/gnu/bash/manual/bash.html#Programmable-Completion).
