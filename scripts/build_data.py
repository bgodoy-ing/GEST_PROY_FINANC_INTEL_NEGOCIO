"""Genera la base de datos del informe web (data/beton_data.js) a partir de los estados financieros
de BETON INGENIEROS SAS 2024-2025 (cifras en pesos colombianos).

Uso: python scripts/build_data.py
"""
import json
import sys
from pathlib import Path


sys.stdout.reconfigure(encoding="utf-8")
ROOT = Path(__file__).resolve().parent.parent
OUT_JS = ROOT / "data" / "beton_data.js"

# ---------------------------------------------------------------------------
# 1. Datos fuente: transcritos del PDF "Estados Financieros Beton Ingenieros SAS_2025"
#    (estado, grupo, rubro, nota, naturaleza, tipo, base vertical, 2024, 2025, página)
# ---------------------------------------------------------------------------
ER, ESF, EFE = "Estado de Resultados", "Estado de Situación Financiera", "Estado de Flujos de Efectivo"
V, TA = "Ventas Netas", "Total Activo"

RUBROS = [
    # Estado de resultados (pág. 2; detalle de costos nota 5.15/5.18 pág. 17)
    (ER, "Ingresos operacionales", "Ventas Netas", "5.17", "Ingreso", "Reportado", V, 295124735, 3855157469, 2),
    (ER, "Costo de ventas", "Costo De Ventas", "5.18", "Costo", "Reportado", V, 196398477, 3241912990, 2),
    (ER, "Costo de ventas", "Costos de Venta (detalle)", "5.15", "Costo", "Detalle de nota", V, 116828358, 806334700, 17),
    (ER, "Costo de ventas", "Costo de Producción (detalle)", "5.15", "Costo", "Detalle de nota", V, 79570119, 2435578290, 17),
    (ER, "Resultado", "Utilidad Bruta", "", "Subtotal", "Subtotal", V, 98726258, 613244479, 2),
    (ER, "Gastos operacionales", "Gastos De Administración", "", "Gasto", "Reportado", V, 371900, 145822260, 2),
    (ER, "Gastos operacionales", "Gastos De Ventas", "", "Gasto", "Reportado", V, 4321614, 123175432, 2),
    (ER, "Gastos operacionales", "Total Gastos", "", "Subtotal", "Subtotal", V, 4693514, 268997692, 2),
    (ER, "Resultado", "Utilidad Operacional", "", "Subtotal", "Subtotal", V, 94032744, 344246787, 2),
    (ER, "No operacional", "Ingresos No Operacionales", "", "Ingreso", "Reportado", V, 2326, 240240, 2),
    (ER, "No operacional", "Gastos No Operacionales", "", "Gasto", "Reportado", V, 1355824, 91139838, 2),
    (ER, "No operacional", "Total No Operacionales", "", "Subtotal", "Subtotal", V, -1353498, -90899597, 2),
    (ER, "Resultado", "Utilidad Antes De Impuestos", "", "Subtotal", "Subtotal", V, 92679246, 253347190, 2),
    (ER, "Impuestos", "Impuestos", "", "Gasto", "Reportado", V, 6391000, 115079360, 2),
    (ER, "Resultado", "Utilidad Neta", "", "Subtotal", "Subtotal", V, 86288246, 138267830, 2),
    # Estado de situación financiera (pág. 1)
    (ESF, "Activo corriente", "Disponible", "5.3", "Activo", "Reportado", TA, 16872381, 17076802, 1),
    (ESF, "Activo corriente", "Inversiones", "5.4", "Activo", "Reportado", TA, 0, 98213624, 1),
    (ESF, "Activo corriente", "Deudores Clientes", "5.5", "Activo", "Reportado", TA, 274276766, 449895741, 1),
    (ESF, "Activo corriente", "Cuentas Por Cobrar", "5.6", "Activo", "Reportado", TA, 37126746, 288648760, 1),
    (ESF, "Activo corriente", "Activos Por Impuestos Corrientes", "5.7", "Activo", "Reportado", TA, 680055, 4555482, 1),
    (ESF, "Activo corriente", "Inventarios", "5.8", "Activo", "Reportado", TA, 0, 52348221, 1),
    (ESF, "Activo corriente", "Total Activo Corriente", "", "Subtotal", "Subtotal", TA, 328955948, 910738630, 1),
    (ESF, "Activo no corriente", "Propiedades Planta Y Equipo", "5.9", "Activo", "Reportado", TA, 0, 299992728, 1),
    (ESF, "Activo no corriente", "Total Activo No Corriente", "", "Subtotal", "Subtotal", TA, 0, 299992728, 1),
    (ESF, "Activo", "Total Activo", "", "Subtotal", "Subtotal", TA, 328955948, 1210731358, 1),
    (ESF, "Pasivo corriente", "Proveedores Nacionales", "5.10", "Pasivo", "Reportado", TA, 0, 109767282, 1),
    (ESF, "Pasivo corriente", "Cuentas Por Pagar", "5.11", "Pasivo", "Reportado", TA, 160685329, 189365509, 1),
    (ESF, "Pasivo corriente", "Impuestos Gravámenes Y Tasas", "5.12", "Pasivo", "Reportado", TA, 6681172, 15686957, 1),
    (ESF, "Pasivo corriente", "Obligaciones Laborales", "5.13", "Pasivo", "Reportado", TA, 14118450, 37943595, 1),
    (ESF, "Pasivo corriente", "Total Pasivo Corriente", "", "Subtotal", "Subtotal", TA, 181484951, 352763343, 1),
    (ESF, "Pasivo no corriente", "Obligaciones Financieras LP", "5.14", "Pasivo", "Reportado", TA, 0, 165375587, 1),
    (ESF, "Pasivo no corriente", "Otros Pasivos (anticipos de clientes)", "5.15", "Pasivo", "Reportado", TA, 125935997, 332592427, 1),
    (ESF, "Pasivo no corriente", "Total Pasivo No Corriente", "", "Subtotal", "Subtotal", TA, 125935997, 497968014, 1),
    (ESF, "Pasivo", "Total Pasivo", "", "Subtotal", "Subtotal", TA, 307420948, 850731357, 1),
    (ESF, "Patrimonio", "Capital Social", "5.16", "Patrimonio", "Reportado", TA, 10000000, 210197170, 1),
    (ESF, "Patrimonio", "Utilidad Del Ejercicio", "", "Patrimonio", "Reportado", TA, 11535000, 138267830, 1),
    (ESF, "Patrimonio", "Utilidades Acumuladas", "", "Patrimonio", "Reportado", TA, 0, 11535000, 1),
    (ESF, "Patrimonio", "Total Patrimonio", "", "Subtotal", "Subtotal", TA, 21535000, 360000000, 1),
    (ESF, "Pasivo + Patrimonio", "Total Pasivo + Patrimonio", "", "Subtotal", "Subtotal", TA, 328955948, 1210731357, 1),
    # Estado de flujos de efectivo, método indirecto (pág. 4)
    (EFE, "Operación", "Utilidad neta (flujo)", "", "Flujo", "Reportado", V, 86288246, 138267830, 4),
    (EFE, "Operación", "Depreciaciones", "", "Flujo", "Reportado", V, 0, 17861723, 4),
    (EFE, "Operación", "Aumento en cuentas por cobrar", "", "Flujo", "Reportado", V, 0, -251522014, 4),
    (EFE, "Operación", "Aumento en clientes", "", "Flujo", "Reportado", V, 0, -175618975, 4),
    (EFE, "Operación", "Aumento en impuestos por cobrar", "", "Flujo", "Reportado", V, 0, -3875427, 4),
    (EFE, "Operación", "Aumento en proveedores", "", "Flujo", "Reportado", V, 0, 109767282, 4),
    (EFE, "Operación", "Aumento en cuentas por pagar", "", "Flujo", "Reportado", V, 0, 28680180, 4),
    (EFE, "Operación", "Aumento en impuestos por pagar", "", "Flujo", "Reportado", V, 0, 9005785, 4),
    (EFE, "Operación", "Aumento en obligaciones laborales", "", "Flujo", "Reportado", V, 0, 23825145, 4),
    (EFE, "Operación", "Flujo neto de operación", "", "Subtotal", "Subtotal", V, 86288246, -103608471, 4),
    (EFE, "Inversión", "Compra de propiedad, planta y equipo", "", "Flujo", "Reportado", V, 0, -299992728, 4),
    (EFE, "Inversión", "Inversiones financieras", "", "Flujo", "Reportado", V, 0, -98213624, 4),
    (EFE, "Inversión", "Flujo neto de inversión", "", "Subtotal", "Subtotal", V, 0, -398206352, 4),
    (EFE, "Financiación", "Nuevas obligaciones financieras", "", "Flujo", "Reportado", V, 0, 165916283, 4),
    (EFE, "Financiación", "Flujo neto de financiación", "", "Subtotal", "Subtotal", V, 0, 165916283, 4),
    (EFE, "Efectivo", "Incremento neto de efectivo", "", "Subtotal", "Reportado", V, 0, 204421, 4),
    (EFE, "Efectivo", "Efectivo inicial", "", "Saldo", "Reportado", V, 16872381, 17076802, 4),
    (EFE, "Efectivo", "Efectivo final", "", "Saldo", "Reportado", V, 16872381, 17076802, 4),
]

