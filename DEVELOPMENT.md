# Arpegium JS Development

## Para desarrollo local

Si quieres probar el paquete localmente antes de publicar:

```bash
# En el directorio del paquete
npm pack

# En tu proyecto de prueba
npm install /ruta/al/arpegium-js-0.2.0.tgz
```

## Para enlazar localmente durante desarrollo

```bash
# En el directorio del paquete
npm link

# En tu proyecto de prueba
npm link arpegium-js
```

## Comandos útiles

```bash
# Compilar en modo watch
npm run build:watch

# Limpiar build
npm run clean

# Publicar (con validaciones)
./publish.sh

# Ver qué se incluirá en el paquete
npm pack --dry-run
```

## Estructura del paquete publicado

```
arpegium-js/
├── dist/           # Código compilado
├── README.md       # Documentación
├── LICENSE         # Licencia MIT
└── package.json    # Metadatos del paquete
```
