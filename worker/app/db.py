import pyodbc
from .settings import settings

def get_conn():
    conn_str = (
        f"DRIVER={{ODBC Driver 18 for SQL Server}};SERVER={settings.sql_host},{settings.sql_port};DATABASE={settings.sql_database};UID={settings.sql_user};PWD={settings.sql_password};Encrypt=yes;TrustServerCertificate=yes"
    )
    return pyodbc.connect(conn_str, autocommit=False)