# Metas de referencia: supuestos del análisis (no provienen de la empresa).
# (clave, nombre, fórmula legible, sentido, meta, formato, responsable, qué mide)
INDICADORES = [
    ("mb", "Margen bruto", "Utilidad bruta / Ventas netas", ">=", 0.20, "pct", "Gerencia de obra",
     "Cuántos pesos quedan de cada $100 vendidos después de pagar el costo directo de la obra."),
    ("mo", "Margen operacional", "Utilidad operacional / Ventas netas", ">=", 0.10, "pct", "Gerencia general",
     "Rentabilidad del negocio de construcción después de gastos de administración y ventas."),
    ("mn", "Margen neto", "Utilidad neta / Ventas netas", ">=", 0.05, "pct", "Gerencia general",
     "Lo que finalmente le queda a los socios de cada $100 facturados."),
    ("roe", "Rentabilidad del patrimonio (ROE)", "Utilidad neta / Patrimonio total", ">=", 0.15, "pct", "Socios",
     "Retorno que obtienen los socios sobre el capital que tienen en la empresa (patrimonio de cierre)."),
    ("roa", "Rentabilidad del activo (ROA)", "Utilidad neta / Activo total", ">=", 0.05, "pct", "Gerencia general",
     "Qué tan productivos son los activos (maquinaria, cartera, caja) para generar utilidad."),
    ("rc", "Razón corriente", "Activo corriente / Pasivo corriente", ">=", 1.5, "x", "Tesorería",
     "Cuántos pesos de activo de corto plazo respaldan cada peso de deuda de corto plazo."),
    ("pa", "Prueba ácida", "(Activo corriente − Inventarios) / Pasivo corriente", ">=", 1.0, "x", "Tesorería",
     "Capacidad de pagar el corto plazo sin depender de vender inventarios."),
    ("end", "Nivel de endeudamiento", "Pasivo total / Activo total", "<=", 0.70, "pct", "Gerencia financiera",
     "Proporción de los activos financiada por terceros (proveedores, bancos, anticipos)."),
    ("dso", "Días de cartera (clientes)", "Deudores clientes / Ventas netas × 365", "<=", 60, "dias", "Cartera",
     "Días promedio que tardan los clientes en pagar las obras facturadas."),
    ("cob", "Cobertura de gastos no operacionales", "Utilidad operacional / Gastos no operacionales", ">=", 3.0, "x", "Gerencia financiera",
     "Veces que la utilidad operacional cubre los gastos no operacionales (principalmente financieros)."),
    ("tei", "Tasa efectiva de impuestos", "Impuestos / Utilidad antes de impuestos", "<=", 0.35, "pct", "Contabilidad",
     "Carga tributaria real frente a la tarifa general de renta en Colombia (35 %)."),
    ("fco", "Flujo de caja operativo", "Flujo neto de actividades de operación", ">=", 0, "cop", "Tesorería",
     "Si la operación genera o consume efectivo, más allá de la utilidad contable."),
]

