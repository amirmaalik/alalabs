// Ala Spatial — contact form submission via Formspree (https://formspree.io).
// Progressive enhancement: with JS, the form submits in place with an inline status
// message so a visitor never leaves the site. Without JS (or if this script fails to
// load), the <form> still has a real action/method and posts natively — the browser
// just lands on Formspree's own hosted "thanks" page instead of staying on-page.

(function () {
  const form = document.getElementById('inquiry-form');
  if (!form) return;

  const status = document.getElementById('inquiry-status');
  const submitBtn = form.querySelector('button[type="submit"]');
  const label = submitBtn ? submitBtn.querySelector('[data-label-idle]') : null;

  const PLACEHOLDER = 'YOUR_FORM_ID';

  function setStatus(text, tone) {
    if (!status) return;
    status.hidden = !text;
    status.textContent = text || '';
    status.classList.toggle('inquiry__status--error', tone === 'error');
    status.classList.toggle('inquiry__status--ok', tone === 'ok');
  }

  function setSending(sending) {
    if (!submitBtn) return;
    submitBtn.disabled = sending;
    if (label) label.textContent = sending ? label.dataset.labelSending : label.dataset.labelIdle;
  }

  form.addEventListener('submit', async (e) => {
    // Not wired up yet: fail loudly and visibly instead of pretending to send.
    if (form.action.indexOf(PLACEHOLDER) !== -1) {
      e.preventDefault();
      setStatus('This form isn’t connected yet — email us directly at the address above and we’ll get back to you.', 'error');
      return;
    }

    e.preventDefault();
    setSending(true);
    setStatus('Sending…');

    try {
      const res = await fetch(form.action, {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body: new FormData(form)
      });

      if (res.ok) {
        form.reset();
        setStatus('Thanks — that’s sent. We’ll reply by email soon.', 'ok');
      } else {
        const data = await res.json().catch(() => null);
        const detail = data && Array.isArray(data.errors) && data.errors.length
          ? data.errors.map((err) => err.message).join(' ')
          : null;
        setStatus(detail || 'That didn’t go through. Please email us directly at the address above.', 'error');
      }
    } catch (err) {
      // Network failure, ad blocker, offline, etc. — the honest fallback is the direct email link.
      setStatus('Couldn’t reach the server. Please email us directly at the address above.', 'error');
    } finally {
      setSending(false);
    }
  });
})();
