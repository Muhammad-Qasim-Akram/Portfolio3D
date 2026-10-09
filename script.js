//PAGE LOADER
const loader = document.getElementById("loader");
window.addEventListener("load", () => {
  setTimeout(() => {
    loader.classList.add("out");
    setTimeout(() => loader.remove(), 1600);
  }, 900);
});

const cur = document.getElementById("cur");
let cx = -200,
  cy = -200;
document.addEventListener("mousemove", (e) => {
  cx = e.clientX;
  cy = e.clientY;
  cur.style.left = cx + "px";
  cur.style.top = cy + "px";
});
document
  .querySelectorAll("a,button,.proj-card,.svc-row,.sk,.stat,.c-link")
  .forEach((el) => {
    el.addEventListener("mouseenter", () => cur.classList.add("big"));
    el.addEventListener("mouseleave", () => cur.classList.remove("big"));
  });
document.querySelectorAll("input,textarea").forEach((el) => {
  el.addEventListener("mouseenter", () => cur.classList.add("txt"));
  el.addEventListener("mouseleave", () => cur.classList.remove("txt"));
});
if ("ontouchstart" in window) cur.style.display = "none";

window.addEventListener(
  "scroll",
  () => {
    document
      .getElementById("navbar")
      .classList.toggle("blur", window.scrollY > 50);
  },
  { passive: true },
);

const navHam = document.getElementById("navHam");
const mobileMenu = document.getElementById("mobileMenu");
navHam.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = mobileMenu.classList.toggle("open");
  navHam.innerHTML = isOpen ? "&#10005;" : "&#9776;";
});

mobileMenu.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", () => {
    mobileMenu.classList.remove("open");
    navHam.innerHTML = "&#9776;";
  });
});

document.addEventListener("click", (e) => {
  if (!mobileMenu.contains(e.target) && e.target !== navHam) {
    mobileMenu.classList.remove("open");
    navHam.innerHTML = "&#9776;";
  }
});

const navAs = document.querySelectorAll(".nav-links a, .nav-mobile-menu a");
window.addEventListener(
  "scroll",
  () => {
    let active = "";
    document.querySelectorAll("section[id], div[id]").forEach((s) => {
      if (window.scrollY >= s.offsetTop - 240) active = s.id;
    });
    navAs.forEach((a) =>
      a.classList.toggle("active", a.getAttribute("href") === "#" + active),
    );
  },
  { passive: true },
);

const io = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        io.unobserve(e.target);
      }
    });
  },
  { threshold: 0.07, rootMargin: "0px 0px -24px 0px" },
);
document.querySelectorAll(".sr,.sr-l,.sr-r").forEach((el) => io.observe(el));


const flipCard = document.getElementById("flipCard");
const heroWrap = document.querySelector(".hero-photo-wrap");

let rotation = 0;
let touchStartY = 0;

function setFlip(deg) {
  rotation = Math.min(180, Math.max(0, deg));
  flipCard.style.transform = `rotateY(${rotation}deg)`;
}

function isHeroCentered() {
  const rect = heroWrap.getBoundingClientRect();
  return (
    rect.top < window.innerHeight / 2 && rect.bottom > window.innerHeight / 2
  );
}

function lockScroll() {
  document.body.style.overflow = "hidden";
  document.body.style.touchAction = "none";
}

function unlockScroll() {
  document.body.style.overflow = "";
  document.body.style.touchAction = "";
}

// ── DESKTOP: wheel ──
window.addEventListener(
  "wheel",
  (e) => {
    if (!isHeroCentered()) return;

    if (e.deltaY > 0 && rotation < 180) {
      e.preventDefault();
      setFlip(rotation + 12);
      if (rotation >= 180) unlockScroll();
      return;
    }

    if (e.deltaY < 0 && rotation > 0) {
      e.preventDefault();
      setFlip(rotation - 12);
      return;
    }
  },
  { passive: false },
);

// MOBILE
document.addEventListener(
  "touchstart",
  (e) => {
    touchStartY = e.touches[0].clientY;
  },
  { passive: true },
);

