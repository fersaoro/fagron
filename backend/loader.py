"""
loader.py — Lector y procesador de archivos Excel para Fagron Dashboard
"""
import hashlib, time, logging
from pathlib import Path
import pandas as pd

logger = logging.getLogger(__name__)

BASE_DIR    = Path(__file__).parent.parent
DATA_DIR    = BASE_DIR / "data"
MAIN_FILES  = ["DATA_201920202021.xlsx","DATA_20222023.xlsx","DATA_2024.xlsx","DATA_2025.xlsx","DATA_2026.xlsx"]
COLSUB_FILE = "ROTACIÓN_COLSUBSIDIO.xlsx"
SHEET_NAME  = "Data ABR 2026"

MES_ORDER = ["ENERO","FEBRERO","MARZO","ABRIL","MAYO","JUNIO","JULIO","AGOSTO","SEPTIEMBRE","OCTUBRE","NOVIEMBRE","DICIEMBRE"]
MES_NUM   = {m: i+1 for i, m in enumerate(MES_ORDER)}

MAIN_ASESORES = [
    "JUAN DAVID LOAIZA","JUAN GUILLERMO GUTIERREZ","NICOLAS MUNERA","DIANA BECERRA",
    "GISELA URIBE","MALKA MARTINLEYES","LUISA FERNANDA TORRES","CRISTINA TAVERA",
    "MARLY PAOLA BOLAÑO SUAREZ","ALEJANDRO HENAO","JESSICA GONZALEZ","NANCY CAICEDO","MAIRA ACOSTA",
]

_cache = {"df": None, "colsub_rot": None, "colsub_inv": None, "file_hash": None}

def _file_hash():
    h = hashlib.md5()
    for fname in MAIN_FILES + [COLSUB_FILE]:
        path = DATA_DIR / fname
        if path.exists():
            h.update(str(path.stat().st_mtime).encode())
    return h.hexdigest()

def _load_main():
    dfs = []
    for fname in MAIN_FILES:
        path = DATA_DIR / fname
        if not path.exists():
            logger.warning(f"Not found: {path}"); continue
        logger.info(f"Loading {fname}…")
        df = pd.read_excel(path, sheet_name=SHEET_NAME, engine="openpyxl")
        dfs.append(df)
    if not dfs:
        raise FileNotFoundError(f"No Excel files in {DATA_DIR}")
    df = pd.concat(dfs, ignore_index=True)
    logger.info(f"Loaded {len(df):,} rows")
    df["VALORES"]  = pd.to_numeric(df["VALORES"],  errors="coerce").fillna(0)
    df["CANTIDAD"] = pd.to_numeric(df["CANTIDAD"], errors="coerce").fillna(0)
    df["AÑO"]      = pd.to_numeric(df["AÑO"],      errors="coerce").fillna(0).astype(int)
    for col in ["LINEA","ZONA","ASESOR","GERENTE","FAMILIA","CLIENTE","TIPO DE CLIENTE","ESPECIALIDAD","MEDICOS","MES","BRANDS","DESCRIPCION"]:
        if col in df.columns:
            df[col] = df[col].astype(str).str.strip().str.upper()
    df["MES_NUM"] = df["MES"].map(MES_NUM).fillna(0).astype(int)
    df["GERENTE"] = df["GERENTE"].apply(
        lambda g: "ERIKA LOPEZ" if "ERIKA" in g else ("BEATRIZ SALAS" if "BEATRIZ" in g or "SALAS" in g else g)
    )
    return df

