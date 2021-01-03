---
title: '[Nano-post] Qt, moc y cabeceras precompiladas'
date: 2020-03-15T19:16:53+01:00
author: Carlos Buchart
layout: post
permalink: /2020/03/15/qt-moc-cabeceras-precompiladas/
categories:
  - programación
tags:
  - C++
  - Qt
---
Si vuestro proyecto Qt presenta las siguientes características (todas):

 -  usa cabeceras precompiladas,
 -  se compila en Visual Studio,
 -  y usa compilación basada en Qt / MSBuild

podéis encontraros con que los ficheros generados por la herramienta de _moc'ing_ de Qt no compilan correctamente al no encontrar el fichero `stdafx.h` (o `pch.h`, o cualquiera sea el nombre de vuestro fichero de cabeceras precompiladas).

Recordad que estos ficheros _ moc'eados_ los genera Qt para ficheros (normalmente) `.h` que incluyen una clase con la macro `Q_OBJECT`, así se genera el fichero `moc_Header.cpp` para el fichero `Header.h`.

Es posible solucionar este problema fácilmente entrando en la configuración de los ficheros de cabecera y forzar la inclusión del fichero de cabecera precompilado:

![todo](/assets/images/qt-moc-pch.jpg)