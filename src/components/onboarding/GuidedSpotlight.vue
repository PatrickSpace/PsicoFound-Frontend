<template>
  <Teleport to="body">
    <div class="guided-spotlight" @keydown.esc.stop.prevent="exit">
      <template v-if="hole">
        <div v-for="(shade, index) in shades" :key="index" class="guided-spotlight__shade" :style="shade" aria-hidden="true" />
        <div class="guided-spotlight__ring" :style="holeStyle" aria-hidden="true" />
      </template>
      <section ref="card" class="guided-spotlight__card" :style="cardStyle" role="dialog" aria-modal="false" aria-labelledby="spotlight-title" tabindex="-1">
        <div class="guided-spotlight__header">
          <span>Guía interactiva · {{ progress || `${step + 1} de ${steps.length}` }}</span>
          <button type="button" aria-label="Cerrar guía interactiva" @click="exit">×</button>
        </div>
        <h2 id="spotlight-title">{{ current.title }}</h2>
        <p v-if="error" role="alert" class="guided-spotlight__error">{{ error }}</p>
        <p aria-live="polite">{{ missing ? 'No pudimos localizar este elemento. Puedes cerrar la guía y volver a intentarlo.' : current.text }}</p>
        <p v-if="!hole && !missing" class="guided-spotlight__hint">Buscando el elemento…</p>
        <div class="guided-spotlight__actions">
          <button type="button" @click="exit">Salir de la guía</button>
          <button v-if="hasPrevious" type="button" :disabled="busy" @click="emit('previous')">Anterior</button>
          <button v-if="controlled || !current.advanceOnClick || missing" type="button" class="guided-spotlight__primary" :disabled="busy || (!hole && !missing)" @click="missing ? exit() : finish()">{{ missing ? 'Cerrar' : nextLabel || (controlled ? 'Siguiente' : 'Terminar guía') }}</button>
          <span v-else class="guided-spotlight__hint">Pulsa el botón iluminado</span>
        </div>
      </section>
    </div>
  </Teleport>
