#!/usr/bin/env python3
"""
Genera el dashboard estático index.html desde los datos procesados.
Ejecutar: py exportar_datos.py
"""
import pandas as pd
import json
import base64
import warnings
from pathlib import Path
warnings.filterwarnings('ignore')

BASE   = Path(__file__).parent.parent
DATA   = BASE / "data"
OUT    = BASE / "docs"  # GitHub Pages serves from /docs
OUT.mkdir(exist_ok=True)

MES_ORDER = ['ENERO','FEBRERO','MARZO','ABRIL','MAYO','JUNIO','JULIO','AGOSTO',
             'SEPTIEMBRE','OCTUBRE','NOVIEMBRE','DICIEMBRE']
MES_NUM   = {m:i+1 for i,m in enumerate(MES_ORDER)}
MAIN = ['JUAN DAVID LOAIZA','JUAN GUILLERMO GUTIERREZ','NICOLAS MUNERA','DIANA BECERRA',
        'GISELA URIBE','MALKA MARTINLEYES','LUISA FERNANDA TORRES','CRISTINA TAVERA',
        'MARLY PAOLA BOLAÑO SUAREZ','ALEJANDRO HENAO','JESSICA GONZALEZ','NANCY CAICEDO','MAIRA ACOSTA']

print("Cargando archivos Excel...")
dfs = []
for fname in ['DATA_201920202021.xlsx','DATA_20222023.xlsx','DATA_2024.xlsx','DATA_2025.xlsx','DATA_2026.xlsx']:
    p = DATA / fname
    if p.exists():
        print(f"  {fname}...")
        dfs.append(pd.read_excel(p, sheet_name='Data ABR 2026', engine='openpyxl'))
    else:
        print(f"  ⚠️  {fname} no encontrado")

if not dfs:
    raise FileNotFoundError("No se encontraron archivos Excel en /data/")

df = pd.concat(dfs, ignore_index=True)
df['VALORES']  = pd.to_numeric(df['VALORES'],  errors='coerce').fillna(0)
df['CANTIDAD'] = pd.to_numeric(df['CANTIDAD'], errors='coerce').fillna(0)
df['AÑO']      = pd.to_numeric(df['AÑO'],      errors='coerce').fillna(0).astype(int)
for col in ['LINEA','ZONA','ASESOR','GERENTE','FAMILIA','CLIENTE','TIPO DE CLIENTE','ESPECIALIDAD','MEDICOS','MES','BRANDS']:
    if col in df.columns: df[col] = df[col].astype(str).str.strip().str.upper()
df['MES_NUM'] = df['MES'].map(MES_NUM).fillna(0).astype(int)
df['GERENTE'] = df['GERENTE'].apply(
    lambda g: 'ERIKA LOPEZ' if 'ERIKA' in g else ('BEATRIZ SALAS' if 'BEATRIZ' in g or 'SALAS' in g else g))
print(f"  Total: {len(df):,} registros")

rec  = df[df['AÑO'] >= 2023].copy()
mrec = rec[rec['ASESOR'].isin([a.upper() for a in MAIN])]

print("Procesando datos...")
# monthly [yr,mn,zona,asesor,linea,v,u]
monthly = mrec.groupby(['AÑO','MES_NUM','ZONA','ASESOR','LINEA']).agg(v=('VALORES','sum'),u=('CANTIDAD','sum')).reset_index()
mrows = [[int(r.AÑO),int(r.MES_NUM),r.ZONA,r.ASESOR,r.LINEA,int(r.v),int(r.u)] for _,r in monthly.iterrows()]

# monthly all [yr,mn,v,u]
mall_df = df.groupby(['AÑO','MES_NUM']).agg(v=('VALORES','sum'),u=('CANTIDAD','sum')).reset_index()
mall = [[int(r.AÑO),int(r.MES_NUM),int(r.v),int(r.u)] for _,r in mall_df.iterrows()]

# products [yr,zona,asesor,linea,familia,v,u]
prods = mrec.groupby(['AÑO','ZONA','ASESOR','LINEA','FAMILIA']).agg(v=('VALORES','sum'),u=('CANTIDAD','sum')).reset_index()
prows = [[int(r.AÑO),r.ZONA,r.ASESOR,r.LINEA,r.FAMILIA,int(r.v),int(r.u)] for _,r in prods.iterrows()]

# clients [yr,zona,asesor,cliente,tipo,v,u,pedidos]
clients = mrec.groupby(['AÑO','ZONA','ASESOR','CLIENTE','TIPO DE CLIENTE']).agg(v=('VALORES','sum'),u=('CANTIDAD','sum'),pedidos=('DOCUMENTO','count')).reset_index()
clients = clients[clients['v'] >= 300000]
crows = [[int(r.AÑO),r.ZONA,r.ASESOR,r.CLIENTE,r['TIPO DE CLIENTE'],int(r.v),int(r.u),int(r.pedidos)] for _,r in clients.iterrows()]

# yearly [yr,v,u]
ydf = df.groupby('AÑO').agg(v=('VALORES','sum'),u=('CANTIDAD','sum')).reset_index()
yrows = [[int(r.AÑO),int(r.v),int(r.u)] for _,r in ydf.iterrows()]

