# Fagron Colombia — Dashboard Ejecutivo

Aplicación web responsive con backend Python/Flask y frontend HTML/CSS/JS.
Los filtros leen datos directamente de los archivos Excel en la carpeta `/data`.

## Estructura del Proyecto

```
fagron-app/
├── README.md
├── backend/
│   ├── app.py          ← Servidor Flask (API REST)
│   ├── loader.py       ← Lector y procesador de Excel
│   └── requirements.txt
├── frontend/
│   ├── index.html      ← Página principal
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── app.js      ← Lógica principal + estado
│       ├── charts.js   ← Todas las gráficas (Chart.js)
│       ├── filters.js  ← Manejo de filtros
│       └── pages.js    ← Renderizado de cada página
└── data/               ← PON AQUÍ TUS ARCHIVOS EXCEL
    ├── DATA_201920202021.xlsx
    ├── DATA_20222023.xlsx
    ├── DATA_2024.xlsx
    ├── DATA_2025.xlsx
    ├── DATA_2026.xlsx
    ├── ROTACIÓN_COLSUBSIDIO.xlsx
    ├── logo.png
    └── logoblanco.png
```

## Instalación

### 1. Requisitos
- Python 3.9 o superior
- pip

### 2. Instalar dependencias
```bash
cd fagron-app/backend
pip install -r requirements.txt
```

### 3. Copiar archivos Excel
Copia todos tus archivos `.xlsx` y los logos a la carpeta `data/`:
```
DATA_201920202021.xlsx
DATA_20222023.xlsx
DATA_2024.xlsx
DATA_2025.xlsx
DATA_2026.xlsx
ROTACIÓN_COLSUBSIDIO.xlsx
logo.png
logoblanco.png
```

### 4. Ejecutar
```bash
cd fagron-app/backend
python app.py
```

### 5. Abrir el Dashboard
Ve a: **http://localhost:5000**

## API Endpoints

| Endpoint | Descripción |
|----------|-------------|
| `GET /api/filters` | Opciones disponibles para los filtros |
| `GET /api/summary` | KPIs y resumen ejecutivo |
| `GET /api/monthly` | Ventas mensuales (soporta todos los filtros) |
| `GET /api/advisors` | Ranking y datos de asesores |
| `GET /api/products` | Top productos y líneas |
| `GET /api/clients` | Top clientes |
| `GET /api/zones` | Ventas por zona y año |
| `GET /api/yearly` | Totales anuales |
| `GET /api/colsubsidio` | Sell-out e inventarios Colsubsidio |
| `GET /api/specialties` | Ventas por especialidad médica |

Todos los endpoints soportan query params: `year`, `zona`, `gerente`, `asesor`, `linea`

## Filtros Disponibles
- **Año**: 2019–2026
- **Zona**: PERIFERIA, CENTRO, MP, SAC, OTROS
- **Gerente**: ERIKA LOPEZ, BEATRIZ SALAS
- **Asesor**: Los 13 asesores principales
- **Línea**: MAGISTRALES ORALES, MAGISTRALES TOPICAS, COSMETICOS, ACTIVOS

## Notas
- El backend procesa los Excel al inicio y cachea los datos en memoria
- El caché se actualiza automáticamente si detecta cambios en los archivos
- Tiempo de carga inicial: ~15-30 segundos (procesa 471K registros)
