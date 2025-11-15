from flask import Blueprint, request, jsonify
from services.mistral import MistralClient
from services.qdrant_service import QdrantService
from config import SEARCH_PROMPT, PERS_MSG_PROMPT
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
            project_desc += "\n" + info
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
        
        result = []
        for prob in similar_problems:
            score = prob.score
            payload = prob.get("payload")
            user_id = payload.get("reddit_id")
            text = payload.get("text")
            title = payload.get("title")
            subreddit = payload.get("subreddit")
            url = payload.get("url")

            prob_desc = f"url:{url}, title : {title}, problem : {text}"

            message = mistral.generate(PERS_MSG_PROMPT + f"Inputs: PROBLEM_DESCRIPTION: {prob_desc} SOLUTION_DESCRIPTION: {project_desc}")

            res = {
                "problem":{
                    "title":title,
                    "subreddit":subreddit,
                    "user_id":user_id,
                    "url":url,
                    "summary": mistral.generate(f"Summarize the users problem:{title + "\n" + text}")
                },
                "marketing":message
            }
            result.append(res)

        ## 

        return jsonify(result)
    except Exception as er:
        return jsonify({"Problem":er})
    
