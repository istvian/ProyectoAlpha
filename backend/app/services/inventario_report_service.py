from datetime import datetime, timezone
from io import BytesIO
from typing import Sequence
from xml.sax.saxutils import escape

from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A3, landscape
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from models.proveedor import Articulos

HEADERS = [
    "ID",
    "SKU",
    "Nombre",
    "Categoría",
    "Estado",
    "Stock actual",
    "Stock mínimo",
    "Precio lista",
    "PMP",
]


def _estado(stock_actual: int, stock_minimo: int) -> str:
    if stock_actual <= 0:
        return "SIN_STOCK"
    if stock_actual <= stock_minimo:
        return "BAJO_STOCK"
    return "DISPONIBLE"


def _categoria(articulo: Articulos) -> str:
    specs = articulo.especificaciones_tecnicas or {}
    if isinstance(specs, dict):
        valor = specs.get("categoria")
        if valor not in (None, ""):
            return str(valor)
    return "Sin categoría"


def _texto_celda(valor: object, estilo: ParagraphStyle) -> Paragraph:
    texto = "-" if valor is None else str(valor)
    return Paragraph(escape(texto).replace("\n", "<br/>"), estilo)


def _filas(articulos: Sequence[Articulos]) -> list[list[object]]:
    filas: list[list[object]] = []
    for a in articulos:
        filas.append(
            [
                a.id,
                a.codigo_sku or "-",
                a.nombre,
                _categoria(a),
                _estado(a.stock_actual, a.stock_minimo),
                a.stock_actual,
                a.stock_minimo,
                a.precio_lista,
                a.precio_medio_ponderado,
            ]
        )
    return filas


def generar_reporte_pdf_inventario(
    articulos: Sequence[Articulos], filtros: dict[str, str]
) -> bytes:
    salida = BytesIO()
    documento = SimpleDocTemplate(
        salida,
        pagesize=landscape(A3),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title="Reporte de inventario",
        author="Proyecto Alpha",
    )
    estilos = getSampleStyleSheet()
    estilo_titulo = ParagraphStyle(
        "TituloInventario",
        parent=estilos["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17324D"),
        fontSize=18,
        spaceAfter=5,
    )
    estilo_subtitulo = ParagraphStyle(
        "SubtituloInventario",
        parent=estilos["Normal"],
        alignment=TA_CENTER,
        fontSize=9,
        leading=12,
    )
    estilo_celda = ParagraphStyle(
        "CeldaInventario", parent=estilos["Normal"], fontSize=8, leading=10
    )
    estilo_encabezado = ParagraphStyle(
        "EncabezadoInventario",
        parent=estilo_celda,
        textColor=colors.white,
        fontName="Helvetica-Bold",
    )

    generado = datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M:%S UTC")
    resumen_filtros = " | ".join(f"{k}: {v}" for k, v in filtros.items())
    contenido = [
        Paragraph("PROYECTO ALPHA", estilo_titulo),
        Paragraph("Reporte de inventario", estilo_subtitulo),
        Paragraph(
            f"Generado: {generado} | Registros: {len(articulos)}", estilo_subtitulo
        ),
        Paragraph(escape(resumen_filtros), estilo_subtitulo),
        Spacer(1, 8 * mm),
    ]

    tabla_datos = [[_texto_celda(h, estilo_encabezado) for h in HEADERS]]
    for fila in _filas(articulos):
        tabla_datos.append([_texto_celda(v, estilo_celda) for v in fila])
    if not articulos:
        tabla_datos.append(
            [
                _texto_celda(
                    "No hay artículos para los filtros seleccionados.", estilo_celda
                )
            ]
            + [""] * (len(HEADERS) - 1)
        )

    estilo_tabla = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        (
            "ROWBACKGROUNDS",
            (0, 1),
            (-1, -1),
            [colors.white, colors.HexColor("#F1F5F9")],
        ),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if not articulos:
        estilo_tabla.append(("SPAN", (0, 1), (-1, 1)))

    tabla = Table(
        tabla_datos,
        colWidths=[
            ancho * mm for ancho in (10, 28, 38, 27, 18, 24, 38, 28, 68, 24, 28)
        ],
        repeatRows=1,
        hAlign="LEFT",
    )
    tabla.setStyle(TableStyle(estilo_tabla))
    contenido.append(tabla)

    def dibujar_pagina(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 8)
        canvas.setFillColor(colors.HexColor("#64748B"))
        canvas.drawRightString(
            doc.pagesize[0] - doc.rightMargin, 8 * mm, f"Página {doc.page}"
        )
        canvas.restoreState()

    documento.build(contenido, onFirstPage=dibujar_pagina, onLaterPages=dibujar_pagina)
    return salida.getvalue()


def _celda_excel(valor: object) -> object:
    if isinstance(valor, str) and valor.startswith(("=", "+", "-", "@", "\t", "\r")):
        return f"'{valor}"
    return valor


def generar_reporte_excel_inventario(
    articulos: Sequence[Articulos], filtros: dict[str, str]
) -> bytes:
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Inventario"
    libro.properties.title = "Reporte de inventario"
    libro.properties.creator = "Proyecto Alpha"
    hoja.sheet_view.showGridLines = False

    fin_columna = len(HEADERS)
    hoja.merge_cells(start_row=1, start_column=1, end_row=1, end_column=fin_columna)
    hoja.cell(1, 1, "PROYECTO ALPHA - REPORTE DE INVENTARIO").font = Font(
        bold=True, size=16, color="17324D"
    )
    hoja.cell(2, 1, "Generado (UTC)")
    hoja.cell(2, 2, datetime.now(timezone.utc).replace(tzinfo=None)).number_format = (
        "dd-mm-yyyy hh:mm:ss"
    )
    hoja.cell(3, 1, "Filtros")
    hoja.cell(3, 2, " | ".join(f"{k}: {v}" for k, v in filtros.items()))
    hoja.merge_cells(start_row=3, start_column=2, end_row=3, end_column=fin_columna)

    fila_encabezado = 5
    for col, encabezado in enumerate(HEADERS, start=1):
        celda = hoja.cell(fila_encabezado, col, encabezado)
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor="17324D")
        celda.alignment = Alignment(vertical="center", wrap_text=True)
    hoja.freeze_panes = f"A{fila_encabezado + 1}"

    for idx, fila in enumerate(_filas(articulos), start=fila_encabezado + 1):
        for col, valor in enumerate(fila, start=1):
            celda = hoja.cell(idx, col, _celda_excel(valor))
            celda.alignment = Alignment(vertical="top", wrap_text=True)
        hoja.cell(idx, 8).number_format = '"$"#,##0.00'
        hoja.cell(idx, 9).number_format = '"$"#,##0.00'

    for col, ancho in enumerate([8, 18, 36, 22, 16, 14, 14, 16, 16], start=1):
        hoja.column_dimensions[get_column_letter(col)].width = ancho
    hoja.auto_filter.ref = (
        f"A{fila_encabezado}:{get_column_letter(fin_columna)}{hoja.max_row}"
    )
    hoja.page_setup.orientation = "landscape"
    hoja.sheet_properties.pageSetUpPr.fitToPage = True
    hoja.page_setup.fitToWidth = 1
    hoja.page_setup.fitToHeight = 0

    salida = BytesIO()
    libro.save(salida)
    return salida.getvalue()
