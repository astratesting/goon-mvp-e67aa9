"""
Goon Backend — Real-time co-founder matching platform.
FastAPI server with Supabase, Clerk auth, Stripe subscriptions,
PDF pitch-deck parsing, and compatibility scoring.
"""

import io
import os
import re
import uuid
from datetime import datetime, timedelta, timezone
from enum import Enum
from typing import Any, Dict, List, Optional

import stripe
from fastapi import FastAPI, File, Form, HTTPException, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr, Field
from supabase import Client, create_client

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

CLERK_JWKS_URL = os.getenv("CLERK_JWKS_URL", "https://api.clerk.com/v1/jwks")
CLERK_SECRET_KEY = os.getenv("CLERK_SECRET_KEY", "")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
STRIPE_SECRET_KEY = os.getenv("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET", "")
STRIPE_MONTHLY_PRICE_ID = os.getenv("STRIPE_MONTHLY_PRICE_ID", "price_monthly")
STRIPE_YEARLY_PRICE_ID = os.getenv("STRIPE_YEARLY_PRICE_ID", "price_yearly")
STRIPE_BG_CHECK_PRICE_ID = os.getenv("STRIPE_BG_CHECK_PRICE_ID", "price_bg_check")
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "http://localhost:3000")
PDF_PARSE_TIMEOUT_SECONDS = int(os.getenv("PDF_PARSE_TIMEOUT_SECONDS", "30"))

# ---------------------------------------------------------------------------
# App initialisation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="Goon API",
    version="0.1.0",
    docs_url="/api/docs",
    openapi_url="/api/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[CORS_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

supabase: Client = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)
stripe.api_key = STRIPE_SECRET_KEY

# ---------------------------------------------------------------------------
# Enums & models
# ---------------------------------------------------------------------------


class StageEnum(str, Enum):
    idea = "idea"
    prototyping = "prototyping"
    launched = "launched"
    growth = "growth"


class AvailabilityEnum(str, Enum):
    part_time = "part_time"
    full_time = "full_time"


class SubscriptionTierEnum(str, Enum):
    free = "free"
    monthly = "monthly"
    yearly = "yearly"


class UserPreferences(BaseModel):
    desired_stage: List[str] = Field(default_factory=lambda: ["idea", "prototyping", "launched", "growth"])
    desired_availability: List[str] = Field(default_factory=lambda: ["part_time", "full_time"])
    desired_tech_stack: List[str] = Field(default_factory=list)
    min_compatibility_score: float = Field(default=0.0, ge=0.0, le=100.0)


class UserProfile(BaseModel):
    id: str
    clerk_id: str
    name: str
    email: str
    bio: str = ""
    avatar_url: str = ""
    tech_stack: List[str] = Field(default_factory=list)
    stage: str = "idea"
    availability: str = "part_time"
    pitch_deck_url: str = ""
    verified_skills: List[str] = Field(default_factory=list)
    subscription_tier: str = "free"
    stripe_customer_id: str = ""
    preferences: Optional[UserPreferences] = None
    created_at: str = ""
    updated_at: str = ""


class MatchResult(BaseModel):
    id: str
    user1_id: str
    user2_id: str
    compatibility_score: float
    matched_user: Optional[UserProfile] = None
    skill_overlap: List[str] = Field(default_factory=list)
    created_at: str = ""


class ParsedPitchDeck(BaseModel):
    tech_stack: List[str] = Field(default_factory=list)
    stage: str = "idea"
    availability: str = "part_time"
    summary: str = ""


# ---------------------------------------------------------------------------
# Helper: Clerk JWT verification (simplified — uses Supabase bearer)
# ---------------------------------------------------------------------------


