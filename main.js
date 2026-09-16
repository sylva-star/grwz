document.documentElement.classList.remove("no-js");
document.documentElement.classList.add("js");

const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/* 导航栏滚动后加深背景 */
const navbar = document.getElementById("navbar");
let navbarIsScrolled = false;
let scrollFramePending = false;

function syncNavbar() {
  const nextState = window.scrollY > 16;

  if (nextState === navbarIsScrolled) {
    return;
  }

  navbarIsScrolled = nextState;
  navbar.classList.toggle("is-scrolled", nextState);
}

function queueNavbarSync() {
  if (scrollFramePending) {
    return;
  }

  scrollFramePending = true;
  window.requestAnimationFrame(() => {
    syncNavbar();
    scrollFramePending = false;
  });
}

syncNavbar();
window.addEventListener("scroll", queueNavbarSync, { passive: true });

/* 流光方案预览：选定后会记住当前方案 */
const flowOptions = [...document.querySelectorAll(".flow-option[data-flow-theme]")];
const validFlowThemes = new Set(["ice", "electric", "deep", "pearl"]);

function applyFlowTheme(theme, persist = true) {
  if (!validFlowThemes.has(theme)) {
    theme = "ice";
  }

  document.documentElement.dataset.flowTheme = theme;
  flowOptions.forEach((option) => {
    const isActive = option.dataset.flowTheme === theme;
    option.classList.toggle("is-active", isActive);
    option.setAttribute("aria-pressed", String(isActive));
  });

  if (persist) {
    try {
      window.localStorage.setItem("flowTheme", theme);
    } catch (error) {
      // 本地存储不可用时仅保留当前页面效果。
    }
  }
}

let savedFlowTheme = "ice";

try {
  savedFlowTheme = window.localStorage.getItem("flowTheme") || savedFlowTheme;
} catch (error) {
  savedFlowTheme = "ice";
}

applyFlowTheme(savedFlowTheme, false);

flowOptions.forEach((option) => {
  option.addEventListener("click", () => {
    applyFlowTheme(option.dataset.flowTheme);
  });
});

/* 滚动进入视口时让模块上浮淡入 */
const revealElements = document.querySelectorAll("[data-reveal]");

if (reduceMotion || !("IntersectionObserver" in window)) {
  revealElements.forEach((element) => element.classList.add("is-visible"));
} else {
  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          revealObserver.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -52px 0px" }
  );

  revealElements.forEach((element) => revealObserver.observe(element));
}

/* 复制按钮：优先使用 Clipboard API，旧浏览器用隐藏输入框兜底 */
function legacyCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.top = "-10000px";
  document.body.appendChild(textarea);
  textarea.select();

  let copied = false;
  try {
    copied = document.execCommand("copy");
  } catch (error) {
    copied = false;
  }

  document.body.removeChild(textarea);
  return copied;
}

document.querySelectorAll(".copy-btn").forEach((button) => {
  const label = button.querySelector(".copy-btn__text");
  const defaultLabel = label.textContent;

  button.addEventListener("click", async () => {
    const text = button.dataset.copy || "";
    let copied = false;

    if (navigator.clipboard && window.isSecureContext) {
      try {
        await navigator.clipboard.writeText(text);
        copied = true;
      } catch (error) {
        copied = false;
      }
    }

    if (!copied) {
      copied = legacyCopy(text);
    }

    button.classList.add("is-copied");
    label.textContent = copied ? "已复制" : "复制失败";
    button.disabled = true;

    window.setTimeout(() => {
      button.classList.remove("is-copied");
      label.textContent = defaultLabel;
      button.disabled = false;
    }, 1600);
  });
});

/* 粒子背景：限制帧率与像素密度，并在页面隐藏时暂停 */
const canvas = document.getElementById("particles");

if (canvas && canvas.getContext) {
  const context = canvas.getContext("2d");
  const particleColors = [
    "37, 99, 235",
    "14, 165, 233",
    "59, 130, 246",
    "2, 132, 199"
  ];
  const targetFrameTime = 1000 / 30;
  let width = 0;
  let height = 0;
  let particles = [];
  let animationFrame = 0;
  let lastFrameTime = 0;
  let isAnimating = false;
  let resizeTimer = 0;

  function resetParticle(particle, startAnywhere) {
    const alpha = 0.08 + Math.random() * 0.35;
    const color = particleColors[Math.floor(Math.random() * particleColors.length)];

    particle.x = Math.random() * width;
    particle.y = startAnywhere ? Math.random() * height : height + 8;
    particle.radius = 0.6 + Math.random() * 1.5;
    particle.speed = 0.08 + Math.random() * 0.32;
    particle.sway = Math.random() * 0.35;
    particle.phase = Math.random() * Math.PI * 2;
    particle.fillStyle = `rgba(${color}, ${alpha})`;

    return particle;
  }

  function createParticle(startAnywhere) {
    return resetParticle({}, startAnywhere);
  }

  function setupCanvas() {
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = Math.floor(width * pixelRatio);
    canvas.height = Math.floor(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    const isCompact = width < 720;
    const minCount = isCompact ? 24 : 32;
    const maxCount = isCompact ? 44 : 72;
    const areaPerParticle = isCompact ? 24000 : 20000;
    const count = Math.max(minCount, Math.min(maxCount, Math.floor((width * height) / areaPerParticle)));
    particles = Array.from({ length: count }, () => createParticle(true));
  }

  function drawParticles(frameScale = 1) {
    context.clearRect(0, 0, width, height);

    particles.forEach((particle) => {
      particle.y -= particle.speed * frameScale;
      particle.phase += 0.008 * frameScale;
      particle.x += Math.sin(particle.phase) * particle.sway * frameScale;

      if (particle.y < -10) {
        resetParticle(particle, false);
      }

      context.beginPath();
      context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      context.fillStyle = particle.fillStyle;
      context.fill();
    });
  }

  function animateParticles(now) {
    const elapsed = lastFrameTime ? now - lastFrameTime : targetFrameTime;

    if (elapsed >= targetFrameTime) {
      drawParticles(Math.min(elapsed / 16.67, 2));
      lastFrameTime = now;
    }

    animationFrame = window.requestAnimationFrame(animateParticles);
  }

  function startParticleAnimation() {
    if (reduceMotion || isAnimating || document.hidden) {
      return;
    }

    isAnimating = true;
    lastFrameTime = 0;
    animationFrame = window.requestAnimationFrame(animateParticles);
  }

  function stopParticleAnimation() {
    isAnimating = false;
    window.cancelAnimationFrame(animationFrame);
  }

  setupCanvas();

  if (reduceMotion) {
    drawParticles();
  } else {
    startParticleAnimation();
  }

  window.addEventListener("resize", () => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(() => {
      setupCanvas();
      if (reduceMotion) {
        drawParticles();
      }
    }, 160);
  });

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopParticleAnimation();
    } else {
      startParticleAnimation();
    }
  });
}