def _load_colsubsidio():
    path = DATA_DIR / COLSUB_FILE
    rot = inv = None
    if not path.exists():
        return rot, inv
    try:
        rot = pd.read_excel(path, sheet_name="ROTACIÓN", engine="openpyxl")
        rot["VENTA"] = pd.to_numeric(rot["VENTA"], errors="coerce").fillna(0)
        rot["AÑO"]   = pd.to_numeric(rot["AÑO"],   errors="coerce").fillna(0).astype(int)
        rot["MES"]   = rot["MES"].astype(str).str.strip().str.upper()
        rot["DESCRIPCION"] = rot["DESCRIPCION"].astype(str).str.strip()
        rot["PUNTO DE VENTA"] = rot["PUNTO DE VENTA"].astype(str).str.strip()
    except Exception as e:
        logger.warning(f"ROTACIÓN: {e}")
    try:
        inv = pd.read_excel(path, sheet_name="INVENTARIOS", engine="openpyxl")
        inv["INVENTARIOS"] = pd.to_numeric(inv["INVENTARIOS"], errors="coerce").fillna(0)
        inv["VALOR FINAL"]  = pd.to_numeric(inv["VALOR FINAL"], errors="coerce").fillna(0)
        inv["AÑO"]          = pd.to_numeric(inv["AÑO"],         errors="coerce").fillna(0).astype(int)
        inv["DESCRIPCION"]  = inv["DESCRIPCION"].astype(str).str.strip()
    except Exception as e:
        logger.warning(f"INVENTARIOS: {e}")
    return rot, inv

def ensure_loaded():
    h = _file_hash()
    if _cache["df"] is not None and _cache["file_hash"] == h:
        return
    logger.info("Reloading data…")
    t0 = time.time()
    _cache["df"] = _load_main()
    _cache["colsub_rot"], _cache["colsub_inv"] = _load_colsubsidio()
    _cache["file_hash"] = h
    logger.info(f"Loaded in {time.time()-t0:.1f}s")

def get_df():   ensure_loaded(); return _cache["df"]
def get_colsub(): ensure_loaded(); return _cache["colsub_rot"], _cache["colsub_inv"]

# ── Filter ────────────────────────────────────────────────────────────────────
def apply_filters(df, year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None):
    if year:   df = df[df["AÑO"] == int(year)]
    if mes:    df = df[df["MES"] == mes.upper()]
    if zona:   df = df[df["ZONA"] == zona.upper()]
    if gerente:df = df[df["GERENTE"] == gerente.upper()]
    if asesor: df = df[df["ASESOR"] == asesor.upper()]
    if linea:  df = df[df["LINEA"] == linea.upper()]
    return df

# ── Queries ───────────────────────────────────────────────────────────────────
def query_filter_options():
    df = get_df()
    years   = sorted([int(y) for y in df["AÑO"].unique() if y > 0], reverse=True)
    meses   = MES_ORDER
    zonas   = sorted([z for z in df["ZONA"].unique() if z and z != "NAN"])
    asesores= sorted([a for a in df["ASESOR"].unique() if a in [x.upper() for x in MAIN_ASESORES]])
    lineas  = sorted([l for l in df["LINEA"].unique() if l and l != "NAN"])
    return {"years": years, "meses": meses, "zonas": zonas,
            "gerentes": ["ERIKA LOPEZ","BEATRIZ SALAS"], "asesores": asesores, "lineas": lineas}

