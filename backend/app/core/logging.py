import logging
import sys
from datetime import datetime, timezone

class StructuredFormatter(logging.Formatter):
    def format(self, record: logging.LogRecord) -> str:
        ts = datetime.now(timezone.utc).isoformat()
        level = record.levelname
        msg = record.getMessage()
        name = record.name
        extra_parts = []
        for key, val in record.__dict__.items():
            if key not in ('args','asctime','created','exc_info','exc_text','filename','funcName',
                          'id','levelname','levelno','lineno','message','module','msecs','msg',
                          'name','pathname','process','processName','relativeCreated','stack_info',
                          'thread','threadName'):
                extra_parts.append(f"{key}={val}")
        extra = " ".join(extra_parts)
        return f"{ts} [{level}] {name}: {msg}" + (f" | {extra}" if extra else "")

def setup_logging(level: int = logging.INFO) -> None:
    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(StructuredFormatter())
    root = logging.getLogger()
    root.setLevel(level)
    root.handlers.clear()
    root.addHandler(handler)

def get_logger(name: str) -> logging.Logger:
    return logging.getLogger(name)
