/*
  Device switcher for the project previews on projects.html
  (the desktop / tablet / mobile buttons that resize the preview frame).
*/
// Interactive Device Switcher Logic
window.switchDevice = function(btn, deviceType, frameId) {
  // Update button classes
  var container = btn.parentElement;
  var buttons = container.querySelectorAll('.device-btn');
  buttons.forEach(function(b) {
    b.classList.remove('active');
    b.querySelector('svg').classList.remove('text-accent');
    b.querySelector('svg').classList.add('text-secondary');
  });
  
  btn.classList.add('active');
  btn.querySelector('svg').classList.remove('text-secondary');
  btn.querySelector('svg').classList.add('text-accent');
  
  // Update frame classes
  var frame = document.getElementById(frameId);
  if (frame) {
    frame.classList.remove('desktop', 'tablet', 'mobile');
    frame.classList.add(deviceType);
  }
};
