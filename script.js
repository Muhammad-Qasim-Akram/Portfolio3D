// Tune the entire scroll animation here; CSS and the fallback share these values.
const heroCardMotion = {
  flipStart: 0, // Rotation at the hero's top, in degrees.
  flipEnd: 180, // Rotation at the hero's bottom, in degrees.
  shrinkStartAngle: 100, // Begin shrinking after the card passes this angle.
  finalScale: 0.04, // Scale when the card has left the hero.
  downwardDistance: 42, // Final downward travel, in svh.
  fadeStart: 0.9, // Begin fading at this normalized hero progress.
};

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

const scrollTasks = new Set();
let scrollFrame = 0;

document
  .querySelectorAll(
    "button:not(:disabled), .btn-primary, .btn-outline, .btn-nav, .btn-send, .current-project-link, .back-link, .c-link",
  )
  .forEach((element) => element.classList.add("magnetic"));

function scheduleScrollWork() {
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    scrollTasks.forEach((task) => task());
  });
}

window.addEventListener("scroll", scheduleScrollWork, { passive: true });
window.addEventListener("resize", scheduleScrollWork, { passive: true });

const navbar = document.getElementById("navbar");
let navbarIsScrolled = null;

function updateNavbarScroll() {
  const scrolled = window.scrollY > 50;
  if (scrolled === navbarIsScrolled) return;
  navbarIsScrolled = scrolled;
  navbar.classList.toggle("blur", scrolled);
  navbar.classList.toggle("scrolled", scrolled);
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

const hero = document.getElementById("hero");
const heroPhoto = document.querySelector(".hero-photo-wrap");
const flipCard = document.getElementById("flipCard");
const flipRotationElement = document.getElementById("flipRotation");
const shrinkStartProgress = Math.max(
  0,
  Math.min(
    1,
    (heroCardMotion.shrinkStartAngle - heroCardMotion.flipStart) /
      (heroCardMotion.flipEnd - heroCardMotion.flipStart),
  ),
);
const supportsScrollTimeline =
  CSS.supports("animation-timeline: view()") &&
  CSS.supports("view-timeline-name: --hero-scroll");
let heroStartY = 0;
let heroHeight = 0;
let cardIsGone = null;

function cubicBezierProgress(progress, x1, y1, x2, y2) {
  const coordinate = (time, first, second) =>
    3 * (1 - time) ** 2 * time * first +
    3 * (1 - time) * time ** 2 * second +
    time ** 3;
  let low = 0;
  let high = 1;
  let time = progress;
  for (let iteration = 0; iteration < 8; iteration++) {
    const x = coordinate(time, x1, x2);
    if (Math.abs(x - progress) < 0.001) break;
    if (x < progress) low = time;
    else high = time;
    time = (low + high) / 2;
  }
  return coordinate(time, y1, y2);
}

function refreshHeroMetrics() {
  heroStartY = hero.getBoundingClientRect().top + window.scrollY;
  heroHeight = hero.offsetHeight;
  const coverRangeStart =
    (window.innerHeight / (heroHeight + window.innerHeight)) * 100;
  document.documentElement.style.setProperty(
    "--hero-scroll-range-start",
    `${coverRangeStart}%`,
  );
}

function updateHeroCard() {
  const progress = Math.max(
    0,
    Math.min(1, (window.scrollY - heroStartY) / heroHeight),
  );
  const gone = progress >= 1;

  if (gone !== cardIsGone) {
    flipCard.style.visibility = gone ? "hidden" : "visible";
    heroPhoto.style.visibility = gone ? "hidden" : "visible";
    flipCard.style.willChange = gone ? "auto" : "transform, opacity";
    cardIsGone = gone;
  }
  if (supportsScrollTimeline) return;

  const flipDegrees =
    heroCardMotion.flipStart +
    (heroCardMotion.flipEnd - heroCardMotion.flipStart) * progress;
  const shrinkProgress = Math.max(
    0,
    Math.min(1, (progress - shrinkStartProgress) / (1 - shrinkStartProgress)),
  );
  const easedShrink = cubicBezierProgress(shrinkProgress, 0.22, 1, 0.36, 1);
  const scale = 1 + (heroCardMotion.finalScale - 1) * easedShrink;
  const downwardDistance = heroCardMotion.downwardDistance * easedShrink;
  const fadeProgress = Math.max(
    0,
    Math.min(1, (progress - heroCardMotion.fadeStart) / (1 - heroCardMotion.fadeStart)),
  );
  flipCard.style.transform = `translate3d(0, ${downwardDistance}svh, 0) scale(${scale})`;
  flipCard.style.opacity = String(1 - fadeProgress);
  flipRotationElement.style.transform = `rotateY(${flipDegrees}deg)`;
}

if (supportsScrollTimeline) {
  const style = document.createElement("style");
  style.textContent = `
    @keyframes hero-card-motion {
      0% {
        transform: translate3d(0, 0, 0) scale(1);
      }
      ${shrinkStartProgress * 100}% {
        transform: translate3d(0, 0, 0) scale(1);
        animation-timing-function: cubic-bezier(0.22, 1, 0.36, 1);
      }
      100% {
        transform: translate3d(0, ${heroCardMotion.downwardDistance}svh, 0) scale(${heroCardMotion.finalScale});
      }
    }
    @keyframes hero-card-flip {
      from { transform: rotateY(${heroCardMotion.flipStart}deg); }
      to { transform: rotateY(${heroCardMotion.flipEnd}deg); }
    }
    @keyframes hero-card-opacity {
      0%, ${heroCardMotion.fadeStart * 100}% { opacity: 1; }
      100% { opacity: 0; }
    }
    html.has-scroll-timeline #flipCard {
      animation-name: hero-card-motion, hero-card-opacity;
      animation-duration: 1s, 1s;
      animation-timing-function: linear, linear;
      animation-fill-mode: both, both;
      animation-timeline: --hero-scroll, --hero-scroll;
      animation-range: cover var(--hero-scroll-range-start) 100%, cover var(--hero-scroll-range-start) 100%;
    }
    html.has-scroll-timeline #flipRotation {
      animation: hero-card-flip 1s linear both;
      animation-timeline: --hero-scroll;
      animation-range: cover var(--hero-scroll-range-start) 100%;
    }
  `;
  document.head.append(style);
  document.documentElement.classList.add("has-scroll-timeline");
}

scrollTasks.add(updateActiveNavigation);
scrollTasks.add(updateHeroCard);
refreshHeroMetrics();
updateHeroCard();

refreshNavSectionPositions();
window.addEventListener("load", () => {
  refreshHeroMetrics();
  refreshNavSectionPositions();
  activeNavHref = "";
  activeSectionId = "";
  scheduleScrollWork();
}, { once: true });
window.addEventListener("resize", () => {
  refreshHeroMetrics();
  refreshNavSectionPositions();
  activeNavHref = "";
  activeSectionId = "";
  scheduleScrollWork();
}, { passive: true });
updateActiveNavigation();

// perf: Reveal once so the animated transform cannot retrigger its own observer.
const io = new IntersectionObserver(
  (entries) => entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add("in");
    io.unobserve(entry.target);
  }),
  { threshold: 0.07, rootMargin: "-100px 0px -12% 0px" },
);
document.querySelectorAll(".sr,.sr-l,.sr-r").forEach((el) => io.observe(el));


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
  education: "I'm pursuing a BS in Computer Science at The Islamia University of Bahawalpur. I'm currently in my 7th semester and expect to graduate in 2027.",
  certs: [
    "Advanced MySQL Topics — Meta (September 2025)",
    "Supervised Machine Learning: Regression & Classification — Stanford / DeepLearning.AI (December 2025)",
    "Python for Data Science, AI & Development — IBM (October 2025)"
  ],
  contact: {
    email: "qasimakram46@hotmail.com",
    github: "https://github.com/Muhammad-Qasim-Akram",
    linkedin: "https://linkedin.com/in/qasimakram",
    whatsapp: "https://wa.me/923126442266"
  },
  resumeUrl: "img/Muhammad_Qasim_Akram_Resume.pdf",
  availability: "I'm open to internships and junior full-stack or AI engineering roles, freelance projects, and collaborations. I'm based in Pakistan and happy to connect about remote opportunities."
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
  const quickCommands = ["/intro", "/stack", "/projects", "/education", "/certs", "/contact", "/resume", "/hire"];
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
            { text: ", or message me on " },
            { text: "WhatsApp ↗", url: BOT_DATA.contact.whatsapp },
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
    if (/\b(contact|email|github|linkedin|whatsapp)\b/.test(text)) return "/contact";
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


