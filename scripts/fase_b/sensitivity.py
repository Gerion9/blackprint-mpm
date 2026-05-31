#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
sensitivity.py — Monte Carlo de RE-PONDERACION de los 4 indices publicados.

QUE HACE (y que NO):
  Mide la ESTABILIDAD del RANKING relativo de los estados con score cuando se
  mueven los pesos de los 4 indices (demanda, brecha, acceso, B2B). Sustituye la
  frase "Monte Carlo +/-20-30%, robustos vs sensibles, r>0.8" que el reporte
  afirmaba SIN calculo por numeros reproducibles.

  NO es una validacion contra cirugias ni un segundo modelo calibrado. Los 4
  indices son juicio experto estructurado (no una formula cerrada que los genere:
  la formula publicada del score NO los reproduce). "Robusto" = estable ante
  re-ponderacion, NO "correcto". La banda NO sube la confianza del score a "medido".

METODO:
  Para cada escenario (social, b2b) con pesos nominales declarados, se muestrean
  N pesos w_k ~ Uniform(nominal_k*0.7, nominal_k*1.3) y se RENORMALIZAN a suma 1
  (sin renormalizar se mide escala, no mezcla). score_i = sum_k w_k * index_k.
  Se rankea entre los estados con indices y se reporta el rango de posicion.

