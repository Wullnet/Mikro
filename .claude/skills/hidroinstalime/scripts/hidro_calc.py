#!/usr/bin/env python3
"""hidro_calc.py - llogaritje hidroteknike per skill-in "hidroinstalime".

Vetem biblioteka standarde e Python 3. Cdo nenkomande printon rezultatet
dhe supozimet; me --json printon te njejtat te dhena si JSON.

Nenkomandat:
  demand        kerkesa per uje + prurja fekale e lagjes
  reservoir     vellimi dhe kuota e rezervarit
  pipe          gyp nen presion (Darcy-Weisbach / Colebrook), zgjedhja e DN
  sewer         kanal me gravitet (Prandtl-Colebrook, mbushje e pjesshme)
  storm         atmosferiku: metoda racionale, Reinhold/IDF, retencioni
  water-in      uji brenda shtepise (EN 806-3 LU, DIN 1988-300 Vs)
  dhw           uji i ngrohte: bojleri, fuqia, rregulla e 3 litrave
  drain-in      shkarkimi brenda shtepise (EN 12056-2, Sistemi I)
  roof          ulluqet dhe gypat vertikale (EN 12056-3)
  neighborhood  sasite e rrjetit per N shtepi (gjatesi, puseta, hidrante...)
  house         gjatesite e peraferta te instalimeve te nje shtepie

Shembull:  python3 hidro_calc.py demand --houses 300
           python3 hidro_calc.py sewer --q 12 --slope 0.5 --type fekal
"""
import argparse
import json
import math
import sys

G = 9.81            # m/s2
NU = 1.31e-6        # m2/s, viskoziteti kinematik i ujit ne 10 °C
RHO = 1000.0        # kg/m3

# ---------------------------------------------------------------------------
# Seritë e gypave (diametri i jashtem OD -> diametri i brendshem ID, mm)
# ---------------------------------------------------------------------------
PE100_OD = [32, 40, 50, 63, 75, 90, 110, 125, 140, 160, 180, 200, 225, 250,
            280, 315, 355, 400]


def pe100_id(od, sdr):
    """EN 12201-2: trashesia minimale e = OD/SDR, e rrumbullakosur lart ne 0.1 mm."""
    e = math.ceil(od / sdr * 10 - 1e-9) / 10
    return od - 2 * e


# PVC-U SN8 (EN 1401, SDR 34): OD -> trashesia e murit, mm
PVC_SN8_WALL = {110: 3.2, 125: 3.7, 160: 4.7, 200: 5.9, 250: 7.3, 315: 9.2,
                400: 11.7, 500: 14.6, 630: 18.4}
# Gypa me diameter nominal te brendshem (PP i brinjezuar EN 13476-3, beton EN 1916)
ID_SERIES = [150, 200, 250, 300, 400, 500, 600, 700, 800, 1000, 1200, 1400, 1500]
# Gypa shkarkimi brenda ndertese (PP/PVC, EN 1451 / EN 1329): OD -> ID perafersisht
DRAIN_IN_ID = {40: 36, 50: 46, 75: 71, 90: 85, 110: 104, 125: 118, 160: 152,
               200: 190}
# PE-X / shumeshtresor (PE-RT/Al/PE-RT): emertimi -> ID mm
PEX_SERIES = [("16x2", 12.0), ("20x2", 16.0), ("26x3", 20.0), ("32x3", 26.0),
              ("40x3.5", 33.0), ("50x4", 42.0), ("63x4.5", 54.0)]


def pipe_series(name):
    """Kthen listen [(emri, OD ose DN, ID_m)] per serine e zgjedhur."""
    if name == "pe100-sdr17":
        return [(f"PE100 OD{od} SDR17", od, pe100_id(od, 17) / 1000) for od in PE100_OD]
    if name == "pe100-sdr11":
        return [(f"PE100 OD{od} SDR11", od, pe100_id(od, 11) / 1000) for od in PE100_OD]
    if name == "pvc-sn8":
        return [(f"PVC SN8 OD{od}", od, (od - 2 * e) / 1000) for od, e in PVC_SN8_WALL.items()]
    if name == "id":
        return [(f"DN/ID {d}", d, d / 1000) for d in ID_SERIES]
    raise SystemExit(f"Seri e panjohur: {name}")


# ---------------------------------------------------------------------------
# Hidraulika
# ---------------------------------------------------------------------------
def colebrook_lambda(re, k_m, d_m):
    """Koeficienti i ferkimit (Colebrook-White), iterativ."""
    if re < 2300:
        return 64 / max(re, 1e-9)
    lam = 0.02
    for _ in range(50):
        lam_new = (-2 * math.log10(2.51 / (re * math.sqrt(lam)) + k_m / (3.71 * d_m))) ** -2
        if abs(lam_new - lam) < 1e-10:
            break
        lam = lam_new
    return lam


def pressure_pipe(q_ls, d_m, k_mm, length_m):
    """Gyp nen presion: shpejtesia, gradienti J (m/km) dhe humbja hf (m)."""
    q = q_ls / 1000
    area = math.pi * d_m ** 2 / 4
    v = q / area
    re = v * d_m / NU
    lam = colebrook_lambda(re, k_mm / 1000, d_m)
    j = lam / d_m * v ** 2 / (2 * G)          # m/m
    return {"v": v, "J_m_per_km": j * 1000, "hf_m": j * length_m, "lambda": lam}


def pc_velocity(dh_m, j, kb_mm):
    """Prandtl-Colebrook (DWA-A 110) me diametrin hidraulik dh = 4R."""
    if j <= 0 or dh_m <= 0:
        return 0.0
    root = math.sqrt(2 * G * dh_m * j)
    return -2 * math.log10(2.51 * NU / (dh_m * root) + kb_mm / 1000 / (3.71 * dh_m)) * root


def circle_segment(d_m, h_ratio):
    """Siperfaqja, perimetri i lagur dhe rrezja hidraulike per mbushje h/D."""
    h_ratio = min(max(h_ratio, 1e-6), 1.0)
    theta = 2 * math.acos(1 - 2 * h_ratio)
    area = d_m ** 2 / 8 * (theta - math.sin(theta))
    perim = d_m * theta / 2
    return area, perim, area / perim


def partial_flow(d_m, j, kb_mm, h_ratio):
    area, _, r_h = circle_segment(d_m, h_ratio)
    v = pc_velocity(4 * r_h, j, kb_mm)
    return v * area * 1000, v, r_h           # Q l/s, v m/s, R m