</template>
<script setup>
import { spotlightPlacement } from '@/utils/spotlightGeometry';
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
const props = defineProps({ steps: { type: Array, required: true }, controlled: Boolean, progress: String, hasPrevious: Boolean, busy: Boolean, error: String, nextLabel: String });
const emit = defineEmits(['close', 'complete', 'next', 'previous']);
const step = ref(0), hole = ref(null), card = ref(null), viewport = ref({ width: innerWidth, height: innerHeight });
const missing = ref(false), cardHeight = ref(240);
const current = computed(() => props.steps[step.value]);
const px = value => `${Math.round(value)}px`;
const holeStyle = computed(() => hole.value ? { left: px(hole.value.left), top: px(hole.value.top), width: px(hole.value.width), height: px(hole.value.height) } : {});
const shades = computed(() => {
  if (!hole.value) return [];
  const { left, top, width, height } = hole.value, { width: vw, height: vh } = viewport.value;
  return [{ left: 0, top: 0, width: px(vw), height: px(top) },
    { left: 0, top: px(top), width: px(left), height: px(height) },
    { left: px(left + width), top: px(top), width: px(Math.max(0, vw - left - width)), height: px(height) },
    { left: 0, top: px(top + height), width: px(vw), height: px(Math.max(0, vh - top - height)) }];
});
const cardStyle = computed(() => {
  const placement = spotlightPlacement(hole.value, viewport.value, cardHeight.value);
  return Object.fromEntries(Object.entries(placement).map(([key, value]) => [key, px(value)]));
});
let target, observer, resizeObserver, timeout, frame, previousFocus, ended = false;
function schedule() { cancelAnimationFrame(frame); frame = requestAnimationFrame(measure); }
function measure() {
  viewport.value = { width: innerWidth, height: innerHeight };
  const visible = selector => selector ? [...document.querySelectorAll(selector)].find(el => el.getClientRects().length && !el.disabled) : null;
  const found = visible(current.value.selector) || visible(current.value.fallbackSelector);
  if (found !== target) {
    target?.removeEventListener('click', targetClick);
    if (target) resizeObserver?.unobserve(target);
    target = found;
    if (target) resizeObserver?.observe(target);
    if (target && (current.value.advanceOnClick || current.value.closeOnClick)) target.addEventListener('click', targetClick);
    target?.scrollIntoView({ block: 'center', behavior: 'instant' });
  }
  if (card.value) cardHeight.value = card.value.scrollHeight;
  if (!target) { hole.value = null; return; }
  missing.value = false;
  const rect = target.getBoundingClientRect(), padding = 7;
  const left = Math.max(0, rect.left - padding), top = Math.max(0, rect.top - padding);
  const right = Math.min(innerWidth, rect.right + padding), bottom = Math.min(innerHeight, rect.bottom + padding);
  hole.value = right > left && bottom > top ? { left, top, width: right - left, height: bottom - top } : null;
}
function targetClick() { if (current.value.closeOnClick) exit(); else advance(); }
async function advance() {
  if (ended || props.busy || !current.value.advanceOnClick) return;
  if (props.controlled) { emit('next'); return; }
  target?.removeEventListener('click', targetClick); target = null; hole.value = null;
  step.value++;
  await nextTick(); schedule();
  clearTimeout(timeout); timeout = setTimeout(() => { if (!hole.value) missing.value = true; }, 4000);
  await nextTick(); card.value?.focus({ preventScroll: true });
}
function exit() { emit('close'); }
function finish() { if (props.busy) return; if (props.controlled) emit('next'); else { ended = true; emit('complete'); } }
function keydown(event) {
  if (event.key === 'Escape') { event.preventDefault(); event.stopImmediatePropagation(); exit(); return; }
  if (event.key !== 'Tab') return;
  const controls = [...(target ? [target, ...target.querySelectorAll('button, a[href], input, select, textarea, [tabindex="0"]')] : []), ...card.value.querySelectorAll('button:not(:disabled)')]
    .filter(el => !el.disabled && el.getClientRects().length && el.matches('button, a[href], input, select, textarea, [tabindex="0"]'));
  if (!controls.length) return;
  event.preventDefault();
  const index = controls.indexOf(document.activeElement), delta = event.shiftKey ? -1 : 1;
  controls[(index + delta + controls.length) % controls.length].focus({ preventScroll: true });
}
watch(() => [step.value, props.steps[0]?.selector, props.progress], async () => { missing.value = false; clearTimeout(timeout); await nextTick(); schedule(); timeout = setTimeout(() => { if (!hole.value) missing.value = true; }, 4000); });
onMounted(async () => {
  previousFocus = document.activeElement;
  observer = new MutationObserver(schedule);
  observer.observe(document.body, { childList: true, subtree: true });
  resizeObserver = new ResizeObserver(schedule); resizeObserver.observe(card.value);
  window.addEventListener('resize', schedule); document.addEventListener('scroll', schedule, true);
  document.addEventListener('keydown', keydown, true);
  measure(); await nextTick(); card.value?.focus({ preventScroll: true });
  timeout = setTimeout(() => { if (!hole.value) missing.value = true; }, 4000);
});
onBeforeUnmount(() => {
  ended = true; observer?.disconnect(); resizeObserver?.disconnect(); clearTimeout(timeout); cancelAnimationFrame(frame);
  target?.removeEventListener('click', targetClick); window.removeEventListener('resize', schedule);
  document.removeEventListener('scroll', schedule, true); document.removeEventListener('keydown', keydown, true);
  if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
});
</script>
<style>
.guided-spotlight { position: fixed; inset: 0; z-index: 10000; pointer-events: none; }
.guided-spotlight__shade { position: fixed; background: rgb(8 24 24 / 76%); pointer-events: auto; }
.guided-spotlight__ring { position: fixed; border: 3px solid #74e3d1; border-radius: 12px; box-shadow: 0 0 0 2px rgb(255 255 255 / 90%); pointer-events: none; }
.guided-spotlight__card { position: fixed; padding: 20px; background: #fff; color: #193b39; border-radius: 18px; box-shadow: 0 14px 48px #0005; pointer-events: auto; max-height: calc(100dvh - 32px); overflow: auto; }
.guided-spotlight__header { display: flex; align-items: center; justify-content: space-between; gap: 12px; font-size: 12px; margin-bottom: 12px; }
.guided-spotlight__header button { font-size: 26px; line-height: 1; min-width: 36px; min-height: 36px; }
.guided-spotlight__card h2 { font-size: 20px; line-height: 1.3; margin-bottom: 10px; }
.guided-spotlight__card p { font-size: 15px; line-height: 1.55; }
.guided-spotlight__actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 18px; }
.guided-spotlight__actions button { padding: 9px 12px; border-radius: 8px; font-size: 14px; }
.guided-spotlight__primary { background: #286b5c; color: white; }
.guided-spotlight__card button:focus-visible { outline: 3px solid #236557; outline-offset: 3px; }
.guided-spotlight__error { color: #a52121; margin-bottom: 10px; }
.guided-spotlight__card button:disabled { opacity: .5; }
.guided-spotlight__hint { font-size: 12px !important; }
</style>
