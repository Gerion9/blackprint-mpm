"""build_trends.py - Senal de INTENCION de busqueda (Google Trends) por estado para catarata.

HONESTIDAD (va en el JSON y en la UI): Google Trends interest-by-region es RELATIVO
(0-100), NO numero de pacientes. 100 = el estado donde el termino es proporcionalmente
mas buscado. Es proxy de la intencion de QUIEN BUSCA/PAGA (a menudo el hijo/cuidador, mas
conectado), asi que SESGA hacia el "Mexico conectado" con capacidad de copago y
SUBREPRESENTA al target pobre/rural/adulto-mayor. Capa exploratoria; NUNCA entra al
priorityScore. Fuente: Google Trends via pytrends, geo=MX, resolution=REGION, ultimos 12m.

Cada termino se jala en su PROPIO payload (1 termino) para obtener intensidad ENTRE estados
(0-100, 100=max). Combinamos por suma y reescalamos 0-100. Estados sin volumen medible
quedan lowConfidence=True. Cachea CSV crudo en raw/ para reproducibilidad.
"""
import csv
import json
import os
import sys
import time
import datetime

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.normpath(os.path.join(HERE, "..", "..", "public", "data", "trends.json"))
RAW = os.path.join(HERE, "raw")
os.makedirs(RAW, exist_ok=True)

TERMS = ["operación de cataratas", "cirugía de cataratas", "cataratas precio"]
TIMEFRAME = "today 12-m"

GEO2CVE = {
    "MX-AGU": "01", "MX-BCN": "02", "MX-BCS": "03", "MX-CAM": "04", "MX-COA": "05",
    "MX-COL": "06", "MX-CHP": "07", "MX-CHH": "08", "MX-DIF": "09", "MX-CMX": "09",
    "MX-DUR": "10", "MX-GUA": "11", "MX-GRO": "12", "MX-HID": "13", "MX-JAL": "14",
    "MX-MEX": "15", "MX-MIC": "16", "MX-MOR": "17", "MX-NAY": "18", "MX-NLE": "19",
    "MX-OAX": "20", "MX-PUE": "21", "MX-QUE": "22", "MX-ROO": "23", "MX-SLP": "24",
    "MX-SIN": "25", "MX-SON": "26", "MX-TAB": "27", "MX-TAM": "28", "MX-TLA": "29",
    "MX-VER": "30", "MX-YUC": "31", "MX-ZAC": "32",
}
NAME = {
    "01": "Aguascalientes", "02": "Baja California", "03": "Baja California Sur",
    "04": "Campeche", "05": "Coahuila", "06": "Colima", "07": "Chiapas",
    "08": "Chihuahua", "09": "Ciudad de México", "10": "Durango", "11": "Guanajuato",
    "12": "Guerrero", "13": "Hidalgo", "14": "Jalisco", "15": "México",
    "16": "Michoacán", "17": "Morelos", "18": "Nayarit", "19": "Nuevo León",
    "20": "Oaxaca", "21": "Puebla", "22": "Querétaro", "23": "Quintana Roo",
    "24": "San Luis Potosí", "25": "Sinaloa", "26": "Sonora", "27": "Tabasco",
    "28": "Tamaulipas", "29": "Tlaxcala", "30": "Veracruz", "31": "Yucatán",
    "32": "Zacatecas",
}


def pull_term(pt, term):
    """One single-term payload -> {cveEnt: value 0-100}. Caches raw CSV."""
    pt.build_payload([term], geo="MX", timeframe=TIMEFRAME)
    df = pt.interest_by_region(resolution="REGION", inc_low_vol=True, inc_geo_code=True)
    slug = term.replace(" ", "_").replace("ó", "o").replace("í", "i").replace("ñ", "n")
    df.to_csv(os.path.join(RAW, "trends_%s.csv" % slug), encoding="utf-8")
    out = {}
    term_cols = [c for c in df.columns if c != "geoCode"]
    col = term_cols[0]  # the term value column (NOT the geoCode column)
    for geoname, row in df.iterrows():
        code = row.get("geoCode")
        cve = GEO2CVE.get(code)
        if cve:
            try:
                out[cve] = int(row[col])
            except (ValueError, TypeError):
                out[cve] = 0
    return out


def main():
    try:
        from pytrends.request import TrendReq
    except Exception as e:  # pragma: no cover
        print("NO_PYTRENDS", repr(e))
        return 2

    pt = TrendReq(hl="es-MX", tz=360, timeout=(10, 25))
    per_term = {}
    got = []
    for i, term in enumerate(TERMS):
        try:
            per_term[term] = pull_term(pt, term)
            got.append(term)
            print("pulled:", term, "->", sum(1 for v in per_term[term].values() if v > 0), "states>0")
        except Exception as e:
            print("FAIL term", term, repr(e))
            per_term[term] = {}
        if i < len(TERMS) - 1:
            time.sleep(2.5)

    if not got:
        print("ABORT: no term succeeded")
        return 1

    # Combine: sum of per-term intensities, then min-max rescale to 0-100.
    combined = {}
    for cve in NAME:
        combined[cve] = sum(per_term[t].get(cve, 0) for t in got)
    lo = min(combined.values())
    hi = max(combined.values())
    span = (hi - lo) or 1

    states = []
    for cve in sorted(NAME):
        raw = combined[cve]
        idx = round(100 * (raw - lo) / span)
        nonzero = sum(1 for t in got if per_term[t].get(cve, 0) > 0)
        states.append({
            "cveEnt": cve,
            "estado": NAME[cve],
            "perTerm": {t: per_term[t].get(cve, 0) for t in got},
            "trendRaw": raw,
            "trendIndex": idx,
            "lowConfidence": (raw == 0) or (nonzero <= 1),
        })

    doc = {
        "generatedAt": datetime.date.today().isoformat(),
        "source": "Google Trends (pytrends), geo=MX, resolution=REGION, interest_by_region",
        "method": ("Intensidad relativa de busqueda 0-100 (100=estado con mayor interes "
                   "proporcional). Cada termino jalado por separado y combinado por suma, "
                   "reescalado 0-100. NO es volumen ni numero de pacientes."),
        "window": TIMEFRAME,
        "terms": got,
        "caveats": [
            "Relativo, no absoluto: mide proporcion de busqueda, no cantidad de pacientes.",
            "Sesga hacia poblacion conectada con capacidad de copago (suele buscar el hijo/cuidador); subrepresenta al target pobre/rural/adulto mayor.",
            "Estados de bajo volumen marcados lowConfidence=true.",
            "Senal exploratoria: NO entra en el puntaje de prioridad.",
        ],
        "states": states,
    }
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(doc, f, ensure_ascii=False, separators=(",", ":"))

    # readable summary
    ranked = sorted(states, key=lambda s: -s["trendIndex"])
    print("\nwrote", OUT, "| terms ok:", got)
    print("TOP:", [(s["estado"], s["trendIndex"]) for s in ranked[:6]])
    print("BOTTOM:", [(s["estado"], s["trendIndex"]) for s in ranked[-6:]])
    print("lowConfidence:", [s["estado"] for s in states if s["lowConfidence"]])
    return 0


if __name__ == "__main__":
    sys.exit(main())