(() => {
  const backdrop = document.getElementById("ambientBackdrop");
  let backdropIsVisible = false;
  let pointerFrame = 0;
  let glowTarget = null;
  let magneticTarget = null;
  let tiltTarget = null;
  let pointerX = 0;
  let pointerY = 0;
  let hasPointerPosition = false;
  let viewportWidth = window.innerWidth;
  let viewportHeight = window.innerHeight;
  let pointerRefreshTimer = 0;
  const pointerMedia = window.matchMedia("(hover: hover) and (pointer: fine)");
  const reducedMotionMedia = window.matchMedia("(prefers-reduced-motion: reduce)");
  const pointerRecords = new Map();

  // perf: Keep glow layers clipped to their surfaces so pointer updates never touch the glass itself.
  document
    .querySelectorAll(".glass:not(.proj-card):not(.nav-mobile-menu), .qbot-launcher")
    .forEach((surface) => {
      const clip = document.createElement("span");
      clip.className = "glass-pointer-glow";
      clip.setAttribute("aria-hidden", "true");
      const light = document.createElement("span");
      light.className = "glass-pointer-glow__light";
      clip.append(light);
      surface.prepend(clip);
      pointerRecords.set(surface, {
        bounds: null,
        glow: light,
        magnetic: false,
        tilt: false,
        currentMagX: 0,
        currentMagY: 0,
        lastMagX: null,
        lastMagY: null,
        currentTiltX: 0,
        currentTiltY: 0,
        currentLift: 0,
        lastGlowTransform: "",
        lastTiltTransform: "",
      });
    });

  document.querySelectorAll(".magnetic, .proj-card").forEach((target) => {
    const record = pointerRecords.get(target) || {
      bounds: null,
      glow: null,
      magnetic: false,
      tilt: false,
      currentMagX: 0,
      currentMagY: 0,
      lastMagX: null,
      lastMagY: null,
      currentTiltX: 0,
      currentTiltY: 0,
      currentLift: 0,
      lastGlowTransform: "",
      lastTiltTransform: "",
    };
    record.magnetic ||= target.matches(".magnetic");
    record.tilt ||= target.matches(".proj-card");
    pointerRecords.set(target, record);
  });

  function pointerEffectsEnabled() {
    return pointerMedia.matches && !reducedMotionMedia.matches;
  }

  function cacheTargetBounds(targets) {
    const boundsByTarget = new Map();
    targets.forEach((target) => {
      if (target.isConnected) boundsByTarget.set(target, target.getBoundingClientRect());
    });
    boundsByTarget.forEach((bounds, target) => {
      pointerRecords.get(target).bounds = bounds;
    });
    return boundsByTarget;
  }

  function schedulePointerFrame() {
    if (
      pointerFrame ||
      (!glowTarget && !magneticTarget && !tiltTarget && !backdropIsVisible)
    ) return;
    pointerFrame = window.requestAnimationFrame(() => {
      pointerFrame = 0;
      if (!hasPointerPosition || !pointerEffectsEnabled()) return;

      if (glowTarget?.isConnected) {
        const record = pointerRecords.get(glowTarget);
        const { bounds, glow } = record;
        if (bounds && glow) {
          const x = Number((pointerX - bounds.left - bounds.width / 2).toFixed(2));
          const y = Number((pointerY - bounds.top - bounds.height / 2).toFixed(2));
          const transform = `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%)`;
          if (transform !== record.lastGlowTransform) {
            glow.style.transform = transform;
            record.lastGlowTransform = transform;
          }
        }
      }

      let continuePointerFrame = false;
      if (magneticTarget?.isConnected) {
        const record = pointerRecords.get(magneticTarget);
        const { bounds } = record;
        if (bounds) {
          const targetX = Math.max(-8, Math.min(8, (pointerX - bounds.left - bounds.width / 2) * 0.12));
          const targetY = Math.max(-8, Math.min(8, (pointerY - bounds.top - bounds.height / 2) * 0.12));
          record.currentMagX += (targetX - record.currentMagX) * 0.15;
          record.currentMagY += (targetY - record.currentMagY) * 0.15;
          const x = Number(record.currentMagX.toFixed(2));
          const y = Number(record.currentMagY.toFixed(2));
          if (x !== record.lastMagX) {
            magneticTarget.style.setProperty("--mag-x", `${x}px`);
            record.lastMagX = x;
          }
          if (y !== record.lastMagY) {
            magneticTarget.style.setProperty("--mag-y", `${y}px`);
            record.lastMagY = y;
          }
          continuePointerFrame ||= Math.abs(targetX - record.currentMagX) >= 0.03 ||
            Math.abs(targetY - record.currentMagY) >= 0.03;
        }
      }

      if (tiltTarget?.isConnected) {
        const record = pointerRecords.get(tiltTarget);
        const { bounds } = record;
        if (bounds?.width && bounds.height) {
          const horizontal = (pointerX - bounds.left) / bounds.width - 0.5;
          const vertical = (pointerY - bounds.top) / bounds.height - 0.5;
          const targetX = Math.max(-7, Math.min(7, -vertical * 14));
          const targetY = Math.max(-7, Math.min(7, horizontal * 14));
          const targetLift = tiltTarget.matches(":hover, :focus-visible") ? -3 : 0;
          record.currentTiltX += (targetX - record.currentTiltX) * 0.15;
          record.currentTiltY += (targetY - record.currentTiltY) * 0.15;
          record.currentLift += (targetLift - record.currentLift) * 0.15;
          const rotateX = Number(record.currentTiltX.toFixed(2));
          const rotateY = Number(record.currentTiltY.toFixed(2));
          const lift = Number(record.currentLift.toFixed(2));
          const transform =
            `perspective(900px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) ` +
            `translateY(${lift}px)`;
          if (transform !== record.lastTiltTransform) {
            tiltTarget.style.transform = transform;
            record.lastTiltTransform = transform;
          }
          continuePointerFrame ||= Math.abs(targetX - record.currentTiltX) >= 0.03 ||
            Math.abs(targetY - record.currentTiltY) >= 0.03 ||
            Math.abs(targetLift - record.currentLift) >= 0.03;
        }
      }

      if (backdropIsVisible) {
        const parallaxX = (pointerX / viewportWidth - 0.5) * 16;
        const parallaxY = (pointerY / viewportHeight - 0.5) * 12;
        backdrop.style.setProperty("--parallax-x", `${parallaxX}px`);
        backdrop.style.setProperty("--parallax-y", `${parallaxY}px`);
      }
      if (continuePointerFrame) schedulePointerFrame();
    });
  }

  function setPointerTargets(
    nextGlowTarget,
    nextMagneticTarget,
    nextTiltTarget,
    refreshBounds = false,
  ) {
    const currentTargets = new Set(
      [glowTarget, magneticTarget, tiltTarget].filter(Boolean),
    );
    const nextTargets = new Set(
      [nextGlowTarget, nextMagneticTarget, nextTiltTarget].filter(Boolean),
    );
    cacheTargetBounds(
      refreshBounds
        ? nextTargets
        : new Set(
            [...nextTargets].filter((target) =>
              !currentTargets.has(target) || !pointerRecords.get(target).bounds,
            ),
          ),
    );

    if (magneticTarget && magneticTarget !== nextMagneticTarget) {
      magneticTarget.classList.remove("qpass1-pointer-active");
      magneticTarget.style.setProperty("--mag-x", "0px");
      magneticTarget.style.setProperty("--mag-y", "0px");
      const magneticRecord = pointerRecords.get(magneticTarget);
      magneticRecord.currentMagX = 0;
      magneticRecord.currentMagY = 0;
      magneticRecord.lastMagX = 0;
      magneticRecord.lastMagY = 0;
    }
    if (tiltTarget && tiltTarget !== nextTiltTarget) {
      tiltTarget.classList.remove("qpass1-pointer-active");
      tiltTarget.style.removeProperty("transform");
      const tiltRecord = pointerRecords.get(tiltTarget);
      tiltRecord.currentTiltX = 0;
      tiltRecord.currentTiltY = 0;
      tiltRecord.currentLift = 0;
      tiltRecord.lastTiltTransform = "";
    }

    glowTarget = nextGlowTarget;
    magneticTarget = nextMagneticTarget;
    tiltTarget = nextTiltTarget;
    if (magneticTarget) magneticTarget.classList.add("qpass1-pointer-active");
    if (tiltTarget) tiltTarget.classList.add("qpass1-pointer-active");
    schedulePointerFrame();
  }

  function refreshPointerTargets() {
    if (
      !pointerEffectsEnabled() ||
      !hasPointerPosition ||
      document.body.classList.contains("qpass1-pointer-scrolling")
    ) return;
    const hit = document.elementFromPoint(pointerX, pointerY);
    const element = hit instanceof Element ? hit : null;
    const nextGlowTarget = element?.closest(
      ".glass:not(.proj-card):not(.nav-mobile-menu), .qbot-launcher",
    );
    const nextMagneticTarget = element?.closest(".magnetic");
    const nextTiltTarget = element?.closest(".proj-card");
    setPointerTargets(
      nextGlowTarget && pointerRecords.has(nextGlowTarget) ? nextGlowTarget : null,
      nextMagneticTarget && pointerRecords.has(nextMagneticTarget) ? nextMagneticTarget : null,
      nextTiltTarget && pointerRecords.has(nextTiltTarget) ? nextTiltTarget : null,
      true,
    );
  }

  function schedulePointerRefresh() {
    if (!pointerEffectsEnabled()) return;
    window.clearTimeout(pointerRefreshTimer);
    pointerRefreshTimer = window.setTimeout(() => {
      pointerRefreshTimer = 0;
      viewportWidth = window.innerWidth;
      viewportHeight = window.innerHeight;
      refreshPointerTargets();
    }, 180);
  }

  pointerRecords.forEach((record, target) => {
    target.addEventListener(
      "pointerenter",
      (event) => {
        if (
          !pointerEffectsEnabled() ||
          event.pointerType !== "mouse" ||
          document.body.classList.contains("qpass1-pointer-scrolling")
        ) return;
        pointerX = event.clientX;
        pointerY = event.clientY;
        hasPointerPosition = true;
        setPointerTargets(
          record.glow ? target : glowTarget,
          record.magnetic ? target : magneticTarget,
          record.tilt ? target : tiltTarget,
        );
      },
      { passive: true },
    );
    target.addEventListener(
      "pointerleave",
      (event) => {
        if (event.pointerType !== "mouse") return;
        setPointerTargets(
          glowTarget === target ? null : glowTarget,
          magneticTarget === target ? null : magneticTarget,
          tiltTarget === target ? null : tiltTarget,
        );
      },
      { passive: true },
    );
  });

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

  let ambientResumeTimer = 0;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    window.addEventListener(
      "scroll",
      () => {
        backdrop.classList.add("is-scrolling");
        window.clearTimeout(ambientResumeTimer);
        ambientResumeTimer = window.setTimeout(() => {
          ambientResumeTimer = 0;
          backdrop.classList.remove("is-scrolling");
        }, 180);
      },
      { passive: true },
    );
  }

  // perf: Ignore hover hit-testing during scroll, then remeasure at the resting pointer position.
  let pointerScrollTimer = 0;
  function schedulePointerScrollFinish() {
    window.clearTimeout(pointerScrollTimer);
    pointerScrollTimer = window.setTimeout(finishPointerScroll, 180);
  }

  function finishPointerScroll() {
    window.clearTimeout(pointerScrollTimer);
    pointerScrollTimer = 0;
    if (!document.body.classList.contains("qpass1-pointer-scrolling")) return;
    document.body.classList.remove("qpass1-pointer-scrolling");
    viewportWidth = window.innerWidth;
    viewportHeight = window.innerHeight;
    refreshPointerTargets();
  }

  window.addEventListener(
    "scroll",
    () => {
      document.body.classList.add("qpass1-pointer-scrolling");
      setPointerTargets(null, null, null);
      schedulePointerScrollFinish();
    },
    { passive: true },
  );
  if ("onscrollend" in window) {
    window.addEventListener("scrollend", schedulePointerScrollFinish, { passive: true });
  }

  document.addEventListener(
    "pointermove",
    (event) => {
      if (
        !pointerEffectsEnabled() ||
        event.pointerType !== "mouse" ||
        document.body.classList.contains("qpass1-pointer-scrolling")
      ) return;
      pointerX = event.clientX;
      pointerY = event.clientY;
      hasPointerPosition = true;
      schedulePointerFrame();
    },
    { passive: true },
  );

  window.addEventListener("resize", schedulePointerRefresh, { passive: true });
  window.addEventListener("scroll", schedulePointerRefresh, { passive: true });
})();

(() => {
  document.querySelectorAll(".proj-card").forEach((card) => {
    card.classList.add("qpass3-tilt");
  });

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
