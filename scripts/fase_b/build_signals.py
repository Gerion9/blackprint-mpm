# -*- coding: utf-8 -*-
"""build_signals.py - senales de CONTEXTO por estado (capas, NO entran al priorityScore).

Genera public/data/signals.json con 2 senales etiquetadas y con valor REAL citado:
  - diabetes : tasa de mortalidad por diabetes mellitus (INEGI EDR 2021, def./10 mil hab.).
               Proxy de carga diabetica: la diabetes ADELANTA y multiplica la catarata,
               y abre demanda <60 que el filtro "60+" no ve. dataConfidence=real.
  - copago   : capacidad de copago del hogar via remesas (Banxico 2024, MDD), normalizada
               por poblacion 60+ -> indice relativo. Proxy de liquidez, NO de necesidad
               medica. dataConfidence=real.

INTEGRIDAD: valores oficiales citados. Estas capas son CONTEXTO visual; NUNCA se funden al
priorityScore (que sigue MODELADO, no medido). Archivo separado que build_data.py no pisa
(mismo patron que municipios.json / clinicas.json). El indice 0-100 es percentil-rank
(misma convencion que el score municipal); el valor crudo se conserva para mostrar la verdad.
"""
import os
import io
import json

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(os.path.dirname(HERE))
DATA = os.path.join(APP, "public", "data")

# INEGI - Estadisticas de Defunciones Registradas 2021. Tasa de mortalidad por diabetes
# mellitus (defunciones por 10 mil hab.) por entidad de residencia. Comunicado 657/22,
# Grafica 5. https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2022/EAP_DIABETES2022.pdf
DIABETES_2021 = {
    "01": 6.0, "02": 7.1, "03": 5.1, "04": 9.7, "05": 9.9, "06": 10.8, "07": 10.4,
    "08": 7.5, "09": 12.4, "10": 7.6, "11": 12.4, "12": 10.5, "13": 9.6, "14": 8.3,
    "15": 14.1, "16": 12.9, "17": 13.2, "18": 8.5, "19": 7.0, "20": 13.5, "21": 15.7,
    "22": 7.7, "23": 5.9, "24": 11.0, "25": 5.8, "26": 6.0, "27": 13.5, "28": 9.8,
    "29": 14.5, "30": 15.6, "31": 6.3, "32": 9.2,
}

# Banxico SIE - Ingresos por remesas por entidad federativa, ANO COMPLETO 2024 (millones USD).
# BBVA Research con datos Banxico; la suma de los 32 ~ 64,745 MDD = total nacional Banxico.
# https://www.bbvaresearch.com/wp-content/uploads/2025/02/Mexico_Remesas_cierre_anual_2024.pdf
REMESAS_2024 = {
    "01": 958, "02": 1447, "03": 150, "04": 169, "05": 951, "06": 455, "07": 4168,
    "08": 1477, "09": 4685, "10": 1371, "11": 5645, "12": 3286, "13": 1784, "14": 5503,
    "15": 4601, "16": 5647, "17": 1144, "18": 858, "19": 1355, "20": 3433, "21": 3367,
    "22": 1277, "23": 396, "24": 2083, "25": 916, "26": 845, "27": 382, "28": 1017,
    "29": 411, "30": 2603, "31": 454, "32": 1907,
}

NAME = {
    "01": "Aguascalientes", "02": "Baja California", "03": "Baja California Sur",
    "04": "Campeche", "05": "Coahuila", "06": "Colima", "07": "Chiapas",
    "08": "Chihuahua", "09": "Ciudad de México", "10": "Durango", "11": "Guanajuato",
    "12": "Guerrero", "13": "Hidalgo", "14": "Jalisco", "15": "Estado de México",
    "16": "Michoacán", "17": "Morelos", "18": "Nayarit", "19": "Nuevo León",
    "20": "Oaxaca", "21": "Puebla", "22": "Querétaro", "23": "Quintana Roo",
    "24": "San Luis Potosí", "25": "Sinaloa", "26": "Sonora", "27": "Tabasco",
    "28": "Tamaulipas", "29": "Tlaxcala", "30": "Veracruz", "31": "Yucatán",
    "32": "Zacatecas",
}

SOURCES = [
    {"id": "inegi-diabetes-edr", "publisher": "INEGI",
     "document": "Estadísticas de Defunciones Registradas 2021 — tasa de mortalidad por diabetes por entidad (Com. 657/22)",
     "date": "2022-11-10",
     "url": "https://www.inegi.org.mx/contenidos/saladeprensa/aproposito/2022/EAP_DIABETES2022.pdf"},
    {"id": "banxico-remesas", "publisher": "Banco de México (SIE) / BBVA Research",
     "document": "Ingresos por remesas por entidad federativa, año completo 2024",
     "date": "2025-02-01",
     "url": "https://www.bbvaresearch.com/wp-content/uploads/2025/02/Mexico_Remesas_cierre_anual_2024.pdf"},
]


