from __future__ import annotations

import json
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, PageBreak, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "entrega"
VALIDATION = json.loads((OUT / "evidencia" / "validacion_iss.json").read_text(encoding="utf-8"))

INK = colors.HexColor("#12232B")
TEAL = colors.HexColor("#087F7A")
PALE = colors.HexColor("#E8F5F3")
GRID = colors.HexColor("#B8C9CC")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="Cover", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=25,
                          leading=30, textColor=INK, alignment=TA_CENTER, spaceAfter=10 * mm))
styles.add(ParagraphStyle(name="Sub", parent=styles["Normal"], fontName="Helvetica", fontSize=11,
                          leading=16, textColor=TEAL, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=16,
                          leading=20, textColor=INK, spaceBefore=5 * mm, spaceAfter=3 * mm))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12,
                          leading=15, textColor=TEAL, spaceBefore=4 * mm, spaceAfter=2 * mm))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.3,
                          leading=13.5, textColor=INK, spaceAfter=2.5 * mm))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.7,
                          leading=10, textColor=INK))
styles.add(ParagraphStyle(name="HeaderSmall", parent=styles["Smallx"], fontName="Helvetica-Bold",
                          textColor=colors.white))


class Report(BaseDocTemplate):
    def __init__(self, path: Path, title: str):
        super().__init__(str(path), pagesize=A4, rightMargin=18 * mm, leftMargin=18 * mm,
                         topMargin=20 * mm, bottomMargin=18 * mm, title=title, author="TP7 Satellite Tracker")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="content")
        self.addPageTemplates(PageTemplate(id="main", frames=frame, onPage=self._page))

    def _page(self, canvas, doc):
        canvas.saveState()
        canvas.setStrokeColor(TEAL)
        canvas.setLineWidth(0.7)
        canvas.line(18 * mm, 13 * mm, 192 * mm, 13 * mm)
        canvas.setFillColor(colors.HexColor("#52666B"))
        canvas.setFont("Helvetica", 7.5)
        canvas.drawString(18 * mm, 8.5 * mm, "TP7 Satellite Tracker — documentación de entrega")
        canvas.drawRightString(192 * mm, 8.5 * mm, f"Página {doc.page}")
        canvas.restoreState()


def p(text: str, style="Bodyx"):
    return Paragraph(text, styles[style])


def bullets(items):
    return [p(f"• {item}") for item in items]


def cover(title: str, subtitle: str):
    return [Spacer(1, 47 * mm), p(title, "Cover"), p(subtitle, "Sub"), Spacer(1, 55 * mm),
            p("Expo SDK 58 · React Native · TypeScript · satellite.js · MapLibre", "Sub"), PageBreak()]