# Hallazgos de calidad de datos detectados al conciliar los estados
CALIDAD = [
    ("Alta", "Utilidad 2024", "El Estado de Resultados reporta utilidad neta 2024 de $86.288.246, pero el Balance y el Estado de Cambios en el Patrimonio registran $11.535.000.",
     "Diferencia de $74.753.246. Validar cuál cifra es la definitiva antes de comparar rentabilidad entre años."),
    ("Alta", "Flujo de efectivo 2025", "Operación (−$103.608.471) + Inversión (−$398.206.352) + Financiación (+$165.916.283) = −$335.898.540, pero se reporta un incremento de efectivo de +$204.421.",
     "Faltan partidas: variación de inventarios (−$52,3 M), anticipos de clientes (+$206,7 M) y aporte de capital en efectivo."),
    ("Media", "Efectivo inicial 2025", "El flujo muestra efectivo inicial 2025 de $17.076.802; debería ser el saldo final 2024 ($16.872.381).",
     "Corregir el saldo de apertura del flujo."),
    ("Media", "Flujo de efectivo 2024", "El flujo operativo 2024 es de $86.288.246 pero el efectivo inicial y final son iguales ($16.872.381).",
     "El flujo 2024 no concilia con la variación del disponible."),
    ("Media", "Cuentas por cobrar 2025", "Balance: $288.648.760. Nota 5.6: $288.002.760.", "Diferencia de $646.000 entre balance y nota."),
    ("Media", "Obligaciones financieras", "Balance: $165.375.587. Flujo de efectivo: $165.916.283.", "Diferencia de $540.696 (posibles intereses causados o abonos)."),
    ("Media", "Tasa de impuestos 2025", "Impuestos de $115.079.360 sobre utilidad antes de impuestos de $253.347.190 (45,4 %).",
     "Supera la tarifa general del 35 %; revisar gastos no deducibles o provisiones."),
    ("Baja", "Proveedores 2024", "La nota 5.10 muestra $13.668.907 en 2024, pero el balance muestra $0.", "Revisar reclasificación."),
    ("Baja", "Aporte de capital en especie", "El aporte de capital ($200.197.170) coincide casi exactamente con la maquinaria registrada ($200.197.171).",
     "Indica aporte en especie (maquinaria); por eso no generó entrada de efectivo."),
    ("Baja", "Redondeos", "Total activo 2025 ($1.210.731.358) vs. pasivo + patrimonio ($1.210.731.357); total no operacional 2025 difiere en $1.",
     "Diferencias de $1 por redondeo; no son materiales."),
    ("Baja", "Formato", "Nota 5.15 repetida (otros pasivos y costos de ventas); el flujo de efectivo está titulado como 'Estado de cambio del patrimonio'; período contable 'al 30 de diciembre'.",
     "Errores de forma que conviene corregir en la versión oficial."),
]

