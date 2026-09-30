/* Puffbase support chat - same site-chat backend as
 * theofficialblacksheepco.com's bubble (Chatwoot -> Rasa -> LLM), reached
 * same-origin through the express proxy at /api/chat. Starting the chat opens
 * a right-side panel. Signed-in console users skip the identity gate (the
 * server asserts their session); guests verify name + email/phone once. */
(function () {
  var TOKEN_KEY = "pb_chat_token";
  var SESSION_KEY = "pb_chat_session";
  var WELCOME =
    "Hey — I'm the Puffbase assistant. Questions about deploying, pricing, or how it works? Ask away.";

  var chatToken = localStorage.getItem(TOKEN_KEY) || "";
  var chatSession = localStorage.getItem(SESSION_KEY) || "";
  if (!chatSession) {
    chatSession = (crypto.randomUUID && crypto.randomUUID()) ||
      "s-" + Date.now() + "-" + Math.random().toString(36).slice(2);
    localStorage.setItem(SESSION_KEY, chatSession);
  }

  var history = [];
  var open = false;
  var typing = false;
  var gatePending = "";

  // ── styles ──────────────────────────────────────────────────────────────
  var style = document.createElement("style");
  style.textContent = [
    "#pb-chat-launcher{position:fixed;bottom:20px;right:20px;z-index:9990;display:flex;align-items:center;gap:8px;padding:10px 18px;border-radius:999px;border:1px solid rgba(177,241,80,.5);background:linear-gradient(90deg,var(--purple,#6d36e8),var(--purple-dark,#32146f));color:#fff;font:600 13px/1 system-ui,sans-serif;cursor:pointer;box-shadow:0 10px 30px rgba(55,25,116,.35);transition:transform .2s,opacity .2s}",
    "#pb-chat-launcher:hover{transform:scale(1.05)}",
    "#pb-chat-launcher.pb-hidden{opacity:0;pointer-events:none}",
    "#pb-chat-panel{position:fixed;top:0;right:0;bottom:0;width:380px;max-width:92vw;z-index:9991;display:flex;flex-direction:column;background:#fff;border-left:1px solid var(--line,#e9e4f2);box-shadow:-18px 0 50px rgba(25,21,35,.25);font:13px/1.45 system-ui,sans-serif;transform:translateX(105%);transition:transform .3s ease}",
    "#pb-chat-panel.pb-open{transform:translateX(0)}",
    "#pb-chat-head{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid var(--line,#e9e4f2);background:linear-gradient(90deg,var(--purple,#6d36e8),var(--purple-dark,#32146f));color:#fff}",
    "#pb-chat-head .pb-title{font-weight:700;font-size:13px}",
    "#pb-chat-head .pb-status{font-size:10px;opacity:.85;display:flex;align-items:center;gap:5px}",
    "#pb-chat-head .pb-dot{width:6px;height:6px;border-radius:50%;background:var(--slime,#b1f150);display:inline-block}",
    "#pb-chat-close{background:none;border:none;color:#fff;font-size:16px;cursor:pointer;padding:4px}",
    "#pb-chat-log{flex:1;overflow-y:auto;padding:14px 12px;display:flex;flex-direction:column;gap:10px;background:var(--purple-soft,#faf8ff)}",
    ".pb-msg{max-width:85%;padding:9px 12px;border-radius:16px;font-size:12.5px;white-space:pre-wrap;word-wrap:break-word}",
    ".pb-msg.bot{align-self:flex-start;background:#fff;border:1px solid var(--line,#e9e4f2);color:var(--ink,#191523);border-bottom-left-radius:4px}",
    ".pb-msg.user{align-self:flex-end;background:var(--purple,#6d36e8);color:#fff;border-bottom-right-radius:4px}",
    ".pb-typing{align-self:flex-start;color:var(--muted,#716b7c);font-size:16px;letter-spacing:2px;padding:4px 10px}",
    "#pb-chat-gate{display:flex;flex-direction:column;gap:8px;padding:14px;border-top:1px solid var(--line,#e9e4f2);background:#fff;font-size:12px}",
    "#pb-chat-gate input{width:100%;box-sizing:border-box;padding:8px 12px;border:1px solid var(--line,#e9e4f2);border-radius:12px;font:inherit;background:#fff;color:var(--ink,#191523)}",
    "#pb-chat-gate input:focus{outline:none;border-color:var(--purple,#6d36e8)}",
    "#pb-chat-gate button{padding:8px;border-radius:12px;border:1px solid var(--line,#e9e4f2);background:var(--purple-light,#f2edff);color:var(--purple-dark,#32146f);font-weight:600;cursor:pointer}",
    "#pb-chat-gate button.pb-primary{background:var(--purple,#6d36e8);color:#fff;border:none}",
    "#pb-gate-err{color:#c0392b;font-size:11px}",
    "#pb-chat-inputrow{display:flex;align-items:flex-end;gap:8px;padding:10px 12px;border-top:1px solid var(--line,#e9e4f2);background:#fff}",
    "#pb-chat-input{flex:1;resize:none;padding:8px 12px;border:1px solid var(--line,#e9e4f2);border-radius:16px;font:inherit;font-size:12.5px;background:#fff;color:var(--ink,#191523)}",
    "#pb-chat-input:focus{outline:none;border-color:var(--purple,#6d36e8)}",
    "#pb-chat-send{width:34px;height:34px;border:none;border-radius:50%;background:var(--purple,#6d36e8);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0}",
    "#pb-chat-send:disabled{opacity:.4;cursor:not-allowed}",
    ".pb-hidden{display:none!important}"
  ].join("\n");
  document.head.appendChild(style);

  // ── markup ──────────────────────────────────────────────────────────────
  var launcher = document.createElement("button");
  launcher.id = "pb-chat-launcher";
  launcher.setAttribute("aria-label", "Open chat");
  launcher.innerHTML =
    '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg><span>Chat with us</span>';
  document.body.appendChild(launcher);

  var panel = document.createElement("div");
  panel.id = "pb-chat-panel";
  panel.innerHTML = [
    '<div id="pb-chat-head">',
    '  <div><div class="pb-title">Puffbase Assistant</div>',
    '  <div class="pb-status"><span class="pb-dot"></span>Online</div></div>',
    '  <button id="pb-chat-close" aria-label="Close chat">&times;</button>',
    "</div>",
    '<div id="pb-chat-log"></div>',
    '<div id="pb-chat-gate" class="pb-hidden">',
    '  <p style="margin:0;color:var(--muted,#716b7c)">Before we chat, let me know who I\'m talking to.</p>',
    '  <input id="pb-gate-name" placeholder="Your name" maxlength="80">',
    '  <input id="pb-gate-contact" placeholder="Email or phone number" maxlength="200">',
    '  <button id="pb-gate-start">Continue</button>',
    '  <div id="pb-gate-coderow" class="pb-hidden" style="display:flex;flex-direction:column;gap:8px">',
    '    <input id="pb-gate-code" placeholder="6-digit code" inputmode="numeric" maxlength="8" style="text-align:center;letter-spacing:4px">',
    '    <button id="pb-gate-verify" class="pb-primary">Verify code</button>',
    "  </div>",
    '  <p id="pb-gate-err" class="pb-hidden"></p>',
    "</div>",
    '<div id="pb-chat-inputrow">',
    '  <textarea id="pb-chat-input" rows="1" placeholder="Ask anything..."></textarea>',
    '  <button id="pb-chat-send" aria-label="Send" disabled>&#10148;</button>',
    "</div>"
  ].join("\n");
  document.body.appendChild(panel);

  var log = panel.querySelector("#pb-chat-log");
  var input = panel.querySelector("#pb-chat-input");
  var sendBtn = panel.querySelector("#pb-chat-send");
  var gate = panel.querySelector("#pb-chat-gate");
  var gateName = panel.querySelector("#pb-gate-name");
  var gateContact = panel.querySelector("#pb-gate-contact");
  var gateCode = panel.querySelector("#pb-gate-code");
  var gateCodeRow = panel.querySelector("#pb-gate-coderow");
  var gateErr = panel.querySelector("#pb-gate-err");
  var inputRow = panel.querySelector("#pb-chat-inputrow");

  function addMsg(text, who) {
    var el = document.createElement("div");
    el.className = "pb-msg " + who;
    el.textContent = text;
    log.appendChild(el);
    log.scrollTop = log.scrollHeight;
    return el;
  }

  function setTyping(on) {
    typing = on;
    var t = log.querySelector(".pb-typing");
    if (on && !t) {
      t = document.createElement("div");
      t.className = "pb-typing";
      t.textContent = "...";
      log.appendChild(t);
    } else if (!on && t) {
      t.remove();
    }
    log.scrollTop = log.scrollHeight;
  }

  function showGate(msg) {
    gate.classList.remove("pb-hidden");
    inputRow.classList.add("pb-hidden");
    gateFail(msg);
  }

  function hideGate() {
    gate.classList.add("pb-hidden");
    inputRow.classList.remove("pb-hidden");
    gateFail("");
  }

  function gateFail(msg) {
    gateErr.textContent = msg || "";
    gateErr.classList.toggle("pb-hidden", !msg);
  }

  function storeToken(tok) {
    chatToken = tok;
    localStorage.setItem(TOKEN_KEY, tok);
  }

  function post(path, body) {
    return fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { res: res, data: data };
      });
    });
  }

  function send(text) {
    var msg = (text || "").trim();
    if (!msg || typing) return;
    input.value = "";
    sendBtn.disabled = true;
    addMsg(msg, "user");
    setTyping(true);
    post("/api/chat", {
      message: msg,
      history: history.slice(-6),
      session_id: chatSession,
      chat_token: chatToken || undefined
    }).then(function (r) {
      var data = r.data;
      if (data.chat_token) storeToken(data.chat_token);
      if (r.res.status === 401 && data.gate) {
        chatToken = "";
        localStorage.removeItem(TOKEN_KEY);
        showGate();
        addMsg(data.reply || "I need to know who you are first.", "bot");
        return;
      }
      var reply = data.reply ||
        (r.res.ok ? "..." : "The assistant is unreachable right now - try again in a moment.");
      history.push({ role: "user", content: msg }, { role: "assistant", content: reply });
      addMsg(reply, "bot");
    }).catch(function () {
      addMsg("Couldn't reach the assistant - try again in a moment.", "bot");
    }).finally(function () {
      setTyping(false);
    });
  }

  function gateStart() {
    var name = gateName.value.trim();
    var contact = gateContact.value.trim();
    if (!name) return gateFail("Tell me your name first.");
    if (!contact) return gateFail("An email or phone number is required.");
    gateFail("");
    post("/api/chat/gate/start", {
      name: name,
      contact: contact,
      method: contact.indexOf("@") >= 0 ? "email" : "phone"
    }).then(function (r) {
      var data = r.data;
      if (!r.res.ok) return gateFail(data.error || "Could not verify that - try again.");
      if (data.chat_token) {
        storeToken(data.chat_token);
        hideGate();
        addMsg("Thanks " + name.split(" ")[0] + " — you're verified. What can I help you with?", "bot");
        return;
      }
      gatePending = data.pending;
      gateCodeRow.classList.remove("pb-hidden");
      addMsg("I just emailed a 6-digit code to " + contact + ". Type it below.", "bot");
    }).catch(function () {
      gateFail("Could not reach the verification service - try again in a moment.");
    });
  }

  function gateVerify() {
    var code = gateCode.value.trim();
    if (!gatePending || !code) return gateFail("Enter the code from the email.");
    gateFail("");
    post("/api/chat/gate/verify", { pending: gatePending, code: code }).then(function (r) {
      var data = r.data;
      if (!r.res.ok) return gateFail(data.error || "That code did not work - try again.");
      if (data.chat_token) {
        storeToken(data.chat_token);
        hideGate();
        addMsg("You're verified. What can I help you with?", "bot");
      }
    }).catch(function () {
      gateFail("Could not reach the verification service - try again in a moment.");
    });
  }

  function setOpen(next) {
    open = next;
    panel.classList.toggle("pb-open", open);
    launcher.classList.toggle("pb-hidden", open);
    if (open && log.children.length === 0) {
      addMsg(WELCOME, "bot");
      input.focus();
    }
  }

  launcher.addEventListener("click", function () { setOpen(true); });
  panel.querySelector("#pb-chat-close").addEventListener("click", function () { setOpen(false); });
  sendBtn.addEventListener("click", function () { send(input.value); });
  input.addEventListener("input", function () { sendBtn.disabled = !input.value.trim() || typing; });
  input.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send(input.value);
    }
  });
  panel.querySelector("#pb-gate-start").addEventListener("click", gateStart);
  panel.querySelector("#pb-gate-verify").addEventListener("click", gateVerify);
  gateCode.addEventListener("keydown", function (e) { if (e.key === "Enter") gateVerify(); });
  gateContact.addEventListener("keydown", function (e) { if (e.key === "Enter") gateStart(); });
})();
