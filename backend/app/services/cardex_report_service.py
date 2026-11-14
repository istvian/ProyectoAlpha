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
from reportlab.platypus import (
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from models.cardex_log import CardexLog


HEADERS = [
    "ID",
    "Fecha y hora (UTC)",
    "Producto / SKU",
    "Movimiento",
    "Cantidad",
    "Saldo resultante",
    "Obra",
    "Responsable",
    "Justificación",
    "Costo unitario",
    "Saldo valorizado",
]


def _fecha_utc(fecha: datetime) -> datetime:
    if fecha.tzinfo is None:
        return fecha.replace(tzinfo=timezone.utc)
    return fecha.astimezone(timezone.utc)


def _texto_celda(valor: object, estilo: ParagraphStyle) -> Paragraph:
    texto = "-" if valor is None else str(valor)
    return Paragraph(escape(texto).replace("\n", "<br/>"), estilo)


def _producto(movimiento: CardexLog) -> str:
    sku = movimiento.producto.codigo_sku
    if sku:
        return f"{movimiento.producto.nombre} / {sku}"
    return movimiento.producto.nombre


def _obra(movimiento: CardexLog) -> str:
    if movimiento.obra_id is None:
        return "Sin obra"
    return f"{movimiento.obra.codigo_obra} - {movimiento.obra.nombre_obra}"


def _filas(movimientos: Sequence[CardexLog]) -> list[list[object]]:
    filas: list[list[object]] = []
    for movimiento in movimientos:
        fecha = _fecha_utc(movimiento.fecha_hora)
        filas.append(
            [
                movimiento.id,
                fecha.replace(tzinfo=None),
                _producto(movimiento),
                movimiento.tipo_movimiento.value,
                movimiento.cantidad,
                movimiento.saldo_resultante,
                _obra(movimiento),
                movimiento.usuario.nombre,
                movimiento.motivo_justificacion,
                movimiento.costo_unitario,
                movimiento.saldo_valorizado,
            ]
        )
    return filas


def generar_reporte_pdf(
    movimientos: Sequence[CardexLog], filtros: dict[str, str]
) -> bytes:
    salida = BytesIO()
    documento = SimpleDocTemplate(
        salida,
        pagesize=landscape(A3),
        rightMargin=12 * mm,
        leftMargin=12 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm,
        title="Reporte oficial de auditoría de Kardex",
        author="Proyecto Alpha",
    )
    estilos = getSampleStyleSheet()
    estilo_titulo = ParagraphStyle(
        "TituloAuditoria",
        parent=estilos["Title"],
        alignment=TA_CENTER,
        textColor=colors.HexColor("#17324D"),
        fontSize=18,
        spaceAfter=5,
    )
    estilo_subtitulo = ParagraphStyle(
        "SubtituloAuditoria",
        parent=estilos["Normal"],
        alignment=TA_CENTER,
        fontSize=9,
        leading=12,
    )
    estilo_celda = ParagraphStyle(
        "CeldaAuditoria",
        parent=estilos["Normal"],
        fontSize=7,
        leading=9,
    )
    estilo_encabezado = ParagraphStyle(
        "EncabezadoAuditoria",
        parent=estilo_celda,
        textColor=colors.white,
        fontName="Helvetica-Bold",
    )

    generado = datetime.now(timezone.utc).strftime("%d-%m-%Y %H:%M:%S UTC")
    resumen_filtros = " | ".join(
        f"{nombre}: {valor}" for nombre, valor in filtros.items()
    )
    contenido = [
        Paragraph("PROYECTO ALPHA", estilo_titulo),
        Paragraph("Reporte oficial de auditoría de Kardex", estilo_subtitulo),
        Paragraph(
            f"Generado: {generado} | Registros: {len(movimientos)}",
            estilo_subtitulo,
        ),
        Paragraph(escape(resumen_filtros), estilo_subtitulo),
        Spacer(1, 8 * mm),
    ]

    tabla_datos = [
        [_texto_celda(encabezado, estilo_encabezado) for encabezado in HEADERS]
    ]
    for fila in _filas(movimientos):
        tabla_datos.append(
            [
                _texto_celda(
                    valor.strftime("%d-%m-%Y %H:%M:%S")
                    if isinstance(valor, datetime)
                    else valor,
                    estilo_celda,
                )
                for valor in fila
            ]
        )
    if not movimientos:
        tabla_datos.append(
            [
                _texto_celda(
                    "No hay movimientos para los filtros seleccionados.",
                    estilo_celda,
                )
            ]
            + [""] * (len(HEADERS) - 1)
        )

    estilo_tabla = [
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#17324D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("GRID", (0, 0), (-1, -1), 0.35, colors.HexColor("#CBD5E1")),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        (
            "ROWBACKGROUNDS",
            (0, 1),
            (-1, -1),
            [colors.white, colors.HexColor("#F1F5F9")],
        ),
    ]
    if not movimientos:
        estilo_tabla.extend(
            [("SPAN", (0, 1), (-1, 1)), ("ALIGN", (0, 1), (-1, 1), "LEFT")]
        )

    tabla = Table(
        tabla_datos,
        colWidths=[
            ancho * mm
            for ancho in (10, 28, 38, 27, 18, 24, 38, 28, 68, 24, 28)
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
            doc.pagesize[0] - doc.rightMargin,
            8 * mm,
            f"Página {doc.page}",
        )
        canvas.restoreState()

    documento.build(
        contenido,
        onFirstPage=dibujar_pagina,
        onLaterPages=dibujar_pagina,
    )
    return salida.getvalue()


def _celda_excel(valor: object) -> object:
    if isinstance(valor, str) and valor.startswith(
        ("=", "+", "-", "@", "\t", "\r")
    ):
        return f"'{valor}"
    return valor


def generar_reporte_excel(
    movimientos: Sequence[CardexLog], filtros: dict[str, str]
) -> bytes:
    libro = Workbook()
    hoja = libro.active
    hoja.title = "Auditoría Kardex"
    libro.properties.title = "Reporte oficial de auditoría de Kardex"
    libro.properties.creator = "Proyecto Alpha"
    hoja.sheet_view.showGridLines = False

    fin_columna = len(HEADERS)
    hoja.merge_cells(start_row=1, start_column=1, end_row=1, end_column=fin_columna)
    hoja.cell(1, 1, "PROYECTO ALPHA - REPORTE DE AUDITORÍA DE KARDEX")
    hoja.cell(1, 1).font = Font(bold=True, size=16, color="17324D")
    hoja.cell(2, 1, "Generado (UTC)")
    hoja.cell(2, 2, datetime.now(timezone.utc).replace(tzinfo=None))
    hoja.cell(2, 2).number_format = "dd-mm-yyyy hh:mm:ss"
    hoja.cell(3, 1, "Filtros")
    hoja.cell(
        3,
        2,
        " | ".join(f"{nombre}: {valor}" for nombre, valor in filtros.items()),
    )
    hoja.merge_cells(start_row=3, start_column=2, end_row=3, end_column=fin_columna)

    fila_encabezado = 5
    for columna, encabezado in enumerate(HEADERS, start=1):
        celda = hoja.cell(fila_encabezado, columna, encabezado)
        celda.font = Font(bold=True, color="FFFFFF")
        celda.fill = PatternFill("solid", fgColor="17324D")
        celda.alignment = Alignment(vertical="center", wrap_text=True)
    hoja.row_dimensions[fila_encabezado].height = 30

    for indice, fila in enumerate(_filas(movimientos), start=fila_encabezado + 1):
        for columna, valor in enumerate(fila, start=1):
            celda = hoja.cell(indice, columna, _celda_excel(valor))
            celda.alignment = Alignment(vertical="top", wrap_text=True)
        hoja.cell(indice, 2).number_format = "dd-mm-yyyy hh:mm:ss"
        hoja.cell(indice, 10).number_format = '"$"#,##0.00'
        hoja.cell(indice, 11).number_format = '"$"#,##0.00'

    anchos = [10, 22, 36, 24, 14, 18, 36, 28, 60, 18, 20]
    for columna, ancho in enumerate(anchos, start=1):
        hoja.column_dimensions[get_column_letter(columna)].width = ancho
    hoja.freeze_panes = f"A{fila_encabezado + 1}"
    hoja.auto_filter.ref = (
        f"A{fila_encabezado}:{get_column_letter(fin_columna)}{hoja.max_row}"
    )
    hoja.sheet_properties.pageSetUpPr.fitToPage = True
    hoja.page_setup.orientation = "landscape"
    hoja.page_setup.fitToWidth = 1
    hoja.page_setup.fitToHeight = 0

    salida = BytesIO()
    libro.save(salida)
    return salida.getvalue()
