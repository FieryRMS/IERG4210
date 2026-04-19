import asyncio
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from pathlib import Path

from jinja2 import Environment, FileSystemLoader

logger = logging.getLogger(__name__)

_TEMPLATES_DIR = Path(__file__).parent.parent / "templates"
_jinja_env = Environment(loader=FileSystemLoader(_TEMPLATES_DIR), autoescape=True)


def render_email(template_name: str, **context: object) -> str:
    return _jinja_env.get_template(template_name).render(**context)


def _send_sync(to: str, subject: str, html: str) -> None:
    smtp_conn = os.getenv("SMTP_CONN")
    if not smtp_conn:
        logger.warning("SMTP not configured — skipping email to %s", to)
        return
    try:
        creds, conn = smtp_conn.rsplit("@", 1)
        user, password = creds.split(":", 1)
        host, port_str = conn.split(":", 1)
        port = int(port_str)
    except Exception:
        logger.warning("Invalid SMTP_CONN format — skipping email to %s", to)
        return

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = user
    msg["To"] = to
    msg.attach(MIMEText(html, "html"))

    with smtplib.SMTP(host, port) as smtp:
        smtp.ehlo()
        smtp.starttls()
        smtp.login(user, password)
        smtp.sendmail(user, to, msg.as_string())


async def send_email(to: str, subject: str, html: str) -> None:
    """Fire-and-forget: schedules the email in the background and returns immediately."""

    async def _task() -> None:
        try:
            await asyncio.to_thread(_send_sync, to, subject, html)
        except Exception:
            logger.exception("Failed to send email to %s", to)

    asyncio.create_task(_task())