def _get_clerk_user_id(authorization: str) -> str:
    """Extract Clerk user ID from the Authorization header.

    In production the JWT should be verified against Clerk's JWKS endpoint.
    For this MVP we trust the bearer token and decode the sub claim locally.
    """
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid Authorization header")

    token = authorization.removeprefix("Bearer ")

    try:
        import jwt as pyjwt

        # Fetch JWKS and verify
        jwks_client = pyjwt.PyJWKClient(CLERK_JWKS_URL, cache_keys=True)
        signing_key = jwks_client.get_signing_key_from_jwt(token)
        payload = pyjwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            issuer="https://clerk.goon.dev",
            options={"verify_exp": True},
        )
        return payload["sub"]
    except ImportError:
        # Fallback for development: parse without verification
        import json
        import base64

        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status_code=401, detail="Invalid JWT format")
        padded = parts[1] + "=" * (4 - len(parts[1]) % 4)
        try:
            payload = json.loads(base64.urlsafe_b64decode(padded))
        except Exception:
            raise HTTPException(status_code=401, detail="Invalid JWT payload")
        return payload.get("sub", "")
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid or expired token")


def _get_user_id(request) -> str:
    auth = request.headers.get("authorization", "")
    return _get_clerk_user_id(auth)


# ---------------------------------------------------------------------------
# PDF pitch-deck parser
# ---------------------------------------------------------------------------

_STAGE_KEYWORDS: Dict[str, List[str]] = {
    "idea": ["idea", "concept", "white paper", "whitepaper", "pre-seed", "brainstorm"],
    "prototyping": ["prototype", "mvp", "minimum viable", "beta", "alpha", "development", "building"],
    "launched": ["launched", "live", "in market", "go-to-market", "gtm", "customers", "revenue", "traction"],
    "growth": ["growth", "scale", "scaling", "series a", "series b", "expansion", "hiring"],
}

_AVAILABILITY_KEYWORDS: Dict[str, List[str]] = {
    "part_time": ["part-time", "part time", "evening", "weekend", "side project", "10 hours", "20 hours"],
    "full_time": ["full-time", "full time", "dedicated", "commit", "40 hours"],
}

_TECH_KEYWORDS: Dict[str, List[str]] = {
    "python": ["python", "django", "flask", "fastapi", "pytorch", "tensorflow", "langchain"],
    "javascript": ["javascript", "js", "node.js", "nodejs", "node", "express", "nestjs", "typescript", "ts", "react", "vue", "angular", "next.js", "nextjs"],
    "go": ["golang", "go "],
    "rust": ["rust", "rustlang"],
    "ruby": ["ruby", "rails", "ruby on rails"],
    "java": ["java", "spring boot", "kotlin"],
    "swift": ["swift", "ios", "swiftui", "uikit"],
    "kotlin": ["kotlin", "android"],
    "mobile": ["flutter", "dart", "react native", "expo", "swiftui", "jetpack compose"],
    "devops": ["docker", "kubernetes", "k8s", "aws", "gcp", "azure", "terraform", "ansible", "ci/cd", "github actions"],
    "database": ["postgresql", "postgres", "mysql", "mongodb", "redis", "sqlite", "supabase", "firebase", "prisma"],
    "blockchain": ["blockchain", "web3", "solidity", "ethereum", "solana", "smart contract", "nft", "defi"],
    "ai-ml": ["machine learning", "deep learning", "llm", "openai", "gpt", "claude", "hugging face", "langchain", "rag", "nlp", "computer vision", "reinforcement learning"],
    "hardware": ["arduino", "raspberry pi", "iot", "embedded", "fpga", "pcb", "cad"],
    "design": ["figma", "sketch", "adobe xd", "ui/ux", "design system", "prototyping"],
    "data": ["data science", "analytics", "data engineering", "spark", "hadoop", "airflow", "dbt", "looker", "tableau"],
    "security": ["security", "cybersecurity", "penetration testing", "appsec", "zero trust", "encryption"],
}


