# 🎧 DJ Vote App v2

App de votación en vivo con WebSockets. El DJ elige 3 canciones de Spotify y el público vota en tiempo real.

---

## 🚀 Cómo correrlo en Mac

### Paso 1 — Instala Node.js (si no lo tenés)

Abrí la app **Terminal** (la encontrás en Aplicaciones → Utilidades, o buscándola con Cmd+Espacio).

Pegá este comando y presioná Enter:

```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

Cuando termine, instalá Node.js:

```bash
brew install node
```

### Paso 2 — Descargá los archivos del proyecto

Creá una carpeta y copiá los 3 archivos adentro:
- `server.js`
- `package.json`
- carpeta `public/` con `index.html` adentro

La estructura debe quedar así:
```
djvote/
├── server.js
├── package.json
└── public/
    └── index.html
```

### Paso 3 — Instalá las dependencias

En la Terminal, navegá a la carpeta del proyecto:

```bash
cd ~/Desktop/djvote
```

Luego instalá las dependencias:

```bash
npm install
```

### Paso 4 — Corré la app

```bash
npm start
```

Deberías ver:

```
🎧 DJ Vote App corriendo en:

  → http://localhost:3000          (Pantalla principal)
  → http://localhost:3000/#dj      (Panel del DJ)
  → http://localhost:3000/#user    (Votación / QR)
```

---

## 📱 Cómo usar en un evento

1. **El DJ** abre `http://localhost:3000/#dj` en su computadora
2. Conecta Spotify con su Client ID y Client Secret
3. Busca 3 canciones y presiona **Iniciar Votación**
4. **El público** escanea el QR que muestra la URL `http://TU_IP:3000/#user` con su celular
5. Cada persona vota por su canción favorita
6. A los 30 segundos aparece la canción ganadora en todas las pantallas

### ¿Cómo saber la IP de tu Mac?
```bash
ipconfig getifaddr en0
```

---

## 🎵 Configuración de Spotify

1. Ve a [developer.spotify.com/dashboard](https://developer.spotify.com/dashboard)
2. Crea una app nueva (nombre: cualquiera, tipo: Web API)
3. En **Settings**, copia el **Client ID** y **Client Secret**
4. Pégalos en el modal que aparece al entrar al DJ Panel