def full_flow(d_m, j, kb_mm):
    v = pc_velocity(d_m, j, kb_mm)
    return v * math.pi * d_m ** 2 / 4 * 1000, v


def solve_depth(d_m, j, kb_mm, q_ls):
    """Mbushja h/D per prurjen q (bisection). None nese q > kapacitetin maksimal."""
    hs = [0.80 + i * 0.002 for i in range(100)]
    h_max = max(hs, key=lambda h: partial_flow(d_m, j, kb_mm, h)[0])
    if q_ls > partial_flow(d_m, j, kb_mm, h_max)[0]:
        return None
    lo, hi = 1e-5, h_max
    for _ in range(80):
        mid = (lo + hi) / 2
        if partial_flow(d_m, j, kb_mm, mid)[0] < q_ls:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


# ---------------------------------------------------------------------------
# Shiu
# ---------------------------------------------------------------------------
def reinhold_r(d_min, t_years, r15_1):
    """Reinhold: r(D,T) = r15,1 * 38/(D+9) * (n^-0.25 - 0.369), n = 1/T."""
    n = 1.0 / t_years
    return r15_1 * 38.0 / (d_min + 9.0) * (n ** -0.25 - 0.369)


def rain_intensity(d_min, t_years, r15_1, idf):
    if idf:
        a, b, c = idf
        return a / (d_min + b) ** c
    return reinhold_r(d_min, t_years, r15_1)


# ---------------------------------------------------------------------------
# Pajisjet sanitare
# ---------------------------------------------------------------------------
# EN 806-3 Tab. 2: LU (1 LU = 0.1 l/s)
LU = {"lavaman": 1, "bide": 1, "wc": 1, "dush": 2, "vaske": 4, "kuzhine": 2,
      "enelarese": 2, "lavatrice": 2, "pisuar": 3, "rubinet": 5}
# DIN 1988-300: prurja llogaritese VR (l/s) e ftohte / e ngrohte
VR = {"lavaman": (0.07, 0.07), "bide": (0.07, 0.07), "wc": (0.13, 0.0),
      "dush": (0.15, 0.15), "vaske": (0.15, 0.15), "kuzhine": (0.07, 0.07),
      "enelarese": (0.07, 0.0), "lavatrice": (0.15, 0.0), "pisuar": (0.30, 0.0),
      "rubinet": (0.30, 0.0)}
# EN 12056-2 Tab. 2, Sistemi I: DU (l/s)
DU = {"lavaman": 0.5, "bide": 0.5, "wc": 2.0, "dush": 0.6, "dush-tape": 0.8,
      "vaske": 0.8, "kuzhine": 0.8, "enelarese": 0.8, "lavatrice": 0.8,
      "lavatrice12": 1.5, "pisuar": 0.8, "sifon50": 0.8, "sifon70": 1.5,
      "sifon100": 2.0}
# EN 12056-2 Tab. 11, Sistemi I, vertikale me ventilim primar:
# DN -> (Qmax me hyrje drejtkendore, Qmax me hyrje te harkuar) l/s
STACK_I = [(60, 0.5, 0.7), (70, 1.5, 2.0), (80, 2.0, 2.6), (90, 2.7, 3.5),
           (100, 4.0, 5.2), (125, 5.8, 7.6), (150, 9.5, 12.4), (200, 16.0, 21.0)]
# EN 12056-2 Tab. 6, Sistemi I, dege te paventiluara: (Qmax l/s, DN)
BRANCH_I = [(0.40, 30), (0.50, 40), (0.80, 50), (1.00, 56), (1.50, 60),
            (2.00, 70), (2.25, 80), (2.50, 100)]


def parse_fixtures(text):
    out = {}
    for part in text.split(","):
        part = part.strip()
        if not part:
            continue
        key, _, num = part.partition("=")
        out[key.strip()] = float(num or 1)
    return out


# ---------------------------------------------------------------------------
# Printimi
# ---------------------------------------------------------------------------
def emit(args, title, rows, notes=(), data=None):
    if getattr(args, "json", False):
        print(json.dumps({"titulli": title, "rezultatet": data or dict(rows),
                          "shenime": list(notes)}, ensure_ascii=False, indent=2))
        return
    print(f"\n== {title} ==")
    width = max((len(k) for k, _ in rows), default=10)
    for key, val in rows:
        if isinstance(val, float):
            val = f"{val:,.2f}"
        print(f"  {key.ljust(width)}  {val}")
    for note in notes:
        print(f"  * {note}")


def fmt(x, nd=2):
    return f"{x:.{nd}f}"


# ---------------------------------------------------------------------------
# Nenkomandat
# ---------------------------------------------------------------------------
def cmd_demand(a):
    pop = a.population or a.houses * a.persons
    q_cons = pop * a.q / 1000                          # m3/d konsumi
    q_prod = q_cons * (1 + a.losses)                   # m3/d me humbjet
    q_avg = q_prod / 86.4                              # l/s
    q_day = q_avg * a.kd
    q_hour = q_day * a.kh
    q_fire = a.fire_ls
    p_th = pop / 1000
    harmon = 1 + 14 / (4 + math.sqrt(p_th))
    dwf = q_cons * a.ret / 86.4                        # l/s mesatare
    if a.area_ha:
        q_inf = a.inf_ha * a.area_ha
        inf_note = f"infiltrim {a.inf_ha} l/(s*ha) x {a.area_ha} ha"
    else:
        q_inf = dwf * a.inf_pct
        inf_note = f"infiltrim {a.inf_pct*100:.0f}% e prurjes mesatare"
    q_sew = dwf * harmon + q_inf
    rows = [
        ("Banore", f"{pop:,.0f}"),
        ("Konsumi mesatar ditor", f"{q_cons:,.1f} m3/d"),
        ("Prodhimi mesatar (me humbje)", f"{q_prod:,.1f} m3/d = {fmt(q_avg)} l/s"),
        ("Q max ditor (kd)", f"{fmt(q_day)} l/s = {q_day*86.4:,.1f} m3/d"),
        ("Q max oror (kd*kh)", f"{fmt(q_hour)} l/s"),
        ("Zjarri", f"{fmt(q_fire)} l/s ({q_fire*3.6:.0f} m3/h) x {a.fire_h} h = {q_fire*3.6*a.fire_h:.0f} m3"),
        ("Rasti zjarr: Q max ditor + zjarri", f"{fmt(q_day + q_fire)} l/s"),
        ("Rasti dimensionues i rrjetit", f"{fmt(max(q_hour, q_day + q_fire))} l/s"),
        ("Fekal: prurja mesatare", f"{fmt(dwf)} l/s (kthim {a.ret*100:.0f}%)"),
        ("Fekal: faktori Harmon", fmt(harmon)),
        ("Fekal: infiltrimi", f"{fmt(q_inf)} l/s"),
        ("Fekal: prurja e pikut", f"{fmt(q_sew)} l/s"),
    ]
    notes = [f"q = {a.q} l/banor/dite, humbje {a.losses*100:.0f}%, kd = {a.kd}, kh = {a.kh}",
             inf_note,
             "Kontrollo: rrjeti dimensionohet per max(Q max oror, Q max ditor + zjarri)."]
    data = {"banore": pop, "q_cons_m3d": q_cons, "q_avg_ls": q_avg, "q_maxday_ls": q_day,
            "q_maxhour_ls": q_hour, "q_fire_ls": q_fire, "q_design_ls": max(q_hour, q_day + q_fire),
            "dwf_ls": dwf, "harmon": harmon, "q_inf_ls": q_inf, "q_sewer_peak_ls": q_sew}
    emit(a, "Kerkesa per uje dhe prurja fekale", rows, notes, data)


