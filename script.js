//PAGE LOADER
const loader = document.getElementById("loader");
let loaderStarted = false;

function finishPageLoader() {
  const heroName = document.querySelector(".hero-hey .word-name");
  if (shouldScrambleText() && heroName) {
    scrambleText(heroName, heroName.textContent, 500);
  }
  document.body.classList.add("qpass2-ready");
  loader.remove();
}

function startPageLoaderExit() {
  if (loaderStarted || !loader) return;
  loaderStarted = true;
  const handleLoaderExit = (event) => {
    if (event.target !== loader || event.animationName !== "loaderOut") return;
    loader.removeEventListener("animationend", handleLoaderExit);
    finishPageLoader();
  };
  loader.addEventListener(
    "animationend",
    handleLoaderExit,
  );
  loader.classList.add("out");
}

window.addEventListener("load", () => {
  window.setTimeout(startPageLoaderExit, 900);
}, { once: true });
if (document.readyState === "complete") {
  window.setTimeout(startPageLoaderExit, 900);
}

const cur = document.getElementById("cur");
document
  .querySelectorAll("a,button,.proj-card,.svc-row,.sk,.stat,.c-link")
  .forEach((el) => {
    el.addEventListener("mouseenter", () => {
      if (el.closest(".nav-links")) {
        cur.classList.add("nav-hover");
        return;
      }
      cur.classList.add("big");
    });
    el.addEventListener("mouseleave", () => {
      cur.classList.remove("big", "nav-hover");
    });
  });
document.querySelectorAll("input,textarea").forEach((el) => {
  el.addEventListener("mouseenter", () => cur.classList.add("txt"));
  el.addEventListener("mouseleave", () => cur.classList.remove("txt"));
});
if ("ontouchstart" in window) cur.style.display = "none";

const scrollTasks = new Set();
let scrollFrame = 0;

function scheduleScrollWork() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    scrollTasks.forEach((task) => task());
  });
}

window.addEventListener("scroll", scheduleScrollWork, { passive: true });
window.addEventListener("resize", scheduleScrollWork, { passive: true });

function updateNavbarScroll() {
  const scrolled = window.scrollY > 50;
  document.getElementById("navbar").classList.toggle("blur", scrolled);
  document.getElementById("navbar").classList.toggle("scrolled", scrolled);
}
scrollTasks.add(updateNavbarScroll);
updateNavbarScroll();

const navHam = document.getElementById("navHam");
const mobileMenu = document.getElementById("mobileMenu");

function closeMobileMenu() {
  mobileMenu.classList.remove("open");
  mobileMenu.setAttribute("aria-hidden", "true");
  mobileMenu.inert = true;
  navHam.setAttribute("aria-expanded", "false");
  navHam.setAttribute("aria-label", "Open menu");
  navHam.innerHTML = "&#9776;";
}

navHam.addEventListener("click", (e) => {
  e.stopPropagation();
  const isOpen = mobileMenu.classList.toggle("open");
  mobileMenu.setAttribute("aria-hidden", String(!isOpen));
  mobileMenu.inert = !isOpen;
  navHam.setAttribute("aria-expanded", String(isOpen));
  navHam.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  navHam.innerHTML = isOpen ? "&#10005;" : "&#9776;";
});

mobileMenu.querySelectorAll("a").forEach((a) => {
  a.addEventListener("click", closeMobileMenu);
});

document.addEventListener("click", (e) => {
  if (!mobileMenu.contains(e.target) && e.target !== navHam) {
    closeMobileMenu();
  }
});

const navAs = document.querySelectorAll(".nav-links a, .nav-mobile-menu a");
const navSectionIds = new Set(
  Array.from(navAs, (link) => link.getAttribute("href").slice(1)),
);
const navLinks = document.getElementById("navLinks");
let activeNavHref = "";
let activeSectionId = "";
let navSectionPositions = [];

function refreshNavSectionPositions() {
  navSectionPositions = Array.from(
    document.querySelectorAll("section[id], .section[id]"),
  )
    .filter((section) => navSectionIds.has(section.id))
    .map((section) => ({ id: section.id, top: section.offsetTop }))
    .sort((first, second) => first.top - second.top);
}

