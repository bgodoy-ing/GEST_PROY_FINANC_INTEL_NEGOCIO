# BETON · Informe BI financiero 2024–2025

Informe interactivo de inteligencia de negocios sobre los resultados financieros de BETON INGENIEROS SAS
(obras civiles, pisos industriales y especiales), construido a partir de sus estados financieros 2024–2025 (NIIF para Pymes).

**Secciones:** 00 Ejecutivo · 01 Resultados · 02 Crecimiento · 03 Balance · 04 Caja · 05 Sensibilidad ·
06 Decisiones · 07 Base de datos · 08 Calidad de datos · 09 Diccionario.

## Estructura

- `index.html`, `styles.css`, `app.js`: el informe (sitio estático, listo para GitHub Pages).
- `data/beton_data.js`: base de datos (114 registros rubro × año), generada por el script.
- `scripts/build_data.py`: fuente única de los datos transcritos de los estados financieros; valida subtotales y regenera `data/beton_data.js`.

```bash
python scripts/build_data.py   # regenerar datos
python -m http.server 8000     # ver en http://localhost:8000
```