def cmd_reservoir(a):
    v_bal = a.balance * a.qmaxday
    v_fire = a.fire_ls * 3.6 * a.fire_h
    v_em = a.qmaxday / 24 * a.emergency_h
    v_tot = v_bal + v_fire + v_em
    std = [50, 100, 150, 200, 250, 300, 400, 500, 750, 1000, 1500, 2000, 3000, 5000]
    v_std = next((s for s in std if s >= v_tot), math.ceil(v_tot / 500) * 500)
    rows = [("Vellimi balancues", f"{v_bal:,.1f} m3 ({a.balance*100:.0f}% e Q max ditor)"),
            ("Rezerva e zjarrit", f"{v_fire:,.1f} m3"),
            ("Rezerva emergjente", f"{v_em:,.1f} m3 ({a.emergency_h} h)"),
            ("Vellimi i nevojshem", f"{v_tot:,.1f} m3"),
            ("Vellimi i propozuar", f"{v_std} m3 (2 dhoma te barabarta)")]
    notes = []
    if a.z_highest is not None:
        h_min = a.z_highest + a.p_req * 10.2 + a.losses_m
        rows.append(("Niveli minimal i ujit ne rezervar", f"{h_min:.1f} m mnd"))
        notes.append(f"= kuota e shtepise me te larte {a.z_highest} + {a.p_req} bar + humbjet {a.losses_m} m")
        if a.level_min is not None:
            if a.level_min < h_min:
                notes.append(f"Niveli i zgjedhur {a.level_min} m < {h_min:.1f} m: RRIT kuoten e rezervarit.")
            h_min = a.level_min
            rows.append(("Niveli minimal i zgjedhur", f"{h_min:.1f} m mnd (maksimal {h_min + a.depth:.1f} m)"))
    if a.z_lowest is not None and a.z_highest is not None:
        p_static = (h_min + a.depth - a.z_lowest) / 10.2
        rows.append(("Presioni statik te pika me e ulet", f"{p_static:.2f} bar"))
        if p_static > 6.0:
            notes.append("Presioni statik > 6 bar: ndaj zonat e presionit ose vendos reduktor (PRV) ne rrjet.")
    if a.source_ls is not None and a.source_ls < a.qmaxday / 86.4:
        notes.append("Burimi < Q max ditor: rezervari nuk mbushet dot; duhet burim shtese.")
    if a.source_ls is not None and a.qmaxhour is not None:
        if a.source_ls >= a.qmaxhour + a.fire_ls:
            notes.append("Burimi mbulon Q max oror + zjarrin: rezervari nuk eshte i domosdoshem hidraulikisht "
                         "(mbetet i dobishem per siguri dhe presion te qendrueshem).")
        else:
            notes.append("Burimi < Q max oror + zjarri: rezervari eshte i NEVOJSHEM.")
    emit(a, "Rezervari", rows, notes, {"v_total_m3": v_tot, "v_propozuar_m3": v_std})


def cmd_pipe(a):
    series = pipe_series(a.series)
    rows, chosen = [], None
    for name, nom, d in series:
        if a.min_nom and nom < a.min_nom:
            continue
        r = pressure_pipe(a.q, d, a.k, a.length)
        p_end = None
        if a.h_start is not None:
            p_end = (a.h_start - r["hf_m"] * (1 + a.local) - a.dz) / 10.2
        ok = r["v"] <= a.vmax and (p_end is None or p_end >= a.p_min)
        mark = ""
        if ok and chosen is None:
            chosen = (name, d, r, p_end)
            mark = "  <- zgjedhur"
        p_txt = f"  p fund={p_end:.2f} bar" if p_end is not None else ""
        rows.append((name, f"ID {d*1000:.1f} mm  v={r['v']:.2f} m/s  J={r['J_m_per_km']:.2f} m/km  "
                           f"hf={r['hf_m']:.2f} m{p_txt}{mark}"))
        if chosen and len(rows) >= 5:
            break
    notes = [f"Q = {a.q} l/s, L = {a.length} m, k = {a.k} mm, v max = {a.vmax} m/s"]
    data = {}
    if a.h_start is not None:
        notes.append(f"H fillim {a.h_start} m, ngritja {a.dz} m, humbje lokale +{a.local*100:.0f}%, "
                     f"p min ne fund {a.p_min} bar")
    if chosen:
        name, d, r, p_end = chosen
        data = {"gypi": name, "id_mm": d * 1000, **r}
        if p_end is not None:
            data["p_end_bar"] = p_end
    else:
        notes.append("Asnje gyp nuk plotson kushtet: kontrollo presionin ne fillim ose ndaj rrjetin.")
    emit(a, "Gyp nen presion", rows, notes, data)


def sewer_limits(kind, dn_mm):
    if kind == "fekal":
        return {"dn_min": 200, "h_max": 0.5 if dn_mm <= 300 else 0.7, "v_min": 0.6, "q_ratio": None}
    return {"dn_min": 300, "h_max": None, "v_min": 0.7, "q_ratio": 0.9}


