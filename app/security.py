import bcrypt

MAX_BCRYPT_BYTES = 72


def _ensure_bytes(password: str) -> bytes:
    if not isinstance(password, str):
        raise TypeError("Password must be a string")
    return password.encode("utf-8")


def hash_password(password: str) -> str:
    secret = _ensure_bytes(password)
    if len(secret) > MAX_BCRYPT_BYTES:
        raise ValueError("Password cannot exceed 72 bytes when encoded to UTF-8.")
    hashed = bcrypt.hashpw(secret, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    secret = _ensure_bytes(password)
    if len(secret) > MAX_BCRYPT_BYTES:
        # bcrypt would silently truncate; treat as invalid instead
        return False
    try:
        hashed_bytes = hashed.encode("utf-8")
    except AttributeError:
        raise TypeError("Hashed password must be a string")
    try:
        return bcrypt.checkpw(secret, hashed_bytes)
    except ValueError:
        # Raised if the stored hash has an invalid format
        return False
