from flask import Flask
from flask_cors import CORS
from controllers.client_search import cl_search_bp
from controllers.upload_problem import upload_problem_bp

def create_app():
    app = Flask(__name__)

    # Enable CORS for all routes and origins
    CORS(app, origins=["http://localhost:5173", "http://localhost:5174", "http://127.0.0.1:5173", "http://127.0.0.1:5174"])

    app.register_blueprint(cl_search_bp, url_prefix="/client_search")
    return app

if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=8000)
