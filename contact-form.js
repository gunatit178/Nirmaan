/*
  contact-form.js: enquiry form on contact.html.

  HOW TO CONNECT IT
    Set the form's data-endpoint attribute to your form service URL, e.g. a
    Formspree form:  <form ... data-endpoint="https://formspree.io/f/xxxxxxxx">
    (in src/contact.njk). It's sent as multipart form data with
    "Accept: application/json", which Formspree, Basin, Getform and most form
    services accept. If your own backend expects JSON, add data-format="json".

  Until an endpoint is set the form says plainly that it isn't connected.
  It never reports success for a message that was not actually sent.
*/
(function () {
  'use strict';

  var form = document.querySelector('[data-enquiry]');
  if (!form) return;

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var fallbackEmail = (form.getAttribute('data-fallback-email') || '').trim();
  var reachUs = fallbackEmail ? ' Please email us at ' + fallbackEmail + ' instead.' : '';

  var MSG = {
    required: 'Please fill in your name, email and what you want to build.',
    email: 'That email address doesn’t look right. Please check it and try again.',
    notConnected: 'This form isn’t connected to an inbox yet, so your message was not sent.' + reachUs,
    network: 'We couldn’t reach the server. Check your connection and try again.',
    server: 'Something went wrong on our side, so your message was not sent. Please try again in a moment.' + reachUs,
  };

  var ok = form.querySelector('[data-form-ok]');
  var err = form.querySelector('[data-form-error]');
  var errText = err.querySelector('[data-form-error-text]');
  var button = form.querySelector('[type="submit"]');
  var buttonLabel = button.querySelector('[data-label]');
  var idleLabel = buttonLabel.textContent;

  function showError(message, field) {
    ok.hidden = true;
    errText.textContent = message;
    err.hidden = false;
    if (field) { field.setAttribute('aria-invalid', 'true'); field.focus(); }
  }
  function clearState() {
    ok.hidden = true;
    err.hidden = true;
    Array.prototype.forEach.call(form.querySelectorAll('[aria-invalid]'), function (f) { f.removeAttribute('aria-invalid'); });
  }
  function busy(on) {
    button.disabled = on;
    buttonLabel.textContent = on ? 'Sending…' : idleLabel;
  }

  form.addEventListener('input', function (e) {
    if (e.target.hasAttribute('aria-invalid')) e.target.removeAttribute('aria-invalid');
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    clearState();

    // 1. Required fields
    var name = form.elements.name, email = form.elements.email, project = form.elements.project;
    var missing = [name, email, project].filter(function (f) { return !f.value.trim(); })[0];
    if (missing) return showError(MSG.required, missing);
    if (!EMAIL_RE.test(email.value.trim())) return showError(MSG.email, email);

    // 2. Spam trap: people never see or fill this field; bots do.
    if (form.elements._gotcha && form.elements._gotcha.value) { form.reset(); ok.hidden = false; return; }

    // 3. Endpoint
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    if (!endpoint) {
      if (window.console) console.error('[contact-form] No endpoint set. Add data-endpoint="https://formspree.io/f/…" to the form in src/contact.njk.');
      return showError(MSG.notConnected);
    }

    // 4. Send
    busy(true);
    var init = { method: 'POST', headers: { Accept: 'application/json' } };
    if (form.getAttribute('data-format') === 'json') {
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(data);
    } else {
      init.body = new FormData(form);
    }

    fetch(endpoint, init)
      .then(function (res) {
        if (res.ok) { form.reset(); ok.hidden = false; ok.focus(); return; }
        return res.json().catch(function () { return null; }).then(function (body) {
          var detail = body && body.errors && body.errors[0] && body.errors[0].message;
          showError(res.status < 500 && detail ? detail : MSG.server);
        });
      })
      .catch(function () { showError(MSG.network); })
      .then(function () { busy(false); });
  });
})();