document.addEventListener(
  "touchmove",
  (e) => {
    if (!isHeroCentered()) return;

    const deltaY = touchStartY - e.touches[0].clientY;

    if (deltaY > 3 && rotation < 180) {
      lockScroll(); 
      e.preventDefault();
      setFlip(rotation + 3);
      touchStartY = e.touches[0].clientY;

      if (rotation >= 180) {
        unlockScroll(); 
      }
      return;
    }

    
    if (deltaY < -3 && rotation > 0) {
      lockScroll();
      e.preventDefault();
      setFlip(rotation - 3);
      touchStartY = e.touches[0].clientY;

      if (rotation <= 0) {
        unlockScroll();
      }
      return;
    }

    unlockScroll();
  },
  { passive: false },
);

document.addEventListener("touchend", () => {
  touchStartY = 0;
  unlockScroll();
});

emailjs.init("yCgwIWXoWe_klsqNy");

function handleSubmit() {
  var name = document.getElementById("from_name").value;
  var email = document.getElementById("from_email").value;
  var message = document.getElementById("message").value;
  var btn = document.getElementById("sendBtn");
  var btnText = document.getElementById("btnText");
  var bar = document.getElementById("btnBar");

  if (!name || !email || !message) return;

  btn.disabled = true;
  btnText.textContent = "Sending...";
  bar.classList.remove("sending");
  void bar.offsetWidth;
  bar.classList.add("sending");

  emailjs
    .send("portfolio_contack", "template_mkyegym", {
      from_name: name,
      from_email: email,
      message: message,
    })
    .then(function () {
      bar.style.transition = "none";
      bar.style.width = "100%";
      btn.classList.add("sent");
      btnText.textContent = "Sent!";

      setTimeout(function () {
        btnText.textContent = "Send Message →";
        bar.style.width = "0%";
        btn.classList.remove("sent");
        btn.disabled = false;

        document.getElementById("from_name").value = "";
        document.getElementById("from_email").value = "";
        document.getElementById("message").value = "";
      }, 2000);
    })
    .catch(function () {
      bar.style.transition = "none";
      bar.style.width = "0%";
      btnText.textContent = "Send Message →";
      btn.disabled = false;
    });
}

const CHARS = 'z0156789!@#$§]⌈⟫※¥↨▩▭▤∄⋿∑:)%&~<>/|}{[]';


function scrambleText(el, finalText, duration = 750) {
  if (!finalText || !finalText.trim()) return;
  const len = finalText.length;
  const frameDuration = 30;
  const totalFrames = Math.round(duration / frameDuration);
  let frame = 0;
  if (el._scrambleInterval) clearInterval(el._scrambleInterval);
  el._scrambleInterval = setInterval(() => {
    el.textContent = finalText
      .split('')
      .map((char, i) => {
        if (char === ' ') return ' ';
        if (i < Math.floor((frame / totalFrames) * len)) return char;
        return CHARS[Math.floor(Math.random() * CHARS.length)];
      })
      .join('');
    frame++;
    if (frame > totalFrames) {
      el.textContent = finalText;
      clearInterval(el._scrambleInterval);
      el._scrambleInterval = null;
    }
  }, frameDuration);
}

function scrambleTextWithBR(el, duration = 800) {
  const segments = [];
  let current = '';
  el.childNodes.forEach(node => {
    if (node.nodeType === Node.TEXT_NODE) {
      current += node.textContent;
    } else if (node.nodeName === 'BR') {
      segments.push(current);
      segments.push(null);
      current = '';
    }
  });
  segments.push(current);
  const fullText = segments.filter(s => s !== null).join('');
  if (!fullText.trim()) return;
  const len = fullText.length;
  const frameDuration = 30;
  const totalFrames = Math.round(duration / frameDuration);
  let frame = 0;
  if (el._scrambleInterval) clearInterval(el._scrambleInterval);
  el._scrambleInterval = setInterval(() => {
    const progress = Math.floor((frame / totalFrames) * len);
    let charIdx = 0;
    const html = segments.map(seg => {
      if (seg === null) return '<br>';
      return seg.split('').map(char => {
        if (char === ' ') { charIdx++; return ' '; }
        const resolved = charIdx < progress;
        charIdx++;
        return resolved ? char : CHARS[Math.floor(Math.random() * CHARS.length)];
      }).join('');
    }).join('');
    el.innerHTML = html;
    frame++;
    if (frame > totalFrames) {
      el.innerHTML = segments.map(s => s === null ? '<br>' : s).join('');
      clearInterval(el._scrambleInterval);
      el._scrambleInterval = null;
    }
  }, frameDuration);
}

