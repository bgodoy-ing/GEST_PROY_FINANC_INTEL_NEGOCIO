# BETON · Informe BI financiero 2024–2025

Informe interactivo de inteligencia de negocios sobre los resultados financieros de BETON INGENIEROS SAS
(obras civiles, pisos industriales y especiales), construido a partir de sus estados financieros 2024–2025 (NIIF para Pymes).

**Secciones:** 00 Ejecutivo · 01 Resultados · 02 Crecimiento · 03 Balance · 04 Caja · 05 Sensibilidad ·
06 Decisiones · 07 Base de datos · 08 Calidad de datos · 09 Diccionario.

**Sitio publicado:** https://bgodoy-ing.github.io/GEST_PROY_FINANC_INTEL_NEGOCIO/

## Herramientas de desarrollo

| Herramienta | En qué se usó |
|---|---|
| HTML5 | Estructura del informe (`index.html`) |
| CSS3 | Diseño, colores y adaptación a celular (`styles.css`) |
| JavaScript | Cálculos, gráficos, simulador y tabla (`app.js`) |
| Chart.js 4.4.1 | Todos los gráficos del informe |
| Python 3 | Script que construye y valida la base de datos (`scripts/build_data.py`) |
| Pillow | Preparación de los logos y del ícono de la pestaña |
| Git | Control de versiones |
| GitHub | Repositorio GEST_PROY_FINANC_INTEL_NEGOCIO |
| GitHub Pages | Publicación del sitio web |
| Google Fonts (Carlito) | Respaldo de la fuente Calibri |
| Visual Studio Code | Editor donde se desarrolló el proyecto |
| Google Chrome (headless) | Capturas de prueba en computador y celular |

## Desarrollado por

- Brandon Alexcis Godoy Cruz
- Cindy Geraldine Guerrero Jaimes
- Wendy Ginneth López Carvajal
- Astrid Vanessa Zuluaga Hernández

Fundación Universitaria del Área Andina

## Estructura

- `index.html`, `styles.css`, `app.js`: el informe (sitio estático, listo para GitHub Pages).
- `data/beton_data.js`: base de datos (114 registros rubro × año), generada por el script.
- `scripts/build_data.py`: fuente única de los datos transcritos de los estados financieros; valida subtotales y regenera `data/beton_data.js`.

```bash
python scripts/build_data.py   # regenerar datos
python -m http.server 8000     # ver en http://localhost:8000
```
