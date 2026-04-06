from datetime import datetime, timezone

from fastapi import APIRouter, Response
from fastapi.responses import PlainTextResponse

from app.core.config import settings

router = APIRouter(tags=["SEO"])


@router.get("/robots.txt", include_in_schema=False, response_class=PlainTextResponse)
async def robots_txt() -> str:
    sitemap_url = f"{settings.backend_public_url.rstrip('/')}/sitemap.xml"
    return "\n".join(
        [
            "User-agent: *",
            "Allow: /",
            "Disallow: /api/",
            "Disallow: /docs",
            "Disallow: /redoc",
            "Disallow: /openapi.json",
            "Disallow: /app/",
            f"Sitemap: {sitemap_url}",
            "",
        ]
    )


@router.get("/sitemap.xml", include_in_schema=False)
async def sitemap_xml() -> Response:
    frontend_url = settings.frontend_public_url.rstrip("/")
    now = datetime.now(timezone.utc).date().isoformat()
    urls = [
        {
            "loc": f"{frontend_url}/",
            "changefreq": "weekly",
            "priority": "1.0",
            "lastmod": now,
        },
    ]

    xml_items = "".join(
        [
            (
                "<url>"
                f"<loc>{item['loc']}</loc>"
                f"<lastmod>{item['lastmod']}</lastmod>"
                f"<changefreq>{item['changefreq']}</changefreq>"
                f"<priority>{item['priority']}</priority>"
                "</url>"
            )
            for item in urls
        ]
    )
    xml = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'
        f"{xml_items}"
        "</urlset>"
    )
    return Response(content=xml, media_type="application/xml")