def _extract_text_from_pdf(content: bytes) -> str:
    """Extract text from a PDF byte stream using a pure-Python parser."""
    text_parts: List[str] = []
    i = 0
    length = len(content)

    while i < length:
        # Find text between parentheses in PDF streams
        if content[i : i + 1] == b"(":
            depth = 1
            j = i + 1
            while j < length and depth > 0:
                byte = content[j : j + 1]
                if byte == b"(" and content[j - 1 : j] != b"\\":
                    depth += 1
                elif byte == b")" and content[j - 1 : j] != b"\\":
                    depth -= 1
                j += 1
            chunk = content[i + 1 : j - 1]
            try:
                decoded = chunk.decode("utf-8", errors="replace")
                # Filter out non-printable garbage
                cleaned = re.sub(r"[^\x20-\x7E\s]", "", decoded)
                if len(cleaned) > 2:
                    text_parts.append(cleaned)
            except Exception:
                pass
            i = j
        elif content[i : i + 1] == b"<":
            # Hex-encoded string
            j = i + 1
            while j < length and content[j : j + 1] != b">":
                j += 1
            i = j + 1
        else:
            i += 1

    return " ".join(text_parts)


def _text_contains(text: str, keywords: List[str]) -> bool:
    lowered = text.lower()
    for kw in keywords:
        if kw in lowered:
            return True
    return False


def _score_stage(text: str) -> str:
    scores: Dict[str, int] = {}
    for stage, keywords in _STAGE_KEYWORDS.items():
        scores[stage] = sum(1 for kw in keywords if kw in text.lower())
    if not scores or max(scores.values()) == 0:
        return "idea"
    return max(scores, key=scores.get)  # type: ignore[arg-type]


def _score_availability(text: str) -> str:
    text_lower = text.lower()
    pt_score = sum(1 for kw in _AVAILABILITY_KEYWORDS["part_time"] if kw in text_lower)
    ft_score = sum(1 for kw in _AVAILABILITY_KEYWORDS["full_time"] if kw in text_lower)
    return "full_time" if ft_score > pt_score else "part_time"


def _extract_tech_stack(text: str) -> List[str]:
    found: List[str] = []
    text_lower = text.lower()
    seen = set()
    for tech, keywords in _TECH_KEYWORDS.items():
        if tech not in seen and any(kw in text_lower for kw in keywords):
            found.append(tech)
            seen.add(tech)
    return found


def parse_pitch_deck(content: bytes) -> ParsedPitchDeck:
    """Parse a pitch-deck PDF and return extracted structured data."""
    text = _extract_text_from_pdf(content)

    if not text.strip():
        return ParsedPitchDeck(
            tech_stack=[],
            stage="idea",
            availability="part_time",
            summary="No extractable text found in PDF.",
        )

    tech_stack = _extract_tech_stack(text)
    stage = _score_stage(text)
    availability = _score_availability(text)

    # Generate a concise summary from the first ~500 chars of clean text
    clean = re.sub(r"\s+", " ", text).strip()
    summary = clean[:500] + ("..." if len(clean) > 500 else "")

    return ParsedPitchDeck(
        tech_stack=tech_stack,
        stage=stage,
        availability=availability,
        summary=summary,
    )


# ---------------------------------------------------------------------------
# Matching algorithm
# ---------------------------------------------------------------------------


def _compute_compatibility(user_a: UserProfile, user_b: UserProfile) -> float:
    """Compute a compatibility score (0–100) between two user profiles.

    Weighted criteria:
      - Tech-stack overlap (35 %)
      - Stage alignment (25 %)
      - Availability match (20 %)
      - Verified skills (20 %)
    """
    score = 0.0

    # 1. Tech-stack overlap (35 points)
    a_tech = set(t.lower() for t in user_a.tech_stack)
    b_tech = set(t.lower() for t in user_b.tech_stack)
    if a_tech and b_tech:
        intersection = a_tech & b_tech
        union = a_tech | b_tech
        jaccard = len(intersection) / len(union) if union else 0
        score += 35.0 * jaccard
    elif not a_tech and not b_tech:
        score += 17.5  # neutral — both have no data
    # else one has tech and the other does not — score stays 0 for this component

    # 2. Stage alignment (25 points)
    _STAGE_ORDER = ["idea", "prototyping", "launched", "growth"]
    if user_a.stage == user_b.stage:
        score += 25.0
    else:
        # Partial credit for adjacent stages
        try:
            idx_a = _STAGE_ORDER.index(user_a.stage)
            idx_b = _STAGE_ORDER.index(user_b.stage)
            gap = abs(idx_a - idx_b)
            if gap == 1:
                score += 12.5
            elif gap == 2:
                score += 6.0
            # gap == 3 => 0
        except ValueError:
            pass

    # 3. Availability match (20 points)
    if user_a.availability == user_b.availability:
        score += 20.0

    # 4. Verified skills overlap (20 points)
    a_skills = set(s.lower() for s in user_a.verified_skills)
    b_skills = set(s.lower() for s in user_b.verified_skills)
    if a_skills and b_skills:
        s_intersection = a_skills & b_skills
        s_union = a_skills | b_skills
        skill_jaccard = len(s_intersection) / len(s_union) if s_union else 0
        score += 20.0 * skill_jaccard
    elif not a_skills and not b_skills:
        score += 10.0

    return round(min(score, 100.0), 1)


