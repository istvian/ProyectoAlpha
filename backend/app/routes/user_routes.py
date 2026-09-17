from fastapi import APIRouter, Response
from controllers import user_controller

router = APIRouter()

@router.get("/")
def get_users():
    return user_controller.get_all_users()

@router.post("/")
def create_user(body: dict, res: Response):
    data, status_code = user_controller.create_user(body)
    res.status_code = status_code
    return data