# zone_yr [yr,zona,v,u]
zdf = df.groupby(['AÑO','ZONA']).agg(v=('VALORES','sum'),u=('CANTIDAD','sum')).reset_index()
zrows = [[int(r.AÑO),r.ZONA,int(r.v),int(r.u)] for _,r in zdf.iterrows()]

# specialties [esp,v,u]
sdf = df[df['AÑO']>=2025].groupby('ESPECIALIDAD').agg(v=('VALORES','sum'),u=('CANTIDAD','sum')).reset_index().sort_values('v',ascending=False)
srows = [[r.ESPECIALIDAD,int(r.v),int(r.u)] for _,r in sdf.iterrows()]

# doctors [medico,esp,v,u]
excl = {'NO REGISTRADO','SIN MEDICO','NAN','NONE',''}
ddf = df[(df['AÑO']>=2025)&(~df['MEDICOS'].isin(excl))].groupby(['MEDICOS','ESPECIALIDAD']).agg(v=('VALORES','sum'),u=('CANTIDAD','sum')).reset_index().sort_values('v',ascending=False).head(20)
drows = [[r.MEDICOS,r.ESPECIALIDAD,int(r.v),int(r.u)] for _,r in ddf.iterrows()]

# asesor_info
asesor_info = {}
for a in MAIN:
    d2 = mrec[mrec['ASESOR']==a.upper()]
    if len(d2): asesor_info[a.upper()]={'zona':d2['ZONA'].mode()[0],'gerente':d2['GERENTE'].mode()[0]}

# Colsubsidio
cs = {'monthly':[],'prods':[],'inv':[],'stores':[]}
cp = DATA / 'ROTACIÓN_COLSUBSIDIO.xlsx'
if cp.exists():
    print("  Colsubsidio...")
    rot = pd.read_excel(cp, sheet_name='ROTACIÓN', engine='openpyxl')
    rot['VENTA'] = pd.to_numeric(rot['VENTA'],errors='coerce').fillna(0)
    rot['AÑO']   = pd.to_numeric(rot['AÑO'],  errors='coerce').fillna(0).astype(int)
    rot['MES']   = rot['MES'].astype(str).str.strip().str.upper()
    rot['PUNTO DE VENTA'] = rot['PUNTO DE VENTA'].astype(str).str.strip()
    rot['DESCRIPCION']    = rot['DESCRIPCION'].astype(str).str.strip()
    rot_mes = {m.lower():i+1 for i,m in enumerate(MES_ORDER)}
    rot['MES_NUM'] = rot['MES'].str.lower().map(rot_mes).fillna(0).astype(int)
    cm = rot.groupby(['AÑO','MES_NUM']).agg(so=('VENTA','sum')).reset_index()
    cs['monthly'] = [[int(r.AÑO),int(r.MES_NUM),int(r.so)] for _,r in cm.sort_values(['AÑO','MES_NUM']).iterrows()]
    cp2 = rot.groupby('DESCRIPCION').agg(so=('VENTA','sum')).reset_index().sort_values('so',ascending=False).head(15)
    cs['prods'] = [[r.DESCRIPCION,int(r.so)] for _,r in cp2.iterrows()]
    cs['stores'] = sorted(rot['PUNTO DE VENTA'].dropna().unique().tolist())
    inv = pd.read_excel(DATA/'ROTACIÓN_COLSUBSIDIO.xlsx',sheet_name='INVENTARIOS',engine='openpyxl')
    inv['INVENTARIOS'] = pd.to_numeric(inv['INVENTARIOS'],errors='coerce').fillna(0)
    inv['VALOR FINAL']  = pd.to_numeric(inv['VALOR FINAL'], errors='coerce').fillna(0)
    inv['DESCRIPCION']  = inv['DESCRIPCION'].astype(str).str.strip()
    ig = inv.groupby('DESCRIPCION').agg(inv=('INVENTARIOS','sum'),val=('VALOR FINAL','sum')).reset_index().sort_values('inv',ascending=False).head(15)
    cs['inv'] = [[r.DESCRIPCION,int(r.inv),int(r.val)] for _,r in ig.iterrows()]

data = {
    'meta': {'years':sorted([int(y) for y in df['AÑO'].unique() if y>0],reverse=True),
             'meses':MES_ORDER,'zonas':sorted([z for z in df['ZONA'].unique() if z and z!='NAN']),
             'lineas':sorted([l for l in df['LINEA'].unique() if l and l!='NAN']),
             'asesores':sorted([a for a in df['ASESOR'].unique() if a in [x.upper() for x in MAIN]]),
             'gerentes':['ERIKA LOPEZ','BEATRIZ SALAS'],
             'mes_names':{str(i+1):m for i,m in enumerate(MES_ORDER)}},
    'asesor_info':asesor_info,'mrows':mrows,'mall':mall,'prows':prows,
    'crows':crows,'yrows':yrows,'zrows':zrows,'srows':srows,'drows':drows,'cs':cs
}

json_str = json.dumps(data,ensure_ascii=False,separators=(',',':'))
print(f"  JSON: {len(json_str)//1024} KB")

# Save datos.json
json_path = OUT / 'datos.json'
with open(json_path,'w',encoding='utf-8') as f:
    f.write(json_str)
print(f"  Guardado: {json_path}")
print("✓ Exportación completa. Ahora ejecuta: git add . && git commit -m 'Actualizar datos' && git push")