def pctrank(values):
    """dict cve->raw  ->  dict cve->0..100 (percentil-rank, promedio en empates; rank/n*100)."""
    items = sorted(values.items(), key=lambda kv: kv[1])
    n = len(items)
    ranks = {}
    i = 0
    while i < n:
        j = i
        while j + 1 < n and items[j + 1][1] == items[i][1]:
            j += 1
        avg_rank = (i + j) / 2.0 + 1.0  # 1-based average rank for ties
        for k in range(i, j + 1):
            ranks[items[k][0]] = avg_rank
        i = j + 1
    return {cve: round(100.0 * ranks[cve] / n) for cve in values}


def state_pob60():
    """Suma pob60 por cveEnt desde municipios.json (demanda real Censo 2020)."""
    path = os.path.join(DATA, "municipios.json")
    muni = json.loads(io.open(path, encoding="utf-8").read())
    acc = {}
    for m in muni:
        cve = m.get("cveEnt")
        p = m.get("pob60") or 0
        if cve:
            acc[cve] = acc.get(cve, 0) + p
    return acc


def main():
    pob60 = state_pob60()
    missing = [c for c in NAME if not pob60.get(c)]
    if missing:
        print("OJO: sin pob60 para", missing, "(copayIndex usara fallback)")

    diabetes_idx = pctrank(DIABETES_2021)

    # remesas per capita 60+ (USD/ano por adulto 60+) -> indice relativo de capacidad de copago
    percap = {}
    for c in NAME:
        p = pob60.get(c) or 0
        percap[c] = (REMESAS_2024[c] * 1_000_000.0 / p) if p else 0.0
    copay_idx = pctrank(percap)

    states = []
    for c in sorted(NAME):
        states.append({
            "cveEnt": c,
            "estado": NAME[c],
            "diabetesRate": DIABETES_2021[c],          # def./10 mil hab. (INEGI 2021)
            "diabetesIndex": diabetes_idx[c],          # 0-100 percentil
            "diabetesConf": "real",
            "remesas2024Mdd": REMESAS_2024[c],          # millones USD (Banxico 2024)
            "remesasPerCapita60": round(percap[c]),     # USD/ano por adulto 60+
            "copayIndex": copay_idx[c],                 # 0-100 percentil
            "copayConf": "real",
        })

    doc = {
        "generatedAt": "2026-05-31",
        "signals": {
            "diabetes": {
                "label": "Acelerador de demanda: diabetes",
                "unit": "defunciones por diabetes / 10 mil hab. (INEGI 2021)",
                "method": "Tasa oficial de mortalidad por diabetes 2021. Indice 0-100 = percentil entre los 32 estados. La diabetes adelanta y multiplica la catarata; capa de CONTEXTO, no entra al puntaje.",
                "sourceId": "inegi-diabetes-edr",
                "caveats": [
                    "Mortalidad por diabetes es proxy de carga, no de demanda quirurgica directa.",
                    "Senala donde la catarata aparecera mas joven y en mayor proporcion (incl. <60, fuera del filtro 60+).",
                ],
            },
            "copay": {
                "label": "Capacidad de copago (remesas)",
                "unit": "remesas anuales por adulto 60+ (USD, Banxico 2024)",
                "method": "Remesas 2024 por entidad normalizadas por poblacion 60+. Indice 0-100 = percentil. Proxy de liquidez del hogar para el canal de autopago de bajo costo.",
                "sourceId": "banxico-remesas",
                "caveats": [
                    "Mide capacidad/liquidez, NO disposicion a pagar ni necesidad medica.",
                    "Las remesas benefician al hogar completo; se normaliza por 60+ como intensidad relativa hacia el target.",
                    "Corrige el supuesto 'marginado = no puede pagar copago' (cinturon de remesas: Michoacan, Zacatecas, Guanajuato, Oaxaca).",
                ],
            },
        },
        "sources": SOURCES,
        "states": states,
    }
    out = os.path.join(DATA, "signals.json")
    io.open(out, "w", encoding="utf-8").write(json.dumps(doc, ensure_ascii=False, separators=(",", ":")))
    print("WROTE signals.json (%d bytes, %d estados)" % (os.path.getsize(out), len(states)))

    dia = sorted(states, key=lambda s: -s["diabetesRate"])
    cop = sorted(states, key=lambda s: -s["copayIndex"])
    print("\nDIABETES top5:", [(s["estado"], s["diabetesRate"]) for s in dia[:5]])
    print("DIABETES low5:", [(s["estado"], s["diabetesRate"]) for s in dia[-5:]])
    print("COPAGO top5 (per cap 60+):", [(s["estado"], s["remesasPerCapita60"]) for s in cop[:5]])
    print("COPAGO low5:", [(s["estado"], s["remesasPerCapita60"]) for s in cop[-5:]])


if __name__ == "__main__":
    main()