function updateNavIndicator() {
  const activeLink = navLinks.querySelector("a.active");
  if (!activeLink) {
    navLinks.classList.remove("has-active");
    activeNavHref = "";
    return;
  }
  navLinks.classList.add("has-active");
  if (activeLink.getAttribute("href") === activeNavHref) return;
  activeNavHref = activeLink.getAttribute("href");
  navLinks.style.setProperty("--indicator-x", `${activeLink.offsetLeft}px`);
  navLinks.style.setProperty("--indicator-width", `${activeLink.offsetWidth}px`);
}

function updateActiveNavigation() {
  let active = "";
  const currentPosition = window.scrollY + 240;
  for (const section of navSectionPositions) {
    if (currentPosition < section.top) break;
    active = section.id;
  }
  if (active === activeSectionId) return;
  activeSectionId = active;
  navAs.forEach((link) =>
    link.classList.toggle("active", link.getAttribute("href") === `#${active}`),
  );
  updateNavIndicator();
}

scrollTasks.add(updateActiveNavigation);
refreshNavSectionPositions();
window.addEventListener("load", () => {
  refreshNavSectionPositions();
  activeNavHref = "";
  activeSectionId = "";
  scheduleScrollWork();
}, { once: true });
window.addEventListener("resize", () => {
  refreshNavSectionPositions();
  activeNavHref = "";
  activeSectionId = "";
  scheduleScrollWork();
}, { passive: true });
updateActiveNavigation();

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

