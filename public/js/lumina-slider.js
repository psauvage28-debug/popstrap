// Slider hero "Lumina" — adapte en JS natif (a l'origine un composant React) pour tourner
// directement dans les pages EJS du site, sans React/Tailwind/shadcn. Meme moteur (Three.js
// + GSAP, transition shader "verre") mais branche sur les vraies photos et textes Popstrap.
(function () {
  const loadScript = (src, globalName) =>
    new Promise((resolve, reject) => {
      if (window[globalName]) { resolve(); return; }
      if (document.querySelector(`script[src="${src}"]`)) {
        const check = setInterval(() => {
          if (window[globalName]) { clearInterval(check); resolve(); }
        }, 50);
        setTimeout(() => { clearInterval(check); reject(new Error(`Timeout waiting for ${globalName}`)); }, 10000);
        return;
      }
      const s = document.createElement("script");
      s.src = src;
      s.onload = () => setTimeout(() => resolve(), 100);
      s.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(s);
    });

  async function loadScripts() {
    try {
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js", "gsap");
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js", "THREE");
    } catch (e) {
      console.error("Lumina slider: echec du chargement de GSAP/Three.js", e);
      return;
    }
    initApplication();
  }

  function initApplication() {
    const gsap = window.gsap;
    const THREE = window.THREE;

    const SLIDER_CONFIG = {
      settings: {
        transitionDuration: 2.2,
        autoSlideSpeed: 5500,
        currentEffect: "glass",
        globalIntensity: 1.0,
        speedMultiplier: 1.0,
        distortionStrength: 1.0,
        glassRefractionStrength: 1.0,
        glassChromaticAberration: 1.0,
        glassBubbleClarity: 1.0,
        glassEdgeGlow: 1.0,
        glassLiquidFlow: 1.0,
      },
    };

    let currentSlideIndex = 0;
    let isTransitioning = false;
    let shaderMaterial, renderer, scene, camera;
    let slideTextures = [];
    let texturesLoaded = false;
    let autoSlideTimer = null;
    let progressAnimation = null;
    let sliderEnabled = false;

    const SLIDE_DURATION = () => SLIDER_CONFIG.settings.autoSlideSpeed;
    const PROGRESS_UPDATE_INTERVAL = 50;
    const TRANSITION_DURATION = () => SLIDER_CONFIG.settings.transitionDuration;

    // Vraies photos et coloris Popstrap (a la place des images Unsplash generiques du composant d'origine).
    const slides = [
      { title: "Royal Pop", description: "Trois montres, trois box. Une conviction : le luxe ne doit pas se ruiner.", media: "/img/hero-banner.jpg" },
      { title: "Otto Rosso", description: "Caractere affirme. Biocéramique mate, resistante aux rayures.", media: "/img/colors/ceramique-otto-rosso.jpg" },
      { title: "Lan Ba", description: "Sport et urbain. Caoutchouc waterproof, pret a tout.", media: "/img/colors/oyster-lan-ba.jpg" },
      { title: "Blaue Acht", description: "L'elegance discrete d'un bleu profond.", media: "/img/colors/ceramique-blaue-acht.jpg" },
      { title: "Otg Roz Jaune", description: "Solaire et affirme, pour ne pas passer inapercu.", media: "/img/colors/ceramique-otg-roz-jaune.jpg" },
      { title: "Toute la palette", description: "Dix coloris. Un seul geste : cinq secondes chrono.", media: "/img/colors-grid.jpg" },
    ];

    const vertexShader = `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
    const fragmentShader = `
      uniform sampler2D uTexture1, uTexture2;
      uniform float uProgress;
      uniform vec2 uResolution, uTexture1Size, uTexture2Size;
      uniform float uGlobalIntensity, uSpeedMultiplier, uDistortionStrength;
      uniform float uGlassRefractionStrength, uGlassChromaticAberration, uGlassBubbleClarity, uGlassEdgeGlow, uGlassLiquidFlow;
      varying vec2 vUv;

      vec2 getCoverUV(vec2 uv, vec2 textureSize) {
        vec2 s = uResolution / textureSize;
        float scale = max(s.x, s.y);
        vec2 scaledSize = textureSize * scale;
        vec2 offset = (uResolution - scaledSize) * 0.5;
        return (uv * uResolution - offset) / scaledSize;
      }

      vec4 glassEffect(vec2 uv, float progress) {
        float time = progress * 5.0 * uSpeedMultiplier;
        vec2 uv1 = getCoverUV(uv, uTexture1Size); vec2 uv2 = getCoverUV(uv, uTexture2Size);
        float maxR = length(uResolution) * 0.85; float br = progress * maxR;
        vec2 p = uv * uResolution; vec2 c = uResolution * 0.5;
        float d = length(p - c); float nd = d / max(br, 0.001);
        float param = smoothstep(br + 3.0, br - 3.0, d);
        vec4 img;
        if (param > 0.0) {
          float ro = 0.08 * uGlassRefractionStrength * uDistortionStrength * uGlobalIntensity * pow(smoothstep(0.3 * uGlassBubbleClarity, 1.0, nd), 1.5);
          vec2 dir = (d > 0.0) ? (p - c) / d : vec2(0.0);
          vec2 distUV = uv2 - dir * ro;
          distUV += vec2(sin(time + nd * 10.0), cos(time * 0.8 + nd * 8.0)) * 0.015 * uGlassLiquidFlow * uSpeedMultiplier * nd * param;
          float ca = 0.02 * uGlassChromaticAberration * uGlobalIntensity * pow(smoothstep(0.3, 1.0, nd), 1.2);
          img = vec4(texture2D(uTexture2, distUV + dir * ca * 1.2).r, texture2D(uTexture2, distUV + dir * ca * 0.2).g, texture2D(uTexture2, distUV - dir * ca * 0.8).b, 1.0);
          if (uGlassEdgeGlow > 0.0) {
            float rim = smoothstep(0.95, 1.0, nd) * (1.0 - smoothstep(1.0, 1.01, nd));
            img.rgb += rim * 0.08 * uGlassEdgeGlow * uGlobalIntensity;
          }
        } else { img = texture2D(uTexture2, uv2); }
        vec4 oldImg = texture2D(uTexture1, uv1);
        if (progress > 0.95) img = mix(img, texture2D(uTexture2, uv2), (progress - 0.95) / 0.05);
        return mix(oldImg, img, param);
      }

      void main() { gl_FragColor = glassEffect(vUv, uProgress); }
    `;

    const splitText = (text) =>
      text.split("").map((char) => `<span style="display:inline-block;opacity:0;">${char === " " ? "&nbsp;" : char}</span>`).join("");

    function updateContent(idx) {
      const titleEl = document.getElementById("mainTitle");
      const descEl = document.getElementById("mainDesc");
      if (!titleEl || !descEl) return;

      gsap.to(titleEl.children, { y: -20, opacity: 0, duration: 0.5, stagger: 0.02, ease: "power2.in" });
      gsap.to(descEl, { y: -10, opacity: 0, duration: 0.4, ease: "power2.in" });

      setTimeout(() => {
        titleEl.innerHTML = splitText(slides[idx].title);
        descEl.textContent = slides[idx].description;
        gsap.set(titleEl.children, { y: 20, opacity: 0 });
        gsap.set(descEl, { y: 20, opacity: 0 });
        gsap.to(titleEl.children, { y: 0, opacity: 1, duration: 0.8, stagger: 0.03, ease: "power3.out" });
        gsap.to(descEl, { y: 0, opacity: 1, duration: 0.8, delay: 0.2, ease: "power3.out" });
      }, 500);
    }

    function navigateToSlide(targetIndex) {
      if (isTransitioning || targetIndex === currentSlideIndex) return;
      stopAutoSlideTimer();
      quickResetProgress(currentSlideIndex);

      const currentTexture = slideTextures[currentSlideIndex];
      const targetTexture = slideTextures[targetIndex];
      if (!currentTexture || !targetTexture) return;

      isTransitioning = true;
      shaderMaterial.uniforms.uTexture1.value = currentTexture;
      shaderMaterial.uniforms.uTexture2.value = targetTexture;
      shaderMaterial.uniforms.uTexture1Size.value = currentTexture.userData.size;
      shaderMaterial.uniforms.uTexture2Size.value = targetTexture.userData.size;

      updateContent(targetIndex);
      currentSlideIndex = targetIndex;
      updateCounter(currentSlideIndex);
      updateNavigationState(currentSlideIndex);

      gsap.fromTo(
        shaderMaterial.uniforms.uProgress,
        { value: 0 },
        {
          value: 1,
          duration: TRANSITION_DURATION(),
          ease: "power2.inOut",
          onComplete: () => {
            shaderMaterial.uniforms.uProgress.value = 0;
            shaderMaterial.uniforms.uTexture1.value = targetTexture;
            shaderMaterial.uniforms.uTexture1Size.value = targetTexture.userData.size;
            isTransitioning = false;
            safeStartTimer(100);
          },
        }
      );
    }

    function handleSlideChange() {
      if (isTransitioning || !texturesLoaded || !sliderEnabled) return;
      navigateToSlide((currentSlideIndex + 1) % slides.length);
    }

    function createSlidesNavigation() {
      const nav = document.getElementById("slidesNav");
      if (!nav) return;
      nav.innerHTML = "";
      slides.forEach((slide, i) => {
        const item = document.createElement("div");
        item.className = `slide-nav-item${i === 0 ? " active" : ""}`;
        item.dataset.slideIndex = String(i);
        item.innerHTML = `<div class="slide-progress-line"><div class="slide-progress-fill"></div></div><div class="slide-nav-title">${slide.title}</div>`;
        item.addEventListener("click", (e) => {
          e.stopPropagation();
          if (!isTransitioning && i !== currentSlideIndex) {
            stopAutoSlideTimer();
            quickResetProgress(currentSlideIndex);
            navigateToSlide(i);
          }
        });
        nav.appendChild(item);
      });
    }

    const updateNavigationState = (idx) =>
      document.querySelectorAll(".slide-nav-item").forEach((el, i) => el.classList.toggle("active", i === idx));

    const updateSlideProgress = (idx, prog) => {
      const el = document.querySelectorAll(".slide-nav-item")[idx]?.querySelector(".slide-progress-fill");
      if (el) { el.style.width = `${prog}%`; el.style.opacity = "1"; }
    };
    const fadeSlideProgress = (idx) => {
      const el = document.querySelectorAll(".slide-nav-item")[idx]?.querySelector(".slide-progress-fill");
      if (el) { el.style.opacity = "0"; setTimeout(() => (el.style.width = "0%"), 300); }
    };
    const quickResetProgress = (idx) => {
      const el = document.querySelectorAll(".slide-nav-item")[idx]?.querySelector(".slide-progress-fill");
      if (el) {
        el.style.transition = "width 0.2s ease-out";
        el.style.width = "0%";
        setTimeout(() => (el.style.transition = "width 0.1s ease, opacity 0.3s ease"), 200);
      }
    };
    const updateCounter = (idx) => {
      const sn = document.getElementById("slideNumber");
      if (sn) sn.textContent = String(idx + 1).padStart(2, "0");
      const st = document.getElementById("slideTotal");
      if (st) st.textContent = String(slides.length).padStart(2, "0");
    };

    function startAutoSlideTimer() {
      if (!texturesLoaded || !sliderEnabled) return;
      stopAutoSlideTimer();
      let progress = 0;
      const increment = (100 / SLIDE_DURATION()) * PROGRESS_UPDATE_INTERVAL;
      progressAnimation = setInterval(() => {
        if (!sliderEnabled) { stopAutoSlideTimer(); return; }
        progress += increment;
        updateSlideProgress(currentSlideIndex, progress);
        if (progress >= 100) {
          clearInterval(progressAnimation);
          progressAnimation = null;
          fadeSlideProgress(currentSlideIndex);
          if (!isTransitioning) handleSlideChange();
        }
      }, PROGRESS_UPDATE_INTERVAL);
    }
    function stopAutoSlideTimer() {
      if (progressAnimation) clearInterval(progressAnimation);
      if (autoSlideTimer) clearTimeout(autoSlideTimer);
      progressAnimation = null;
      autoSlideTimer = null;
    }
    function safeStartTimer(delay) {
      stopAutoSlideTimer();
      if (sliderEnabled && texturesLoaded) {
        if (delay > 0) autoSlideTimer = setTimeout(startAutoSlideTimer, delay);
        else startAutoSlideTimer();
      }
    }

    const loadImageTexture = (src) =>
      new Promise((resolve, reject) => {
        const loader = new THREE.TextureLoader();
        loader.load(
          src,
          (t) => {
            t.minFilter = t.magFilter = THREE.LinearFilter;
            t.userData = { size: new THREE.Vector2(t.image.width, t.image.height) };
            resolve(t);
          },
          undefined,
          reject
        );
      });

    async function initRenderer() {
      const canvas = document.querySelector(".webgl-canvas");
      if (!canvas) return;
      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      shaderMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTexture1: { value: null },
          uTexture2: { value: null },
          uProgress: { value: 0 },
          uResolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
          uTexture1Size: { value: new THREE.Vector2(1, 1) },
          uTexture2Size: { value: new THREE.Vector2(1, 1) },
          uGlobalIntensity: { value: SLIDER_CONFIG.settings.globalIntensity },
          uSpeedMultiplier: { value: SLIDER_CONFIG.settings.speedMultiplier },
          uDistortionStrength: { value: SLIDER_CONFIG.settings.distortionStrength },
          uGlassRefractionStrength: { value: SLIDER_CONFIG.settings.glassRefractionStrength },
          uGlassChromaticAberration: { value: SLIDER_CONFIG.settings.glassChromaticAberration },
          uGlassBubbleClarity: { value: SLIDER_CONFIG.settings.glassBubbleClarity },
          uGlassEdgeGlow: { value: SLIDER_CONFIG.settings.glassEdgeGlow },
          uGlassLiquidFlow: { value: SLIDER_CONFIG.settings.glassLiquidFlow },
        },
        vertexShader,
        fragmentShader,
      });
      scene.add(new THREE.Mesh(new THREE.PlaneGeometry(2, 2), shaderMaterial));

      for (const s of slides) {
        try { slideTextures.push(await loadImageTexture(s.media)); }
        catch { console.warn("Lumina slider: photo introuvable", s.media); }
      }

      if (slideTextures.length >= 2) {
        shaderMaterial.uniforms.uTexture1.value = slideTextures[0];
        shaderMaterial.uniforms.uTexture2.value = slideTextures[1];
        shaderMaterial.uniforms.uTexture1Size.value = slideTextures[0].userData.size;
        shaderMaterial.uniforms.uTexture2Size.value = slideTextures[1].userData.size;
        texturesLoaded = true;
        sliderEnabled = true;
        document.querySelector(".slider-wrapper")?.classList.add("loaded");
        safeStartTimer(500);
      }

      const render = () => { requestAnimationFrame(render); renderer.render(scene, camera); };
      render();
    }

    createSlidesNavigation();
    updateCounter(0);

    const tEl = document.getElementById("mainTitle");
    const dEl = document.getElementById("mainDesc");
    if (tEl && dEl) {
      tEl.innerHTML = splitText(slides[0].title);
      dEl.textContent = slides[0].description;
      gsap.fromTo(tEl.children, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, stagger: 0.03, ease: "power3.out", delay: 0.5 });
      gsap.fromTo(dEl, { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.8 });
    }

    initRenderer();

    document.addEventListener("visibilitychange", () => (document.hidden ? stopAutoSlideTimer() : (!isTransitioning && safeStartTimer(0))));
    window.addEventListener("resize", () => {
      if (renderer) {
        renderer.setSize(window.innerWidth, window.innerHeight);
        shaderMaterial.uniforms.uResolution.value.set(window.innerWidth, window.innerHeight);
      }
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", loadScripts);
  } else {
    loadScripts();
  }
})();
