from flask import Blueprint, request, jsonify
from services.mistral import MistralClient
from services.qdrant_service import QdrantService
from config import SEARCH_PROMPT
from controllers import utils

cl_search_bp = Blueprint("client_search", __name__)
qdrant = QdrantService()
mistral = MistralClient()

@cl_search_bp.route("/", methods=["POST"])
def proceed_client_search():

    try:

        payload = request.json.get("payload")

        ## parsing payload
        prod_name = payload.get("productName")
        if not prod_name:
            raise Exception("Product name is not mentioned!")
        ques_answ = utils.split_conversation_into_pairs(payload.get("conversationTranscript"))
        ques_answ.append("productHint : " + payload.get("conversationProblemHint"))
        ques_answ.append("productSolution : " + payload.get("conversationSolutionHint"))
        if len(ques_answ<3):
            raise Exception("Problem on parsing product information")
        
        points = []
        project_desc = ""
        ## Uploading client information to our database
        qdrant.create_collection(name = prod_name)
        for info in ques_answ:
            pt = qdrant.models.PointStruct(
                id = qdrant.get_uuid,
                payload= {"content":info},
                vector= mistral.get_embedding(info)
            )
            points.append(pt)
        
        qdrant.insert_vectors(collection_name=prod_name,points=points)
        
        ## Creating a search query
        prompt = SEARCH_PROMPT + project_desc

        query = mistral.generate(prompt = prompt)
        query_emb = mistral.get_embedding(text = query)
        similar_problems = qdrant.search_vectors("problem_collection",vector = query_emb, limit=10)

        ## 

        return jsonify(similar_problems)
    except Exception as er:
        return jsonify({"Problem":er})
    