const SKIP_TAGS = new Set([
  'IMG','SVG','svg','I','INPUT','TEXTAREA','SCRIPT',
  'STYLE','CANVAS','VIDEO','AUDIO','PICTURE','FIGURE','HR'
]);

function isLeaf(el) {
  return el.children.length === 0 && el.textContent.trim().length > 0;
}

function isBRLeaf(el) {
  if (el.children.length === 0) return false;
  return [...el.children].every(c => c.tagName === 'BR') && el.textContent.trim().length > 0;
}

function collectSafeLeaves(root) {
  const results = [];
  function walk(node) {
    if (!node || SKIP_TAGS.has(node.tagName)) return;
    if (isLeaf(node) || isBRLeaf(node)) {
      results.push(node);
    } else {
      for (const child of node.children) walk(child);
    }
  }
  walk(root);
  return results;
}

function scrambleEl(el, duration) {
  if (isBRLeaf(el)) {
    scrambleTextWithBR(el, duration);
  } else {
    scrambleText(el, el.textContent, duration);
  }
}

(function () {
  document.querySelectorAll('.loader-word').forEach((el) => {
    if (el.textContent.toLowerCase().includes('full stack') || el.textContent.toLowerCase().includes('ai engineer')) return;
    const originalHTML = el.innerHTML;
    const hasBreak = el.querySelector('br');
    if (hasBreak) {
      el.childNodes.forEach(n => { if (n.nodeType === Node.TEXT_NODE) n.textContent = ''; });
    } else {
      el.textContent = '';
    }
    const delayMs = parseFloat(el.style.animationDelay || '0') * 1000;
    setTimeout(() => {
      if (hasBreak) {
        scrambleTextWithBR(el, 550);
      } else {
        const plainText = originalHTML.replace(/<[^>]+>/g, ' ').trim();
        scrambleText(el, plainText, 550);
      }
    }, delayMs + 200);
  });
})();

(function () {
  const seen = new WeakSet();

  function go(el, delay, dur) {
    if (!el || seen.has(el)) return;
    if (!isLeaf(el) && !isBRLeaf(el)) return;
    seen.add(el);
    setTimeout(() => scrambleEl(el, dur || 750), delay);
  }

  function runHeroScramble() {
    document.querySelectorAll('.hero-hey .word').forEach((el, i) => {
      go(el, 200 + i * 150);
    });

    go(document.querySelector('.hero-tagline'), 500);
    go(document.querySelector('.scroll-hint span:last-child'), 700);

    const bio = document.querySelector('.hero-bio');
    if (bio) {
      collectSafeLeaves(bio).forEach((el, i) => {
        go(el, 600 + i * 100);
      });
    }

    document.querySelectorAll('.hero-cta a').forEach((el, i) => {
      go(el, 800 + i * 120);
    });

    document.querySelectorAll('#navLinks a, .nav-mobile-menu a').forEach((el, i) => {
      go(el, 100 + i * 80, 500);
    });

    go(document.querySelector('.btn-nav'), 300, 500);
    go(document.querySelector('.nav-name'), 50, 500);
  }

  // Run immediately — no waiting for load event.
  // Wrapped in a short timeout so the DOM is painted first.
  setTimeout(runHeroScramble, 2600);
})();

(function () {
  const SECTION_SELECTORS = [
    '#stack',    '.stack',
    '#projects', '.projects',
    '#services', '.services',
    '#about',    '.about',
    '#contact',  '.contact',
  ].join(',');

  const seen = new WeakSet();

  const scrambleIO = new IntersectionObserver(
    (entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        const el = e.target;
        if ((isLeaf(el) || isBRLeaf(el))) {
          scrambleEl(el, 800);
        } else {
          collectSafeLeaves(el).forEach((child, idx) => {
            if (seen.has(child)) return;
            seen.add(child);
            setTimeout(() => scrambleEl(child, 780), idx * 55);
          });
        }
        scrambleIO.unobserve(el);
      });
    },
    { threshold: 0.08, rootMargin: '0px 0px -15px 0px' }
  );

  document.querySelectorAll(SECTION_SELECTORS).forEach((section) => {
    if (!seen.has(section)) {
      scrambleIO.observe(section);
      seen.add(section);
    }
    collectSafeLeaves(section).forEach((el) => {
      if (!seen.has(el)) {
        scrambleIO.observe(el);
        seen.add(el);
      }
    });
  });

  document.querySelectorAll(
    '.sr h1,.sr h2,.sr h3,.sr h4,.sr h5,.sr h6,.sr p,.sr span,.sr a,.sr li,' +
    '.sr-l h1,.sr-l h2,.sr-l h3,.sr-l h4,.sr-l p,.sr-l span,.sr-l a,' +
    '.sr-r h1,.sr-r h2,.sr-r h3,.sr-r h4,.sr-r p,.sr-r span,.sr-r a'
  ).forEach((el) => {
    if (!seen.has(el) && (isLeaf(el) || isBRLeaf(el))) {
      scrambleIO.observe(el);
      seen.add(el);
    }
  });
})();