def _skill_overlap(user_a: UserProfile, user_b: UserProfile) -> List[str]:
    a_set = set(user_a.tech_stack)
    b_set = set(user_b.tech_stack)
    return sorted(a_set & b_set)


# ---------------------------------------------------------------------------
# Helper: DB read / write
# ---------------------------------------------------------------------------


def _db_get_user(clerk_id: str) -> Optional[UserProfile]:
    result = supabase.table("users").select("*").eq("clerk_id", clerk_id).maybe_single().execute()
    row = result.data
    if not row:
        return None
    return _row_to_profile(row)


def _db_get_user_by_id(user_id: str) -> Optional[UserProfile]:
    result = supabase.table("users").select("*").eq("id", user_id).maybe_single().execute()
    row = result.data
    if not row:
        return None
    return _row_to_profile(row)


def _row_to_profile(row: dict) -> UserProfile:
    prefs_raw = row.get("preferences")
    preferences = None
    if prefs_raw and isinstance(prefs_raw, dict):
        preferences = UserPreferences(**prefs_raw)
    return UserProfile(
        id=row["id"],
        clerk_id=row["clerk_id"],
        name=row.get("name", ""),
        email=row.get("email", ""),
        bio=row.get("bio", ""),
        avatar_url=row.get("avatar_url", ""),
        tech_stack=row.get("tech_stack", []) or [],
        stage=row.get("stage", "idea"),
        availability=row.get("availability", "part_time"),
        pitch_deck_url=row.get("pitch_deck_url", ""),
        verified_skills=row.get("verified_skills", []) or [],
        subscription_tier=row.get("subscription_tier", "free"),
        stripe_customer_id=row.get("stripe_customer_id", ""),
        preferences=preferences,
        created_at=row.get("created_at", ""),
        updated_at=row.get("updated_at", ""),
    )


def _db_upsert_user(clerk_id: str, data: dict) -> UserProfile:
    now = datetime.now(timezone.utc).isoformat()
    payload = {**data, "clerk_id": clerk_id, "updated_at": now}
    # Check if user exists
    existing = _db_get_user(clerk_id)
    if existing:
        supabase.table("users").update(payload).eq("clerk_id", clerk_id).execute()
    else:
        payload["created_at"] = now
        supabase.table("users").insert(payload).execute()
    refreshed = _db_get_user(clerk_id)
    if refreshed is None:
        raise HTTPException(status_code=500, detail="Failed to upsert user")
    return refreshed


# ---------------------------------------------------------------------------
# Routes — Auth middleware
# ---------------------------------------------------------------------------


from fastapi import Request  # noqa: E402


@app.middleware("http")
async def _auth_middleware(request: Request, call_next):
    """Protect all /api/ routes except public endpoints."""
    path = request.url.path
    public_paths = {"/api/health", "/api/webhook/stripe", "/api/docs", "/api/openapi.json"}
    if not path.startswith("/api/") or path in public_paths:
        return await call_next(request)

    auth_header = request.headers.get("authorization", "")
    try:
        clerk_id = _get_clerk_user_id(auth_header)
        request.state.clerk_id = clerk_id
    except HTTPException:
        return JSONResponse(status_code=401, content={"detail": "Unauthorized"})

    return await call_next(request)


# ---------------------------------------------------------------------------
# Routes — Health
# ---------------------------------------------------------------------------


@app.get("/api/health")
async def health_check():
    return {"status": "ok", "timestamp": datetime.now(timezone.utc).isoformat()}


