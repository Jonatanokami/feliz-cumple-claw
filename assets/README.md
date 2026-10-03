# Assets — cómo personalizar sin tocar código

Poné tus archivos en esta carpeta con **exactamente estos nombres**:

| Archivo                 | Qué es | Recomendado |
|-------------------------|--------|-------------|
| `friend.png`            | Foto de tu amiga **recortada con transparencia** (la persona sola, sin fondo) | PNG 800×1000 aprox, fondo transparente |
| `galaxy.jpg`            | Fondo de galaxia (opcional) | JPG 1200×1800 vertical, oscuro |
| `constellation.svg`     | Constelación (ya incluye Libra, reemplazable por otro signo) | SVG transparente |
| `stars.png`             | Estrellas extra (opcional, se generan solas por JS si no existe) | PNG transparente |
| `foreground-stars.png`  | Destellos delanteros (opcional, se generan solos por JS si no existe) | PNG transparente |
| `music.mp3`             | Música de fondo (suena tras tocar ABRIR, en loop) | MP3 < 5 MB |
| `back-photo.png`        | Foto circular del reverso (opcional; si no existe usa `friend.png`) | PNG/JPG cuadrado |

Si un archivo no existe, la tarjeta **sigue funcionando**: usa degradados
CSS + estrellas generadas por JS. No hay que modificar `index.html`,
`style.css` ni `script.js`.

## Textos

Editá solo esto al inicio de `script.js`:

```js
const BIRTHDAY_CONFIG = {
  title: "Feliz cumpleaños",
  subtitle: "Espero que este nuevo año esté lleno de cosas lindas ✨",
  backTitle: "Para vos 🤍",     // título del reverso
  backMessage: "...",           // tu texto propio (acepta saltos con \n\n)
};
```

## Publicar en GitHub Pages

1. Subí esta carpeta a un repo.
2. Settings → Pages → Deploy from branch → `main` / root.
3. Abrí el link desde el iPhone (requiere HTTPS para el sensor).