// ===== Chatbot script start =====
const BOT_DATA = {
  name: "Muhammad Qasim Akram",
  role: "Full Stack Developer & AI Engineer",
  intro: "Hey, I'm Qasim — a full stack developer and AI engineer from Pakistan. I build useful products across React frontends, ASP.NET, Node.js and Django backends, and AI systems. I'm currently building SmartSpend, an expense-tracking app backend with ASP.NET and PostgreSQL.",
  stack: {
    frontend: ["React.js", "JavaScript", "TypeScript", "HTML", "CSS"],
    backend: ["ASP.NET", "Node.js", "Django", "Python", "REST APIs", "WebSockets", "PostgreSQL", "MongoDB", "Redis"],
    ai: ["YOLOv8", "OpenCV", "Computer Vision", "LLM APIs", "LLaMA 3"],
    tools: ["Git & GitHub", "Azure", "Vercel", "Netlify", "GitHub Actions", "Railway"]
  },
  projects: [
    {
      name: "SmartSpend — Expense Tracking Backend (In Progress)",
      description: "The backend for an expense-tracking app with categorized spending and budgets, built with ASP.NET and PostgreSQL.",
      link: "https://github.com/Muhammad-Qasim-Akram/Smartspend.Api"
    },
    {
      name: "ChatRoom — Real-Time Chat App",
      description: "A real-time room-based chat app built with Django Channels, WebSockets, and Redis.",
      link: "https://chat-room-two-pi.vercel.app/"
    },
    {
      name: "DevChat — AI Chat Assistant",
      description: "An LLM-powered developer assistant with context memory and streaming, using LLaMA 3 via Ollama.",
      link: "https://dev-chat-gilt.vercel.app/"
    },
    {
      name: "EyeSpy — Blind Assistance System",
      description: "Real-time object detection and audio feedback using YOLOv8 on a live camera.",
      link: "https://github.com/Muhammad-Qasim-Akram/EyeSpy"
    },
    {
      name: "YOUROWN — E-Commerce Platform",
      description: "A storefront with a cart, JWT authentication, order tracking, Azure hosting, and GitHub Actions CI/CD.",
      link: "https://qasim-ecommerce.azurewebsites.net/"
    },
    {
      name: "Minimal Analysis — AI Stock Predictor",
      description: "Stock analysis with live market data and AI-generated insights.",
      link: "https://github.com/Muhammad-Qasim-Akram/Stock-Price-Prediction"
    }
  ],
  education: "TODO: Add your education details.",
  certs: ["TODO: Add certifications, or replace this with an empty array if you have none."],
  contact: {
    email: "qasimakram46@hotmail.com",
    github: "https://github.com/Muhammad-Qasim-Akram",
    linkedin: "https://linkedin.com/in/qasimakram"
  },
  resumeUrl: "img/Muhammad_Qasim_Akram_Resume.pdf",
  availability: "Open to collaborations, freelance work, and interesting opportunities."
};