def cmd_sewer(a):
    j = a.slope / 100
    series = pipe_series(a.series)
    if a.table:
        rows = []
        for name, nom, d in series:
            qf, vf = full_flow(d, j, a.kb)
            rows.append((name, f"ID {d*1000:.0f} mm  Q plote = {qf:,.1f} l/s  v plote = {vf:.2f} m/s  "
                               f"pjerresia min ~1/DN = {100 / nom:.2f}%"))
        emit(a, f"Kapaciteti i kanaleve ne {a.slope}% (kb = {a.kb} mm)", rows)
        return
    if a.q <= 0:
        raise SystemExit("Jep prurjen e projektit me --q (ose perdor --table).")
    chosen, rows = None, []
    for name, nom, d in series:
        lim = sewer_limits(a.type, nom)
        if nom < (a.dn_min or lim["dn_min"]):
            continue
        qf, vf = full_flow(d, j, a.kb)
        h = solve_depth(d, j, a.kb, a.q)
        if h is None:
            rows.append((name, f"Q plote = {qf:.1f} l/s < Q: e pamjaftueshme"))
            continue
        qq, v, r_h = partial_flow(d, j, a.kb, h)
        tau = RHO * G * r_h * j
        ok = True
        if lim["h_max"] and h > lim["h_max"]:
            ok = False
        if lim["q_ratio"] and a.q > lim["q_ratio"] * qf:
            ok = False
        rows.append((name, f"Q plote={qf:,.1f} l/s  h/D={h:.2f}  v={v:.2f} m/s  v plote={vf:.2f}  "
                           f"tau={tau:.2f} N/m2{'  <- zgjedhur' if ok and chosen is None else ''}"))
        if ok and chosen is None:
            chosen = {"gypi": name, "id_mm": d * 1000, "q_full_ls": qf, "v_full": vf,
                      "h_D": h, "v": v, "tau": tau, "v_min": lim["v_min"]}
        if chosen and len(rows) >= 4:
            break
    notes = [f"Q = {a.q} l/s, pjerresia {a.slope}%, kb = {a.kb} mm (DWA-A 110), lloji: {a.type}"]
    if chosen:
        if round(chosen["v"], 2) < chosen["v_min"]:
            notes.append(f"KUJDES: v = {chosen['v']:.2f} m/s < {chosen['v_min']} m/s ne prurjen e projektit: "
                         "rrit pjerresine ose parashiko shperlarje periodike (normale ne degët e sipërme).")
        if chosen["v_full"] > a.vmax:
            notes.append(f"KUJDES: v plote = {chosen['v_full']:.2f} m/s > {a.vmax} m/s: perdor puseta me renie "
                         "ose ul pjerresine.")
        if chosen["tau"] < 1.5 and a.type == "fekal":
            notes.append("tau < 1.5 N/m2: rrezik depozitimi; pjerresi me e madhe ose shperlarje.")
    emit(a, "Kanal me gravitet", rows, notes, chosen or {})


def cmd_storm(a):
    surfaces = []
    for s in a.surface or []:
        name, area, psi = s.split(":")
        surfaces.append((name, float(area), float(psi)))
    if not surfaces:
        surfaces = [("siperfaqja", a.area, a.psi)]
    area = sum(s[1] for s in surfaces)
    au = sum(s[1] * s[2] for s in surfaces)
    psi = au / area
    tc = a.tc if a.tc else a.t_entry + (a.length / a.v / 60 if a.length else 0)
    tc = max(tc, 5.0)
    idf = [float(x) for x in a.idf.split(",")] if a.idf else None
    r = rain_intensity(tc, a.T, a.r15, idf)
    q = r * au
    rows = [("Siperfaqja totale", f"{area:.3f} ha"),
            ("Siperfaqja e reduktuar Au", f"{au:.3f} ha (psi mesatar {psi:.2f})"),
            ("Koha e koncentrimit tc", f"{tc:.1f} min"),
            ("Intensiteti r(tc, T)", f"{r:.1f} l/(s*ha)  (T = {a.T} vjet)"),
            ("Prurja Q = psi*r*A", f"{q:,.1f} l/s")]
    notes = []
    if not idf:
        notes.append(f"Reinhold me r15,1 = {a.r15} l/(s*ha): VLERE SUPOZIMI - zevendesoje me IDF nga IHMK/studimi hidrologjik.")
    data = {"area_ha": area, "au_ha": au, "psi": psi, "tc_min": tc, "r": r, "q_ls": q}
    if a.outflow is not None:
        best = (0.0, 0)
        for d in range(5, 24 * 60 + 1, 5):
            rr = rain_intensity(d, a.T_ret, a.r15, idf)
            v = (rr * au - a.outflow) * d * 60 / 1000
            if v > best[0]:
                best = (v, d)
        v_req = best[0] * a.fz
        rows.append(("Retencioni: prurja dalese", f"{a.outflow:.1f} l/s"))
        rows.append(("Retencioni: vellimi i nevojshem", f"{v_req:,.0f} m3 (D kritike {best[1]} min, T = {a.T_ret} vjet, fz = {a.fz})"))
        notes.append("Metode e thjeshtuar (bilanc hyrje-dalje, si DWA-A 117 e thjeshtuar); per projekt final bej simulim.")
        data["v_retention_m3"] = v_req
    emit(a, "Atmosferiku: metoda racionale", rows, notes, data)


def cmd_water_in(a):
    fx = parse_fixtures(a.fixtures)
    unknown = [k for k in fx if k not in LU]
    if unknown:
        raise SystemExit(f"Pajisje te panjohura: {unknown}. Te njohura: {sorted(LU)}")
    sum_lu = sum(LU[k] * n for k, n in fx.items())
    sum_vr = sum((VR[k][0] + VR[k][1]) * n for k, n in fx.items())
    max_vr = max(max(VR[k]) for k in fx)
    vs = 1.48 * sum_vr ** 0.19 - 0.94 if sum_vr > 0 else 0
    vs = min(max(vs, max_vr), sum_vr)
    rows = [("Shuma LU (EN 806-3)", f"{sum_lu:.0f} LU  (= {sum_lu*0.1:.1f} l/s pa njekohesi)"),
            ("Shuma VR (DIN 1988-300)", f"{sum_vr:.2f} l/s"),
            ("Prurja e pikut Vs (banim)", f"{vs:.2f} l/s")]
    chosen = None
    for name, di in PEX_SERIES:
        r = pressure_pipe(vs, di / 1000, 0.007, 1.0)
        mark = ""
        if r["v"] <= a.vmax and chosen is None:
            chosen = (name, di, r)
            mark = "  <- zgjedhur"
        rows.append((f"PE-X/shumeshtresor {name}",
                     f"v={r['v']:.2f} m/s  R={r['J_m_per_km'] * 0.0981:.1f} mbar/m{mark}"))
    notes = ["Vs = 1.48*(SVR)^0.19 - 0.94 (DIN 1988-300, ndertesa banimi), kufizuar ndermjet VR max dhe SVR.",
             f"v max = {a.vmax} m/s (lidhja e shtepise / kolonat; degët per nje pajisje deri 2 m/s)."]
    data = {"sum_lu": sum_lu, "sum_vr": sum_vr, "vs_ls": vs}
    if chosen:
        name, di, r = chosen
        data.update({"gypi": name, "v": r["v"]})
        if a.p_avail is not None:
            dp_pipe = r["J_m_per_km"] / 1000 * a.length * (1 + a.local) / 10.2   # bar
            p_end = a.p_avail - a.z / 10.2 - a.dp_devices - dp_pipe
            rows.append(("Presioni ne pajisjen kritike", f"{p_end:.2f} bar (kerkohet >= {a.p_min} bar)"))
            notes.append(f"Buxheti: {a.p_avail} bar - lartesia {a.z} m - pajisjet {a.dp_devices} bar "
                         f"(ujemates, filter, valvula) - gypat {dp_pipe:.2f} bar")
            if p_end < a.p_min:
                notes.append("PRESION I PAMJAFTUESHEM: rrit diametrin, shkurto trasene ose vendos pompe rritese.")
            data["p_end_bar"] = p_end
    emit(a, "Uji brenda shtepise", rows, notes, data)


