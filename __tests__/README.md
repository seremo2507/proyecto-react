# Pruebas en el Proyecto

Este proyecto utiliza **Jest** y **@testing-library/react-native** para pruebas unitarias y de integración.

## ¿Dónde están las pruebas?
- **Pruebas unitarias**: Se encuentran en la carpeta `__tests__/unitarias/`
- **Pruebas de integración**: Se encuentran en la carpeta `__tests__/integration/`

## ¿Cómo correr las pruebas?

### 1. Todas las pruebas (unitarias e integración)
```bash
npm test
```
Esto ejecuta todas las pruebas encontradas en el proyecto.

### 2. Solo pruebas unitarias
Para correr SOLO las pruebas unitarias:
```bash
npm test __tests__/unitarias
```

Para ejecutar un archivo de prueba unitaria específico:
```bash
npm test __tests__/unitarias/components.test.tsx
```

### 3. Solo pruebas de integración
Para correr solo las pruebas de integración:
```bash
npm test __tests__/integration/componentIntegration.test.tsx
```

## Notas
- Si agregas nuevas pruebas, asegúrate de que el nombre del archivo termine en `.test.ts`, `.test.tsx`, `.spec.ts` o `.spec.tsx`.
- Si tienes problemas con dependencias nativas o de Expo, revisa los mocks en los archivos de prueba.
- El flag `--` es necesario para pasar argumentos adicionales a Jest.

---
¡Feliz testing! 🚀 