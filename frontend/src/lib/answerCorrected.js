// "The AI corrected this answer" notice. Extend / Regenerate always cross-check
// the marked answer and options and fix them when wrong; the single-question
// calls report that with `answerCorrected: true`. The service layer calls
// reportAnswerCorrected(), and the one <AnswerCorrectedToast> at the app root
// shows it — so every page that extends / regenerates a question gets the
// notice without its own code.
const EVENT = "msg:answer-corrected";
export function reportAnswerCorrected(result) {
  if (result?.answerCorrected && typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(EVENT, { detail: result }));
  }
  return result;
}
export function onAnswerCorrected(fn) {
  const h = (e) => fn(e.detail);
  window.addEventListener(EVENT, h);
  return () => window.removeEventListener(EVENT, h);
}
// "B" for index 1.
export const answerLetter = (i) => (Number.isInteger(i) && i >= 0 ? String.fromCharCode(65 + i) : "?");