def cmd_dhw(a):
    v_day = a.persons * a.lpd
    v_store = max(v_day * a.factor, 120)
    std = [120, 150, 200, 250, 300, 400, 500, 750, 1000]
    v_std = next((s for s in std if s >= v_store), v_store)
    power = v_std * 1.163 * (a.t_hot - a.t_cold) / 1000 / a.recovery_h     # kW
    rows = [("Nevoja ditore (60 °C)", f"{v_day:.0f} l"),
            ("Bojleri i propozuar", f"{v_std} l"),
            ("Fuqia per ringrohje", f"{power:.1f} kW per {a.recovery_h} h (dT = {a.t_hot - a.t_cold} K)")]
    notes = ["Bojleri >= 60 °C, kthimi i qarkullimit >= 55 °C, i ftohti <= 25 °C (DVGW W 551).",
             "Grup sigurie EN 1487 (valvul sigurie 6 bar), ene ekspansioni sanitare, perzieres termostatik <= 45-50 °C ne dalje."]
    data = {"v_day_l": v_day, "v_store_l": v_std, "power_kw": power}
    if a.pipes:
        vol = 0.0
        for part in a.pipes.split(","):
            size, _, length = part.partition(":")
            di = dict(PEX_SERIES).get(size.strip())
            if di is None:
                raise SystemExit(f"Madhesi e panjohur {size}; perdor {[p[0] for p in PEX_SERIES]}")
            vol += math.pi * (di / 1000) ** 2 / 4 * float(length) * 1000
        rows.append(("Vellimi i gypit te ngrohte deri te rubineti", f"{vol:.2f} l"))
        rows.append(("Rregulla e 3 litrave", "OK pa qarkullim" if vol <= 3.0 else "> 3 l: DUHET linje qarkullimi"))
        data["pipe_volume_l"] = vol
    emit(a, "Uji i ngrohte sanitar", rows, notes, data)


def cmd_drain_in(a):
    fx = parse_fixtures(a.fixtures)
    unknown = [k for k in fx if k not in DU]
    if unknown:
        raise SystemExit(f"Pajisje te panjohura: {unknown}. Te njohura: {sorted(DU)}")
    sum_du = sum(DU[k] * n for k, n in fx.items())
    qww = a.K * math.sqrt(sum_du)
    qww = max(qww, max(DU[k] for k in fx))
    qtot = qww + a.qc
    stack = next((dn for dn, sq, sw in STACK_I if (sw if a.swept else sq) >= qtot), None)
    if "wc" in fx and stack is not None:
        stack = max(stack, 100)
    rows = [("Shuma DU", f"{sum_du:.1f}"),
            ("Qww = K*sqrt(SDU)", f"{qww:.2f} l/s (K = {a.K})"),
            ("Q total", f"{qtot:.2f} l/s"),
            ("Vertikalja (Sistemi I, ventilim primar)", f"DN {stack}" if stack else "> DN 200: ndaj vertikalet")]
    j = a.slope / 100
    col = None
    for od, di in sorted(DRAIN_IN_ID.items()):
        if od < 110 and "wc" in fx:
            continue
        q50, v50, _ = partial_flow(di / 1000, j, 1.0, a.fill)
        if q50 >= qtot:
            col = (od, q50, v50)
            break
    if col:
        rows.append((f"Kolektori horizontal ({a.slope}%, h/D {a.fill})",
                     f"OD {col[0]}  kapaciteti {col[1]:.2f} l/s  v = {col[2]:.2f} m/s"))
    branches = ", ".join(f"{q} l/s -> DN {dn}" for q, dn in BRANCH_I)
    notes = ["DU sipas EN 12056-2 Sistemi I; K = 0.5 banim, 0.7 shkolla/restorante, 1.0 tualete publike.",
             "Vertikalja me WC min DN 100 (OD 110); ventilimi vazhdon mbi cati me te njejtin DN.",
             f"Dege te paventiluara (Qww e deges): {branches}; <= 4 m, <= 3 kthesa, renie <= 1 m, >= 1%; "
             "dega me WC gjithmone DN 100."]
    emit(a, "Shkarkimi brenda shtepise", rows, notes,
         {"sum_du": sum_du, "qww": qww, "qtot": qtot, "stack_dn": stack, "collector_od": col[0] if col else None})


def downpipe_capacity(di_mm, f=0.33, kb_mm=0.25):
    """EN 12056-3: Q = 2.5e-4 * kb^-0.167 * di^2.667 * f^1.667 (l/s)."""
    return 2.5e-4 * kb_mm ** -0.167 * di_mm ** 2.667 * f ** 1.667


