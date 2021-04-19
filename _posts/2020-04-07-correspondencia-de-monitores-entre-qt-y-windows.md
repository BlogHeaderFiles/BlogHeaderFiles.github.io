---
title: Correspondencia de monitores entre Qt y Windows
date: 2020-04-07T00:55:51+02:00
author: Carlos Buchart
layout: post
permalink: /2020/04/07/correspondencia-de-monitores-entre-qt-y-windows/
image: /assets/images/featured/monitors_correspondence.jpg
excerpt: 'En esta entrada explicamos la relación entre los monitores reportados por Qt y los listados por Windows.'
---
Hace poco modifiqué el módulo de _splash screens_ (en Qt) para mostrar la imagen en el mismo monitor en el que se mostraría la aplicación. Esto implica conocer en qué monitor se va a mostrar la aplicación, calcular el tamaño del escritorio, escalar la imagen, entre otras.

Qt ofrece una forma muy amigable de solicitar información sobre las pantallas disponibles mediante [`QApplication::screens()`](https://doc.qt.io/qt-5/qguiapplication.html#screens), la cual devuelve una lista de [`QScreens`](https://doc.qt.io/qt-5/qscreen.html) desde donde podemos consultar datos como la resolución y el factor de escala, por lo que los requisitos de dimensionado estaban cubiertos: sólo quedaba por conocer el monitor en el que se iba a mostrar la aplicación.

Nótese que este módulo se usa tanto en aplicaciones creadas en Qt como en aplicaciones más antiguas desarrolladas usando, en su mayor parte, MFC.

### Aplicaciones Qt
En el primer caso (Qt) el problema se resolvió guardando la geometría de la ventana al cerrar la aplicación. Al arrancar se crea un widget falso con dicha geometría y se calcula en qué monitor saldrá:

```cpp
void saveWindowGeometry(const QMainWindow *window)
{
  QSettings().setValue("window_geometry", window->saveGeometry());
}

int getMonitorToShowSplashScreen()
{
  QWidget fake_widget;
  fake_widget.restoreGeometry(QSettings().value("window_geometry").toByteArray());

  return qApp->desktop()->screenNumber(&fake_widget);
}
```

### Aplicaciones MFC
En el caso de MFC se hace uso del guardado automático de geometría de todas las ventanas. Esta geometría se guarda en el registro de Windows bajo `HKCU\Software\<Company>\<Application>\Workspace\WindowPlacement`, aunque con MFC podemos obtener el _handle_ mediante `AfxGetApp()->GetSectionKey("Workspace\\WindowPlacement")`. Cada valor de posición y tamaño se almacena en el registroy como un volcado directo de memoria de la estructura `RECT` de la geometría de la ventana en cuestión (se pueden consultar más detalles en [esta entrada de Stack Overflow](https://stackoverflow.com/q/54327046/1485885)).

```cpp
RECT getInitialWindowPositionStoredAtHKEY(HKEY hKey)
{
  DWORD dwReturn[32];
  DWORD dwBufSize = sizeof(dwReturn);
  if (RegQueryValueEx(hKey, "MainWindowRect", 0, 0, (LPBYTE)dwReturn, &dwBufSize) != ERROR_SUCCESS) { return {}; }
  return *(RECT*)dwReturn;
}

int getMonitorForInitialWindowPosition()
{
  const HKEY hKey = AfxGetApp()->GetSectionKey("Workspace\\WindowPlacement");
  if (!hKey) { return -1; }

  const RECT rect = getInitialWindowPositionStoredAtHKEY(hKey);
  RegCloseKey(hKey);

  return getMonitorForRect(rect);
}
```

Una vez recuperada la geometría de la ventana principal se calcula el monitor asociado ([Stack Overflow](https://stackoverflow.com/q/54326892/1485885)):

```cpp
int getMonitorForRect(const RECT &rect)
{
  const HMONITOR screen = MonitorFromRect(&rect, MONITOR_DEFAULTTONEAREST);
  return getMonitorIndex(screen);
}

struct sEnumInfo
{
  int iIndex = 0;
  HMONITOR hMonitor = NULL;
};

int getMonitorIndex(HMONITOR hMonitor)
{
  sEnumInfo info;
  info.hMonitor = hMonitor;

  if (EnumDisplayMonitors(NULL, NULL, getMonitorByHandle, (LPARAM)&info)) return -1;
  return info.iIndex + 1;
}

BOOL CALLBACK getMonitorByHandle(HMONITOR hMonitor, HDC, LPRECT, LPARAM dwData)
{
  auto info = (sEnumInfo *)dwData;
  if (info->hMonitor == hMonitor) return FALSE;
  ++info->iIndex;
  return TRUE;
}
```

### Correspondencia Qt / Windows (MFC)
Como expliqué al principio, se usaría `QApplication::screens` para acceder a los datos del monitor en el que arrancaría nuestra aplicación. La sorpresa, o mejor dicho, el problema de verdad surgió cuando usamos el índice de monitor de las aplicaciones MFC para ubicar nuestro _widget_ Qt: no siempre había correspondencia. El módulo se probó en diversas configuraciones de ordenadores de 1, 2 y 3 pantallas y no siempre se comportaba correctamente.

El estudio que hice está mejor detallado en [Stack Overflow](https://stackoverflow.com/q/54351270/1485885) pero el resumen es que Qt enumera los monitores igual que Windows salvando que la pantalla principal está siempre en la primera posición de la lista de monitores (`QApplication::screens()[0]`). Así, en un sistema con tres pantallas donde la segunda es la principal, su orden en la lista Qt sería: `2, 1, 3`, mientras que Windows siempre devuelve `1, 2, 3`.

El siguiente código solventa ese problema creando una lista que relaciona índice de pantalla en Qt con número de pantalla en Windows. La lista se crea siguiendo los mismos pasos que Qt, es decir, enumera de forma normal las pantallas, pero si la pantalla es la principal ésta se pone al comienzo de la lista en lugar de añadirse al final.

```cpp
bool isPrimaryMonitor(HMONITOR hMonitor)
{
  MONITORINFOEX info;
  memset(&info, 0, sizeof(MONITORINFOEX));
  info.cbSize = sizeof(MONITORINFOEX);
  if (GetMonitorInfo(hMonitor, &info) == FALSE) { return false; }

  return (info.dwFlags & MONITORINFOF_PRIMARY) != 0;
}

BOOL CALLBACK monitorEnumCallback(HMONITOR hMonitor, HDC, LPRECT, LPARAM p)
{
  // Windows enumerates monitors starting at 1
  auto list = reinterpret_cast<QList<int> *>(p);
  if (isPrimaryMonitor(hMonitor)) {
    list->prepend(list->size() + 1);
  } else {
    list->append(list->size() + 1);
  }

  return TRUE;
}

int getQtScreenNumber(int win_screen_number)
{
  QList<int> screens;
  EnumDisplayMonitors(0, 0, monitorEnumCallback, reinterpret_cast<LPARAM>(&screens));

  return screens.indexOf(win_screen_number);
}
```