function shouldScrambleText() {
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

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

(function () {
  document.querySelectorAll('.loader-word, .loader-progress').forEach((el) => {
    if (!shouldScrambleText()) return;
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
  const tagline = document.querySelector(".hero-tagline");
  const text = tagline.textContent.trim().split(/\s+/);
  tagline.replaceChildren();
  text.forEach((word, index) => {
    if (index) tagline.append(document.createTextNode(" "));
    const mask = document.createElement("span");
    mask.className = "hero-tagline-word-mask";
    const wordSpan = document.createElement("span");
    wordSpan.className = "hero-tagline-word";
    wordSpan.style.setProperty("--hero-word-delay", `${index * 42}ms`);
    wordSpan.textContent = word;
    mask.append(wordSpan);
    tagline.append(mask);
  });
})();

// ===== Chatbot script start =====
const BOT_DATA = {
  name: "Muhammad Qasim Akram",
  role: "Full Stack Developer & AI Engineer",
  intro: "Hey, I'm Qasim, a full stack developer from Pakistan. I build useful products across React frontends, ASP.NET, Node.js and Django backends, computer vision, and language-model tools. I'm currently building SmartSpend, an expense-tracking app backend with ASP.NET and PostgreSQL.",
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
      name: "DevChat — Developer Chat Assistant",
      description: "A language-model developer assistant with context memory and streaming, using LLaMA 3 via Ollama.",
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
      name: "Minimal Analysis — Stock Predictor",
      description: "Stock analysis with live market data and generated insights.",
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
  const botTitle = document.getElementById("qbot-title");
  botTitle.textContent = "Ask Qasim";
  const commandNames = [
    "/help", "/intro", "/stack", "/projects", "/education",
    "/certs", "/contact", "/resume", "/hire", "/clear", "/coffee"
  ];
  const quickCommands = ["/intro", "/stack", "/projects", "/contact"];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let hasOpened = false;
  let titleScrambled = false;
  let replyId = 0;

  function addMessage(kind, content) {
    const message = document.createElement("div");
    message.className = `qbot-message qbot-${kind}`;
    if (typeof content === "string") {
      if (kind === "bot" && shouldScrambleText()) {
        appendScrambledText(message, content);
      } else {
        message.textContent = content;
      }
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
          if (kind === "bot" && shouldScrambleText()) {
            appendScrambledText(message, part.text);
          } else {
            message.append(document.createTextNode(part.text));
          }
        }
      });
    }
    messages.append(message);
    messages.scrollTop = messages.scrollHeight;
    return message;
  }

  function appendScrambledText(parent, text) {
    const tokens = text.match(/\s+|[^\s]+/g) || [];
    const wordSpans = [];
    const visualText = document.createElement("span");
    visualText.className = "qbot-scramble-visual";
    visualText.setAttribute("aria-hidden", "true");
    tokens.forEach((token) => {
      if (/^\s+$/.test(token)) {
        visualText.append(document.createTextNode(token));
        return;
      }
      const word = document.createElement("span");
      word.className = "qbot-scramble-word";
      word.dataset.finalText = token;
      word.textContent = token.replace(/[^\s]/g, () =>
        CHARS[Math.floor(Math.random() * CHARS.length)],
      );
      visualText.append(word);
      wordSpans.push(word);
    });
    parent.append(visualText);
    const accessibleText = document.createElement("span");
    accessibleText.className = "qbot-sr-only";
    accessibleText.textContent = text;
    parent.append(accessibleText);

    const interval = wordSpans.length
      ? Math.min(500, Math.max(1, Math.floor(500 / wordSpans.length)))
      : 0;
    wordSpans.forEach((word, index) => {
      window.setTimeout(() => {
        word.textContent = word.dataset.finalText;
      }, interval * index);
    });
  }

  function scrambleBotTitle() {
    if (!shouldScrambleText()) return;
    const finalText = botTitle.textContent;
    let frame = 0;
    const totalFrames = 10;
    const timer = window.setInterval(() => {
      const resolvedWords = Math.floor((frame / totalFrames) * 2);
      botTitle.textContent = ["Ask", "Qasim"]
        .map((word, index) => index < resolvedWords
          ? word
          : word.replace(/[^\s]/g, () => CHARS[Math.floor(Math.random() * CHARS.length)]))
        .join(" ");
      frame += 1;
      if (frame > totalFrames) {
        window.clearInterval(timer);
        botTitle.textContent = finalText;
      }
    }, 50);
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
          text: "I can tell you about my work, skills, projects, education, and contact details. Try /intro, /stack, /projects, /education, /certs, /contact, /resume, or /hire.",
          chips: quickCommands
        };
      case "/intro":
        return { text: BOT_DATA.intro, chips: quickCommands };
      case "/stack":
        return {
          parts: [
            { text: "Here's what I work with:\nFrontend: " + BOT_DATA.stack.frontend.join(", ") +
              "\nBackend: " + BOT_DATA.stack.backend.join(", ") +
              "\nComputer vision & language tools: " + BOT_DATA.stack.ai.join(", ") +
              "\nTools: " + BOT_DATA.stack.tools.join(", ") }
          ],
          chips: ["/projects", "/intro", "/contact"]
        };
      case "/projects":
        return {
          parts: BOT_DATA.projects.flatMap((project, index) => [
            { text: `${index ? "\n\n" : "Here are a few things I've built:\n"}${project.name}: ${project.description} ` },
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
            { text: "Email me at " },
            { text: BOT_DATA.contact.email, url: `mailto:${BOT_DATA.contact.email}` },
            { text: ", or find my work on " },
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
        text: "I cleared the chat. What would you like to know?",
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
      setChips(reply.chips);
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
    if (!titleScrambled) {
      titleScrambled = true;
      scrambleBotTitle();
    }
    if (!hasOpened) {
      hasOpened = true;
      setChips(quickCommands);
      showBotReply({
        text: "Hey, I'm Qasim. Ask me about my work, projects, or how to get in touch.",
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

// ===== Pass 1: Glass pointer and ambient lifecycle start =====
(() => {
  const backdrop = document.getElementById("ambientBackdrop");
  const canUsePointerGlow =
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let backdropIsVisible = false;
  let pointerFrame = 0;
  let pointerTarget = null;
  let magneticTarget = null;
  let tiltTarget = null;
  let previousMagneticTarget = null;
  let previousTiltTarget = null;
  let pointerX = 0;
  let pointerY = 0;

  function updateBackdropState() {
    backdrop.classList.toggle(
      "is-paused",
      document.hidden || !backdropIsVisible,
    );
  }

  const backdropObserver = new IntersectionObserver(([entry]) => {
    backdropIsVisible = entry.isIntersecting;
    backdrop.classList.toggle("is-visible", backdropIsVisible);
    updateBackdropState();
  });
  backdropObserver.observe(backdrop);

  document.addEventListener("visibilitychange", updateBackdropState, {
    passive: true,
  });

  if (canUsePointerGlow) {
    document.addEventListener(
      "pointermove",
      (event) => {
        const target =
          event.target instanceof Element
            ? event.target.closest(".glass, .qbot-launcher")
            : null;
        magneticTarget =
          event.target instanceof Element ? event.target.closest(".magnetic") : null;
        tiltTarget =
          event.target instanceof Element ? event.target.closest(".proj-card") : null;
        if (previousMagneticTarget && previousMagneticTarget !== magneticTarget) {
          previousMagneticTarget.style.setProperty("--mag-x", "0px");
          previousMagneticTarget.style.setProperty("--mag-y", "0px");
        }
        if (previousTiltTarget && previousTiltTarget !== tiltTarget) {
          previousTiltTarget.style.setProperty("--qpass3-tilt-x", "0deg");
          previousTiltTarget.style.setProperty("--qpass3-tilt-y", "0deg");
        }
        previousMagneticTarget = magneticTarget;
        previousTiltTarget = tiltTarget;
        pointerTarget = target;
        pointerX = event.clientX;
        pointerY = event.clientY;
        if (pointerFrame) return;

        pointerFrame = window.requestAnimationFrame(() => {
          pointerFrame = 0;
          cur.style.setProperty("--cursor-x", `${pointerX}px`);
          cur.style.setProperty("--cursor-y", `${pointerY}px`);
          if (pointerTarget && pointerTarget.isConnected) {
            const bounds = pointerTarget.getBoundingClientRect();
            const x = bounds.width ? ((pointerX - bounds.left) / bounds.width) * 100 : 50;
            const y = bounds.height ? ((pointerY - bounds.top) / bounds.height) * 100 : 50;
            pointerTarget.style.setProperty("--mx", `${x}%`);
            pointerTarget.style.setProperty("--my", `${y}%`);
          }
          if (magneticTarget && magneticTarget.isConnected) {
            const bounds = magneticTarget.getBoundingClientRect();
            const x = Math.max(-8, Math.min(8, (pointerX - bounds.left - bounds.width / 2) * 0.12));
            const y = Math.max(-8, Math.min(8, (pointerY - bounds.top - bounds.height / 2) * 0.12));
            magneticTarget.style.setProperty("--mag-x", `${x}px`);
            magneticTarget.style.setProperty("--mag-y", `${y}px`);
          }
          if (tiltTarget && tiltTarget.isConnected) {
            const bounds = tiltTarget.getBoundingClientRect();
            const horizontal = (pointerX - bounds.left) / bounds.width - 0.5;
            const vertical = (pointerY - bounds.top) / bounds.height - 0.5;
            const rotateX = Math.max(-3, Math.min(3, -vertical * 6));
            const rotateY = Math.max(-3, Math.min(3, horizontal * 6));
            tiltTarget.style.setProperty("--qpass3-tilt-x", `${rotateY}deg`);
            tiltTarget.style.setProperty("--qpass3-tilt-y", `${rotateX}deg`);
          }
          if (backdropIsVisible) {
            const parallaxX = ((pointerX / window.innerWidth) - 0.5) * 16;
            const parallaxY = ((pointerY / window.innerHeight) - 0.5) * 12;
            backdrop.style.setProperty("--parallax-x", `${parallaxX}px`);
            backdrop.style.setProperty("--parallax-y", `${parallaxY}px`);
          }
        });
      },
      { passive: true },
    );
    document.addEventListener(
      "pointerout",
      (event) => {
        if (!event.relatedTarget && previousMagneticTarget) {
          previousMagneticTarget.style.setProperty("--mag-x", "0px");
          previousMagneticTarget.style.setProperty("--mag-y", "0px");
          previousMagneticTarget = null;
          magneticTarget = null;
        }
        if (!event.relatedTarget && previousTiltTarget) {
          previousTiltTarget.style.setProperty("--qpass3-tilt-x", "0deg");
          previousTiltTarget.style.setProperty("--qpass3-tilt-y", "0deg");
          previousTiltTarget = null;
          tiltTarget = null;
        }
      },
      { passive: true },
    );
  }
})();
// ===== Pass 1: Glass pointer and ambient lifecycle end =====

// ===== Pass 3: Scroll progress, stats, and contact interactions start =====
(() => {
  document.querySelectorAll(".proj-card").forEach((card) => {
    card.classList.add("qpass3-tilt");
  });

  const progress = document.getElementById("qpass3-scroll-progress");
  let maxScroll = 0;

  function refreshScrollRange() {
    maxScroll = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
  }

  function updateProgress() {
    const amount = maxScroll > 0 ? window.scrollY / maxScroll : 0;
    progress.style.transform = `scaleX(${Math.max(0, Math.min(1, amount))})`;
  }

  scrollTasks.add(updateProgress);
  window.addEventListener("resize", refreshScrollRange, { passive: true });
  window.addEventListener("load", refreshScrollRange, { once: true });
  refreshScrollRange();
  updateProgress();

  const stats = document.querySelector(".stats");
  const statNumbers = stats ? Array.from(stats.querySelectorAll(".sn")) : [];
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const statsObserver = new IntersectionObserver(
    ([entry]) => {
      if (!entry.isIntersecting) return;
      statsObserver.unobserve(entry.target);
      const counters = statNumbers.map((element) => {
        const [, number, suffix] = element.textContent.trim().match(/^(\d+)(.*)$/);
        return { element, target: Number(number), suffix };
      });
      if (reducedMotion.matches) {
        counters.forEach(({ element, target, suffix }) => {
          element.textContent = `${target}${suffix}`;
        });
        return;
      }

      const startedAt = performance.now();
      function animateCounters(now) {
        const progressAmount = Math.min(1, (now - startedAt) / 900);
        const eased = 1 - Math.pow(1 - progressAmount, 3);
        counters.forEach(({ element, target, suffix }) => {
          element.textContent = `${Math.round(target * eased)}${suffix}`;
        });
        if (progressAmount < 1) window.requestAnimationFrame(animateCounters);
      }
      window.requestAnimationFrame(animateCounters);
    },
    { threshold: 0.35 },
  );
  if (stats) statsObserver.observe(stats);

  const copyButton = document.getElementById("qpass3-copy-email");
  const toast = document.getElementById("qpass3-toast");
  const email = "qasimakram46@hotmail.com";
  let toastTimeout = 0;

  function showToast(message) {
    toast.textContent = message;
    toast.classList.add("visible");
    window.clearTimeout(toastTimeout);
    toastTimeout = window.setTimeout(() => toast.classList.remove("visible"), 2400);
  }

  function legacyCopy(text) {
    const field = document.createElement("textarea");
    field.value = text;
    field.setAttribute("readonly", "");
    field.style.position = "fixed";
    field.style.opacity = "0";
    document.body.append(field);
    try {
      field.select();
      return typeof document.execCommand === "function" &&
        document.execCommand("copy");
    } finally {
      field.remove();
    }
  }

  copyButton.addEventListener("click", async () => {
    let copied = false;
    let copyError = null;
    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(email);
        copied = true;
      } catch (error) {
        copyError = error;
      }
    }
    if (!copied) {
      try {
        copied = legacyCopy(email);
        if (!copied && !copyError) {
          copyError = new Error("The browser could not copy text to the clipboard.");
        }
      } catch (error) {
        copyError = error;
      }
    }
    if (copied) {
      showToast("Email address copied.");
      return;
    }
    console.error("Could not copy the contact email address.", copyError);
    showToast(`Copy didn't work. You can email me at ${email}.`);
  });
})();
// ===== Pass 3: Scroll progress, stats, and contact interactions end =====
