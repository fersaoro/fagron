"""
app.py — Fagron Dashboard API Server
"""
import os, math, logging
from pathlib import Path
from flask import Flask, jsonify, request, send_from_directory, send_file
from flask_cors import CORS
import loader

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

BASE_DIR = Path(__file__).parent.parent
FRONTEND = BASE_DIR / "frontend"
DATA_DIR = BASE_DIR / "data"

app = Flask(__name__, static_folder=str(FRONTEND), static_url_path="")
CORS(app)

def clean(obj):
    if isinstance(obj, float):
        return None if (math.isnan(obj) or math.isinf(obj)) else obj
    if isinstance(obj, dict):  return {k: clean(v) for k,v in obj.items()}
    if isinstance(obj, list):  return [clean(v) for v in obj]
    return obj

def gp():
    """Get all filter params from request."""
    return {k: request.args.get(k) for k in ["year","mes","zona","gerente","asesor","linea"]}

def ok(data): return jsonify(clean(data))
def err(e):   logger.exception(e); return jsonify({"error": str(e)}), 500

@app.route("/")
def index(): return send_file(FRONTEND / "index.html")

@app.route("/data/<path:filename>")
def serve_data(filename): return send_from_directory(str(DATA_DIR), filename)

@app.route("/api/status")
def status():
    try:
        loader.ensure_loaded(); df = loader.get_df()
        return ok({"ok": True, "rows": len(df), "years": sorted(df["AÑO"].unique().tolist())})
    except FileNotFoundError as e:
        return ok({"ok": False, "error": str(e)}), 503

@app.route("/api/filters")
def api_filters():
    try: return ok(loader.query_filter_options())
    except Exception as e: return err(e)

@app.route("/api/summary")
def api_summary():
    try: return ok(loader.query_summary(**gp()))
    except Exception as e: return err(e)

@app.route("/api/monthly")
def api_monthly():
    try: return ok(loader.query_monthly(**gp()))
    except Exception as e: return err(e)

@app.route("/api/yearly")
def api_yearly():
    try: return ok(loader.query_yearly())
    except Exception as e: return err(e)

@app.route("/api/zones")
def api_zones():
    try: return ok(loader.query_zones(**gp()))
    except Exception as e: return err(e)

@app.route("/api/advisors")
def api_advisors():
    try: return ok(loader.query_advisors(**gp()))
    except Exception as e: return err(e)

@app.route("/api/advisor-monthly")
def api_advisor_monthly():
    asesor = request.args.get("asesor","")
    if not asesor: return jsonify({"error":"asesor required"}), 400
    try: return ok(loader.query_monthly_advisor(asesor))
    except Exception as e: return err(e)

@app.route("/api/products")
def api_products():
    try: return ok({"products": loader.query_products(**gp()), "lines": loader.query_lines(**gp())})
    except Exception as e: return err(e)

@app.route("/api/clients")
def api_clients():
    try: return ok(loader.query_clients(**gp()))
    except Exception as e: return err(e)

@app.route("/api/clients-monthly")
def api_clients_monthly():
    try: return ok(loader.query_clients_monthly(**gp()))
    except Exception as e: return err(e)

@app.route("/api/colsubsidio")
def api_colsubsidio():
    tienda = request.args.get("tienda","")
    try: return ok(loader.query_colsubsidio_monthly(tienda if tienda else None))
    except Exception as e: return err(e)

@app.route("/api/specialties")
def api_specialties():
    try: return ok({"specialties": loader.query_specialties(**gp()), "doctors": loader.query_doctors(**gp())})
    except Exception as e: return err(e)

@app.route("/api/molecules")
def api_molecules():
    try: return ok(loader.query_molecules(**gp()))
    except Exception as e: return err(e)

@app.route("/api/inconsistencies")
def api_inconsistencies():
    try: return ok(loader.query_inconsistencies())
    except Exception as e: return err(e)

@app.route("/api/forecast")
def api_forecast():
    try: return ok(loader.query_forecast())
    except Exception as e: return err(e)

if __name__ == "__main__":
    logger.info("="*60)
    logger.info("Fagron Dashboard — Iniciando servidor")
    logger.info(f">>> http://localhost:5000 <<<")
    logger.info("="*60)
    try:
        loader.ensure_loaded()
        df = loader.get_df()
        logger.info(f"✓ {len(df):,} registros · Años: {sorted(df['AÑO'].unique().tolist())}")
    except FileNotFoundError as e:
        logger.error(f"✗ {e}")
    app.run(host="0.0.0.0", port=5000, debug=False)
