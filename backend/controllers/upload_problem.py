from flask import Blueprint, request, jsonify
from services.mistral import MistralClient
from services.qdrant_service import QdrantService

upload_problem_bp = Blueprint("upload_problem", __name__)
qdrant = QdrantService()
mistral = MistralClient()

@upload_problem_bp.route("/", methods=["POST"])
def upload_problem():
    text = request.json.get("payload")

    points = []


    vector = mistral.get_embedding(text)
    
    return jsonify({"embedding": vector})