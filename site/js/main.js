(function () {
  'use strict';

  const header = document.getElementById('header');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav');
  const yearEl = document.getElementById('year');
  const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  let ticking = false;

  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }

  /* Header scroll */
  function onScroll() {
    if (!header) {
      return;
    }

    if (window.scrollY > 20) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Mobile menu */
  if (burger && nav) {
    burger.addEventListener('click', function () {
      const expanded = burger.getAttribute('aria-expanded') === 'true';
      burger.setAttribute('aria-expanded', String(!expanded));
      burger.setAttribute('aria-label', expanded ? 'Ouvrir le menu' : 'Fermer le menu');
      nav.classList.toggle('open');
    });

    document.addEventListener('keydown', function (event) {
      if (event.key !== 'Escape' || !nav.classList.contains('open')) {
        return;
      }

      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Ouvrir le menu');
      nav.classList.remove('open');
      burger.focus();
    });

    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () {
        burger.setAttribute('aria-expanded', 'false');
        burger.setAttribute('aria-label', 'Ouvrir le menu');
        nav.classList.remove('open');
      });
    });
  }

  /* Titres : découpage mot à mot pour apparition progressive */
  const wordHeadings = document.querySelectorAll(
    '.section__header h2, .split__content h2, .contact-info h2'
  );

  wordHeadings.forEach(function (el) {
    const text = el.textContent.trim();
    el.setAttribute('aria-label', text);
    el.classList.add('words');
    el.innerHTML = text
      .split(/\s+/)
      .map(function (word, i) {
        return '<span class="w" aria-hidden="true" style="transition-delay:' + i * 45 + 'ms">' + word + '</span>';
      })
      .join(' ');
  });

  /* Étincelle commune : le tiret de chaque label de section se dessine */
  const sparkLabels = document.querySelectorAll('.section__label');

  sparkLabels.forEach(function (el) {
    el.classList.add('spark');
  });

  /* Scroll reveal */
  const revealEls = document.querySelectorAll(
    '.card, .pricing__main, .pricing__row, .examples__item, .feature, .faq__item, .contact-map, .contact-action, .section__header'
  );

  revealEls.forEach(function (el, index) {
    el.classList.add('reveal');
    el.style.setProperty('--reveal-delay', Math.min(index % 6, 5) * 70 + 'ms');
  });

  const observedEls = Array.prototype.slice.call(revealEls)
    .concat(Array.prototype.slice.call(wordHeadings))
    .concat(Array.prototype.slice.call(sparkLabels));

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    observedEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    observedEls.forEach(function (el) {
      el.classList.add('visible');
    });
  }

  /* Hero : références du récit épinglé */
  const hero = document.querySelector('.hero');
  const heroSticky = document.querySelector('.hero__sticky');
  let pointerX = -10000;
  let pointerY = -10000;

  /* Subtle hero pointer light */
  if (heroSticky && !motionQuery.matches) {
    heroSticky.addEventListener('pointermove', function (event) {
      const rect = heroSticky.getBoundingClientRect();
      pointerX = event.clientX - rect.left;
      pointerY = event.clientY - rect.top;
      heroSticky.style.setProperty('--hero-x', ((pointerX / rect.width) * 100).toFixed(2) + '%');
      heroSticky.style.setProperty('--hero-y', ((pointerY / rect.height) * 100).toFixed(2) + '%');
    });

    heroSticky.addEventListener('pointerleave', function () {
      pointerX = -10000;
      pointerY = -10000;
    });
  }

  /* Vidéo du hero, jamais en boucle : pilotée image par image par le
     scroll (elle avance quand on descend, recule quand on remonte).
     Retirée en cas d'erreur de chargement — dégradé + particules restent. */
  const heroVideo = document.getElementById('hero-video');
  let heroVideoDuration = 0;

  if (heroVideo) {
    heroVideo.pause();

    function onVideoMeta() {
      heroVideoDuration = heroVideo.duration;

      /* Reduced motion : pas de scrub, on fige sur l'ampoule allumée */
      if (motionQuery.matches) {
        heroVideo.currentTime = Math.max(0, heroVideoDuration - 0.08);
        return;
      }

      /* iOS n'affiche pas les frames d'une vidéo jamais lue : on
         l'amorce par une lecture muette immédiatement mise en pause */
      const prime = heroVideo.play();

      if (prime && prime.then) {
        prime
          .then(function () {
            heroVideo.pause();
            requestFrame();
          })
          .catch(function () {
            requestFrame();
          });
      } else {
        requestFrame();
      }
    }

    if (heroVideo.readyState >= 1) {
      onVideoMeta();
    } else {
      heroVideo.addEventListener('loadedmetadata', onVideoMeta);
    }

    heroVideo.addEventListener(
      'error',
      function () {
        heroVideo.remove();
      },
      true
    );
  }

  /* « Vidéo » générative du hero : particules électriques connectées,
     attirées par le pointeur. La boucle s'arrête dès que le hero sort
     de l'écran et redémarre quand il revient. */
  const heroCanvas = document.getElementById('hero-canvas');
  let sparksRunning = false;
  let startSparks = null;

  if (hero && heroSticky && heroCanvas && !motionQuery.matches && heroCanvas.getContext) {
    const ctx = heroCanvas.getContext('2d');
    let cw = 0;
    let ch = 0;
    let parts = [];

    function sizeSparks() {
      if (cw === heroSticky.clientWidth && Math.abs(ch - heroSticky.clientHeight) < 120) {
        return;
      }

      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cw = heroSticky.clientWidth;
      ch = heroSticky.clientHeight;
      heroCanvas.width = Math.round(cw * dpr);
      heroCanvas.height = Math.round(ch * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.min(64, Math.max(26, Math.round(cw / 24)));
      parts = [];

      for (let i = 0; i < count; i++) {
        parts.push({
          x: Math.random() * cw,
          y: Math.random() * ch,
          vx: (Math.random() - 0.5) * 0.4,
          vy: (Math.random() - 0.5) * 0.4,
          r: Math.random() * 1.7 + 0.7,
          gold: Math.random() < 0.22
        });
      }
    }

    function drawSparks() {
      if (hero.getBoundingClientRect().bottom <= 0) {
        sparksRunning = false;
        return;
      }

      ctx.clearRect(0, 0, cw, ch);

      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < -10) { p.x = cw + 10; } else if (p.x > cw + 10) { p.x = -10; }
        if (p.y < -10) { p.y = ch + 10; } else if (p.y > ch + 10) { p.y = -10; }

        const dx = pointerX - p.x;
        const dy = pointerY - p.y;
        const d2 = dx * dx + dy * dy;

        if (d2 < 19600 && d2 > 1) {
          const d = Math.sqrt(d2);
          p.vx += (dx / d) * 0.012;
          p.vy += (dy / d) * 0.012;
        }

        p.vx *= 0.992;
        p.vy *= 0.992;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = p.gold ? 'rgba(255, 194, 26, 0.55)' : 'rgba(99, 210, 255, 0.5)';
        ctx.fill();
      }

      ctx.lineWidth = 1;

      for (let i = 0; i < parts.length; i++) {
        for (let j = i + 1; j < parts.length; j++) {
          const a = parts[i];
          const b = parts[j];
          const ddx = a.x - b.x;
          const ddy = a.y - b.y;
          const dd2 = ddx * ddx + ddy * ddy;

          if (dd2 < 12100) {
            const alpha = (1 - Math.sqrt(dd2) / 110) * 0.14;
            ctx.strokeStyle = 'rgba(99, 210, 255, ' + alpha.toFixed(3) + ')';
            ctx.beginPath();
            ctx.moveTo(a.x, a.y);
            ctx.lineTo(b.x, b.y);
            ctx.stroke();
          }
        }
      }

      window.requestAnimationFrame(drawSparks);
    }

    startSparks = function () {
      if (!sparksRunning) {
        sparksRunning = true;
        window.requestAnimationFrame(drawSparks);
      }
    };

    sizeSparks();
    startSparks();
    window.addEventListener('resize', sizeSparks, { passive: true });
  }

  /* Barre de progression + fil conducteur : la « charge » globale */
  const progressBar = document.getElementById('scroll-progress');
  const threadFill = document.querySelector('.thread__fill');

  function clamp01(v) {
    return Math.min(1, Math.max(0, v));
  }

  function updateProgressBar() {
    const max = document.documentElement.scrollHeight - window.innerHeight;
    const p = (max > 0 ? clamp01(window.scrollY / max) : 0).toFixed(4);

    if (progressBar) {
      progressBar.style.transform = 'scaleX(' + p + ')';
    }
    if (threadFill) {
      threadFill.style.transform = 'scaleY(' + p + ')';
    }
  }

  /* Scrollspy commun : liens de nav + nœuds du fil conducteur */
  const spyLinks = Array.prototype.slice.call(
    document.querySelectorAll('.nav__list a[href^="#"], .thread a[href^="#"]')
  );
  const spyTargets = [];
  const spySeen = {};

  spyLinks.forEach(function (link) {
    const id = link.hash.slice(1);
    const section = document.getElementById(id);

    if (section && !spySeen[id]) {
      spySeen[id] = true;
      spyTargets.push(section);
    }
  });

  function updateSpy() {
    if (!spyTargets.length) {
      return;
    }

    const line = Math.max(130, window.innerHeight * 0.3);
    let currentId = '';

    spyTargets.forEach(function (section) {
      const rect = section.getBoundingClientRect();
      if (rect.top <= line && rect.bottom > line) {
        currentId = section.id;
      }
    });

    spyLinks.forEach(function (link) {
      const isActive = currentId !== '' && link.hash === '#' + currentId;
      link.classList.toggle('active', isActive);
      if (isActive) {
        link.setAttribute('aria-current', 'true');
      } else {
        link.removeAttribute('aria-current');
      }
    });
  }

  /* Récit du hero piloté en continu par le scroll : chaque pixel de
     scroll fait évoluer l'intro, le visuel et la vidéo — dans les deux
     sens (on remonte, tout rembobine) */
  const heroIntroEl = hero ? hero.querySelector('.hero__intro') : null;
  const heroStoryEl = hero ? hero.querySelector('.hero__story') : null;
  const heroCardWrap = hero ? hero.querySelector('.hero__cardwrap') : null;
  const heroSceneEl = hero ? hero.querySelector('.hero__scene') : null;
  const storySteps = hero ? hero.querySelectorAll('.scrolly__step') : [];
  const storyCounter = hero ? hero.querySelector('.scrolly__counter') : null;
  const storyBarFill = hero ? hero.querySelector('.scrolly__bar-fill') : null;

  /* Scène maison / téléphone : le courant se trace du téléphone au
     tableau puis à l'ampoule au fil des étapes */
  const sceneWire = hero ? hero.querySelector('.scene__wire') : null;
  /* getTotalLength() lève une exception sur un SVG non rendu
     (display:none) dans Safari et Firefox — longueur de repli mesurée */
  let sceneWireLen = 380;

  if (sceneWire) {
    try {
      sceneWireLen = sceneWire.getTotalLength();
    } catch (e) {
      /* scène masquée (mobile) : la valeur de repli suffit */
    }
  }
  const sceneBulbGlow = hero ? hero.querySelector('.scene__bulb-glow') : null;
  const sceneBulb = hero ? hero.querySelector('.scene__bulb') : null;
  const sceneLed = hero ? hero.querySelector('.scene__led') : null;
  const scenePulse = hero ? hero.querySelector('.scene__pulse') : null;
  const sceneHouse = hero ? hero.querySelector('.scene__house') : null;

  if (sceneWire) {
    sceneWire.style.strokeDasharray = String(sceneWireLen);
    sceneWire.style.strokeDashoffset = String(sceneWireLen);
  }

  function updateScene(sp) {
    if (sceneWire) {
      sceneWire.style.strokeDashoffset = String(sceneWireLen * (1 - clamp01(sp * 1.3)));
    }

    const lit = clamp01((sp - 0.6) / 0.32);

    if (sceneBulbGlow) {
      sceneBulbGlow.style.opacity = String(lit * 0.9);
    }
    if (sceneBulb) {
      sceneBulb.style.opacity = String(0.55 + lit * 0.45);
    }
    if (sceneHouse) {
      sceneHouse.style.opacity = String(0.55 + lit * 0.45);
    }
    if (sceneLed) {
      sceneLed.setAttribute('fill', sp > 0.55 ? '#2dd4bf' : 'rgba(255,255,255,0.3)');
    }
    if (scenePulse) {
      scenePulse.style.opacity = String(clamp01(1 - sp * 2.6));
    }
  }

  function smooth01(v) {
    v = clamp01(v);
    return v * v * (3 - 2 * v);
  }

  function scrubHeroVideo(p) {
    if (!heroVideo || !heroVideo.isConnected || !heroVideoDuration || motionQuery.matches) {
      return;
    }

    const t = p * Math.max(0, heroVideoDuration - 0.08);

    if (Math.abs(heroVideo.currentTime - t) > 0.04) {
      heroVideo.currentTime = t;
    }
  }

  function updateHeroStory(vh) {
    if (!hero || !heroSticky || !storySteps.length) {
      return;
    }

    const rect = hero.getBoundingClientRect();
    const total = rect.height - vh;

    if (total < 80) {
      return;
    }

    const p = clamp01(-rect.top / total);

    /* La vidéo suit la progression sur toute la traversée du hero */
    scrubHeroVideo(p);

    if (motionQuery.matches) {
      /* Layout empilé géré par le CSS : on retire tout pilotage inline */
      [heroIntroEl, heroStoryEl, heroCardWrap, heroSceneEl].forEach(function (el) {
        if (el) {
          el.style.opacity = '';
          el.style.translate = '';
          el.style.pointerEvents = '';
        }
      });
      storySteps.forEach(function (step) {
        step.classList.add('is-active');
      });
      return;
    }

    /* Fondu continu intro → récit */
    const introK = 1 - smooth01((p - 0.05) / 0.13);
    const storyK = smooth01((p - 0.17) / 0.14);

    if (heroIntroEl) {
      heroIntroEl.style.opacity = introK.toFixed(3);
      heroIntroEl.style.translate = '0 ' + (-(1 - introK) * 64).toFixed(1) + 'px';
      heroIntroEl.style.pointerEvents = introK > 0.5 ? 'auto' : 'none';
    }
    if (heroCardWrap) {
      heroCardWrap.style.opacity = introK.toFixed(3);
      heroCardWrap.style.translate = '0 ' + (-(1 - introK) * 40).toFixed(1) + 'px';
      heroCardWrap.style.pointerEvents = introK > 0.5 ? 'auto' : 'none';
    }
    if (heroStoryEl) {
      heroStoryEl.style.opacity = storyK.toFixed(3);
      heroStoryEl.style.translate = '0 ' + ((1 - storyK) * 46).toFixed(1) + 'px';
      heroStoryEl.style.pointerEvents = storyK > 0.5 ? 'auto' : 'none';
    }
    if (heroSceneEl) {
      heroSceneEl.style.opacity = storyK.toFixed(3);
      heroSceneEl.style.translate = '0 ' + ((1 - storyK) * 30).toFixed(1) + 'px';
    }

    const sp = clamp01((p - 0.26) / 0.68);
    const idx = Math.min(storySteps.length - 1, Math.floor(sp * storySteps.length));
    const storyOn = storyK > 0.1;

    storySteps.forEach(function (step, i) {
      step.classList.toggle('is-active', storyOn && i === idx);
    });

    if (storyCounter) {
      storyCounter.textContent = '0' + (idx + 1);
    }
    if (storyBarFill) {
      storyBarFill.style.transform = 'scaleX(' + sp.toFixed(3) + ')';
    }

    /* La scène se trace au rythme des étapes */
    updateScene(sp);
  }

  /* Rail « courant » des petits travaux : la ligne se remplit au scroll
     et chaque numéro s'allume à son passage */
  const examples = document.querySelector('.examples');
  const exampleItems = examples ? examples.querySelectorAll('.examples__item') : [];

  function updateRail(vh) {
    if (!examples) {
      return;
    }

    const rect = examples.getBoundingClientRect();

    if (rect.bottom < 0 || rect.top > vh) {
      return;
    }

    const line = vh * 0.78;
    examples.style.setProperty('--rail-p', clamp01((line - rect.top) / rect.height).toFixed(3));

    exampleItems.forEach(function (item) {
      item.classList.toggle('is-lit', item.getBoundingClientRect().top + 24 < line);
    });
  }

  /* Parallax de profondeur léger sur les cartes des sections (desktop) */
  const parallaxEls = [];

  document.querySelectorAll('.cards .card').forEach(function (el, i) {
    parallaxEls.push({ el: el, speed: [0.055, 0.025, 0.07][i % 3] });
  });
  document.querySelectorAll('.features .feature').forEach(function (el, i) {
    parallaxEls.push({ el: el, speed: i % 2 ? -0.03 : 0.03 });
  });

  const contactMap = document.querySelector('.contact-map');
  if (contactMap) {
    parallaxEls.push({ el: contactMap, speed: 0.04 });
  }

  function updateSectionParallax(vh) {
    parallaxEls.forEach(function (p) {
      const rect = p.el.getBoundingClientRect();

      if (rect.bottom < -120 || rect.top > vh + 120) {
        return;
      }

      const fromCenter = rect.top + rect.height / 2 - vh / 2;
      p.el.style.translate = '0 ' + (fromCenter * p.speed).toFixed(1) + 'px';
    });
  }

  /* Compteur du prix : 0 → 125 à l'apparition */
  const amountEl = document.querySelector('.pricing__amount-value');

  if (amountEl && 'IntersectionObserver' in window && !motionQuery.matches) {
    const target = parseInt(amountEl.textContent, 10);

    if (!isNaN(target)) {
      amountEl.textContent = '0';

      const amountObserver = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) {
              return;
            }

            amountObserver.disconnect();
            const start = performance.now();
            const duration = 1100;

            (function tick(now) {
              const k = Math.min(1, (now - start) / duration);
              const eased = 1 - Math.pow(1 - k, 3);
              amountEl.textContent = String(Math.round(target * eased));

              if (k < 1) {
                window.requestAnimationFrame(tick);
              }
            })(start);
          });
        },
        { threshold: 0.6 }
      );

      amountObserver.observe(amountEl);
    }
  }

  /* Boucle scroll unique (rAF) pour tous les effets liés au scroll */
  function onFrame() {
    ticking = false;
    const vh = window.innerHeight;

    if (!motionQuery.matches && window.innerWidth > 900) {
      updateSectionParallax(vh);
    }

    updateHeroStory(vh);
    updateProgressBar();
    updateRail(vh);
    updateSpy();

    if (startSparks && hero && hero.getBoundingClientRect().bottom > 0) {
      startSparks();
    }
  }

  function requestFrame() {
    if (!ticking) {
      ticking = true;
      window.requestAnimationFrame(onFrame);
    }
  }

  window.addEventListener('scroll', requestFrame, { passive: true });
  window.addEventListener('resize', requestFrame, { passive: true });

  /* Onglet remis au premier plan : un rAF a pu être avalé pendant la
     suspension — on relance la boucle pour resynchroniser l'état */
  document.addEventListener('visibilitychange', function () {
    if (document.visibilityState === 'visible') {
      ticking = false;
      requestFrame();
    }
  });

  requestFrame();
})();