# ---------------------------------------------------------------------------
# Routes — User
# ---------------------------------------------------------------------------


@app.get("/api/user/me")
async def get_current_user(request: Request):
    clerk_id = request.state.clerk_id
    user = _db_get_user(clerk_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user.model_dump()


@app.post("/api/user/upsert")
async def upsert_user(request: Request, body: dict):
    clerk_id = request.state.clerk_id
    allowed = {"name", "email", "bio", "avatar_url", "tech_stack", "stage", "availability", "preferences"}
    filtered = {k: v for k, v in body.items() if k in allowed}
    user = _db_upsert_user(clerk_id, filtered)
    return user.model_dump()


# ---------------------------------------------------------------------------
# Routes — Pitch-deck upload & parse
# ---------------------------------------------------------------------------


@app.post("/api/pitch-deck/upload")
async def upload_pitch_deck(request: Request, file: UploadFile = File(...)):
    clerk_id = request.state.clerk_id

    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted")

    content = await file.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 10 MB limit")

    parsed = parse_pitch_deck(content)

    # Upload to Supabase storage
    file_ext = "pdf"
    storage_path = f"pitch-decks/{clerk_id}/{uuid.uuid4().hex}.{file_ext}"
    try:
        supabase.storage.from_("pitch-decks").upload(
            path=storage_path,
            file=content,
            file_options={"content-type": "application/pdf"},
        )
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Storage upload failed: {str(exc)}")

    public_url = f"{SUPABASE_URL}/storage/v1/object/public/pitch-decks/{storage_path}"

    # Update user profile with parsed data
    update_data = {
        "pitch_deck_url": public_url,
        "tech_stack": parsed.tech_stack,
        "stage": parsed.stage,
        "availability": parsed.availability,
    }
    updated = _db_upsert_user(clerk_id, update_data)

    return {
        "pitch_deck_url": public_url,
        "parsed": parsed.model_dump(),
        "user": updated.model_dump(),
    }


# ---------------------------------------------------------------------------
# Routes — Matching
# ---------------------------------------------------------------------------


@app.get("/api/matches")
async def get_matches(
    request: Request,
    min_score: float = Query(0.0, ge=0.0, le=100.0),
    stage: Optional[str] = Query(None),
    availability: Optional[str] = Query(None),
    tech: Optional[str] = Query(None),
    limit: int = Query(20, ge=1, le=100),
):
    clerk_id = request.state.clerk_id
    current_user = _db_get_user(clerk_id)
    if current_user is None:
        raise HTTPException(status_code=404, detail="User not found")

    user_prefs = current_user.preferences or UserPreferences()

    # Fetch all other users from DB
    result = supabase.table("users").select("*").neq("clerk_id", clerk_id).limit(200).execute()
    candidates = [_row_to_profile(row) for row in (result.data or [])]

    # Apply preference filters
    filtered: List[UserProfile] = []
    for c in candidates:
        # Stage filter
        if c.stage not in user_prefs.desired_stage:
            continue
        if stage and c.stage != stage:
            continue
        # Availability filter
        if c.availability not in user_prefs.desired_availability:
            continue
        if availability and c.availability != availability:
            continue
        # Tech filter
        if tech and tech.lower() not in [t.lower() for t in c.tech_stack]:
            continue
        filtered.append(c)

    # Score & sort
    scored: List[tuple[float, UserProfile]] = []
    for c in filtered:
        score = _compute_compatibility(current_user, c)
        if score >= max(min_score, user_prefs.min_compatibility_score):
            scored.append((score, c))

    scored.sort(key=lambda x: x[0], reverse=True)
    top = scored[:limit]

    # Save match records
    matches_out: List[MatchResult] = []
    now_iso = datetime.now(timezone.utc).isoformat()
    for score, candidate in top:
        match_id = uuid.uuid4().hex
        overlap = _skill_overlap(current_user, candidate)
        # Upsert match record
        try:
            supabase.table("matches").upsert(
                {
                    "id": match_id,
                    "user1_id": current_user.id,
                    "user2_id": candidate.id,
                    "compatibility_score": score,
                    "created_at": now_iso,
                },
                on_conflict="id",
            ).execute()
        except Exception:
            pass  # Non-critical — serve the match anyway

        matches_out.append(
            MatchResult(
                id=match_id,
                user1_id=current_user.id,
                user2_id=candidate.id,
                compatibility_score=score,
                matched_user=candidate,
                skill_overlap=overlap,
                created_at=now_iso,
            )
        )

    return [m.model_dump() for m in matches_out]


# ---------------------------------------------------------------------------
# Routes — Stripe subscriptions
# ---------------------------------------------------------------------------


@app.post("/api/subscription/create-checkout")
async def create_checkout_session(request: Request, body: dict):
    clerk_id = request.state.clerk_id
    user = _db_get_user(clerk_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    price_id = body.get("price_id", STRIPE_MONTHLY_PRICE_ID)
    success_url = body.get("success_url", f"{CORS_ORIGIN}/dashboard")
    cancel_url = body.get("cancel_url", f"{CORS_ORIGIN}/pricing")

    # Create or reuse Stripe customer
    customer_id = user.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"clerk_id": clerk_id},
        )
        customer_id = customer.id
        supabase.table("users").update({"stripe_customer_id": customer_id}).eq(
            "clerk_id", clerk_id
        ).execute()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": price_id, "quantity": 1}],
        mode="subscription",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"clerk_id": clerk_id},
    )

    return {"url": session.url, "session_id": session.id}


