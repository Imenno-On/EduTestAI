from sqlalchemy.orm import declarative_base

Base = declarative_base()

from sqlalchemy.orm import configure_mappers
configure_mappers()
