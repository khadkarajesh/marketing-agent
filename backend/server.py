from flask import Flask
from controllers.client_search import cl_search_bp
from controllers.upload_problem import upload_problem_bp

def create_app():
    app = Flask(__name__)
    app.register_blueprint(cl_search_bp, url_prefix="/client_search")
    return app

if __name__ == "__main__":
    create_app().run(host="0.0.0.0", port=5000)
