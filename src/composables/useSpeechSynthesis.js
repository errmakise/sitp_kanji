export function useSpeechSynthesis() {
  function speak(text, lang) {
    if (!text || text === '-' || text === '—') return
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = lang
    window.speechSynthesis.speak(utterance)
  }

  function cancel() {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }

  return {
    speak,
    cancel,
  }
}