(() => {
  const panel = document.getElementById("qbot-panel");
  const launcher = document.getElementById("qbot-launcher");
  const closeButton = document.getElementById("qbot-close");
  const messages = document.getElementById("qbot-messages");
  const chips = document.getElementById("qbot-chips");
  const suggestions = document.getElementById("qbot-suggestions");
  const form = document.getElementById("qbot-form");
  const input = document.getElementById("qbot-input");
  const displayName = BOT_DATA.name.trim().split(/\s+/).slice(-2).join(" ");
  document.getElementById("qbot-title").textContent = `${displayName}'s assistant`;
  const commandNames = [
    "/help", "/intro", "/stack", "/projects", "/education",
    "/certs", "/contact", "/resume", "/hire", "/clear", "/coffee"
  ];
  const quickCommands = ["/intro", "/stack", "/projects", "/contact"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let hasOpened = false;
  let replyId = 0;

  function addMessage(kind, content) {
    const message = document.createElement("div");
    message.className = `qbot-message qbot-${kind}`;
    if (typeof content === "string") {
      message.textContent = content;
    } else {
      content.forEach((part) => {
        if (part.url) {
          const link = document.createElement("a");
          link.className = "qbot-link";
          link.href = part.url;
          link.target = "_blank";
          link.rel = "noopener noreferrer";
          link.textContent = part.text;
          message.append(link);
        } else {
          message.append(document.createTextNode(part.text));
        }
      });
    }
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function setChips(commands) {
    chips.replaceChildren();
    commands.forEach((command) => {
      const chip = document.createElement("button");
      chip.className = "qbot-chip";
      chip.type = "button";
      chip.textContent = command;
      chip.addEventListener("click", () => runCommand(command));
      chips.append(chip);
    });
  }

  function showSuggestions(value) {
    const trimmed = value.trim().toLowerCase();
    if (!trimmed.startsWith("/")) {
      suggestions.hidden = true;
      suggestions.replaceChildren();
      return;
    }
    const matches = commandNames.filter((command) => command.startsWith(trimmed));
    suggestions.replaceChildren();
    matches.forEach((command) => {
      const option = document.createElement("button");
      option.className = "qbot-suggestion";
      option.type = "button";
      option.setAttribute("role", "option");
      option.textContent = command;
      option.addEventListener("click", () => runCommand(command));
      suggestions.append(option);
    });
    suggestions.hidden = matches.length === 0;
  }

  function getReply(command) {
    switch (command) {
      case "/help":
        return {
          text: "Try /intro, /stack, /projects, /education, /certs, /contact, /resume, or /hire. You can also ask me in plain English.",
          chips: quickCommands
        };
      case "/intro":
        return { text: BOT_DATA.intro, typewriter: true, chips: quickCommands };
      case "/stack":
        return {
          parts: [
            { text: "Here's what I work with:\nFrontend: " + BOT_DATA.stack.frontend.join(", ") +
              "\nBackend: " + BOT_DATA.stack.backend.join(", ") +
              "\nAI: " + BOT_DATA.stack.ai.join(", ") +
              "\nTools: " + BOT_DATA.stack.tools.join(", ") }
          ],
          chips: ["/projects", "/intro", "/contact"]
        };
      case "/projects":
        return {
          parts: BOT_DATA.projects.flatMap((project, index) => [
            { text: `${index ? "\n\n" : ""}${project.name}: ${project.description} ` },
            { text: "View project ↗", url: project.link }
          ]),
          chips: ["/stack", "/contact", "/hire"]
        };
      case "/education":
        return { text: BOT_DATA.education, chips: ["/certs", "/contact"] };
      case "/certs":
        return {
          text: BOT_DATA.certs.length ? BOT_DATA.certs.join("\n") : "I haven't listed any certifications yet.",
          chips: ["/education", "/stack"]
        };
      case "/contact":
        return {
          parts: [
            { text: "You can reach me at " },
            { text: BOT_DATA.contact.email, url: `mailto:${BOT_DATA.contact.email}` },
            { text: ", or find me on " },
            { text: "GitHub", url: BOT_DATA.contact.github },
            { text: " and " },
            { text: "LinkedIn", url: BOT_DATA.contact.linkedin },
            { text: "." }
          ],
          chips: ["/hire", "/projects", "/resume"]
        };
      case "/resume":
        return {
          parts: [
            { text: "Here's my " },
            { text: "resume ↗", url: BOT_DATA.resumeUrl },
            { text: ". Feel free to get in touch if you'd like to talk." }
          ],
          chips: ["/contact", "/hire"]
        };
      case "/hire":
        return {
          parts: [
            { text: `${BOT_DATA.availability} Email me at ` },
            { text: BOT_DATA.contact.email, url: `mailto:${BOT_DATA.contact.email}` },
            { text: " and let's talk." }
          ],
          chips: ["/projects", "/resume", "/contact"]
        };
      case "/coffee":
        return { text: "Good idea. I’ll bring the code; you bring the coffee. What are we building?", chips: ["/projects", "/hire"] };
      default:
        return null;
    }
  }

  function runCommand(rawCommand) {
    const command = rawCommand.trim().toLowerCase()
      .replace(/\s+/g, " ")
      .replace(/^\/\s*/, "/");
    input.value = "";
    showSuggestions("");
    if (command === "/clear") {
      replyId++;
      messages.replaceChildren();
      setChips(quickCommands);
      showBotReply({
        text: "All cleared. What would you like to know?",
        chips: quickCommands
      });
      return;
    }
    const reply = getReply(command);
    if (!reply) {
      showBotReply({
        text: "I’m not sure about that one. Try /help and I’ll point you in the right direction.",
        chips: quickCommands
      });
      return;
    }
    showBotReply(reply);
  }

  function showBotReply(reply) {
    const currentReply = ++replyId;
    messages.querySelectorAll(".qbot-typing").forEach((indicator) => indicator.remove());
    chips.replaceChildren();
    const typing = document.createElement("div");
    typing.className = "qbot-message qbot-bot qbot-typing";
    typing.setAttribute("aria-label", "Assistant is typing");
    typing.innerHTML = '<span></span><span></span><span></span>';
    messages.append(typing);
    messages.scrollTop = messages.scrollHeight;
    const delay = 600 + Math.floor(Math.random() * 301);

    window.setTimeout(() => {
      if (currentReply !== replyId) return;
      typing.remove();
      const content = reply.parts || reply.text;
      const message = addMessage("bot", content);
      if (reply.typewriter && !reduceMotion.matches) {
        const fullText = reply.text;
        message.textContent = "";
        let index = 0;
        const step = () => {
          if (currentReply !== replyId) return;
          message.textContent = fullText.slice(0, index++);
          messages.scrollTop = messages.scrollHeight;
          if (index <= fullText.length) window.setTimeout(step, 16);
          else setChips(reply.chips);
        };
        step();
      } else {
        setChips(reply.chips);
      }
    }, delay);
  }

  function normalizePlainText(value) {
    const text = value.toLowerCase();
    if (/\b(project|work|portfolio)\b/.test(text)) return "/projects";
    if (/\b(skill|stack|tech|technology|technologies)\b/.test(text)) return "/stack";
    if (/\b(contact|email|github|linkedin)\b/.test(text)) return "/contact";
    if (/\b(hire|hiring|job|freelance|available)\b/.test(text)) return "/hire";
    if (/\b(education|study|degree|university)\b/.test(text)) return "/education";
    if (/\b(resume|cv)\b/.test(text)) return "/resume";
    if (/\b(hello|hi|hey)\b/.test(text)) return "/intro";
    return null;
  }

  function submitMessage(value) {
    const text = value.trim();
    if (!text) return;
    addMessage("user", text);
    if (text.startsWith("/")) {
      runCommand(text);
      return;
    }
    const command = normalizePlainText(text);
    if (command) {
      runCommand(command);
    } else {
      showBotReply({
        text: "I’m not sure I have that detail, but I’m happy to help. Try /help to see what I can tell you.",
        chips: quickCommands
      });
    }
  }

  function openPanel() {
    panel.hidden = false;
    panel.setAttribute("aria-hidden", "false");
    launcher.setAttribute("aria-expanded", "true");
    launcher.classList.add("qbot-clicked");
    window.requestAnimationFrame(() => panel.classList.add("qbot-open"));
    window.setTimeout(() => input.focus(), reduceMotion.matches ? 0 : 180);
    if (!hasOpened) {
      hasOpened = true;
      setChips(quickCommands);
      showBotReply({
        text: `Hey! I'm here to tell you about ${displayName}'s work, skills, and how to get in touch.`,
        chips: quickCommands
      });
    }
  }

  function closePanel() {
    panel.classList.remove("qbot-open");
    panel.hidden = true;
    panel.setAttribute("aria-hidden", "true");
    launcher.setAttribute("aria-expanded", "false");
    launcher.focus();
  }

  launcher.addEventListener("click", () => {
    if (panel.hidden) openPanel();
    else closePanel();
  });
  closeButton.addEventListener("click", closePanel);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    const value = input.value;
    input.value = "";
    showSuggestions("");
    submitMessage(value);
  });
  input.addEventListener("input", () => showSuggestions(input.value));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !panel.hidden) closePanel();
  });
})();

// ===== Chatbot script end =====
