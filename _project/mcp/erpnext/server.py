"""
ERPNext MCP Server
Provides tools for managing ERPNext via Model Context Protocol.
"""

import csv
import json
import logging
import os
import pathlib
from typing import Any, Dict, Optional

import httpx
from mcp.server.fastmcp import FastMCP
from pydantic import BaseModel, ConfigDict, Field

# ─── Logging ────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
log = logging.getLogger("erpnext_mcp")

# ─── Config ─────────────────────────────────────────────────────────────────


def _load_keys_from_csv(csv_path: str) -> tuple[str, str]:
    """Read api_key and api_secret from a CSV file (columns: api_key, api_secret)."""
    p = pathlib.Path(csv_path)
    if not p.exists():
        log.warning("CSV key file not found: %s", csv_path)
        return ("", "")
    with open(p, newline="", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            key = row.get("api_key", "").strip().strip('"')
            secret = row.get("api_secret", "").strip().strip('"')
            if key and secret:
                log.info("Loaded API credentials from CSV: %s", csv_path)
                return (key, secret)
    log.warning("No valid credentials found in CSV: %s", csv_path)
    return ("", "")


CSV_PATH = os.environ.get("ERPNEXT_KEYS_CSV", "/app/frappe_api_keys.csv")
_csv_key, _csv_secret = _load_keys_from_csv(CSV_PATH)

ERPNEXT_URL = os.environ.get("ERPNEXT_URL", "http://localhost:8000").rstrip("/")
API_KEY = os.environ.get("ERPNEXT_API_KEY", "") or _csv_key
API_SECRET = os.environ.get("ERPNEXT_API_SECRET", "") or _csv_secret

if not API_KEY or not API_SECRET:
    log.warning(
        "API credentials are not set. "
        "Provide ERPNEXT_API_KEY / ERPNEXT_API_SECRET env vars or a valid CSV file."
    )
else:
    log.info("ERPNext URL: %s | Auth: token %s:***", ERPNEXT_URL, API_KEY[:6])

AUTH_HEADERS = {
    "Authorization": f"token {API_KEY}:{API_SECRET}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

# ─── Shared HTTP client ──────────────────────────────────────────────────────

_http_client: httpx.AsyncClient | None = None


def get_client() -> httpx.AsyncClient:
    """Return the shared AsyncClient, creating it lazily on first use."""
    global _http_client
    if _http_client is None or _http_client.is_closed:
        _http_client = httpx.AsyncClient(
            headers=AUTH_HEADERS,
            timeout=30,
            follow_redirects=True,
        )
        log.debug("Created new shared httpx.AsyncClient")
    return _http_client


port = int(os.environ.get("PORT", "8000"))
mcp = FastMCP(
    "erpnext_mcp",
    host="0.0.0.0",
    port=port,
    stateless_http=True,
)

# ─── HTTP helpers ────────────────────────────────────────────────────────────


async def erp_get(path: str, params: Optional[Dict] = None) -> Dict:
    log.debug("GET %s params=%s", path, params)
    r = await get_client().get(f"{ERPNEXT_URL}{path}", params=params)
    r.raise_for_status()
    return r.json()


async def erp_post(path: str, data: Dict) -> Dict:
    log.debug("POST %s", path)
    r = await get_client().post(f"{ERPNEXT_URL}{path}", json=data)
    r.raise_for_status()
    return r.json()


async def erp_put(path: str, data: Dict) -> Dict:
    log.debug("PUT %s", path)
    r = await get_client().put(f"{ERPNEXT_URL}{path}", json=data)
    r.raise_for_status()
    return r.json()


async def erp_delete(path: str) -> Dict:
    log.debug("DELETE %s", path)
    r = await get_client().delete(f"{ERPNEXT_URL}{path}")
    r.raise_for_status()
    return r.json()


def _err(e: Exception) -> str:
    if isinstance(e, httpx.HTTPStatusError):
        try:
            body = e.response.json()
            msg = body.get("exception") or body.get("message") or str(e)
        except Exception:
            msg = e.response.text or str(e)
        log.error("ERPNext API error %s: %s", e.response.status_code, msg)
        return f"ERPNext API error {e.response.status_code}: {msg}"
    log.error("Unexpected error: %s: %s", type(e).__name__, e)
    return f"Error: {type(e).__name__}: {e}"


def ok(data: Any) -> str:
    return json.dumps(data, ensure_ascii=False, indent=2, default=str)


# ─── Input models ────────────────────────────────────────────────────────────


class ListDocsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(
        ..., description="ERPNext DocType, e.g. 'Customer', 'Sales Order', 'Item'"
    )
    filters: Optional[str] = Field(
        default=None, description='JSON filters, e.g. [["status","=","Open"]]'
    )
    fields: Optional[str] = Field(
        default=None, description='Comma-separated fields, e.g. "name,status,customer"'
    )
    limit: int = Field(default=20, ge=1, le=500, description="Max records to return")
    order_by: Optional[str] = Field(
        default=None, description='Sort, e.g. "creation desc"'
    )


class GetDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")


class CreateDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType to create")
    fields: str = Field(
        ..., description='JSON object with field values, e.g. {"customer_name": "Acme"}'
    )


class UpdateDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    fields: str = Field(..., description="JSON object with fields to update")


class DeleteDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")


class SubmitDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID to submit")


class CancelDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID to cancel")


class SearchInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType to search in")
    query: str = Field(..., description="Search keyword")
    limit: int = Field(default=10, ge=1, le=100)


class ReportInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    report_name: str = Field(
        ..., description="ERPNext report name, e.g. 'Accounts Receivable'"
    )
    filters: Optional[str] = Field(
        default=None, description="JSON filters for the report"
    )


class RunMethodInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    method: str = Field(
        ..., description="Frappe method path, e.g. 'frappe.client.get_value'"
    )
    args: Optional[str] = Field(
        default=None, description="JSON object with method arguments"
    )


class DocTypeMetaInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    name: str = Field(..., description="DocType name, e.g. 'Sales Order', 'Customer'")


# ─── Tools ───────────────────────────────────────────────────────────────────


@mcp.tool(
    name="erpnext_list_documents",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_list_documents(params: ListDocsInput) -> str:
    """List documents of any DocType with optional filters, field selection and sorting.

    Returns a JSON array of matching records.
    """
    try:
        log.info("list_documents doctype=%s limit=%s", params.doctype, params.limit)
        query: Dict[str, Any] = {
            "doctype": params.doctype,
            "limit_page_length": params.limit,
        }
        if params.filters:
            query["filters"] = params.filters
        if params.fields:
            query["fields"] = json.dumps([f.strip() for f in params.fields.split(",")])
        if params.order_by:
            query["order_by"] = params.order_by

        data = await erp_get("/api/resource/" + params.doctype, params=query)
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_document",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_document(params: GetDocInput) -> str:
    """Fetch a single document by DocType and name, returning all its fields."""
    try:
        log.info("get_document doctype=%s name=%s", params.doctype, params.name)
        data = await erp_get(f"/api/resource/{params.doctype}/{params.name}")
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_create_document",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_create_document(params: CreateDocInput) -> str:
    """Create a new ERPNext document. Returns the created document with its auto-generated name.

    Example fields for Customer:
      {"customer_name": "Acme Corp", "customer_type": "Company", "customer_group": "All Customer Groups"}
    """
    try:
        fields = json.loads(params.fields)
        fields["doctype"] = params.doctype
        log.info("create_document doctype=%s", params.doctype)
        data = await erp_post(f"/api/resource/{params.doctype}", data=fields)
        return ok(data.get("data", data))
    except json.JSONDecodeError:
        return "Error: 'fields' must be a valid JSON object"
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_update_document",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_update_document(params: UpdateDocInput) -> str:
    """Update fields of an existing document. Only provided fields are changed."""
    try:
        fields = json.loads(params.fields)
        log.info("update_document doctype=%s name=%s", params.doctype, params.name)
        data = await erp_put(
            f"/api/resource/{params.doctype}/{params.name}", data=fields
        )
        return ok(data.get("data", data))
    except json.JSONDecodeError:
        return "Error: 'fields' must be a valid JSON object"
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_delete_document",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": True,
        "idempotentHint": False,
    },
)
async def erpnext_delete_document(params: DeleteDocInput) -> str:
    """Delete a document permanently. Use with caution — this cannot be undone."""
    try:
        log.warning("delete_document doctype=%s name=%s", params.doctype, params.name)
        data = await erp_delete(f"/api/resource/{params.doctype}/{params.name}")
        return ok(
            {
                "deleted": True,
                "doctype": params.doctype,
                "name": params.name,
                "response": data,
            }
        )
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_submit_document",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_submit_document(params: SubmitDocInput) -> str:
    """Submit a document (e.g. Sales Order, Purchase Order, Journal Entry).
    Submitted documents are locked and trigger downstream workflows."""
    try:
        log.info("submit_document doctype=%s name=%s", params.doctype, params.name)
        data = await erp_post(
            "/api/method/frappe.client.submit",
            data={"doc": {"doctype": params.doctype, "name": params.name}},
        )
        return ok(data)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_cancel_document",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": True,
        "idempotentHint": False,
    },
)
async def erpnext_cancel_document(params: CancelDocInput) -> str:
    """Cancel a submitted document. Reverses its accounting and stock effects."""
    try:
        log.warning("cancel_document doctype=%s name=%s", params.doctype, params.name)
        data = await erp_post(
            "/api/method/frappe.client.cancel",
            data={"doctype": params.doctype, "name": params.name},
        )
        return ok(data)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_search",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_search(params: SearchInput) -> str:
    """Quick text search within a DocType using the built-in ERPNext search."""
    try:
        log.info("search doctype=%s query=%r", params.doctype, params.query)
        data = await erp_get(
            "/api/method/frappe.desk.search.search_link",
            params={
                "txt": params.query,
                "doctype": params.doctype,
                "ignore_user_permissions": 0,
                "reference_doctype": "",
                "page_length": params.limit,
            },
        )
        return ok(data.get("results", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_report",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_report(params: ReportInput) -> str:
    """Run an ERPNext report and return its data.

    Common reports: 'Accounts Receivable', 'Accounts Payable', 'Stock Balance',
    'Sales Analytics', 'Purchase Analytics', 'Trial Balance', 'Profit and Loss Statement'
    """
    try:
        log.info("get_report name=%r", params.report_name)
        args: Dict[str, Any] = {"report_name": params.report_name}
        if params.filters:
            args["filters"] = json.loads(params.filters)
        data = await erp_get("/api/method/frappe.desk.query_report.run", params=args)
        result = data.get("message", data)
        return ok(result)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_run_method",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_run_method(params: RunMethodInput) -> str:
    """Call any Frappe/ERPNext method directly.

    Useful for: frappe.client.get_value, frappe.client.get_list,
    erpnext.accounts.utils.get_balance_on, etc.
    """
    try:
        args = json.loads(params.args) if params.args else {}
        log.info("run_method method=%s", params.method)
        data = await erp_post(f"/api/method/{params.method}", data=args)
        return ok(data)
    except json.JSONDecodeError:
        return "Error: 'args' must be a valid JSON object or null"
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_doctypes",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_doctypes() -> str:
    """List all available DocTypes in this ERPNext instance."""
    try:
        log.info("get_doctypes")
        data = await erp_get(
            "/api/resource/DocType",
            params={
                "fields": '["name","module","issingle"]',
                "limit_page_length": 500,
                "order_by": "module asc, name asc",
            },
        )
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_doctype_meta",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_doctype_meta(params: DocTypeMetaInput) -> str:
    """Get metadata (fields, permissions, child tables) for a DocType.

    Returns a compact summary with field names, types, labels and required flags.
    Useful before creating or updating documents — to know which fields are available.
    """
    try:
        log.info("get_doctype_meta name=%s", params.name)
        data = await erp_get(f"/api/resource/DocType/{params.name}")
        doc = data.get("data", data)
        summary = {
            "name": doc.get("name"),
            "module": doc.get("module"),
            "is_submittable": doc.get("is_submittable"),
            "fields": [
                {
                    "fieldname": f.get("fieldname"),
                    "fieldtype": f.get("fieldtype"),
                    "label": f.get("label"),
                    "reqd": f.get("reqd"),
                    "options": f.get("options"),
                }
                for f in doc.get("fields", [])
                if f.get("fieldtype")
                not in ("Section Break", "Column Break", "HTML", "Fold")
            ],
        }
        return ok(summary)
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_ping",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_ping() -> str:
    """Check connectivity to ERPNext and return the logged-in user info."""
    try:
        log.info("ping url=%s", ERPNEXT_URL)
        data = await erp_get("/api/method/frappe.auth.get_logged_user")
        return ok(
            {"connected": True, "url": ERPNEXT_URL, "user": data.get("message", data)}
        )
    except Exception as e:
        log.warning("ping failed: %s", e)
        return ok({"connected": False, "url": ERPNEXT_URL, "error": str(e)})


# ─── Input models: new tools ─────────────────────────────────────────────────

from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class GetValueInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    fieldname: str = Field(
        ..., description="Field name, e.g. 'status' or 'grand_total'"
    )


class SetValueInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    fieldname: str = Field(..., description="Field name to set")
    value: str = Field(..., description="New value")


class GetCountInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    filters: Optional[str] = Field(
        default=None, description='JSON filters, e.g. [["status","=","Open"]]'
    )


class RenameDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    old_name: str = Field(..., description="Current document name")
    new_name: str = Field(..., description="New document name")
    merge: bool = Field(
        default=False, description="Merge with existing document of same name"
    )


class DuplicateDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Source document name to duplicate")


class AmendDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Name of the cancelled document to amend")


class LinkedDocsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")


class AddCommentInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    content: str = Field(..., description="Comment text (HTML supported)")
    comment_type: str = Field(
        default="Comment", description="Type: 'Comment', 'Info', 'Warning', 'Workflow'"
    )


class GetCommentsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")


class AssignToInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    assign_to: str = Field(..., description="User email to assign to")
    description: Optional[str] = Field(default=None, description="Assignment note")
    priority: str = Field(
        default="Medium", description="Priority: 'Low', 'Medium', 'High'"
    )
    due_date: Optional[str] = Field(default=None, description="Due date YYYY-MM-DD")


class ApplyWorkflowInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    action: str = Field(..., description="Workflow action, e.g. 'Approve', 'Reject'")


class AccountBalanceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    account: str = Field(..., description="Account name, e.g. 'Cash - Company'")
    date: Optional[str] = Field(
        default=None, description="As-of date YYYY-MM-DD (default: today)"
    )
    company: Optional[str] = Field(default=None, description="Company name")


class StockBalanceInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    item_code: str = Field(..., description="Item code / SKU")
    warehouse: Optional[str] = Field(
        default=None, description="Warehouse name (empty = all)"
    )
    date: Optional[str] = Field(default=None, description="As-of date YYYY-MM-DD")


class AddTagInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    tag: str = Field(..., description="Tag to add, e.g. 'urgent', 'vip'")


class RemoveTagInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    tag: str = Field(..., description="Tag to remove")


class AttachmentsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")


class BulkUpdateInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    filters: str = Field(..., description='JSON filters, e.g. [["status","=","Draft"]]')
    fields: str = Field(
        ..., description='JSON fields to update, e.g. {"priority": "High"}'
    )


class ShareDocInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    user: str = Field(..., description="User email to share with")
    read: bool = Field(default=True, description="Grant read permission")
    write: bool = Field(default=False, description="Grant write permission")
    share: bool = Field(default=False, description="Grant share permission")


class SendEmailInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    doctype: str = Field(..., description="ERPNext DocType")
    name: str = Field(..., description="Document name / ID")
    recipients: str = Field(..., description="Comma-separated recipient emails")
    subject: str = Field(..., description="Email subject")
    content: str = Field(..., description="Email body (HTML supported)")
    send_me_a_copy: bool = Field(default=False, description="CC current user")


class GetDefaultInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    key: str = Field(
        ..., description="Default key, e.g. 'company', 'currency', 'fiscal_year'"
    )


class SetDefaultInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    key: str = Field(..., description="Default key")
    value: str = Field(..., description="Value to set as default")


class UserPermissionsInput(BaseModel):
    model_config = ConfigDict(str_strip_whitespace=True, extra="forbid")
    user: str = Field(..., description="User email, e.g. 'user@company.com'")


# ─── Tools: Field-level ───────────────────────────────────────────────────────


@mcp.tool(
    name="erpnext_get_value",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_value(params: GetValueInput) -> str:
    """Get a single field value from a document — faster than loading the whole document.

    Example: get 'grand_total' of Sales Order SO-0001, or 'status' of a Customer.
    """
    try:
        log.info(
            "get_value doctype=%s name=%s field=%s",
            params.doctype,
            params.name,
            params.fieldname,
        )
        data = await erp_get(
            "/api/method/frappe.client.get_value",
            params={
                "doctype": params.doctype,
                "filters": params.name,
                "fieldname": params.fieldname,
            },
        )
        return ok(data.get("message", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_set_value",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_set_value(params: SetValueInput) -> str:
    """Set a single field value — faster and safer than updating the whole document.

    Example: change 'status' of a Lead, or update 'priority' of a ToDo.
    """
    try:
        log.info(
            "set_value doctype=%s name=%s field=%s",
            params.doctype,
            params.name,
            params.fieldname,
        )
        data = await erp_post(
            "/api/method/frappe.client.set_value",
            data={
                "doctype": params.doctype,
                "name": params.name,
                "fieldname": params.fieldname,
                "value": params.value,
            },
        )
        return ok(data.get("message", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_count",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_count(params: GetCountInput) -> str:
    """Count documents matching the given filters.

    Useful for quick stats: how many open invoices, how many active customers, etc.
    """
    try:
        log.info("get_count doctype=%s", params.doctype)
        query: Dict[str, Any] = {"doctype": params.doctype}
        if params.filters:
            query["filters"] = params.filters
        data = await erp_get("/api/method/frappe.client.get_count", params=query)
        return ok({"doctype": params.doctype, "count": data.get("message", data)})
    except Exception as e:
        return _err(e)


# ─── Tools: Document lifecycle ────────────────────────────────────────────────


@mcp.tool(
    name="erpnext_rename_doc",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_rename_doc(params: RenameDocInput) -> str:
    """Rename (change the ID) of a document. Can also merge two documents if merge=True.

    Example: rename Customer 'Acme' to 'Acme Corp'.
    """
    try:
        log.info(
            "rename_doc doctype=%s %s -> %s",
            params.doctype,
            params.old_name,
            params.new_name,
        )
        data = await erp_post(
            "/api/method/frappe.client.rename_doc",
            data={
                "doctype": params.doctype,
                "old": params.old_name,
                "new": params.new_name,
                "merge": params.merge,
            },
        )
        return ok({"renamed": True, "new_name": data.get("message", params.new_name)})
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_duplicate_doc",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_duplicate_doc(params: DuplicateDocInput) -> str:
    """Create a full copy of an existing document (all fields and child tables) as Draft.

    Useful for creating similar documents quickly.
    """
    try:
        log.info("duplicate_doc doctype=%s name=%s", params.doctype, params.name)
        data = await erp_post(
            "/api/method/frappe.client.copy_doc",
            data={
                "dt": params.doctype,
                "dn": params.name,
            },
        )
        return ok(data.get("message", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_amend_doc",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_amend_doc(params: AmendDocInput) -> str:
    """Amend a cancelled document — creates an editable copy linked to the original.

    Use when you need to correct a submitted+cancelled document.
    The amended document will have a suffix like -1, -2, etc.
    """
    try:
        log.info("amend_doc doctype=%s name=%s", params.doctype, params.name)
        original = await erp_get(f"/api/resource/{params.doctype}/{params.name}")
        doc = original.get("data", original)
        doc["amended_from"] = params.name
        doc["docstatus"] = 0
        for key in ("name", "creation", "modified", "modified_by", "owner"):
            doc.pop(key, None)
        data = await erp_post(f"/api/resource/{params.doctype}", data=doc)
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_linked_docs",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_linked_docs(params: LinkedDocsInput) -> str:
    """Get all documents linked to a given document across all DocTypes.

    Example: find all Invoices, Payments, Deliveries linked to a Sales Order.
    """
    try:
        log.info("get_linked_docs doctype=%s name=%s", params.doctype, params.name)
        data = await erp_get(
            "/api/method/frappe.desk.form.load.get_docinfo",
            params={
                "doctype": params.doctype,
                "name": params.name,
            },
        )
        info = data.get("message", {})
        return ok({"links": info.get("links", []), "count": len(info.get("links", []))})
    except Exception as e:
        return _err(e)


# ─── Tools: Collaboration ─────────────────────────────────────────────────────


@mcp.tool(
    name="erpnext_add_comment",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_add_comment(params: AddCommentInput) -> str:
    """Add a comment or note to any document (visible in timeline, HTML supported).

    comment_type options: 'Comment', 'Info', 'Warning', 'Workflow', 'Label'.
    """
    try:
        log.info("add_comment doctype=%s name=%s", params.doctype, params.name)
        data = await erp_post(
            "/api/resource/Comment",
            data={
                "comment_type": params.comment_type,
                "content": params.content,
                "reference_doctype": params.doctype,
                "reference_name": params.name,
            },
        )
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_comments",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_comments(params: GetCommentsInput) -> str:
    """Get all comments and activity for a document."""
    try:
        log.info("get_comments doctype=%s name=%s", params.doctype, params.name)
        data = await erp_get(
            "/api/resource/Comment",
            params={
                "filters": json.dumps(
                    [
                        ["reference_doctype", "=", params.doctype],
                        ["reference_name", "=", params.name],
                    ]
                ),
                "fields": '["name","comment_type","content","owner","creation"]',
                "order_by": "creation asc",
                "limit_page_length": 100,
            },
        )
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_assign_to",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_assign_to(params: AssignToInput) -> str:
    """Assign a document to a user with optional due date, priority and note.

    Creates a ToDo linked to the document and notifies the assigned user.
    """
    try:
        log.info(
            "assign_to doctype=%s name=%s user=%s",
            params.doctype,
            params.name,
            params.assign_to,
        )
        payload: Dict[str, Any] = {
            "doctype": params.doctype,
            "name": params.name,
            "assign_to": [params.assign_to],
            "priority": params.priority,
        }
        if params.description:
            payload["description"] = params.description
        if params.due_date:
            payload["date"] = params.due_date
        data = await erp_post(
            "/api/method/frappe.desk.form.assign_to.add", data=payload
        )
        return ok(data.get("message", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_add_tag",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_add_tag(params: AddTagInput) -> str:
    """Add a tag to a document for easy filtering and grouping."""
    try:
        log.info(
            "add_tag doctype=%s name=%s tag=%s", params.doctype, params.name, params.tag
        )
        data = await erp_post(
            "/api/method/frappe.desk.tags.add_tag",
            data={
                "dt": params.doctype,
                "dn": params.name,
                "tag": params.tag,
            },
        )
        return ok(
            {"tagged": True, "tag": params.tag, "response": data.get("message", data)}
        )
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_remove_tag",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_remove_tag(params: RemoveTagInput) -> str:
    """Remove a tag from a document."""
    try:
        log.info(
            "remove_tag doctype=%s name=%s tag=%s",
            params.doctype,
            params.name,
            params.tag,
        )
        data = await erp_post(
            "/api/method/frappe.desk.tags.remove_tag",
            data={
                "dt": params.doctype,
                "dn": params.name,
                "tag": params.tag,
            },
        )
        return ok({"removed": True, "tag": params.tag})
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_attachments",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_attachments(params: AttachmentsInput) -> str:
    """List all file attachments for a document."""
    try:
        log.info("get_attachments doctype=%s name=%s", params.doctype, params.name)
        data = await erp_get(
            "/api/resource/File",
            params={
                "filters": json.dumps(
                    [
                        ["attached_to_doctype", "=", params.doctype],
                        ["attached_to_name", "=", params.name],
                    ]
                ),
                "fields": '["name","file_name","file_url","file_size","is_private","creation"]',
            },
        )
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_share_doc",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_share_doc(params: ShareDocInput) -> str:
    """Share a document with another user and set their permission level (read/write/share)."""
    try:
        log.info(
            "share_doc doctype=%s name=%s user=%s",
            params.doctype,
            params.name,
            params.user,
        )
        data = await erp_post(
            "/api/resource/DocShare",
            data={
                "share_doctype": params.doctype,
                "share_name": params.name,
                "user": params.user,
                "read": int(params.read),
                "write": int(params.write),
                "share": int(params.share),
            },
        )
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_send_email",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_send_email(params: SendEmailInput) -> str:
    """Send an email from within ERPNext, linked to a document.

    The email appears in the document's communication timeline.
    """
    try:
        log.info(
            "send_email doctype=%s name=%s to=%s",
            params.doctype,
            params.name,
            params.recipients,
        )
        data = await erp_post(
            "/api/method/frappe.core.doctype.communication.email.make",
            data={
                "recipients": params.recipients,
                "subject": params.subject,
                "content": params.content,
                "doctype": params.doctype,
                "name": params.name,
                "send_email": 1,
                "send_me_a_copy": int(params.send_me_a_copy),
            },
        )
        return ok(data.get("message", data))
    except Exception as e:
        return _err(e)


# ─── Tools: Workflow ──────────────────────────────────────────────────────────


@mcp.tool(
    name="erpnext_apply_workflow",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_apply_workflow(params: ApplyWorkflowInput) -> str:
    """Apply a workflow action to a document (Approve, Reject, etc.).

    Requires a Workflow configured for the DocType in ERPNext.
    Available actions depend on the current workflow state.
    """
    try:
        log.info(
            "apply_workflow doctype=%s name=%s action=%s",
            params.doctype,
            params.name,
            params.action,
        )
        data = await erp_post(
            "/api/method/frappe.model.workflow.apply_workflow",
            data={
                "doctype": params.doctype,
                "docname": params.name,
                "action": params.action,
            },
        )
        return ok(data.get("message", data))
    except Exception as e:
        return _err(e)


# ─── Tools: Finance & Inventory ───────────────────────────────────────────────


@mcp.tool(
    name="erpnext_get_account_balance",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_account_balance(params: AccountBalanceInput) -> str:
    """Get the current GL balance of an account as of today or a specified date.

    Positive = debit balance, Negative = credit balance.
    Example: 'Cash - Company', 'Debtors - Company', 'Sales - Company'.
    """
    try:
        log.info("get_account_balance account=%s date=%s", params.account, params.date)
        filters: List[Any] = [
            ["account", "=", params.account],
            ["is_cancelled", "=", 0],
        ]
        if params.date:
            filters.append(["posting_date", "<=", params.date])
        if params.company:
            filters.append(["company", "=", params.company])
        data = await erp_get(
            "/api/resource/GL Entry",
            params={
                "filters": json.dumps(filters),
                "fields": '["debit","credit"]',
                "limit_page_length": 0,
            },
        )
        rows = data.get("data", [])
        debit = sum(float(r.get("debit", 0) or 0) for r in rows)
        credit = sum(float(r.get("credit", 0) or 0) for r in rows)
        balance = debit - credit
        return ok(
            {
                "account": params.account,
                "balance": balance,
                "debit": debit,
                "credit": credit,
                "entries_count": len(rows),
            }
        )
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_stock_balance",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_stock_balance(params: StockBalanceInput) -> str:
    """Get current stock quantity for an item, optionally filtered by warehouse and date."""
    try:
        log.info(
            "get_stock_balance item=%s warehouse=%s", params.item_code, params.warehouse
        )
        if params.warehouse:
            # Specific warehouse — use the stock balance utility
            query: Dict[str, Any] = {
                "item_code": params.item_code,
                "warehouse": params.warehouse,
            }
            if params.date:
                query["posting_date"] = params.date
            data = await erp_get(
                "/api/method/erpnext.stock.utils.get_stock_balance", params=query
            )
            return ok(
                {
                    "item_code": params.item_code,
                    "warehouse": params.warehouse,
                    "balance": data.get("message", data),
                }
            )
        else:
            # All warehouses — query Bin doctype
            data = await erp_get(
                "/api/resource/Bin",
                params={
                    "filters": json.dumps([["item_code", "=", params.item_code]]),
                    "fields": '["warehouse","actual_qty","reserved_qty","ordered_qty","projected_qty"]',
                    "limit_page_length": 100,
                },
            )
            rows = data.get("data", [])
            total = sum(r.get("actual_qty", 0) for r in rows)
            return ok(
                {
                    "item_code": params.item_code,
                    "warehouse": "all",
                    "total_actual_qty": total,
                    "per_warehouse": rows,
                }
            )
    except Exception as e:
        return _err(e)


# ─── Tools: Bulk & Admin ──────────────────────────────────────────────────────


@mcp.tool(
    name="erpnext_bulk_update",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": False,
    },
)
async def erpnext_bulk_update(params: BulkUpdateInput) -> str:
    """Update fields on ALL documents matching the filters in one operation.

    WARNING: affects all matching documents — verify your filters first.
    Example: set priority='High' on all open Tasks assigned to a user.
    """
    try:
        fields = json.loads(params.fields)
        log.warning("bulk_update doctype=%s fields=%s", params.doctype, fields)
        docs = await erp_get(
            "/api/resource/" + params.doctype,
            params={
                "filters": params.filters,
                "fields": '["name"]',
                "limit_page_length": 500,
            },
        )
        names = [d["name"] for d in docs.get("data", [])]
        updated, errors = [], []
        for name in names:
            try:
                await erp_put(f"/api/resource/{params.doctype}/{name}", data=fields)
                updated.append(name)
            except Exception as ex:
                errors.append({"name": name, "error": str(ex)})
        return ok(
            {
                "updated": len(updated),
                "errors": len(errors),
                "names": updated,
                "failed": errors,
            }
        )
    except json.JSONDecodeError:
        return "Error: 'filters' and 'fields' must be valid JSON"
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_defaults",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_defaults(params: GetDefaultInput) -> str:
    """Get a system or user default value (e.g. default company, currency, fiscal_year)."""
    try:
        log.info("get_defaults key=%s", params.key)
        # Try Global Defaults first, then System Settings
        for doctype in ("Global Defaults", "System Settings"):
            try:
                data = await erp_get(
                    "/api/method/frappe.client.get_value",
                    params={
                        "doctype": doctype,
                        "filters": doctype,
                        "fieldname": params.key,
                    },
                )
                msg = data.get("message", {})
                if isinstance(msg, dict) and params.key in msg:
                    return ok(
                        {"key": params.key, "value": msg[params.key], "source": doctype}
                    )
            except Exception:
                pass
        return ok(
            {
                "key": params.key,
                "value": None,
                "note": "Not found in Global Defaults or System Settings",
            }
        )
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_set_default",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_set_default(params: SetDefaultInput) -> str:
    """Set a system or user default value (e.g. default company, currency)."""
    try:
        log.info("set_default key=%s value=%s", params.key, params.value)
        # Try Global Defaults first, then System Settings
        for doctype in ("Global Defaults", "System Settings"):
            try:
                data = await erp_post(
                    "/api/method/frappe.client.set_value",
                    data={
                        "doctype": doctype,
                        "name": doctype,
                        "fieldname": params.key,
                        "value": params.value,
                    },
                )
                return ok(
                    {
                        "key": params.key,
                        "value": params.value,
                        "source": doctype,
                        "response": data.get("message", data),
                    }
                )
            except Exception:
                pass
        return ok(
            {
                "error": f"Field '{params.key}' not found in Global Defaults or System Settings"
            }
        )
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_clear_cache",
    annotations={
        "readOnlyHint": False,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_clear_cache() -> str:
    """Clear the ERPNext server-side cache (requires Administrator role).

    Useful after configuration changes that aren't reflecting in the UI.
    """
    try:
        log.warning("clear_cache requested")
        data = await erp_post("/api/method/frappe.sessions.clear", data={})
        return ok({"cleared": True, "response": data.get("message", data)})
    except Exception as e:
        return _err(e)


@mcp.tool(
    name="erpnext_get_user_permissions",
    annotations={
        "readOnlyHint": True,
        "destructiveHint": False,
        "idempotentHint": True,
    },
)
async def erpnext_get_user_permissions(params: UserPermissionsInput) -> str:
    """Get all User Permissions assigned to a specific user.

    Shows which DocType records the user is restricted to.
    """
    try:
        log.info("get_user_permissions user=%s", params.user)
        data = await erp_get(
            "/api/resource/User Permission",
            params={
                "filters": json.dumps([["user", "=", params.user]]),
                "fields": '["name","user","allow","for_value","apply_to_all_doctypes","applicable_for"]',
                "limit_page_length": 200,
            },
        )
        return ok(data.get("data", data))
    except Exception as e:
        return _err(e)


if __name__ == "__main__":
    transport = os.environ.get("MCP_TRANSPORT", "streamable-http")
    log.info("Starting ERPNext MCP server | transport=%s port=%s", transport, port)
    if transport == "stdio":
        mcp.run(transport="stdio")
    else:
        mcp.run(transport="streamable-http")
