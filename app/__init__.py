from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///planner.db'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'indischeZiegenMilch2024'
    
    db.init_app(app)
    migrate = Migrate(app, db)

    # Import and register blueprints
    from .routes import main
    app.register_blueprint(main)

    with app.app_context():
        db.create_all()

    return app
