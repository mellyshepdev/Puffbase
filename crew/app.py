"""Puffbase site-builder crew service.

A CrewAI orchestration layer in front of the local Ollama (phi4:14b on unit2).
The express app (server/builder.ts) submits jobs and polls for results; it
falls back to a single-shot LLM call if this service is unavailable.

Generation runs a 5-agent sequential crew:
  architect -> copywriter -> designer -> developer -> reviewer
Revision runs a 2-agent crew:
  developer -> reviewer

Single worker thread serialises jobs: the fleet has one CPU-bound LLM, so
concurrent crews would only thrash it (mirrors the express-side gen queue).
"""

import os
import re
import threading
import time
import uuid
from queue import Queue

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

OLLAMA_BASE_URL = os.environ.get(
    "OLLAMA_BASE_URL", "http://100.64.118.105:11434/v1"
).rstrip("/")
MODEL = os.environ.get("CREW_MODEL", "phi4:14b")
LLM_TIMEOUT_S = int(os.environ.get("CREW_LLM_TIMEOUT_S", "600"))
JOB_TTL_S = int(os.environ.get("CREW_JOB_TTL_S", "3600"))

app = FastAPI(title="puffbase-crew", version="1.0.0")

_jobs: dict[str, dict] = {}
_work: Queue = Queue()


# ---------------------------------------------------------------- models


