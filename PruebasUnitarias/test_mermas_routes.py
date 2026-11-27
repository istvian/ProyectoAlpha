from decimal import Decimal
from uuid import uuid4
import pytest

from fastapi import HTTPException
from pydantic import ValidationError
from starlette.requests import Request

from models.ajustes_operativos import Merma
from models.cardex_log import CardexLog, TipoMovimiento
from models.obra import Obra
from models.proveedor import Articulos
from models.rol import Rol
from models.user import User
from routes.mermas_routes import MermaCreateSchema, registrar_merma
from routes.uso_interno_routes import UsoInternoCreateSchema, registrar_uso_interno


def crear_solicitud(correo: str) -> Request:
    request = Request(
        {
            "type": "http",
            "asgi": {"version": "3.0"},
            "http_version": "1.1",
            "method": "POST",
            "scheme": "http",
            "path": "/api/v1/mermas",
            "raw_path": b"/api/v1/mermas",
            "query_string": b"",
            "headers": [],
            "server": ("test", 80),
            "client": ("test", 1),
        }
    )
    request.state.usuario = correo
    return request


def test_motivo_rechaza_nulo_vacio_o_solo_espacios():
    for motivo in (None, "", "   "):
        with pytest.raises(ValidationError):
            MermaCreateSchema(articulo_id=1, cantidad=1, obra_id=1, motivo=motivo)


def test_consumo_interno_rechaza_destino_o_responsable_vacios():
    for campo in ("destino_material", "responsable_solicitud"):
        valores = {
            "articulo_id": 1,
            "cantidad": 1,
            "destino_material": "Reparación",
            "responsable_solicitud": "Jefe de bodega",
        }
        valores[campo] = "   "
        with pytest.raises(ValidationError):
            UsoInternoCreateSchema(**valores)


async def test_registra_merma_y_no_descontara_stock_insuficiente(db):
    rol = await Rol.create(id=2, nombre="Bodega")
    usuario = await User.create(nombre="Bodega de prueba", correo="bodega@example.invalid", password="test-password", rol=rol)
    obra = await Obra.create(codigo_obra="OBRA-TEST", nombre_obra="Obra de prueba", tipo_servicio="Prueba", tecnico_responsable=usuario)
    articulo = await Articulos.create(codigo_sku="MERMA-TEST", nombre="Artículo de prueba", stock_actual=8, precio_medio_ponderado=Decimal("3.50"))
    request = crear_solicitud(usuario.correo)
    respuesta = await registrar_merma(
        MermaCreateSchema(articulo_id=articulo.id, cantidad=3, obra_id=obra.id, motivo="  Empaque dañado  "),
        request,
        uuid4(),
    )

    assert respuesta["data"]["motivo"] == "Empaque dañado"
    assert respuesta["data"]["stock_resultante"] == 5
    assert await Merma.all().count() == 1
    movimiento = await CardexLog.get(tipo_movimiento=TipoMovimiento.MERMA)
    assert movimiento.cantidad == 3
    assert movimiento.saldo_resultante == 5

    with pytest.raises(HTTPException) as error:
        await registrar_merma(
            MermaCreateSchema(articulo_id=articulo.id, cantidad=6, obra_id=obra.id, motivo="Rotura"),
            request,
            uuid4(),
        )

    assert error.value.status_code == 400
    articulo_actualizado = await Articulos.get(id=articulo.id)
    assert articulo_actualizado.stock_actual == 5
    assert await Merma.all().count() == 1
    assert await CardexLog.all().count() == 1


async def test_registra_uso_interno_y_actualiza_stock_y_cardex(db):
    rol = await Rol.create(id=2, nombre="Bodega")
    usuario = await User.create(nombre="Bodega de prueba", correo="bodega@example.invalid", password="test-password", rol=rol)
    articulo = await Articulos.create(codigo_sku="USO-TEST", nombre="Artículo de uso interno", stock_actual=6, precio_medio_ponderado=Decimal("2.00"))
    respuesta = await registrar_uso_interno(
        UsoInternoCreateSchema(
            articulo_id=articulo.id,
            cantidad=2,
            destino_material="Mantención de herramientas",
            responsable_solicitud="Jefe de bodega",
        ),
        crear_solicitud(usuario.correo),
        uuid4(),
    )

    assert respuesta["data"]["stock_resultante"] == 4
    articulo_actualizado = await Articulos.get(id=articulo.id)
    assert articulo_actualizado.stock_actual == 4
    assert await CardexLog.all().count() == 1
    movimiento = await CardexLog.get(tipo_movimiento=TipoMovimiento.USO_INTERNO)
    assert movimiento.cantidad == 2
    assert movimiento.saldo_resultante == 4
    assert "Mantención de herramientas" in movimiento.motivo_justificacion
