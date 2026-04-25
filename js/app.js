/* global window, document, history, location, localStorage, Image */
(() => {
  const QUEST = window.__QUEST__;
  const STORAGE_KEY = QUEST.meta.storageKey;
  const STAGES_TOTAL = QUEST.stages.length;

  const appRoot = document.getElementById("app");

  const state = {
    finalPhotoStatus: "unknown",
  };

  function escapeHtml(value) {
    return String(value)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
  }

  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { completedCount: 0, completedIds: [] };
      const parsed = JSON.parse(raw);
      const completedCount = Number(parsed?.completedCount ?? 0);
      const completedIds = Array.isArray(parsed?.completedIds) ? parsed.completedIds.map(String) : [];
      return {
        completedCount: Number.isFinite(completedCount) ? clamp(completedCount, 0, STAGES_TOTAL) : 0,
        completedIds,
      };
    } catch {
      return { completedCount: 0, completedIds: [] };
    }
  }

  function saveProgress(progress) {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        completedCount: progress.completedCount,
        completedIds: progress.completedIds,
      }),
    );
  }

  function resetProgress() {
    localStorage.removeItem(STORAGE_KEY);
    navigateToMenu(true);
  }

  function parseRoute() {
    const raw = (location.hash || "#menu").replace(/^#/, "");
    if (!raw || raw === "menu") return { name: "menu" };
    const stageMatch = raw.match(/^stage\/(\d+)$/);
    if (stageMatch) return { name: "stage", stageNumber: Number(stageMatch[1]) };
    return { name: "menu" };
  }

  function navigateToMenu(replace = false) {
    if (replace) history.replaceState(null, "", "#menu");
    else location.hash = "#menu";
    render();
  }

  function navigateToStage(stageNumber, replace = false) {
    const hash = `#stage/${stageNumber}`;
    if (replace) history.replaceState(null, "", hash);
    else location.hash = hash;
    render();
  }

  function ensureFinalPhotoLoaded() {
    if (state.finalPhotoStatus !== "unknown") return;
    const img = new Image();
    img.onload = () => {
      state.finalPhotoStatus = "ok";
      render();
    };
    img.onerror = () => {
      state.finalPhotoStatus = "missing";
      render();
    };
    img.src = QUEST.meta.finalPhotoSrc;
  }

  function getMosaicConfig() {
    if (STAGES_TOTAL >= 16) {
      return { columns: 4, rows: 4, tilesCount: 16 };
    }
    const tilesCount = STAGES_TOTAL;
    const columns = tilesCount <= 6 ? 3 : tilesCount <= 8 ? 4 : 5;
    const rows = Math.ceil(tilesCount / columns);
    return { columns, rows, tilesCount };
  }

  function getStageCover(stage) {
    return stage.coverImage || stage.gallery?.[0]?.src || QUEST.meta.finalPhotoSrc;
  }

  function render() {
    ensureFinalPhotoLoaded();

    const progress = loadProgress();
    const route = parseRoute();

    if (route.name === "stage") {
      const stageNumber = route.stageNumber;
      if (!Number.isFinite(stageNumber) || stageNumber < 1 || stageNumber > STAGES_TOTAL) {
        navigateToMenu(true);
        return;
      }

      const stageIndex = stageNumber - 1;
      const isUnlocked = stageIndex <= progress.completedCount;
      if (!isUnlocked) {
        navigateToMenu(true);
        return;
      }

      appRoot.innerHTML = renderStageView(stageIndex, progress);
      wireStageView(stageIndex);
      return;
    }

    appRoot.innerHTML = renderMenuView(progress);
    wireMenuView(progress);
  }

  function renderMenuView(progress) {
    const completed = progress.completedCount;
    const canLearnNew = completed < STAGES_TOTAL;
    const showStageList = completed > 0 || completed === STAGES_TOTAL;
    const visibleStageCount = showStageList ? Math.min(STAGES_TOTAL, completed + (completed < STAGES_TOTAL ? 1 : 0)) : 0;
    const nextStageTitle = canLearnNew ? QUEST.stages[completed].title : "Маршрут завершен";
    const routeSteps = QUEST.stages.map((stage, idx) => renderRouteStep(stage, idx, progress)).join("");
    const mosaic = renderMosaic(progress);

    const hintFinal =
      state.finalPhotoStatus === "missing"
        ? `<div class="note note--warn">
             <div class="note__title">Нужна итоговая композиция</div>
             <div class="note__body">Добавьте файл <code>${escapeHtml(QUEST.meta.finalPhotoSrc)}</code>, чтобы мозаика собиралась из общей фотографии.</div>
           </div>`
        : "";

    return `
      <header class="topbar topbar--overlay">
        <div class="topbar__brand">
          <div class="topbar__title">${escapeHtml(QUEST.meta.title)}</div>
          <div class="topbar__subtitle">${escapeHtml(QUEST.meta.subtitle)}</div>
        </div>
        <div class="topbar__actions">
          <button class="btn btn--ghost" type="button" id="resetBtn">Сбросить прогресс</button>
        </div>
      </header>

      <main class="main main--menu" id="main">
        <section class="hero hero--menu hero--fullbleed" style="--hero-bg:url('${escapeHtml(QUEST.stages[0].coverImage)}')">
          <div class="hero__backdrop"></div>
          <div class="hero__inner">
            <div class="hero__content">
              <h1 class="hero__heading">${escapeHtml(QUEST.meta.title)}</h1>
              <p class="hero__text">
                Открывайте маршрут по Мостовскому району шаг за шагом: от общей истории к Неману, Мостам, Дубно,
                памятным местам и музейным точкам, из которых складывается единая картина района.
              </p>
            </div>

            <button
              class="hero-map"
              type="button"
              data-lightbox-src="${escapeHtml(QUEST.meta.routeMapSrc || "")}"
              data-lightbox-alt="${escapeHtml(QUEST.meta.routeMapCaption || "Картосхема маршрута")}"
              data-lightbox-caption="${escapeHtml(QUEST.meta.routeMapCaption || "Картосхема маршрута")}"
            >
              <img src="${escapeHtml(QUEST.meta.routeMapSrc || "")}" alt="${escapeHtml(QUEST.meta.routeMapCaption || "Картосхема маршрута")}" loading="lazy" decoding="async" />
              <span class="hero-map__chip">Открыть картосхему</span>
            </button>

            <div class="hero__aside">
              <div class="hero__meta">
                <div class="kpi">
                  <div class="kpi__label">Прогресс маршрута</div>
                  <div class="kpi__value">${completed}/${STAGES_TOTAL}</div>
                </div>
                <div class="hero__next">
                  <div class="hero__nextLabel">Следующий объект</div>
                  <div class="hero__nextValue">${escapeHtml(nextStageTitle)}</div>
                </div>
              </div>

              <div class="hero__cta">
                ${
                  canLearnNew
                    ? `<button class="btn btn--primary btn--big" id="learnNewBtn" type="button">Узнать новое</button>`
                    : `<button class="btn btn--primary btn--big" id="learnNewBtn" type="button" disabled>Все этапы пройдены</button>`
                }
              </div>
            </div>
          </div>
        </section>

        ${hintFinal}

        <section class="panel panel--dark route-combo">
          <div class="panel__title">Маршрут и композиция</div>
          <div class="panel__body">
            <div class="route-combo__grid">
              <div class="route-combo__steps">
                <div class="route-strip__steps" role="list">
                  ${routeSteps}
                </div>
              </div>
              <div class="route-combo__mosaic">
                ${mosaic}
              </div>
            </div>
            <div class="mosaic__foot">
              <div class="muted">Фрагменты из фото открываются частично и постепенно собираются как пазл.</div>
              ${state.finalPhotoStatus === "ok" ? `<button class="btn btn--ghost" id="openPosterBtn" type="button">Открыть фото целиком</button>` : ""}
            </div>
          </div>
        </section>

        ${
          showStageList
            ? `<section class="panel panel--dark">
                 <div class="panel__title">Открытые этапы</div>
                 <div class="panel__body">
                   <div class="stage-list" role="list">
                     ${QUEST.stages
                       .slice(0, visibleStageCount)
                       .map((stage, idx) => renderStageListItem(stage, idx, progress))
                       .join("")}
                   </div>
                 </div>
               </section>`
            : ""
        }
      </main>

      <footer class="footer">
        <div>© <span id="year"></span> ${escapeHtml(QUEST.meta.title)}</div>
      </footer>
    `;
  }

  function renderRouteStep(stage, stageIndex, progress) {
    const isDone = stageIndex < progress.completedCount;
    const isCurrent = stageIndex === progress.completedCount && progress.completedCount < STAGES_TOTAL;
    const tone = isDone ? "route-step--done" : isCurrent ? "route-step--current" : "route-step--locked";
    const stateLabel = isDone ? "Пройден" : isCurrent ? "Сейчас открыт" : "Закрыт";

    return `
      <div class="route-step ${tone}" role="listitem" aria-label="${escapeHtml(stage.title)}: ${escapeHtml(stateLabel)}">
        <div class="route-step__index">${String(stageIndex + 1).padStart(2, "0")}</div>
        <div class="route-step__body">
          <div class="route-step__title">${escapeHtml(stage.title)}</div>
          <div class="route-step__meta">${escapeHtml(stateLabel)}</div>
        </div>
      </div>
    `;
  }

  function renderStageListItem(stage, stageIndex, progress) {
    const completed = stageIndex < progress.completedCount;
    const isCurrent = stageIndex === progress.completedCount && progress.completedCount < STAGES_TOTAL;
    const status = completed ? "Пройден" : isCurrent ? "Открыт сейчас" : "Открыт";
    const cover = getStageCover(stage);
    const tone = completed ? "stage-item--done" : isCurrent ? "stage-item--next" : "stage-item--open";
    const icon = completed ? "✓" : isCurrent ? "→" : "•";

    return `
      <button class="stage-item ${tone}" role="listitem" type="button" data-stage="${stageIndex + 1}" style="--stage-preview:url('${escapeHtml(
        cover,
      )}')">
        <div class="stage-item__thumb" aria-hidden="true"></div>
        <div class="stage-item__icon" aria-hidden="true">${icon}</div>
        <div class="stage-item__content">
          <div class="stage-item__title">${escapeHtml(stage.title)}</div>
          <div class="stage-item__meta">${escapeHtml(status)}</div>
        </div>
      </button>
    `;
  }

  function renderMosaic(progress) {
    const { columns, rows, tilesCount } = getMosaicConfig();
    return `
      <div class="mosaic" style="--final-photo:url('${escapeHtml(QUEST.meta.finalPhotoSrc)}');--mosaic-cols:${columns};--mosaic-rows:${rows}" aria-label="Мозаика прогресса">
        ${renderMosaicTiles(progress, columns, rows, tilesCount)}
      </div>
    `;
  }

  function renderMosaicTiles(progress, columns, rows, tilesCount) {
    const completed = progress.completedCount;
    const allDone = completed >= STAGES_TOTAL;
    const tiles = [];

    for (let i = 0; i < tilesCount; i++) {
      const revealed = i < completed;
      tiles.push(renderMosaicTile(i, revealed, allDone, columns, rows));
    }

    return tiles.join("");
  }

  function renderMosaicTile(tileIndex, revealed, allDone, columns, rows) {
    const col = tileIndex % columns;
    const row = Math.floor(tileIndex / columns);
    const posX = columns === 1 ? 0 : (col * 100) / (columns - 1);
    const posY = rows === 1 ? 0 : (row * 100) / (rows - 1);
    const shiftX = ((tileIndex * 7) % 23) - 11;
    const shiftY = ((tileIndex * 11) % 25) - 12;
    const rotate = ((tileIndex * 5) % 14) - 7;
    const title = `Этап ${tileIndex + 1}`;
    const hint = revealed ? (allDone ? "Фрагмент открыт" : "Фрагмент открыт частично") : "Закрыт";

    return `
      <div
        class="mosaic__tile mosaic__tile--photo ${revealed ? "is-revealed" : "is-hidden"} ${allDone ? "is-color" : "is-gray"} ${revealed && !allDone ? "is-partial" : ""}"
        style="--pos-x:${posX}%;--pos-y:${posY}%;--piece-shift-x:${shiftX}px;--piece-shift-y:${shiftY}px;--piece-rot:${rotate}deg"
        aria-label="${escapeHtml(title)}"
        ${state.finalPhotoStatus === "ok" ? 'data-open-poster="1"' : ""}
      >
        <div class="mosaic__mask"></div>
        <div class="mosaic__meta">
          <div class="mosaic__title">${escapeHtml(title)}</div>
          <div class="mosaic__hint">${escapeHtml(hint)}</div>
        </div>
      </div>
    `;
  }

  function wireMenuView(progress) {
    wireLightbox();

    document.getElementById("year").textContent = String(new Date().getFullYear());

    const learnNewBtn = document.getElementById("learnNewBtn");
    if (learnNewBtn && !learnNewBtn.disabled) {
      learnNewBtn.addEventListener("click", () => {
        navigateToStage(progress.completedCount + 1);
      });
    }

    document.getElementById("resetBtn").addEventListener("click", () => {
      const ok = confirm("Сбросить прогресс? Это действие нельзя отменить.");
      if (ok) resetProgress();
    });

    const openPosterBtn = document.getElementById("openPosterBtn");
    if (openPosterBtn) {
      openPosterBtn.addEventListener("click", openFinalPoster);
    }

    document.querySelectorAll("[data-open-poster]").forEach((tile) => {
      tile.addEventListener("click", openFinalPoster);
    });

    document.querySelectorAll("[data-stage]").forEach((btn) => {
      btn.addEventListener("click", () => {
        navigateToStage(Number(btn.getAttribute("data-stage")));
      });
    });

    document.querySelectorAll("[data-lightbox-src]").forEach((btn) => {
      if (btn.dataset.lbWired === "1") return;
      btn.dataset.lbWired = "1";
      btn.addEventListener("click", () => {
        openLightbox({
          src: btn.getAttribute("data-lightbox-src"),
          alt: btn.getAttribute("data-lightbox-alt") || "",
          caption: btn.getAttribute("data-lightbox-caption") || "",
        });
      });
    });
  }

  function renderStageView(stageIndex, progress) {
    const stage = QUEST.stages[stageIndex];
    const stageNumber = stageIndex + 1;
    const completedAlready = stageIndex < progress.completedCount;
    const progressText = `${progress.completedCount}/${STAGES_TOTAL}`;
    const cover = getStageCover(stage);

    const sectionsHtml = stage.sections
      .map(
        (section) => `
          <section class="stage-section">
            <h2 class="stage-section__title">${escapeHtml(section.heading)}</h2>
            <p class="stage-section__body">${escapeHtml(section.body)}</p>
          </section>
        `,
      )
      .join("");

    const galleryHtml =
      stage.gallery && stage.gallery.length
        ? `
            <section class="panel panel--dark">
              <div class="panel__title">Иллюстрации этапа</div>
              <div class="panel__body">
                <div class="gallery" role="list">
                  ${stage.gallery
                    .map((img) => {
                      const shape = img.shape || "wide";
                      return `
                        <button
                          class="gallery__item gallery__item--${escapeHtml(shape)}"
                          type="button"
                          role="listitem"
                          data-lightbox-src="${escapeHtml(img.src)}"
                          data-lightbox-alt="${escapeHtml(img.alt || "")}"
                          data-lightbox-caption="${escapeHtml(img.caption || "")}"
                        >
                          <img src="${escapeHtml(img.src)}" loading="lazy" decoding="async" alt="${escapeHtml(img.alt || "")}" />
                          ${img.caption ? `<div class="gallery__caption">${escapeHtml(img.caption)}</div>` : ""}
                        </button>
                      `;
                    })
                    .join("")}
                </div>
              </div>
            </section>
          `
        : "";

    return `
      <header class="topbar topbar--overlay">
        <div class="topbar__brand">
          <button class="backlink" type="button" id="backToMenu">← В меню</button>
          <div class="topbar__title">${escapeHtml(QUEST.meta.title)}</div>
          <div class="topbar__subtitle">Этап ${stageNumber} из ${STAGES_TOTAL} • Прогресс ${escapeHtml(progressText)}</div>
        </div>
      </header>

      <main class="main">
        <article class="stage stage--cover" style="--stage-cover:url('${escapeHtml(cover)}')">
          <div class="stage__overlay"></div>
          <div class="stage__inner">
            <div class="stage__kicker">${completedAlready ? "Раздел маршрута" : "Маршрут продолжается"}</div>
            <h1 class="stage__title">${escapeHtml(stage.title)}</h1>
            <p class="stage__lead">${escapeHtml(stage.lead)}</p>
          </div>
        </article>

        <section class="panel panel--dark panel--copy">
          ${sectionsHtml}
        </section>

        ${galleryHtml}

        <section class="panel panel--dark">
          <div class="panel__title">Мини-вопрос</div>
          <div class="panel__body">
            <div class="quiz" data-stage-index="${stageIndex}">
              <div class="quiz__q">${escapeHtml(stage.quiz.question)}</div>
              <div class="quiz__opts" role="list">
                ${stage.quiz.options
                  .map(
                    (option, idx) => `
                      <button class="quiz__opt" type="button" role="listitem" data-opt="${idx}">
                        ${escapeHtml(option)}
                      </button>
                    `,
                  )
                  .join("")}
              </div>
              <div class="quiz__result" aria-live="polite"></div>
              <div class="quiz__actions">
                <button class="btn btn--primary" id="finishStageBtn" type="button" disabled>Завершить этап</button>
                <button class="btn btn--ghost" id="backBtn2" type="button">В меню</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  function wireStageView(stageIndex) {
    document.getElementById("backToMenu").addEventListener("click", () => navigateToMenu());
    document.getElementById("backBtn2").addEventListener("click", () => navigateToMenu());

    wireLightbox();

    document.querySelectorAll("[data-lightbox-src]").forEach((btn) => {
      btn.addEventListener("click", () => {
        openLightbox({
          src: btn.getAttribute("data-lightbox-src"),
          alt: btn.getAttribute("data-lightbox-alt") || "",
          caption: btn.getAttribute("data-lightbox-caption") || "",
        });
      });
    });

    const quizEl = document.querySelector(".quiz");
    const resultEl = quizEl.querySelector(".quiz__result");
    const finishBtn = document.getElementById("finishStageBtn");
    const quiz = QUEST.stages[stageIndex].quiz;
    let answered = false;

    quizEl.querySelectorAll("[data-opt]").forEach((optBtn) => {
      optBtn.addEventListener("click", () => {
        if (answered) return;
        answered = true;

        const idx = Number(optBtn.getAttribute("data-opt"));
        const correct = idx === quiz.correctIndex;

        quizEl.querySelectorAll("[data-opt]").forEach((btn) => btn.classList.add("is-disabled"));
        optBtn.classList.add(correct ? "is-correct" : "is-wrong");

        const correctBtn = quizEl.querySelector(`[data-opt="${quiz.correctIndex}"]`);
        if (correctBtn) correctBtn.classList.add("is-correct");

        resultEl.innerHTML = `
          <div class="quiz__badge ${correct ? "quiz__badge--ok" : "quiz__badge--bad"}">${correct ? "Верно" : "Не совсем"}</div>
          <div class="quiz__explain">${escapeHtml(quiz.explanation || "")}</div>
        `;

        finishBtn.disabled = false;
        finishBtn.focus();
      });
    });

    finishBtn.addEventListener("click", () => {
      const current = loadProgress();
      if (stageIndex === current.completedCount) {
        current.completedCount = clamp(current.completedCount + 1, 0, STAGES_TOTAL);
        if (!current.completedIds.includes(QUEST.stages[stageIndex].id)) current.completedIds.push(QUEST.stages[stageIndex].id);
        saveProgress(current);
      }
      navigateToMenu();
    });
  }

  const lb = document.getElementById("lightbox");
  const lbImg = document.getElementById("lightboxImg");
  const lbCaption = document.getElementById("lightboxCaption");
  const lbClose = document.getElementById("lightboxClose");

  function wireLightbox() {
    if (lb.dataset.wired === "1") return;
    lb.dataset.wired = "1";

    lbClose.addEventListener("click", closeLightbox);
    lb.addEventListener("click", (event) => {
      if (event.target === lb) closeLightbox();
    });
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") closeLightbox();
    });
  }

  function openLightbox({ src, alt, caption }) {
    lbImg.src = src;
    lbImg.alt = alt || "";
    lbCaption.textContent = caption || "";
    lb.classList.add("show");
    lb.setAttribute("aria-hidden", "false");
    lbClose.focus();
  }

  function closeLightbox() {
    if (!lb.classList.contains("show")) return;
    lb.classList.remove("show");
    lb.setAttribute("aria-hidden", "true");
    lbImg.src = "";
    lbCaption.textContent = "";
  }

  function openFinalPoster() {
    openLightbox({
      src: QUEST.meta.finalPhotoSrc,
      alt: "Итоговая композиция маршрута",
      caption: "Итоговая композиция маршрута по Мостовскому району",
    });
  }

  window.addEventListener("hashchange", render);
  render();
})();
