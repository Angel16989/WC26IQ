from fastapi import APIRouter, HTTPException

from app.schemas.prediction import MatchPredictionRequest, MatchPredictionResponse
from app.services.prediction_engine import predict_match

router = APIRouter(tags=["prediction"])


@router.post("/predict/match", response_model=MatchPredictionResponse)
def create_match_prediction(
    request: MatchPredictionRequest,
) -> MatchPredictionResponse:
    try:
        return predict_match(request)
    except ValueError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

