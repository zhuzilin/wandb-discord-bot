import json
from typing import Optional, List

import uvicorn
from fastapi import FastAPI
from pydantic import BaseModel

from process_group import WandBProcessGroup

app = FastAPI()


process_group = WandBProcessGroup()


class LoginRequest(BaseModel):
    discord_username: str
    wandb_api_key: str


@app.post("/login/")
async def login(req: LoginRequest):
    print(req)
    logged_in = process_group.login(req.discord_username, req.wandb_api_key)
    return {"logged_in": logged_in}


class SummaryRequst(BaseModel):
    discord_username: str
    run_path: str


@app.post("/summary/")
async def summary(req: SummaryRequst):
    print(req)
    summary = process_group.summary(req.discord_username, req.run_path)
    return {"summary": summary}


class ProjectRequest(BaseModel):
    discord_username: str
    project: str
    topk: int
    filters: Optional[str]
    order: Optional[str]


@app.post("/project/")
async def project(req: ProjectRequest):
    print(req)
    filters = json.loads(req.filters) if req.filters is not None else None
    runs_info = process_group.project(
        req.discord_username,
        req.project,
        req.topk,
        filters,
        req.order or "-created_at")
    return {'runs_info': runs_info}


class ImageRequest(BaseModel):
    discord_username: str
    runs: List[str]
    keys: List[str]


@app.post("/image/")
async def image(req: ImageRequest):
    print(req)
    images = process_group.image(
        req.discord_username,
        req.runs,
        req.keys)
    return {'images': images}


if __name__ == "__main__":
    uvicorn.run(
      "main:app",
      host="127.0.0.1",
      port=8000)
