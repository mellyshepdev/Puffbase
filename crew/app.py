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


def generation_crew(name: str, survey: dict[str, str], job: dict):
    """8-role pipeline per the crew setup config.

    Sequential process: the Lead Architect's master brief is the coordination
    mechanism - every downstream task consumes it via context chaining. A
    hierarchical manager would add a delegate+review call around every task,
    roughly doubling LLM calls on an already CPU-bound model.
    """
    from crewai import Agent, Crew, Process, Task

    llm = make_llm()
    digest = survey_digest(survey)
    agent_kw = dict(
        llm=llm, allow_delegation=False, verbose=False,
        respect_context_window=True, max_iter=4,
    )

    lead_architect = Agent(
        role="Lead Architect",
        goal=(
            "Process customer requirements from the intake questionnaire and "
            "set the direction every specialized agent follows."
        ),
        backstory=(
            "Lead Architect for an autonomous web development crew. You own "
            "the master build brief: requirements, structure, and the quality "
            "bar the deliverable must meet."
        ),
        **agent_kw,
    )
    researcher = Agent(
        role="Research Agent",
        goal=(
            "Analyze the customer's business domain, competitors, and core "
            "messaging to establish a strong foundational concept."
        ),
        backstory=(
            "Market researcher who turns a business description into concrete "
            "positioning: who it's for, what competitors do, and the message "
            "that differentiates it."
        ),
        **agent_kw,
    )
    designer = Agent(
        role="Design and Brand Agent",
        goal=(
            "Determine the visual identity: color schemes, typography, and "
            "hero section layout for a modern, engaging interface."
        ),
        backstory=(
            "Brand designer; dark premium aesthetic by default. You output "
            "precise specs - hex values, font stacks, spacing - not vague mood."
        ),
        **agent_kw,
    )
    copywriter = Agent(
        role="Content and Copywriting Agent",
        goal=(
            "Craft all textual elements: clear labels, persuasive sales copy, "
            "and consistent information architecture across the page."
        ),
        backstory=(
            "Direct-response copywriter. Plain confident voice, specific "
            "claims, zero filler, never lorem ipsum."
        ),
        **agent_kw,
    )
    tech_integrator = Agent(
        role="Technical Integration Agent",
        goal=(
            "Assemble the HTML, CSS, and JavaScript, integrate the chatbot "
            "widget, and prepare the file for final deployment."
        ),
        backstory=(
            "Front-end engineer specializing in dependency-free single-file "
            "sites. You integrate a lightweight inline chatbot widget (a chat "
            "bubble + panel wired to a configurable endpoint constant) when "
            "the brief calls for one."
        ),
        **agent_kw,
    )
    qa_agent = Agent(
        role="Quality Assurance and Syntax Agent",
        goal=(
            "Execute and validate all code: run syntax and structure checks "
            "against industry standards so everything passes flawlessly."
        ),
        backstory=(
            "QA engineer who validates markup the way you'd validate a complex "
            "container configuration - every rule checked, every defect fixed."
        ),
        **agent_kw,
    )
    devops_sec = Agent(
        role="DevOps and Security Agent",
        goal=(
            "Review the codebase for security vulnerabilities and verify the "
            "chatbot widget, API integrations, and deployment pieces are "
            "robust and operational."
        ),
        backstory=(
            "Security-minded DevOps reviewer: no injected endpoints, no "
            "external resource leaks, no unsafe inline handlers - and the "
            "file must work when opened directly."
        ),
        **agent_kw,
    )
    packager = Agent(
        role="Final Packaging Agent",
        goal=(
            "Compile all verified files into the final deliverable and "
            "coordinate seamless delivery to the customer."
        ),
        backstory=(
            "Release engineer. For this pipeline the deliverable is a single "
            "self-contained HTML file - you confirm it is complete, "
            "self-verified, and ship-ready."
        ),
        **agent_kw,
    )

    t_brief = Task(
        description=(
            f'Process the intake questionnaire for "{name}" and produce the '
            f"master build brief.\n\nQuestionnaire:\n{digest}\n\n"
            "Include: one-line positioning, ordered section list with purpose "
            "each, must-have requirements, and whether a chatbot widget fits "
            "the brief. Max 300 words - this brief directs every agent after "
            "you."
        ),
        expected_output="Master build brief, <=300 words.",
        agent=lead_architect,
    )
    t_research = Task(
        description=(
            "Analyze the business domain: who the customers are, what "
            "competitors in this space typically promise, and the single "
            "strongest message to lead with. Ground it in the master brief. "
            "Max 250 words."
        ),
        expected_output="Domain + messaging analysis, <=250 words.",
        agent=researcher,
        context=[t_brief],
    )
    t_design = Task(
        description=(
            "Define the visual identity: hex palette (respect any questionnaire "
            "colors), type scale and system font stack, spacing rhythm, hero "
            "section layout, subtle motion notes. Max 250 words."
        ),
        expected_output="Design/brand spec, <=250 words.",
        agent=designer,
        context=[t_brief, t_research],
    )
    t_copy = Task(
        description=(
            "Write all textual content: every section's headline, subhead, "
            "body copy, CTA labels, nav labels, footer lines. Specific to "
            f"{name} and its audience - persuasive, real, no placeholders. "
            "Max 600 words."
        ),
        expected_output="Complete site copy keyed by section, <=600 words.",
        agent=copywriter,
        context=[t_brief, t_research, t_design],
    )
    t_build = Task(
        description=(
            f'Assemble the complete single-file site for "{name}" from the '
            "brief, research, design spec, and copy. If the brief calls for a "
            "chatbot widget, embed a self-contained chat bubble + panel wired "
            "to a clearly-named endpoint constant at the top of the script. "
            f"Hard rules: {SITE_RULES}"
        ),
        expected_output="The complete HTML document and nothing else.",
        agent=tech_integrator,
        context=[t_brief, t_design, t_copy],
    )
    t_qa = Task(
        description=(
            "Validate the HTML document like a complex container "
            "configuration: unclosed tags, invalid nesting, missing aria "
            "labels, broken anchors, dead JS references, missing <style> or "
            "<script> closures. Fix every defect and return the complete "
            f"corrected document. Rules: {SITE_RULES}"
        ),
        expected_output="The complete validated HTML document and nothing else.",
        agent=qa_agent,
        context=[t_build],
    )
    t_security = Task(
        description=(
            "Security-review the document: no external resource loads, no "
            "unsafe inline handlers, the chatbot widget (if present) fails "
            "closed when its endpoint is unreachable, and the file renders "
            "opened directly from disk. Fix issues and return the complete "
            "hardened document."
        ),
        expected_output="The complete hardened HTML document and nothing else.",
        agent=devops_sec,
        context=[t_qa],
    )
    t_package = Task(
        description=(
            "Final packaging: confirm the document is complete, self-contained, "
            "and matches the master brief. Return the complete final HTML "
            "document and nothing else - it IS the deliverable."
        ),
        expected_output="The final complete HTML document and nothing else.",
        agent=packager,
        context=[t_security],
    )

    tasks = [
        t_brief, t_research, t_design, t_copy,
        t_build, t_qa, t_security, t_package,
    ]
    task_names = [
        "brief", "research", "design", "copy",
        "build", "qa", "security", "package",
    ]

    def on_task_done(output):
        done = len(job.setdefault("completed_tasks", []))
        if done < len(task_names):
            job["completed_tasks"].append(task_names[done])

    return Crew(
        agents=[
            lead_architect, researcher, designer, copywriter,
            tech_integrator, qa_agent, devops_sec, packager,
        ],
        tasks=tasks,
        process=Process.sequential,
        memory=False,
        verbose=False,
        task_callback=on_task_done,
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
                crew = generation_crew(
                    payload["name"], payload["survey"], job
                )
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
        "completed_tasks": job.get("completed_tasks", []),
    }
    if job["status"] == "done":
        resp["html"] = job["html"]
    if job["status"] == "failed":
        resp["error"] = job["error"]
    return resp