@app.post("/api/subscription/create-bg-check-checkout")
async def create_bg_check_checkout(request: Request, body: dict):
    """One-time background-check checkout session."""
    clerk_id = request.state.clerk_id
    user = _db_get_user(clerk_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    success_url = body.get("success_url", f"{CORS_ORIGIN}/dashboard")
    cancel_url = body.get("cancel_url", f"{CORS_ORIGIN}/pricing")

    customer_id = user.stripe_customer_id
    if not customer_id:
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"clerk_id": clerk_id},
        )
        customer_id = customer.id
        supabase.table("users").update({"stripe_customer_id": customer_id}).eq(
            "clerk_id", clerk_id
        ).execute()

    session = stripe.checkout.Session.create(
        customer=customer_id,
        payment_method_types=["card"],
        line_items=[{"price": STRIPE_BG_CHECK_PRICE_ID, "quantity": 1}],
        mode="payment",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={"clerk_id": clerk_id, "type": "background_check"},
    )

    return {"url": session.url, "session_id": session.id}


@app.get("/api/subscription/status")
async def get_subscription_status(request: Request):
    clerk_id = request.state.clerk_id
    user = _db_get_user(clerk_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")

    tier = user.subscription_tier
    active = tier in ("monthly", "yearly")

    return {
        "tier": tier,
        "active": active,
        "has_bg_check": False,  # simplified — checks are tracked per-user in DB
    }


# ---------------------------------------------------------------------------
# Routes — Stripe webhook
# ---------------------------------------------------------------------------


@app.post("/api/webhook/stripe")
async def stripe_webhook(request: Request):
    payload_body = await request.body()
    sig_header = request.headers.get("stripe-signature", "")

    if STRIPE_WEBHOOK_SECRET:
        try:
            event = stripe.Webhook.construct_event(payload_body, sig_header, STRIPE_WEBHOOK_SECRET)
        except stripe.error.SignatureVerificationError:
            raise HTTPException(status_code=400, detail="Invalid signature")
    else:
        # Development fallback — parse raw
        import json

        try:
            event = json.loads(payload_body)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Invalid JSON")

    event_type = event.get("type", event.get("type", ""))

    if event_type == "checkout.session.completed":
        session = event["data"]["object"]
        clerk_id = session.get("metadata", {}).get("clerk_id", "")
        bg_check = session.get("metadata", {}).get("type") == "background_check"

        if bg_check:
            supabase.table("users").update({"has_bg_check": True}).eq(
                "clerk_id", clerk_id
            ).execute()
        else:
            # Map price to tier
            price_id = session.get("line_items", [{}])[0].get("price", {}).get("id", "")
            if price_id in (STRIPE_MONTHLY_PRICE_ID, STRIPE_YEARLY_PRICE_ID):
                tier = "yearly" if price_id == STRIPE_YEARLY_PRICE_ID else "monthly"
                supabase.table("users").update({"subscription_tier": tier}).eq(
                    "clerk_id", clerk_id
                ).execute()

    elif event_type == "customer.subscription.updated":
        sub = event["data"]["object"]
        customer_id = sub.get("customer", "")
        status = sub.get("status", "")
        if status in ("past_due", "canceled", "unpaid"):
            supabase.table("users").update({"subscription_tier": "free"}).eq(
                "stripe_customer_id", customer_id
            ).execute()
        elif status == "active":
            # Determine tier from the price
            items = sub.get("items", {}).get("data", [])
            if items:
                price_id = items[0].get("price", {}).get("id", "")
                tier = "yearly" if price_id == STRIPE_YEARLY_PRICE_ID else "monthly"
                supabase.table("users").update({"subscription_tier": tier}).eq(
                    "stripe_customer_id", customer_id
                ).execute()

    elif event_type == "customer.subscription.deleted":
        sub = event["data"]["object"]
        customer_id = sub.get("customer", "")
        supabase.table("users").update({"subscription_tier": "free"}).eq(
            "stripe_customer_id", customer_id
        ).execute()

    return {"received": True}


# ---------------------------------------------------------------------------
# Routes — Background check
# ---------------------------------------------------------------------------


POSTMARK_SERVER_TOKEN = os.getenv("POSTMARK_SERVER_TOKEN", "")
POSTMARK_FROM_EMAIL = os.getenv("POSTMARK_FROM_EMAIL", "noreply@goon.dev")


@app.post("/api/admin/verify-skills")
async def verify_skills(request: Request, body: dict):
    """Admin endpoint: mark a user's skills as verified."""
    # Simple admin check via env var
    admin_key = request.headers.get("x-admin-key", "")
    if admin_key != os.getenv("GOON_ADMIN_KEY", ""):
        raise HTTPException(status_code=403, detail="Forbidden")

    user_id = body.get("user_id", "")
    skills = body.get("skills", [])
    if not user_id or not skills:
        raise HTTPException(status_code=400, detail="user_id and skills are required")

    supabase.table("users").update({"verified_skills": skills}).eq(
        "id", user_id
    ).execute()

    return {"ok": True, "user_id": user_id, "verified_skills": skills}


# ---------------------------------------------------------------------------
# Routes — Search
# ---------------------------------------------------------------------------


@app.get("/api/users/search")
async def search_users(
    request: Request,
    q: str = Query("", min_length=1, max_length=200),
    limit: int = Query(20, ge=1, le=50),
):
    """Search users by name, tech stack, or bio."""
    clerk_id = request.state.clerk_id

    # Use Supabase full-text search if available, otherwise ILIKE
    try:
        result = (
            supabase.table("users")
            .select("*")
            .neq("clerk_id", clerk_id)
            .or_(
                f"name.ilike.%{q}%,"
                f"bio.ilike.%{q}%,"
                f"tech_stack.cs.{{{q}}}"
            )
            .limit(limit)
            .execute()
        )
    except Exception:
        # Fallback — fetch recent users and filter in Python
        result = (
            supabase.table("users")
            .select("*")
            .neq("clerk_id", clerk_id)
            .limit(limit * 5)
            .execute()
        )
        filtered_rows = []
        q_lower = q.lower()
        for row in (result.data or []):
            name_match = q_lower in row.get("name", "").lower()
            bio_match = q_lower in row.get("bio", "").lower()
            tech_match = any(q_lower in t.lower() for t in (row.get("tech_stack") or []))
            if name_match or bio_match or tech_match:
                filtered_rows.append(row)
        result.data = filtered_rows[:limit]

    users = [_row_to_profile(row) for row in (result.data or [])]
    return [u.model_dump() for u in users]


# ---------------------------------------------------------------------------
# Entrypoint
# ---------------------------------------------------------------------------


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=int(os.getenv("PORT", "8000")), reload=True)