def table(rows, widths=None, header=True):
    data = [[p(str(cell), "HeaderSmall" if header and row_index == 0 else "Smallx")
             for cell in row] for row_index, row in enumerate(rows)]
    t = Table(data, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    rules = [
        ("GRID", (0, 0), (-1, -1), 0.35, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 5), ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        rules += [("BACKGROUND", (0, 0), (-1, 0), TEAL), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
    t.setStyle(TableStyle(rules))
    return t


def build_technical():
    story = cover("INFORME TÉCNICO", "Arquitectura, propagación orbital y aplicación Android")
    story += [p("1. Alcance", "H1x"), p(
        "Orbita es una aplicación móvil que obtiene elementos orbitales públicos, propaga la órbita localmente y presenta posición, pases, geometría y vigencia de datos. La versión de entrega no requiere cuentas, API keys, EAS, Google Maps ni un proxy para su funcionamiento principal."
    ), p("2. Arquitectura", "H1x"), table([
        ["Capa", "Responsabilidad"],
        ["Presentación", "Expo Router; mapa MapLibre; sky chart SVG; catálogo, pases, brújula y ajustes."],
        ["Estado", "Zustand coordina selección, observador, actualizaciones periódicas y estados de carga/error."],
        ["Dominio", "SGP4, topocéntricas, predicción de pases, ground track, footprint y validación."],
        ["Datos", "Proveedores tipados, HTTP con reintentos/límites y caché SQLite con TTL de 18 h."],
        ["Nativo", "Ubicación, heading, DeviceMotion, notificaciones y renderer MapLibre Android."],
    ], [30*mm, 140*mm]), p("Flujo principal", "H2x"), p(
        "CelesTrak entrega OMM/JSON. El registro se normaliza, persiste en SQLite y se convierte a SatRec. Cada 2 s, satellite.js propaga en UTC y transforma ECI a geodésicas. La UI reutiliza el mismo registro para mapa, observador, pases y vigencia, evitando llamadas remotas por cuadro."
    ), p("3. SGP4 y coordenadas", "H1x"), p(
        "SGP4 modela perturbaciones apropiadas para elementos generales de dos líneas y OMM equivalentes. La implementación usa la época, movimiento medio, excentricidad, inclinación, nodo ascendente, argumento de perigeo, anomalía media y términos de arrastre. El vector ECI propagado se convierte a ECF con tiempo sideral y luego a latitud, longitud y altitud."
    ), p(
        "Para el observador se calcula el vector topocéntrico: azimut medido desde el norte, elevación sobre el horizonte y rango. Todas las fechas internas son UTC; la interfaz formatea la zona local. Si la propagación produce un estado inválido, se presenta error y no se fabrica una posición."
    ), PageBreak(), p("4. Pases, trayectoria y cobertura", "H1x")]
    story += bullets([
        "Pases: muestreo grueso a 60 s, detección de cruces de elevación mínima, bisección hasta 1 s y refinamiento del máximo.",
        "Ground track: dos períodos orbitales alrededor del instante actual, muestreados cada 45 s y divididos cuando el salto de longitud supera 180°.",
        "Footprint: radio angular esférico dependiente de altitud y elevación mínima; destinos geodésicos y recorte de polígonos en ±180°.",
        "Starlink: SupGP público con fallback GP/OMM, selección de época por NORAD, muestra uniforme y propagación SGP4 de 24 objetos.",
    ])
    story += [p("5. Mapa y Android", "H1x"), p(
        "MapLibre React Native renderiza fuentes GeoJSON y capas de línea, relleno y círculo. El estilo Liberty se obtiene de OpenFreeMap y la atribución permanece visible. El APK preview se construye con Hermes en EAS, se firma con la keystore remota del proyecto y se instala en un emulador Pixel 6a sin Metro."
    ), p("6. Persistencia y fallos", "H1x"), p(
        "SQLite usa WAL y conserva payload, fuente, época y descarga. Antes del TTL de 18 h evita tráfico; si una actualización falla, una entrada vencida puede sostener cálculos offline y se muestra su antigüedad. Los proveedores declaran capacidades: N2YO y Space-Track se omiten cuando no tienen URL/credenciales, sin bloquear CelesTrak."
    ), p("7. Seguridad, supuestos y limitaciones", "H1x")]
    story += bullets([
        "No hay secretos embebidos. OpenFreeMap, CelesTrak y Where the ISS at? son públicos.",
        "La precisión depende de la edad y calidad de los elementos orbitales; no es navegación ni control de misión.",
        "El modelo de footprint usa Tierra esférica; es apropiado para visualización académica, no para planificación RF de ingeniería.",
        "GPS, magnetómetro, inclinación y entrega de notificaciones deben confirmarse en teléfono físico.",
        "La firma incluida es de prueba académica; una publicación requiere un keystore de producción propio.",
    ])
    story += [p("8. Verificación", "H1x"), table([
        ["Control", "Resultado"], ["TypeScript / ESLint", "Correctos"], ["Jest", "6 suites; 27 pruebas"],
        ["Expo Doctor", "20/20"], ["Android development", "Compilado e instalado"],
        ["Android release", "APK firmado; arranque independiente"], ["Dispositivo físico", "Pendiente; no declarado como probado"],
    ], [55*mm, 115*mm])]
    Report(OUT / "INFORME_TECNICO.pdf", "Informe técnico").build(story)


def build_validation():
    c = VALIDATION["computed"]
    story = cover("INFORME DE VALIDACIÓN", "ISS (NORAD 25544) — comparación pública reproducible")
    story += [p("1. Método", "H1x"), p(
        "Se descargó el registro OMM vigente de CelesTrak y, de forma independiente, la posición de Where the ISS at?. El OMM se propagó con satellite.js 6.0.1 exactamente al timestamp UTC del control remoto. La diferencia horizontal se calculó con Haversine y la vertical como diferencia absoluta de altitud. El JSON completo y los payloads originales se conservan en entrega/evidencia/validacion_iss.json."
    ), p("2. Fuentes", "H1x"), table([
        ["Rol", "Endpoint"], ["Elementos orbitales", VALIDATION["requests"]["celestrakUrl"]],
        ["Control independiente", VALIDATION["requests"]["controlUrl"]],
    ], [42*mm, 128*mm]), p("3. Muestra obtenida", "H1x"), table([
        ["Campo", "SGP4 local", "Where the ISS at?"],
        ["Timestamp UTC", c["local"]["timestamp"], c["remote"]["timestamp"]],
        ["Latitud", f'{c["local"]["latitude"]:.9f}°', f'{c["remote"]["latitude"]:.9f}°'],
        ["Longitud", f'{c["local"]["longitude"]:.9f}°', f'{c["remote"]["longitude"]:.9f}°'],
        ["Altitud", f'{c["local"]["altitudeKm"]:.6f} km', f'{c["remote"]["altitudeKm"]:.6f} km'],
        ["Edad orbital", f'{c["orbitalAgeHours"]:.3f} h', "Control de posición"],
    ], [38*mm, 66*mm, 66*mm]), Spacer(1, 4*mm), table([
        ["Métrica", "Resultado"], ["Separación superficial", f'{c["distanceKm"]:.6f} km'],
        ["Diferencia de altitud", f'{c["altitudeDifferenceKm"]:.6f} km'],
    ], [80*mm, 90*mm]), p("4. Interpretación", "H1x"), p(
        f'La separación de aproximadamente {c["distanceKm"] * 1000:.0f} m y la diferencia vertical de aproximadamente {c["altitudeDifferenceKm"] * 1000:.0f} m son coherentes con dos implementaciones que usan modelos, redondeos y actualizaciones no necesariamente idénticos. La coincidencia temporal elimina el error dominante que produciría comparar instantes distintos. Esta muestra acredita que la cadena OMM → SGP4 → coordenadas funciona con datos reales; no establece una garantía permanente, porque la diferencia cambia con la edad de los elementos y la actualización de las fuentes.'
    ), p("5. Reproducción", "H1x"), p(
        "Con conexión a Internet, ejecutar desde la raíz: node scripts/validate-iss-live.mjs. El script consulta ambas fuentes, imprime las métricas y reemplaza el JSON de evidencia con una muestra nueva. Se debe conservar timestamp, payloads y versión de satellite.js para auditar el resultado."
    ), p("6. Alcance y pendientes", "H1x")]
    story += bullets([
        "Where the ISS at? fue consultado realmente; los valores de este informe provienen del JSON conservado.",
        "N2YO queda pendiente porque requiere una API key propia. No se usó una clave ajena ni se inventaron mediciones.",
        "Space-Track es opcional y no interviene. Una repetición posterior puede producir otros números y seguir siendo válida si conserva fuentes y timestamp.",
    ])
    Report(OUT / "VALIDACION.pdf", "Validación ISS").build(story)


def build_decisions():
    story = cover("DECISIONES DE DATOS", "Fuentes, caché, fallback y cartografía")
    story += [p("1. Principio", "H1x"), p(
        "La entrega prioriza fuentes públicas y reproducibles para que la primera ejecución no dependa de cuentas, pagos ni secretos. Las integraciones privadas se conservan como extensiones, pero no participan del camino crítico."
    ), p("2. Matriz de fuentes", "H1x"), table([
        ["Fuente", "Uso", "Autenticación", "Decisión"],
        ["CelesTrak GP/OMM", "ISS y catálogos", "No", "Principal"],
        ["CelesTrak SupGP", "Starlink", "No", "Principal por lote"],
        ["Where the ISS at?", "RF-15", "No", "Control independiente"],
        ["N2YO", "Control/alternativa", "Sí", "Opcional; se omite sin clave"],
        ["Space-Track", "Alternativa orbital", "Sí", "Opcional; se omite sin sesión"],
        ["OpenFreeMap", "Tiles y estilo Liberty", "No", "Cartografía principal"],
    ], [30*mm, 45*mm, 30*mm, 65*mm]), p("3. Normalización y selección", "H1x"), p(
        "Los payloads OMM se normalizan a un registro interno común. Para SupGP pueden coexistir soluciones de un mismo NORAD; se selecciona la de época más cercana al instante de uso. Si SupGP no está disponible, se usa el grupo GP/OMM STARLINK. Se muestrean 24 objetos uniformemente a través del lote para mantener legibilidad, cobertura visual y costo de propagación estable."
    ), p("4. Caché SQLite", "H1x"), p(
        "Cada entrada conserva clave, payload, fuente, época y fecha de descarga. El TTL es 18 h. Dentro del TTL se reutiliza la entrada. Si está vencida, se intenta actualizar; ante error de red, la entrada vencida puede utilizarse como fallback y la interfaz expone su edad. WAL reduce bloqueo entre lecturas y escrituras."
    ), p("5. Red y fallback", "H1x")]
    story += bullets([
        "Timeout y reintentos con backoff sólo para fallos recuperables; HTTP 403/404 no se reintentan.",
        "Los lotes Starlink respetan una descarga por actualización de CelesTrak; SQLite evita repetirlos durante 18 h.",
        "Rate limiter central evita ráfagas y las actualizaciones de UI no generan consultas remotas por cuadro.",
        "Cada proveedor declara capacidades y disponibilidad. El fallback no pregunta por datos que el proveedor no puede entregar.",
        "Sin proxy, N2YO y Space-Track se consideran no disponibles; CelesTrak mantiene la aplicación funcional.",
    ])
    story += [PageBreak(), p("6. MapLibre y OpenFreeMap", "H1x"), p(
        "Se eliminó Google Maps para evitar API key, cuenta de facturación y restricciones de firma. MapLibre ofrece un renderer Android nativo y fuentes GeoJSON adecuadas para trayectoria, footprint y constelación. OpenFreeMap publica el estilo Liberty sin autenticación. Logo y atribución se dejan visibles."
    ), table([
        ["Capa", "GeoJSON", "Primitiva MapLibre"],
        ["ISS", "Point", "Circle layer con halo"], ["Ground track", "LineString por segmento", "Line layer"],
        ["Footprint", "Polygon por recorte", "Fill + line"], ["Starlink", "FeatureCollection<Point>", "Circle layer"],
    ], [45*mm, 65*mm, 60*mm]), p("7. Operación offline", "H1x"), p(
        "Los mosaicos requieren red salvo que el renderer los conserve temporalmente, pero la propagación, pases y geometría no. Con un OMM almacenado, satellite.js continúa calculando localmente. La edad orbital y de caché permite decidir si el resultado sigue siendo adecuado para la demostración."
    ), p("8. Credenciales", "H1x"), p(
        "La configuración base no necesita ninguna. EXPO_PUBLIC_API_PROXY_URL sólo habilita un backend HTTPS propio. N2YO_API_KEY y las credenciales Space-Track pertenecen exclusivamente al servidor; no deben usar prefijo EXPO_PUBLIC_ ni incorporarse al APK."
    ), p("9. Riesgos y mitigaciones", "H1x"), table([
        ["Riesgo", "Mitigación"], ["Caída o límite remoto", "Caché, rate limiting, backoff y stale fallback visible."],
        ["Datos antiguos", "TTL, época y edad separadas; advertencia de vigencia."],
        ["Cruce de ±180°", "Segmentación de líneas y recorte de polígonos."],
        ["Costo de constelación", "Una descarga por lote y 24 propagaciones agrupadas."],
        ["Secreto en cliente", "No se requieren secretos; proveedores privados sólo detrás de backend propio."],
    ], [55*mm, 115*mm])]
    Report(OUT / "DECISIONES_DATOS.pdf", "Decisiones de datos").build(story)


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    build_technical()
    build_validation()
    build_decisions()
    print("PDFs generados:", ", ".join(p.name for p in OUT.glob("*.pdf")))