# Escenarios de sensibilidad: (nombre, Δ precio, Δ volumen, Δ costo unitario, Δ gastos op. %, Δ gastos fijos $)
ESCENARIOS = [
    ("Base 2025 (real)", 0, 0, 0, 0, 0),
    ("Costo unitario +10 %", 0, 0, 0.10, 0, 0),
    ("Precio −5 %", -0.05, 0, 0, 0, 0),
    ("Volumen −15 %", 0, -0.15, 0, 0, 0),
    ("Gastos fijos +$500.000", 0, 0, 0, 0, 500000),
    ("Pesimista (costo +5 %, precio −3 %)", -0.03, 0, 0.05, 0, 0),
]

# ---------------------------------------------------------------------------
# 2. Cálculos en Python (fuente del respaldo web y verificación de las fórmulas Excel)
# ---------------------------------------------------------------------------
def val(rubro, year):
    for r in RUBROS:
        if r[2] == rubro:
            return r[7] if year == 2024 else r[8]
    raise KeyError(rubro)


def indicadores(year):
    g = lambda r: val(r, year)
    ventas = g("Ventas Netas")
    return {
        "mb": g("Utilidad Bruta") / ventas,
        "mo": g("Utilidad Operacional") / ventas,
        "mn": g("Utilidad Neta") / ventas,
        "roe": g("Utilidad Neta") / g("Total Patrimonio"),
        "roa": g("Utilidad Neta") / g("Total Activo"),
        "rc": g("Total Activo Corriente") / g("Total Pasivo Corriente"),
        "pa": (g("Total Activo Corriente") - g("Inventarios")) / g("Total Pasivo Corriente"),
        "end": g("Total Pasivo") / g("Total Activo"),
        "dso": g("Deudores Clientes") / ventas * 365,
        "cob": g("Utilidad Operacional") / g("Gastos No Operacionales"),
        "tei": g("Impuestos") / g("Utilidad Antes De Impuestos"),
        "fco": g("Flujo neto de operación"),
    }