class GenerateReq(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    survey: dict[str, str] = Field(default_factory=dict)


class ReviseReq(GenerateReq):
    html: str = Field(min_length=1)
    instruction: str = Field(min_length=1, max_length=4000)


# ---------------------------------------------------------------- helpers


def survey_digest(survey: dict[str, str]) -> str:
    lines = [
        f"- {k}: {v.strip()}"
        for k, v in survey.items()
        if isinstance(v, str) and v.strip()
    ]
    return "\n".join(lines) or "- (no survey answers - infer tasteful defaults)"


def extract_html(raw: str) -> str:
    """Mirror of server/llm.ts extractHtml: unwrap fences, crop to the doc."""
    fenced = re.search(r"```(?:html)?\s*([\s\S]*?)```", raw)
    body = fenced.group(1) if fenced else raw
    for marker in ("<!DOCTYPE", "<html"):
        idx = body.find(marker)
        if idx >= 0:
            body = body[idx:]
            break
    return body.strip()


def make_llm():
    from crewai import LLM

    return LLM(
        # openai/ prefix -> litellm OpenAI-compatible provider against Ollama
        model=f"openai/{MODEL}",
        base_url=OLLAMA_BASE_URL,
        api_key="ollama",
        temperature=0.4,
        max_tokens=8192,
        # Ollama runs with OLLAMA_CONTEXT_LENGTH=16384 (its default 4096 would
        # truncate the dev/review stages). crewai forwards unknown kwargs into
        # the completion call, so the window can't be set here - the 8192
        # default only bounds respect_context_window's input trimming anyway.
        timeout=LLM_TIMEOUT_S,
    )


SITE_RULES = (
    "ONE complete HTML document only - no markdown fences, no commentary. "
    "All CSS in a <style> tag in <head>, all JS in a <script> before </body>. "
    "No external stylesheets, fonts, or images - inline SVG, gradients, and "
    "system font stacks only. Responsive at 375px and 1440px. Semantic HTML5, "
    "accessible contrast, real copy (never lorem ipsum)."
)


def generation_crew(name: str, survey: dict[str, str]):
    from crewai import Agent, Crew, Process, Task

    llm = make_llm()
    digest = survey_digest(survey)
    agent_kw = dict(
        llm=llm, allow_delegation=False, verbose=False,
        respect_context_window=True, max_iter=4,
    )

    architect = Agent(
        role="Site Architect",
        goal="Turn an intake survey into a tight site structure.",
        backstory="Senior information architect for small-business sites.",
        **agent_kw,
    )
    copywriter = Agent(
        role="Conversion Copywriter",
        goal="Write real, specific marketing copy for each planned section.",
        backstory="Direct-response copywriter; plain confident voice, no filler.",
        **agent_kw,
    )
    designer = Agent(
        role="Visual Designer",
        goal="Specify a coherent visual system for the page.",
        backstory="Product designer; dark premium aesthetic unless told otherwise.",
        **agent_kw,
    )
    developer = Agent(
        role="Front-End Engineer",
        goal="Implement the approved plan as a single-file HTML site.",
        backstory="Expert in hand-rolled HTML/CSS/JS with zero dependencies.",
        **agent_kw,
    )
    reviewer = Agent(
        role="QA Reviewer",
        goal="Verify the artifact against the brief and ship the final file.",
        backstory="Meticulous reviewer who fixes defects and returns clean HTML.",
        **agent_kw,
    )

    t_plan = Task(
        description=(
            f'Plan the landing page for "{name}".\n\nIntake survey:\n{digest}\n\n'
            "Produce: ordered section list; for each, a one-line purpose and the "
            "key message. Max 250 words."
        ),
        expected_output="Compact markdown section plan, <=250 words.",
        agent=architect,
    )
    t_copy = Task(
        description=(
            "Using the section plan, write the final copy for every section: "
            "headlines, subheads, body text, CTA labels, footer lines. Real copy "
            f"about {name} - specific, no placeholders. Max 600 words."
        ),
        expected_output="Copy keyed by section name, <=600 words.",
        agent=copywriter,
        context=[t_plan],
    )
    t_design = Task(
        description=(
            "Define the visual system: hex palette (respect any survey colors), "
            "type scale, spacing rhythm, layout notes per section, subtle motion. "
            "Max 200 words."
        ),
        expected_output="Design spec, <=200 words.",
        agent=designer,
        context=[t_plan],
    )
    t_build = Task(
        description=(
            f'Implement the complete single-file site for "{name}" using the '
            f"plan, copy, and design spec.\n\nHard rules: {SITE_RULES}"
        ),
        expected_output="The complete HTML document and nothing else.",
        agent=developer,
        context=[t_plan, t_copy, t_design],
    )
    t_review = Task(
        description=(
            "Review the HTML document from the previous step against this brief:\n"
            f"{digest}\n\nRules: {SITE_RULES}\n\n"
            "Fix every defect you find and return the complete corrected HTML "
            "document and nothing else."
        ),
        expected_output="The final complete HTML document and nothing else.",
        agent=reviewer,
        context=[t_build],
    )

    return Crew(
        agents=[architect, copywriter, designer, developer, reviewer],
        tasks=[t_plan, t_copy, t_design, t_build, t_review],
        process=Process.sequential,
        memory=False,
        verbose=False,
    )


def revision_crew(
    name: str, survey: dict[str, str], html: str, instruction: str
):
    from crewai import Agent, Crew, Process, Task

    llm = make_llm()
    digest = survey_digest(survey)
    agent_kw = dict(
        llm=llm, allow_delegation=False, verbose=False,
        respect_context_window=True, max_iter=4,
    )

    developer = Agent(
        role="Front-End Engineer",
        goal="Apply the requested change to the existing single-file site.",
        backstory="Expert in hand-rolled HTML/CSS/JS with zero dependencies.",
        **agent_kw,
    )
    reviewer = Agent(
        role="QA Reviewer",
        goal="Verify the change landed and ship the final file.",
        backstory="Meticulous reviewer who fixes defects and returns clean HTML.",
        **agent_kw,
    )

    t_revise = Task(
        description=(
            f'Here is the current single-file site for "{name}":\n\n{html}\n\n'
            f"Change request: {instruction}\n\nSurvey context (unchanged):\n"
            f"{digest}\n\nReturn the complete updated HTML document - the whole "
            f"file, not a diff. Rules: {SITE_RULES}"
        ),
        expected_output="The complete updated HTML document and nothing else.",
        agent=developer,
    )
    t_review = Task(
        description=(
            f"Verify the previous step applied this change: {instruction}\n"
            f"Rules: {SITE_RULES}\n\nFix any defects and return the complete "
            "final HTML document and nothing else."
        ),
        expected_output="The final complete HTML document and nothing else.",
        agent=reviewer,
        context=[t_revise],
    )

    return Crew(
        agents=[developer, reviewer],
        tasks=[t_revise, t_review],
        process=Process.sequential,
        memory=False,
        verbose=False,
    )


# ---------------------------------------------------------------- worker


def _gc_jobs() -> None:
    # Reap completed jobs after TTL. Keyed on `finished`, not `created` - a
    # crew run can legitimately exceed JOB_TTL_S, and keying on `created`
    # deletes the job the moment it finishes, before the poller reads it.
    cutoff = time.time() - JOB_TTL_S
    for jid in [
        j
        for j, s in _jobs.items()
        if s["finished"] is not None and s["finished"] < cutoff
    ]:
        del _jobs[jid]


def _worker() -> None:
    while True:
        jid, kind, payload = _work.get()
        job = _jobs.get(jid)
        if not job:
            continue
        job["status"] = "running"
        try:
            if kind == "generate":
                crew = generation_crew(payload["name"], payload["survey"])
            else:
                crew = revision_crew(
                    payload["name"], payload["survey"],
                    payload["html"], payload["instruction"],
                )
            html = extract_html(str(crew.kickoff()))
            if "<html" not in html.lower():
                raise ValueError("crew output was not an HTML document")
            job.update(status="done", html=html)
        except Exception as exc:  # surfaced to the poller; express falls back
            job.update(status="failed", error=str(exc)[:500])
        finally:
            job["finished"] = time.time()
            _gc_jobs()


threading.Thread(target=_worker, daemon=True).start()


def _enqueue(kind: str, payload: dict) -> dict:
    jid = uuid.uuid4().hex[:16]
    _jobs[jid] = {
        "status": "queued", "kind": kind, "created": time.time(),
        "html": None, "error": None, "finished": None,
    }
    _work.put((jid, kind, payload))
    return {"job_id": jid}


# ---------------------------------------------------------------- routes


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/status")
def status():
    running = sum(1 for j in _jobs.values() if j["status"] == "running")
    return {
        "model": MODEL,
        "ollama": OLLAMA_BASE_URL,
        "queued": _work.qsize(),
        "running": running,
        "jobs": len(_jobs),
    }


@app.post("/jobs/generate")
def submit_generate(req: GenerateReq):
    return _enqueue("generate", req.model_dump())


@app.post("/jobs/revise")
def submit_revise(req: ReviseReq):
    return _enqueue("revise", req.model_dump())


@app.get("/jobs/{job_id}")
def job_status(job_id: str):
    job = _jobs.get(job_id)
    if not job:
        raise HTTPException(404, "unknown job")
    resp = {
        "status": job["status"],
        "kind": job["kind"],
        "elapsed_s": round(
            (job["finished"] or time.time()) - job["created"], 1
        ),
    }
    if job["status"] == "done":
        resp["html"] = job["html"]
    if job["status"] == "failed":
        resp["error"] = job["error"]
    return resp
