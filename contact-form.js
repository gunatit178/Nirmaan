/*
  Contact form submission (used by index.html and contact.html).

  HOW TO CONNECT IT
    Set the form's data-endpoint attribute to your form service URL, for example
    a Formspree form:   <form ... data-endpoint="https://formspree.io/f/xxxxxxxx">
    The form is sent as multipart form data with "Accept: application/json", which
    Formspree, Basin, Getform and most form services accept. If your own backend
    expects JSON instead, add data-format="json" to the form.

  Until an endpoint is set the form shows an honest "not connected" message.
  It never reports success for a message that was not actually sent.
*/
(function () {
  'use strict';

  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  var NOT_CONNECTED = "This form isn't connected to an inbox yet, so your message was not sent. Please contact us directly instead.";
  var NETWORK_ERROR = "We couldn't send your message. Please check your connection and try again.";
  var SERVER_ERROR = 'Something went wrong on our side. Please try again in a moment, or contact us directly.';

  function submit(e) {
    e.preventDefault();
    var form = e.target;
    var errEl = form.querySelector('#form-error');
    var okEl = form.querySelector('#form-success');
    var btn = form.querySelector('#submit-btn');
    var txt = form.querySelector('#submit-text');
    var errMsg = errEl.querySelector('p');
    if (!errMsg.dataset.required) errMsg.dataset.required = errMsg.textContent;   // original "fill in the required fields" text
    if (!txt.dataset.label) txt.dataset.label = txt.textContent;
    errEl.setAttribute('role', 'alert');
    okEl.setAttribute('role', 'status');

    function fail(message) { errMsg.textContent = message; errEl.classList.remove('hidden'); }
    errEl.classList.add('hidden');
    okEl.classList.add('hidden');

    // 1. Required fields
    var name = form.elements.name, email = form.elements.email, project = form.elements.project;
    var missing = [name, email, project].filter(function (f) { return !f.value.trim(); })[0];
    if (missing || !EMAIL_RE.test(email.value.trim())) {
      fail(missing ? errMsg.dataset.required : 'Please enter a valid email address.');
      (missing || email).focus();
      return;
    }

    // 2. Spam trap: real visitors never see or fill this field. Bots do.
    var trap = form.elements._gotcha;
    if (trap && trap.value) { okEl.classList.remove('hidden'); form.reset(); return; }

    // 3. Endpoint
    var endpoint = (form.getAttribute('data-endpoint') || '').trim();
    if (!endpoint) {
      if (window.console) console.error('[contact-form] No endpoint set. Add data-endpoint="https://formspree.io/f/..." to the <form>. See contact-form.js.');
      fail(NOT_CONNECTED);
      return;
    }

    // 4. Send
    btn.disabled = true;
    txt.textContent = 'Sending…';
    var asJson = form.getAttribute('data-format') === 'json';
    var init = { method: 'POST', headers: { Accept: 'application/json' } };
    if (asJson) {
      var data = {};
      new FormData(form).forEach(function (v, k) { data[k] = v; });
      init.headers['Content-Type'] = 'application/json';
      init.body = JSON.stringify(data);
    } else {
      init.body = new FormData(form);
    }

    fetch(endpoint, init).then(function (res) {
      if (res.ok) { okEl.classList.remove('hidden'); form.reset(); return; }
      return res.json().catch(function () { return null; }).then(function (body) {
        var detail = body && body.errors && body.errors[0] && body.errors[0].message;
        fail(res.status >= 500 ? SERVER_ERROR : (detail || SERVER_ERROR));
      });
    }).catch(function () {
      fail(NETWORK_ERROR);
    }).then(function () {
      btn.disabled = false;
      txt.textContent = txt.dataset.label;
    });
  }

  // The pages call these from an inline onsubmit attribute.
  window.handleSubmit = submit;
  window.handleFormSubmit = submit;
})();