def escenario(dp, dv, dc, dg, df):
    ventas0, costo0 = val("Ventas Netas", 2025), val("Costo De Ventas", 2025)
    gastos0, ino, gno = val("Total Gastos", 2025), val("Ingresos No Operacionales", 2025), val("Gastos No Operacionales", 2025)
    tasa = val("Impuestos", 2025) / val("Utilidad Antes De Impuestos", 2025)
    ventas = ventas0 * (1 + dp) * (1 + dv)
    costo = costo0 * (1 + dv) * (1 + dc)
    gastos = gastos0 * (1 + dg) + df
    ub = ventas - costo
    uo = ub - gastos
    uai = uo + ino - gno
    imp = max(uai, 0) * tasa
    return {"ventas": ventas, "costo": costo, "gastos": gastos, "ub": ub, "uo": uo, "uai": uai, "imp": imp, "un": uai - imp}


# ---------------------------------------------------------------------------
# 3. Registros de la base (rubro x año)
# ---------------------------------------------------------------------------
records = []
for year in (2024, 2025):
    for r in RUBROS:
        records.append((str(year), *r[:7], r[7] if year == 2024 else r[8], r[9]))
N = len(records)

# ---------------------------------------------------------------------------
# 4. Datos para el informe web
# ---------------------------------------------------------------------------
payload = {
    "empresa": "BETON INGENIEROS SAS",
    "registros": [
        {"registro": i, "anio": int(r[0]), "estado": r[1], "grupo": r[2], "rubro": r[3], "nota": r[4],
         "naturaleza": r[5], "tipo": r[6], "valor": r[8], "base": r[7], "pagina": r[9]}
        for i, r in enumerate(records, start=1)
    ],
    "indicadores": [dict(zip(("clave", "nombre", "formula", "sentido", "meta", "formato", "responsable", "descripcion"), x)) for x in INDICADORES],
    "calidad": [dict(zip(("prioridad", "tema", "hallazgo", "accion"), x)) for x in CALIDAD],
}
OUT_JS.parent.mkdir(parents=True, exist_ok=True)
OUT_JS.write_text("// Generado por scripts/build_data.py — no editar a mano\n"
                  f"window.BETON_DATA = {json.dumps(payload, ensure_ascii=False)};\n", encoding="utf-8")

# ---------------------------------------------------------------------------
# 5. Verificaciones (lo que las fórmulas del Excel deben arrojar)
# ---------------------------------------------------------------------------
for y in (2024, 2025):
    g = lambda r: val(r, y)
    assert g("Ventas Netas") - g("Costo De Ventas") == g("Utilidad Bruta")
    assert g("Costos de Venta (detalle)") + g("Costo de Producción (detalle)") == g("Costo De Ventas")
    assert g("Gastos De Administración") + g("Gastos De Ventas") == g("Total Gastos")
    assert g("Utilidad Bruta") - g("Total Gastos") == g("Utilidad Operacional")
    assert g("Utilidad Operacional") + g("Total No Operacionales") == g("Utilidad Antes De Impuestos")
    assert g("Utilidad Antes De Impuestos") - g("Impuestos") == g("Utilidad Neta")
    assert g("Total Activo Corriente") + g("Total Activo No Corriente") == g("Total Activo")
    assert g("Total Pasivo Corriente") + g("Total Pasivo No Corriente") == g("Total Pasivo")
    assert abs(g("Total Activo") - g("Total Pasivo + Patrimonio")) <= 1
print(f"Registros: {N}")
for y in (2024, 2025):
    ind = indicadores(y)
    print(y, {k: round(v, 4) for k, v in ind.items()})
for s in ESCENARIOS:
    res = escenario(*s[1:])
    print(f"{s[0]:<40} UO={res['uo']:>16,.0f}  UAI={res['uai']:>16,.0f}  UN={res['un']:>16,.0f}")
uai, costo, ventas = val("Utilidad Antes De Impuestos", 2025), val("Costo De Ventas", 2025), val("Ventas Netas", 2025)
print("Quiebre costo:", round(uai / costo, 4), " precio:", round(uai / ventas, 4),
      " volumen:", round(uai / (val("Utilidad Bruta", 2025) / ventas) / ventas, 4))
print("OK ->", OUT_JS)
