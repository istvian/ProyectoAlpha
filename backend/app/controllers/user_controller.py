def get_all_users():
    return [
        {"id": 1, "nombre": "Ana"},
        {"id": 2, "nombre": "Carlos"}
    ]

def create_user(body: dict):
    if "nombre" not in body or not body["nombre"]:
        return {"error": "El campo 'nombre' es obligatorio"}, 400

    nuevo_usuario = {
        "id": 3,
        "nombre": body["nombre"]
    }
    return nuevo_usuario, 201