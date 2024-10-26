# This file will initialize the flask application and connect it to the SQL Database using SQLAlchemy and SQLite

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate

db = SQLAlchemy()

def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///planner.db'  # Database file will be in your project folder
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    db.init_app(app)

    migrate = Migrate(app, db)

    with app.app_context():
        db.create_all()  # Create tables if they don't exist

    from .routes import main
    app.register_blueprint(main)
    
    return app