def cmd_roof(a):
    r = a.r if a.r else reinhold_r(5, a.T, a.r15) / 10000     # l/(s*m2)
    q = r * a.area * a.C
    q_dp = downpipe_capacity(a.di, a.f)
    n_dp = max(math.ceil(q / q_dp), 2 if a.area > 60 else 1)
    ae = math.pi * (a.gutter / 2) ** 2 / 2                    # mm2, gjysmerreth
    q_gut = 2.78e-5 * ae ** 1.25
    q_outlet = q_gut * 0.9 * (2 if a.central else 1)          # dalja ne mes merr nga dy anet
    n_out = math.ceil(q / q_outlet)
    rows = [("Intensiteti r", f"{r:.4f} l/(s*m2) = {r*10000:.0f} l/(s*ha)"),
            ("Prurja nga catia", f"{q:.2f} l/s (A = {a.area} m2, C = {a.C})"),
            (f"Kapaciteti i gypit vertikal di {a.di} mm", f"{q_dp:.2f} l/s (f = {a.f})"),
            (f"Kapaciteti i ulluqit gjysmerrethor {a.gutter} mm", f"{q_gut:.2f} l/s (i niveluar)"),
            ("Kapaciteti per dalje", f"{q_outlet:.2f} l/s ({'dalje ne mes' if a.central else 'dalje ne fund'})"),
            ("Numri minimal i gypave vertikale", f"{max(n_dp, n_out)}")]
    notes = ["Gypi vertikal sipas formules se EN 12056-3; ulluku QN = 2.78e-5*AE^1.25, me 0.9 per gjatesi.",
             "Numri real: edhe sipas gjeometrise (cdo ane catie, qoshet, <= 10-12 m ulluk per dalje).",
             "Shto dalje emergjente (overflow) per catite e sheshta dhe ulluqet e brendshme."]
    if not a.r:
        notes.append(f"r = r(5 min, T={a.T}) nga Reinhold me r15,1 = {a.r15}: SUPOZIM, verifiko me IHMK.")
    emit(a, "Ulluqet dhe gypat vertikale", rows, notes,
         {"r": r, "q_ls": q, "q_downpipe": q_dp, "n_downpipes": max(n_dp, n_out)})


def cmd_neighborhood(a):
    sides = 2 if a.both_sides else 1
    l_res = a.houses * a.frontage / sides
    streets = a.streets or max(1, math.ceil(l_res / a.street_len))
    l_tot = l_res + a.collector
    junctions = a.junctions if a.junctions is not None else streets + 1
    mh_f = math.ceil(l_tot / a.mh_spacing) + junctions
    mh_s = math.ceil(l_tot / a.mh_spacing_storm) + junctions
    gullies = math.ceil(sides * l_tot / a.gully_spacing)
    hydrants = math.ceil(l_tot / a.hydrant_spacing)
    valves = math.ceil(2.5 * junctions) + hydrants + math.ceil(l_tot / 400)
    water_mains = l_tot * (2 if a.twin_mains else 1)
    # gjatesite mesatare te kyçjeve
    c_sew = a.carriageway / 2 + a.sidewalk + a.chamber_setback
    c_water = a.main_offset + a.chamber_setback + (0 if a.twin_mains else
                                                   (a.carriageway + a.sidewalk) / 2 * (sides - 1))
    gully_lead = a.carriageway / 2 + 1.0
    rows = [("Shtepi", a.houses), ("Banore", f"{a.houses*a.persons:,.0f}"),
            ("Rruge banimi", f"{l_res:,.0f} m ({streets} rruge)"),
            ("Rruge kryesore/lidhese", f"{a.collector:,.0f} m"),
            ("Gjatesia totale e rrjetit", f"{l_tot:,.0f} m"),
            ("Kryqezime/nyje", junctions),
            ("Ujesjelles: gypa kryesore", f"{water_mains:,.0f} m"),
            ("Ujesjelles: hidrante", f"{hydrants} (cdo <= {a.hydrant_spacing} m)"),
            ("Ujesjelles: valvula ne rrjet", f"~{valves} (2-3/nyje + 1/hidrant + seksionim)"),
            ("Ujesjelles: kyçje", f"{a.houses} x {c_water:.1f} m = {a.houses*c_water:,.0f} m PE OD32"),
            ("Fekal: kolektore", f"{l_tot:,.0f} m"),
            ("Fekal: puseta", f"~{mh_f} (cdo <= {a.mh_spacing} m + nyjet)"),
            ("Fekal: kyçje", f"{a.houses} x {c_sew:.1f} m = {a.houses*c_sew:,.0f} m DN150"),
            ("Atmosferik: kolektore", f"{l_tot:,.0f} m"),
            ("Atmosferik: puseta", f"~{mh_s}"),
            ("Atmosferik: grila rruge", f"~{gullies} (cdo {a.gully_spacing} m, {sides} ane)"),
            ("Atmosferik: lidhjet e grilave", f"{gullies} x {gully_lead:.1f} m = {gullies*gully_lead:,.0f} m DN160"),
            ("Atmosferik: kyçje parcelash", f"{a.houses} x {c_sew:.1f} m = {a.houses*c_sew:,.0f} m DN150"
             if a.storm_connections else "0 (uji i catise infiltrohet/mbahet ne parcele)"),
            ("Puseta ne oborr", f"{a.houses} fekale + {a.houses if a.storm_connections else 0} atmosferike + {a.houses} ujematesi")]
    notes = [f"Ballina e parceles {a.frontage} m, shtepi ne {sides} ane, karrexhata {a.carriageway} m, trotuari {a.sidewalk} m.",
             "Vleresim paraprak (+/-15-20%); numrat perfundimtare dalin nga situacioni dhe profilet gjatesore."]
    emit(a, f"Rrjeti i lagjes: {a.houses} shtepi", rows, notes,
         {"l_total_m": l_tot, "hydrants": hydrants, "valves": valves, "manholes_sewer": mh_f,
          "manholes_storm": mh_s, "gullies": gullies, "conn_sewer_m": c_sew, "conn_water_m": c_water})