Salida: public/data/sensitivity.json  (validado en build/cliente por SensitivitySchema).
Reproducible: semilla fija; generatedAt se copia de meta.json (versionado por contenido).
"""
import json
import os
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "..", "public", "data"))

IDX_ORDER = ["demandIndex", "supplyGapIndex", "accessIndex", "b2bIndex"]
# Pesos nominales TRANSPARENTES de la re-ponderacion (no reproducen el priorityScore
# publicado, que es juicio experto): social premia necesidad (demanda+brecha) y
# acceso, minimiza corporativo; b2b = el vector publicado en meta.json.
NOMINAL = {
    "social": np.array([0.30, 0.30, 0.25, 0.15]),
    "b2b":    np.array([0.25, 0.10, 0.20, 0.45]),
}
DRAWS = 5000
SPREAD = 0.30           # +/-30% sobre el nominal
SEED = 42
TOP_N_ROBUST = 5        # umbral PREREGISTRADO: "ancla" = top-5 en >=90% de draws


def load_states():
    with open(os.path.join(DATA, "estados.json"), encoding="utf-8") as f:
        estados = json.load(f)
    scored = [
        e for e in estados
        if all(e.get(k) is not None for k in IDX_ORDER) and e.get("priorityScore") is not None
    ]
    scored.sort(key=lambda e: -e["priorityScore"])
    return scored


def montecarlo(X, nominal, rng):
    """X: (S,4) indices. Devuelve dict por estado con rangos de score y rank."""
    lo = nominal * (1 - SPREAD)
    hi = nominal * (1 + SPREAD)
    W = rng.uniform(lo, hi, size=(DRAWS, 4))      # (N,4)
    W = W / W.sum(axis=1, keepdims=True)          # renormalizar a suma 1
    assert np.allclose(W.sum(axis=1), 1.0), "los pesos no renormalizan a 1"
    scores = W @ X.T                              # (N,S)
    # rank 1 = score mas alto. argsort desc -> posicion de cada estado por draw.
    order = np.argsort(-scores, axis=1)           # (N,S) indices de estado ordenados
    ranks = np.empty_like(order)
    rows = np.arange(DRAWS)[:, None]
    ranks[rows, order] = np.arange(1, scores.shape[1] + 1)  # (N,S) rank por estado
    out = []
    for i in range(X.shape[0]):
        sc = scores[:, i]
        rk = ranks[:, i]
        out.append({
            "scoreMed": round(float(np.median(sc)), 1),
            "scoreP5":  round(float(np.percentile(sc, 5)), 1),
            "scoreP95": round(float(np.percentile(sc, 95)), 1),
            "rankMed":  int(round(float(np.median(rk)))),
            "rankP5":   int(round(float(np.percentile(rk, 5)))),   # mejor posicion plausible
            "rankP95":  int(round(float(np.percentile(rk, 95)))),  # peor posicion plausible
            "pctTop3":  round(float(np.mean(rk <= 3)), 3),
            "pctTop5":  round(float(np.mean(rk <= TOP_N_ROBUST)), 3),
        })
    return out


def robust_label(s):
    spread = s["rankP95"] - s["rankP5"]
    if s["pctTop5"] >= 0.90:
        return "ancla"          # se mantiene en el top-5 en >=90% de reponderaciones
    if spread <= 2:
        return "estable"        # su posicion casi no se mueve
    if spread >= 6:
        return "sensible"       # su posicion depende fuerte de los pesos
    return "medio"


def main():
    rng = np.random.default_rng(SEED)
    scored = load_states()
    X = np.array([[e[k] for k in IDX_ORDER] for e in scored], dtype=float)
    S = len(scored)

    scenarios = {}
    for name, nom in NOMINAL.items():
        per = montecarlo(X, nom, np.random.default_rng(SEED))  # misma semilla por escenario
        for s in per:
            s["robustLabel"] = robust_label(s)
        scenarios[name] = per

    # r REAL (Pearson) entre demanda y brecha — a nivel ESTADO (juicio experto)
    r_dg_estado = float(np.corrcoef(X[:, 0], X[:, 1])[0, 1])

    # r REAL a nivel MUNICIPAL (demanda y sgi comparten pob60 como insumo)
    r_dg_muni = None
    n_muni = 0
    try:
        with open(os.path.join(DATA, "municipios.json"), encoding="utf-8") as f:
            muni = json.load(f)
        pairs = [(x["demanda"], x["sgi"]) for x in muni
                 if x.get("demanda") is not None and x.get("sgi") is not None]
        if pairs:
            arr = np.array(pairs, dtype=float)
            r_dg_muni = round(float(np.corrcoef(arr[:, 0], arr[:, 1])[0, 1]), 3)
            n_muni = len(pairs)
    except FileNotFoundError:
        pass

    with open(os.path.join(DATA, "meta.json"), encoding="utf-8") as f:
        generated_at = json.load(f).get("generatedAt", "2026")

    states = []
    for i, e in enumerate(scored):
        states.append({
            "code": e["code"],
            "estado": e["estado"],
            "cveEnt": e["cveEnt"],
            "social": scenarios["social"][i],
            "b2b": scenarios["b2b"][i],
        })

    payload = {
        "generatedAt": generated_at,
        "method": (
            "Monte Carlo de re-ponderacion de los 4 indices publicados: pesos "
            "~Uniform(nominal*0.7, nominal*1.3) renormalizados a suma 1, N=%d por escenario. "
            "Mide la estabilidad del RANKING relativo ante re-ponderacion. NO es validacion "
            "contra cirugias ni un segundo modelo calibrado; los indices son juicio experto." % DRAWS
        ),
        "draws": DRAWS,
        "spread": SPREAD,
        "nominalWeights": {"social": NOMINAL["social"].round(3).tolist(), "b2b": NOMINAL["b2b"].round(3).tolist()},
        "indexOrder": IDX_ORDER,
        "correlations": {
            "demand_supplyGap_estado": round(r_dg_estado, 3),
            "n_estado": S,
            "demand_supplyGap_municipio": r_dg_muni,
            "n_municipio": n_muni,
            "note": (
                "Pearson r entre demanda y brecha. A nivel ESTADO los indices son juicio experto y "
                "resultan casi NO correlacionados (r=%s). A nivel MUNICIPAL demanda y sgi comparten "
                "poblacion 60+ como insumo y si hay colinealidad moderada (r=%s) a residualizar en Fase B "
                "(no el >0.8 que se afirmaba sin calculo)." % (round(r_dg_estado, 3), r_dg_muni)
            ),
        },
        "states": states,
    }

    out_path = os.path.join(DATA, "sensitivity.json")
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)

    # --- resumen legible ---
    print("sensitivity.json escrito:", out_path)
    print("estados con indices:", S, "| draws:", DRAWS,
          "| r(D,G) estado =", round(r_dg_estado, 3), "| r(D,G) muni =", r_dg_muni)
    print("\nSOCIAL — rango de posicion (rank) y etiqueta:")
    for st in states:
        s = st["social"]
        print("  %-4s %-18s rank %d (%d-%d)  top5=%.0f%%  %s"
              % (st["code"], st["estado"][:18], s["rankMed"], s["rankP5"], s["rankP95"],
                 100 * s["pctTop5"], s["robustLabel"]))


if __name__ == "__main__":
    main()