def query_summary(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    total_v = float(filtered["VALORES"].sum())
    total_u = float(filtered["CANTIDAD"].sum())
    yr = int(year) if year else int(filtered["AÑO"].max()) if len(filtered) else 2026
    prev_yr = yr - 1
    cur_mos = set(filtered[filtered["AÑO"] == yr]["MES_NUM"].unique())
    prev = apply_filters(df, prev_yr, mes, zona, gerente, asesor, linea)
    prev_v = float(prev[prev["MES_NUM"].isin(cur_mos)]["VALORES"].sum())
    growth = round((total_v - prev_v) / prev_v * 100, 1) if prev_v else 0
    by_a = filtered.groupby("ASESOR")["VALORES"].sum()
    by_f = filtered.groupby("FAMILIA")["VALORES"].sum()
    top_a = by_a.idxmax() if len(by_a) else "N/A"
    top_f = by_f.idxmax() if len(by_f) else "N/A"
    return {"total_cop": total_v, "total_units": total_u, "growth_pct": growth,
            "prev_cop": prev_v, "year": yr, "prev_year": prev_yr,
            "top_asesor": top_a, "top_asesor_v": float(by_a.get(top_a, 0)) if top_a != "N/A" else 0,
            "top_product": top_f, "top_product_v": float(by_f.get(top_f, 0)) if top_f != "N/A" else 0,
            "records": len(filtered)}

def query_monthly(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    grp = (filtered.groupby(["AÑO","MES","MES_NUM"])
           .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
           .reset_index().sort_values(["AÑO","MES_NUM"]))
    return grp.rename(columns={"AÑO":"yr","MES":"mes","MES_NUM":"mn"}).to_dict("records")

def query_yearly():
    df = get_df()
    grp = (df.groupby("AÑO").agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
           .reset_index().sort_values("AÑO"))
    return grp.rename(columns={"AÑO":"yr"}).to_dict("records")

def query_zones(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    grp = (filtered.groupby(["AÑO","ZONA"]).agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
           .reset_index().sort_values(["AÑO","ZONA"]))
    return grp.rename(columns={"AÑO":"yr","ZONA":"zona"}).to_dict("records")

def query_advisors(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    main_up = [a.upper() for a in MAIN_ASESORES]
    main_df = filtered[filtered["ASESOR"].isin(main_up)]

    # Group by ASESOR only — pick dominant ZONA and GERENTE to avoid duplicates
    grp_v = (main_df.groupby("ASESOR")
             .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"), clientes=("CLIENTE","nunique"))
             .reset_index().sort_values("v", ascending=False))

    # Dominant zona/gerente per asesor
    zona_map    = main_df.groupby("ASESOR")["ZONA"].agg(lambda x: x.mode()[0] if len(x) else "")
    gerente_map = main_df.groupby("ASESOR")["GERENTE"].agg(lambda x: x.mode()[0] if len(x) else "")

    yr = int(year) if year else int(df["AÑO"].max())
    cur = apply_filters(df, yr, mes, zona, gerente, asesor, linea).groupby("ASESOR")["VALORES"].sum()
    prv = apply_filters(df, yr-1, mes, zona, gerente, asesor, linea)
    cur_mos = set(filtered[filtered["AÑO"]==yr]["MES_NUM"].unique())
    prv = prv[prv["MES_NUM"].isin(cur_mos)].groupby("ASESOR")["VALORES"].sum()

    result = []
    for _, row in grp_v.iterrows():
        a = row["ASESOR"]
        cv = float(cur.get(a, 0)); pv = float(prv.get(a, 0))
        growth = round((cv - pv) / pv * 100, 1) if pv else 0
        top_p = (filtered[filtered["ASESOR"]==a].groupby("FAMILIA")["VALORES"].sum()
                 .sort_values(ascending=False).index[:3].tolist())
        top_c = (filtered[filtered["ASESOR"]==a].groupby("CLIENTE")["VALORES"].sum()
                 .sort_values(ascending=False).index[:3].tolist())
        result.append({"nombre": a, "zona": zona_map.get(a,""), "gerente": gerente_map.get(a,""),
                       "v": float(row["v"]), "u": float(row["u"]), "clientes": int(row["clientes"]),
                       "growth_yoy": growth, "top_products": top_p, "top_clients": top_c})
    return result

def query_monthly_advisor(asesor_name, years=(2025, 2026)):
    df = get_df()
    adv = df[df["ASESOR"] == asesor_name.upper()]
    result = {}
    for yr in years:
        by_mo = (adv[adv["AÑO"]==yr].groupby(["MES","MES_NUM"])
                 .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
                 .reset_index().sort_values("MES_NUM"))
        result[str(yr)] = {row["MES"]: {"v": float(row["v"]), "u": float(row["u"])} for _, row in by_mo.iterrows()}
    return result

def query_products(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None, top_n=20):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    grp = (filtered.groupby(["FAMILIA","LINEA"]).agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
           .reset_index().sort_values("v", ascending=False).head(top_n))
    return grp.rename(columns={"FAMILIA":"familia","LINEA":"linea"}).to_dict("records")

def query_lines(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    grp = (filtered.groupby("LINEA").agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
           .reset_index().sort_values("v", ascending=False))
    return grp.rename(columns={"LINEA":"linea"}).to_dict("records")

def query_clients(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None, top_n=25):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    grp = (filtered.groupby(["CLIENTE","TIPO DE CLIENTE"])
           .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"), pedidos=("DOCUMENTO","count"))
           .reset_index().sort_values("v", ascending=False).head(top_n))
    return grp.rename(columns={"CLIENTE":"cliente","TIPO DE CLIENTE":"tipo"}).to_dict("records")

def query_clients_monthly(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None, top_n=10):
    """Sell-in mensual por cliente (top N clientes)."""
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    # Get top clients first
    top = (filtered.groupby("CLIENTE")["VALORES"].sum()
           .sort_values(ascending=False).head(top_n).index.tolist())
    sub = filtered[filtered["CLIENTE"].isin(top)]
    grp = (sub.groupby(["CLIENTE","AÑO","MES","MES_NUM"])
           .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
           .reset_index().sort_values(["CLIENTE","AÑO","MES_NUM"]))
    return grp.rename(columns={"CLIENTE":"cliente","AÑO":"yr","MES":"mes","MES_NUM":"mn"}).to_dict("records")

def query_colsubsidio_monthly(tienda=None):
    """Sell-out mensual de Colsubsidio por tienda (PUNTO DE VENTA)."""
    rot, inv = get_colsub()
    if rot is None:
        return {"monthly_so":[], "by_store":[], "sell_out":[], "inventario":[], "rotation":[]}

    r = rot.copy()
    if tienda and tienda != "TODAS":
        r = r[r["PUNTO DE VENTA"] == tienda]

    # Monthly sell-out
    mes_order_lower = {m.lower(): i+1 for i, m in enumerate(MES_ORDER)}
    r["MES_NUM"] = r["MES"].str.lower().map(mes_order_lower).fillna(0).astype(int)
    monthly = (r.groupby(["AÑO","MES","MES_NUM"]).agg(so=("VENTA","sum")).reset_index()
               .sort_values(["AÑO","MES_NUM"]))
    monthly_list = monthly.rename(columns={"AÑO":"yr","MES":"mes","MES_NUM":"mn"}).to_dict("records")

    # By store
    by_store = (rot.groupby("PUNTO DE VENTA").agg(so=("VENTA","sum"))
                .reset_index().sort_values("so", ascending=False).head(20).to_dict("records"))

    # Top products sell-out
    so = (r.groupby("DESCRIPCION").agg(unidades=("VENTA","sum")).reset_index()
          .sort_values("unidades", ascending=False).head(15).to_dict("records"))

    # Inventory
    inv_data = []
    if inv is not None:
        iv = inv.copy()
        inv_grp = (iv.groupby("DESCRIPCION")
                   .agg(inventario=("INVENTARIOS","sum"), valor=("VALOR FINAL","sum"))
                   .reset_index().sort_values("inventario", ascending=False).head(15))
        inv_data = inv_grp.to_dict("records")

    # Rotation analysis
    rotation = []
    so_map = {x["DESCRIPCION"]: x["unidades"] for x in so}
    for ri in inv_data:
        prod = ri["DESCRIPCION"]; so_u = so_map.get(prod, 0); inv_u = ri["inventario"]
        rot_rate = round(so_u / inv_u, 2) if inv_u > 0 else 0
        if rot_rate > 1.5:   st = "riesgo_agotado"
        elif rot_rate > 0.5: st = "normal"
        elif so_u > 0:       st = "baja_rotacion"
        else:                st = "sin_sell_out"
        rotation.append({"prod": prod, "so": int(so_u), "inv": int(inv_u),
                         "rot": rot_rate, "status": st, "valor": float(ri["valor"])})

    # All stores list
    stores = sorted(rot["PUNTO DE VENTA"].dropna().unique().tolist())

    return {"monthly_so": monthly_list, "by_store": by_store, "sell_out": so,
            "inventario": inv_data, "rotation": rotation, "stores": stores}

def query_specialties(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    grp = (filtered.groupby("ESPECIALIDAD")
           .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"), clientes=("CLIENTE","nunique"))
           .reset_index().sort_values("v", ascending=False))
    return grp.rename(columns={"ESPECIALIDAD":"esp"}).to_dict("records")

def query_doctors(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None, top_n=20):
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)
    excl = {"NO REGISTRADO","SIN MEDICO","NAN","NONE",""}
    med = filtered[~filtered["MEDICOS"].isin(excl)]
    grp = (med.groupby(["MEDICOS","ESPECIALIDAD"])
           .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
           .reset_index().sort_values("v", ascending=False).head(top_n))
    return grp.rename(columns={"MEDICOS":"medico","ESPECIALIDAD":"esp"}).to_dict("records")

def query_molecules(year=None, mes=None, zona=None, gerente=None, asesor=None, linea=None, top_n=20):
    """Ventas por molécula (FAMILIA) con tendencia anual y mensual."""
    df = get_df()
    filtered = apply_filters(df, year, mes, zona, gerente, asesor, linea)

    # Exclude non-molecule entries
    excl_fam = {"FLETES","OTRAS ACTIVIDADES","OTRAS VENTAS","NAN","MAQUILA",""}
    mol_df = filtered[~filtered["FAMILIA"].isin(excl_fam)]

    # Total by molecule
    top_mols = (mol_df.groupby("FAMILIA")["VALORES"].sum()
                .sort_values(ascending=False).head(top_n).index.tolist())

    # Yearly trend per molecule
    yearly = (mol_df[mol_df["FAMILIA"].isin(top_mols)]
              .groupby(["FAMILIA","AÑO"])
              .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
              .reset_index()
              .rename(columns={"FAMILIA":"familia","AÑO":"yr"})
              .to_dict("records"))

    # Monthly trend (filtered years)
    monthly = (mol_df[mol_df["FAMILIA"].isin(top_mols[:10])]
               .groupby(["FAMILIA","AÑO","MES","MES_NUM"])
               .agg(v=("VALORES","sum"), u=("CANTIDAD","sum"))
               .reset_index().sort_values(["FAMILIA","AÑO","MES_NUM"])
               .rename(columns={"FAMILIA":"familia","AÑO":"yr","MES":"mes","MES_NUM":"mn"})
               .to_dict("records"))

    # YoY growth per molecule
    all_yrs = sorted(df["AÑO"].unique())
    yr_curr = int(year) if year else max(all_yrs)
    yr_prev = yr_curr - 1
    curr_v = mol_df[mol_df["AÑO"]==yr_curr].groupby("FAMILIA")["VALORES"].sum()
    prev_v = mol_df[mol_df["AÑO"]==yr_prev].groupby("FAMILIA")["VALORES"].sum()

    summary = []
    for fam in top_mols:
        cv = float(curr_v.get(fam, 0)); pv = float(prev_v.get(fam, 0))
        growth = round((cv-pv)/pv*100, 1) if pv else 0
        linea_val = mol_df[mol_df["FAMILIA"]==fam]["LINEA"].mode()
        summary.append({"familia": fam, "v": cv, "u": float(mol_df[mol_df["FAMILIA"]==fam]["CANTIDAD"].sum()),
                        "v_prev": pv, "growth_yoy": growth,
                        "linea": linea_val.iloc[0] if len(linea_val) else ""})

    return {"summary": summary, "yearly": yearly, "monthly": monthly, "top_mols": top_mols}

def query_inconsistencies():
    df = get_df()
    result = []
    multi = (df.groupby("ASESOR")["ZONA"].nunique().reset_index().query("ZONA > 1"))
    for _, row in multi.iterrows():
        a = row["ASESOR"]
        zones = df[df["ASESOR"]==a]["ZONA"].unique().tolist()
        result.append({"asesor": a, "zonas": zones, "ventas": float(df[df["ASESOR"]==a]["VALORES"].sum())})
    return sorted(result, key=lambda x: -x["ventas"])

def query_forecast():
    df = get_df()
    seasonal = {}
    for m in MES_ORDER:
        vals = []
        for yr in [2023,2024,2025]:
            yr_df = df[df["AÑO"]==yr]; total = yr_df["VALORES"].sum()
            mo_v  = yr_df[yr_df["MES"]==m]["VALORES"].sum()
            if total > 0: vals.append(float(mo_v/total))
        seasonal[m] = sum(vals)/len(vals) if vals else 0
    ytd = float(df[df["AÑO"]==2026]["VALORES"].sum())
    ytd_mos = df[df["AÑO"]==2026]["MES"].unique().tolist()
    ytd_pct = sum(seasonal[m] for m in ytd_mos if m in seasonal)
    ann = float(ytd/ytd_pct) if ytd_pct else 0
    months_left = [m for m in MES_ORDER if m not in ytd_mos]
    result = [{"mes": m, "conservador": round(ann*seasonal.get(m,0)*0.92),
               "esperado": round(ann*seasonal.get(m,0)), "acelerado": round(ann*seasonal.get(m,0)*1.15)}
              for m in months_left]
    return {"forecast": result, "ytd_2026": ytd, "annualized": round(ann)}