def cmd_house(a):
    per = 2 * (a.length + a.width)
    wet = a.baths * 4 + 3              # pajisje: 4/banjo (lavaman, wc, dush/vaske, bide/lavatrice) + kuzhina 3
    cold = a.setback + a.floors * a.floor_h + wet * a.run
    hot_fix = a.baths * 3 + 1
    hot = a.floors * a.floor_h + hot_fix * a.run
    circ = a.floors * a.floor_h + a.length * 0.8 if a.circulation else 0
    stacks = max(1, a.stacks)
    stack_len = stacks * (a.floors * a.floor_h + 1.5)
    under_slab = a.length + a.width * 0.5 + stacks * 2
    branches = wet * a.branch
    gutters = per if a.roof == "kater-ujesh" else 2 * a.length
    n_dp = max(2, math.ceil(gutters / 12))
    downp = n_dp * (a.floors * a.floor_h + 0.8)
    storm_ground = per * 0.6 + a.setback
    sew_ext = a.setback + 2
    rows = [("Uje i ftohte PE-X/shumeshtresor", f"~{cold:.0f} m (16x2 te pajisjet, 20x2-26x3 kryesorja)"),
            ("Uje i ngrohte", f"~{hot:.0f} m"),
            ("Qarkullim", f"~{circ:.0f} m" if circ else "jo (kontrollo rregullen e 3 l me `dhw`)"),
            ("Shkarkim OD110 vertikale + ventilim", f"~{stack_len:.0f} m ({stacks} vertikale)"),
            ("Shkarkim OD110-125 nen pllake", f"~{under_slab:.0f} m (>= 1-2%)"),
            ("Dege OD40/50", f"~{branches:.0f} m"),
            ("Shkarkim nga shtepia te puseta ne oborr", f"~{sew_ext:.0f} m OD160"),
            ("Ulluqe", f"~{gutters:.0f} m ({a.roof})"),
            ("Gypa vertikale shiu", f"{n_dp} x {a.floors*a.floor_h+0.8:.1f} m = ~{downp:.0f} m"),
            ("Atmosferik ne oborr OD125-160", f"~{storm_ground:.0f} m deri te puseta atmosferike"),
            ("Puseta ne oborr", "1 fekale (DN400-600) + 1 atmosferike + 1 ujematesi + revizione te kthesat")]
    notes = [f"Shtepi {a.length}x{a.width} m, P+{a.floors-1}, {a.baths} banjo, sistem kolektori (manifold).",
             "Vleresim paraprak per paramase; gjatesite reale merren nga plani/skema izometrike."]
    emit(a, "Gjatesite e instalimeve te nje shtepie", rows, notes)


