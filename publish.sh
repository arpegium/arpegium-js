#!/bin/bash

# Script para publicar el paquete NPM

echo "🚀 Iniciando proceso de publicación..."

# Verificar que estamos en la rama main/master
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ] && [ "$CURRENT_BRANCH" != "master" ]; then
    echo "❌ Error: Debes estar en la rama main/master para publicar"
    exit 1
fi

# Verificar que no hay cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo "❌ Error: Hay cambios sin commitear. Commits todos los cambios antes de publicar."
    exit 1
fi

# Limpiar build anterior
echo "🧹 Limpiando builds anteriores..."
npm run clean

# Ejecutar tests
echo "🧪 Ejecutando tests..."
npm test
if [ $? -ne 0 ]; then
    echo "❌ Error: Los tests no pasaron"
    exit 1
fi

# Compilar
echo "🔨 Compilando..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Error: La compilación falló"
    exit 1
fi

# Mostrar información antes de publicar
echo "📦 Información del paquete:"
npm pack --dry-run

echo ""
echo "¿Estás seguro de que quieres publicar? (y/N)"
read -r CONFIRM

if [ "$CONFIRM" != "y" ] && [ "$CONFIRM" != "Y" ]; then
    echo "❌ Publicación cancelada"
    exit 1
fi

# Publicar
echo "📤 Publicando paquete..."
npm publish

if [ $? -eq 0 ]; then
    echo "✅ ¡Paquete publicado exitosamente!"
    echo "🎉 Puedes instalarlo con: npm install arpegium-js"
else
    echo "❌ Error durante la publicación"
    exit 1
fi
