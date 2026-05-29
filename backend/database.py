import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

Base = declarative_base()

import threading

_engine_cache = {}
_session_cache = {}
_db_lock = threading.Lock()

def get_student_db(gr_number: str):
    """Yields a database session for a specific student's isolated database."""
    if not gr_number:
        raise ValueError("gr_number is required to connect to a student schema")
        
    db_path = f"sqlite:///./student_databases/{gr_number}.db"
    
    with _db_lock:
        if gr_number not in _engine_cache:
            engine = create_engine(db_path, connect_args={"check_same_thread": False})
            Base.metadata.create_all(bind=engine)
            _engine_cache[gr_number] = engine
            _session_cache[gr_number] = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    
    db = _session_cache[gr_number]()
    try:
        yield db
    finally:
        db.close()

def get_db():
    raise Exception("Monolithic get_db() is deprecated in Schema-per-Student architecture. Use get_student_db(gr_number).")