# ---------------------------------------------------------------------------
def build_parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = p.add_subparsers(dest="cmd", required=True)

    def add(name, func, help_):
        sp = sub.add_parser(name, help=help_)
        sp.add_argument("--json", action="store_true", help="dalje JSON")
        sp.set_defaults(func=func)
        return sp

    s = add("demand", cmd_demand, "kerkesa per uje dhe prurja fekale")
    s.add_argument("--houses", type=int, default=300)
    s.add_argument("--persons", type=float, default=5.0, help="banore/shtepi (Kosova ~5)")
    s.add_argument("--population", type=float, help="mbishkruan houses*persons")
    s.add_argument("--q", type=float, default=150, help="l/banor/dite")
    s.add_argument("--losses", type=float, default=0.10, help="humbjet ne rrjet (0.10 = 10%%)")
    s.add_argument("--kd", type=float, default=1.5)
    s.add_argument("--kh", type=float, default=2.0)
    s.add_argument("--fire-ls", type=float, default=13.3, help="48 m3/h = 13.3 l/s")
    s.add_argument("--fire-h", type=float, default=2.0)
    s.add_argument("--ret", type=float, default=0.85, help="pjesa e ujit qe kthehet ne kanal")
    s.add_argument("--area-ha", type=float, help="siperfaqja e kanalizuar per infiltrimin")
    s.add_argument("--inf-ha", type=float, default=0.05, help="l/(s*ha) infiltrim")
    s.add_argument("--inf-pct", type=float, default=0.15)

    s = add("reservoir", cmd_reservoir, "vellimi dhe kuota e rezervarit")
    s.add_argument("--qmaxday", type=float, required=True, help="m3/d")
    s.add_argument("--qmaxhour", type=float, help="l/s, per krahasim me burimin")
    s.add_argument("--source-ls", type=float, help="kapaciteti i burimit/kyçjes l/s")
    s.add_argument("--balance", type=float, default=0.25)
    s.add_argument("--fire-ls", type=float, default=13.3)
    s.add_argument("--fire-h", type=float, default=2.0)
    s.add_argument("--emergency-h", type=float, default=0.0)
    s.add_argument("--z-highest", type=float, help="kuota e shtepise me te larte, m mnd")
    s.add_argument("--z-lowest", type=float, help="kuota e pikes me te ulet te rrjetit")
    s.add_argument("--p-req", type=float, default=2.35, help="bar te kyçja (P+1 = 2.35)")
    s.add_argument("--losses-m", type=float, default=5.0, help="humbjet deri te shtepia, m")
    s.add_argument("--depth", type=float, default=4.0, help="thellesia e ujit ne rezervar, m")
    s.add_argument("--level-min", type=float, help="niveli minimal i zgjedhur i ujit, m mnd")

    s = add("pipe", cmd_pipe, "gyp nen presion")
    s.add_argument("--q", type=float, required=True, help="l/s")
    s.add_argument("--length", type=float, default=100)
    s.add_argument("--series", default="pe100-sdr17",
                   choices=["pe100-sdr17", "pe100-sdr11", "pvc-sn8", "id"])
    s.add_argument("--k", type=float, default=0.4, help="rrashtesia operative mm (0.1 transmetim, 0.4 shperndarje)")
    s.add_argument("--vmax", type=float, default=1.5)
    s.add_argument("--min-nom", type=float, default=0, help="p.sh. 110 per rrjet me hidrante")
    s.add_argument("--h-start", type=float, help="presioni ne fillim, m")
    s.add_argument("--dz", type=float, default=0.0, help="ngritja e terrenit deri ne fund, m")
    s.add_argument("--local", type=float, default=0.10, help="shtese per humbjet lokale")
    s.add_argument("--p-min", type=float, default=1.5, help="bar ne fund (zjarr 1.5; YU 2.5)")

    s = add("sewer", cmd_sewer, "kanal me gravitet")
    s.add_argument("--q", type=float, default=0.0, help="l/s prurja e projektit")
    s.add_argument("--slope", type=float, required=True, help="%%")
    s.add_argument("--type", choices=["fekal", "atmosferik"], default="fekal")
    s.add_argument("--series", default="pvc-sn8", choices=["pvc-sn8", "id"])
    s.add_argument("--kb", type=float, default=0.75, help="mm, DWA-A 110 kolektore me puseta")
    s.add_argument("--dn-min", type=float, help="mbishkruan DN minimal")
    s.add_argument("--vmax", type=float, default=5.0, help="m/s (3.0 per beton)")
    s.add_argument("--table", action="store_true", help="tabela e kapaciteteve")

    s = add("storm", cmd_storm, "atmosferiku")
    s.add_argument("--area", type=float, default=1.0, help="ha")
    s.add_argument("--psi", type=float, default=0.6)
    s.add_argument("--surface", action="append", help="emri:ha:psi (mund te perseritet)")
    s.add_argument("--T", type=float, default=2.0, help="periudha e kthimit, vjet")
    s.add_argument("--r15", type=float, default=150.0, help="r15,1 l/(s*ha) - SUPOZIM per Kosoven")
    s.add_argument("--idf", help="a,b,c per r = a/(t+b)^c ne l/(s*ha)")
    s.add_argument("--tc", type=float, help="koha e koncentrimit, min")
    s.add_argument("--t-entry", type=float, default=5.0)
    s.add_argument("--length", type=float, default=0.0, help="gjatesia e rrjedhjes ne gyp, m")
    s.add_argument("--v", type=float, default=1.0, help="shpejtesia mesatare ne gyp, m/s")
    s.add_argument("--outflow", type=float, help="l/s dalje e lejuar -> vellimi i retencionit")
    s.add_argument("--T-ret", dest="T_ret", type=float, default=5.0)
    s.add_argument("--fz", type=float, default=1.2)

    s = add("water-in", cmd_water_in, "uji brenda shtepise")
    s.add_argument("--fixtures", default="lavaman=2,wc=2,dush=1,vaske=1,kuzhine=1,enelarese=1,lavatrice=1,rubinet=1")
    s.add_argument("--vmax", type=float, default=2.0)
    s.add_argument("--p-avail", type=float, help="bar pas ujematesit/ne kyçje")
    s.add_argument("--z", type=float, default=6.0, help="lartesia e pajisjes kritike mbi kyçjen, m")
    s.add_argument("--length", type=float, default=30.0, help="gjatesia deri te pajisja kritike, m")
    s.add_argument("--local", type=float, default=0.5, help="shtese per humbjet lokale")
    s.add_argument("--dp-devices", type=float, default=0.6, help="bar: ujemates, filter, EA, PRV")
    s.add_argument("--p-min", type=float, default=1.0, help="presioni minimal i rrjedhjes, bar")

    s = add("dhw", cmd_dhw, "uji i ngrohte")
    s.add_argument("--persons", type=float, default=5)
    s.add_argument("--lpd", type=float, default=40, help="l/person/dite ne 60 °C")
    s.add_argument("--factor", type=float, default=1.2, help="bojleri/nevoja ditore (pompe nxehtesie 1.2-1.5)")
    s.add_argument("--t-hot", type=float, default=60)
    s.add_argument("--t-cold", type=float, default=10)
    s.add_argument("--recovery-h", type=float, default=2.0)
    s.add_argument("--pipes", help="p.sh. '20x2:6,16x2:4' gypi i ngrohte pa qarkullim deri te rubineti")

    s = add("drain-in", cmd_drain_in, "shkarkimi brenda shtepise")
    s.add_argument("--fixtures", default="lavaman=2,wc=2,dush=1,vaske=1,kuzhine=1,enelarese=1,lavatrice=1,sifon50=2")
    s.add_argument("--K", type=float, default=0.5)
    s.add_argument("--qc", type=float, default=0.0, help="prurje e vazhdueshme/pompa l/s")
    s.add_argument("--swept", action="store_true", help="hyrje te harkuara ne vertikale")
    s.add_argument("--slope", type=float, default=1.0, help="%% i kolektorit horizontal")
    s.add_argument("--fill", type=float, default=0.5, help="h/D i lejuar")

    s = add("roof", cmd_roof, "ulluqet dhe gypat vertikale")
    s.add_argument("--area", type=float, required=True, help="m2 ne projeksion horizontal")
    s.add_argument("--r", type=float, help="l/(s*m2); nese mungon: Reinhold r(5,T)")
    s.add_argument("--T", type=float, default=5.0)
    s.add_argument("--r15", type=float, default=150.0)
    s.add_argument("--C", type=float, default=1.0)
    s.add_argument("--di", type=float, default=100.0, help="ID i gypit vertikal, mm")
    s.add_argument("--f", type=float, default=0.33, help="mbushja e gypit vertikal")
    s.add_argument("--gutter", type=float, default=125.0, help="gjeresia e ulluqit gjysmerrethor, mm")
    s.add_argument("--end-outlet", dest="central", action="store_false",
                   help="dalja ne fund te ulluqit (default: ne mes)")

    s = add("neighborhood", cmd_neighborhood, "sasite e rrjetit per N shtepi")
    s.add_argument("--houses", type=int, default=300)
    s.add_argument("--persons", type=float, default=5.0)
    s.add_argument("--frontage", type=float, default=15.0, help="ballina e parceles, m")
    s.add_argument("--both-sides", action="store_true", default=True)
    s.add_argument("--one-side", dest="both_sides", action="store_false")
    s.add_argument("--street-len", type=float, default=375.0)
    s.add_argument("--streets", type=int)
    s.add_argument("--junctions", type=int)
    s.add_argument("--collector", type=float, default=450.0, help="rruga lidhese pa shtepi, m")
    s.add_argument("--carriageway", type=float, default=6.0)
    s.add_argument("--sidewalk", type=float, default=2.0)
    s.add_argument("--main-offset", type=float, default=1.0, help="gypi i ujit nga kufiri i parceles, m")
    s.add_argument("--chamber-setback", type=float, default=1.5, help="puseta brenda kufirit, m")
    s.add_argument("--twin-mains", action="store_true", help="gyp uji ne te dy trotuaret")
    s.add_argument("--mh-spacing", type=float, default=50.0)
    s.add_argument("--mh-spacing-storm", type=float, default=60.0)
    s.add_argument("--gully-spacing", type=float, default=30.0)
    s.add_argument("--hydrant-spacing", type=float, default=80.0)
    s.add_argument("--storm-connections", action="store_true", help="kyç catite ne atmosferikun publik")

    s = add("house", cmd_house, "gjatesite e instalimeve te nje shtepie")
    s.add_argument("--length", type=float, default=12.0)
    s.add_argument("--width", type=float, default=10.0)
    s.add_argument("--floors", type=int, default=2)
    s.add_argument("--floor-h", type=float, default=3.0)
    s.add_argument("--baths", type=int, default=2)
    s.add_argument("--stacks", type=int, default=2)
    s.add_argument("--setback", type=float, default=6.0, help="shtepia - puseta/ujematesi, m")
    s.add_argument("--run", type=float, default=7.0, help="gjatesia mesatare kolektor-pajisje, m")
    s.add_argument("--branch", type=float, default=2.0, help="dega mesatare e shkarkimit, m")
    s.add_argument("--circulation", action="store_true")
    s.add_argument("--roof", choices=["kater-ujesh", "dy-ujesh"], default="kater-ujesh")
    return p


def main(argv=None):
    args = build_parser().parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    sys.exit(main())
