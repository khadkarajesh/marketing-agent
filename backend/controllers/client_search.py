from flask import Blueprint, request, jsonify
from services.mistral import MistralClient
from services.qdrant_service import QdrantService
from qdrant_client import models
from config import SEARCH_PROMPT, PERS_MSG_PROMPT
from controllers import utils
from tqdm import tqdm

cl_search_bp = Blueprint("client_search", __name__)
qdrant = QdrantService()
mistral = MistralClient()

@cl_search_bp.route("/", methods=["POST"])
def proceed_client_search():
    try:
        payload = request.get_json()
        ## parsing payload
        prod_name = payload.get("productName")
        if not prod_name:
            raise Exception("Product name is not mentioned!")
        conversation_transcript = payload.get("conversationTranscript", "")
        if not isinstance(conversation_transcript, str):
            conversation_transcript = str(conversation_transcript) if conversation_transcript else ""
        ques_answ = utils.split_conversation_into_pairs(conversation_transcript)
        problem_hint = payload.get("conversationProblemHint")
        if problem_hint:
            ques_answ.append("productHint : " + str(problem_hint))
        solution_hint = payload.get("conversationSolutionHint")
        if solution_hint:
            ques_answ.append("productSolution : " + str(solution_hint))
        pdf_slides = payload.get("pdfSlidesText", [])
        if pdf_slides and isinstance(pdf_slides, list):
            # Convert PdfPageText objects to strings if needed
            pdf_strings = []
            for slide in pdf_slides:
                if isinstance(slide, dict) and 'text' in slide:
                    pdf_strings.append(f"Page {slide.get('pageNumber', '?')} ({slide.get('filename', 'unknown')}):\n{slide['text']}")
                elif isinstance(slide, str):
                    pdf_strings.append(slide)
            ques_answ += utils.parse_pdf_slides_clean(pdf_strings)
        if len(ques_answ)<3:
            raise Exception("Problem on parsing product information")
        
        # print(ques_answ)
        # return jsonify({"suc":"suc"})
        points = []
        project_desc = ""
        ## Uploading client information to our database
        qdrant.create_collection(name = prod_name)
        for info in ques_answ:
            project_desc += "\n" + info
            # pt = models.PointStruct(
            #     id = qdrant.get_uuid(),
            #     payload= {"content":info},
            #     vector = mistral.get_embedding(info)
            # )
            # points.append(pt)
        #qdrant.insert_vectors(collection_name=prod_name,points=points)

        print("Summarizing project")
        summary = mistral.generate(f"Summarize my project {project_desc}")
        
        ## Creating a search query
        prompt = SEARCH_PROMPT + summary

        print("Creating search prompt")
        query = mistral.generate(prompt = prompt)
        print("Generating embeddings")
        query_emb = mistral.get_embedding(text = query)
        print("Searching similar vectors")
        similar_problems = qdrant.search_vectors("problem_collection",vector = query_emb, limit=4)
        
        print("Creating personalized responses")
        result = []
        for prob in tqdm(similar_problems,leave=True):
            score = prob.score
            payload = prob.payload
            user_id = payload["reddit_id"]
            text = payload["text"]
            title = payload["title"]
            subreddit = payload["subreddit"]
            url = payload["url"]

            prob_desc = f"url:{url}, title : {title}, problem : {text}"

            message = mistral.generate(PERS_MSG_PROMPT + f"Inputs: PROBLEM_DESCRIPTION: {prob_desc} SOLUTION_DESCRIPTION: {summary}")

            res = {
                "problem":{
                    "similarity_score":score,
                    "title":title,
                    "subreddit":subreddit,
                    "user_id":user_id,
                    "url":url,
                    "summary":payload.get("conversationProblemHint")
                },
                "marketing":message
            }
            result.append(res)

        ## 

        return jsonify(result)
    except Exception as er:
        print(er)
        return jsonify({"Problem":str(er)})
    
