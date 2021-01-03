---
title: 'Intuición y OpenSSL: exportando claves RSA'
date: 2019-03-12T09:44:24+01:00
author: Carlos Buchart
layout: post
permalink: /2019/03/12/intuicion-y-openssl-exportando-claves-rsa/
categories:
  - programación
---
Pocas cosas hay menos intuitivas en este mundo que el exportar las claves RSA privada y pública en OpenSSL: de entrada uno piensa que son `PEM_write_bio_RSAPrivateKey` y `PEM_write_bio_RSAPublicKey`. Todo compila, las salidas son coherentes y parece que todo va bien, pero pronto uno descubre no hay manera de hacer que el programa no falle al usar la clave pública. El problema radica en que la función a utilizar es <strong>¡`PEM_write_bio_RSA_PUBKEY`!</strong>

# Enlaces relacionados
- [`PEM_write_bio_RSA_PUBKEY()` vs `PEM_write_bio_RSAPublicKey()`](https://dmiyakawa.blogspot.com/2013/03/pemwritebiorsapubkey-vs.html)
- [How to read an RSA public key from a its PEM format string using the OpenSSL API?](https://stackoverflow.com/a/42484452/1485885)