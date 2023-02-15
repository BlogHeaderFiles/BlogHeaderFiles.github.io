function toggleDarkMode(){const e="dark";var t=document.querySelector("body");t.classList.contains(e)?(setCookie("theme","light"),t.classList.remove(e)):(setCookie("theme","dark"),t.classList.add(e))}function getCookie(e){var t=document.cookie.match("(^|;) ?"+e+"=([^;]*)(;|$)");return t?t[2]:null}function setCookie(e,t,o){var n=new Date;n.setTime(n.getTime()+864e5*o),document.cookie=e+"="+t+";path=/;SameSite=strict;expires="+n.toGMTString()}function deleteCookie(e){setCookie(e,"",-1)}const userPrefersDark=window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches;var theme=getCookie("theme");if(null===theme&&userPrefersDark||"dark"===theme){var checkDarkDone=!1;function checkDark(){checkDarkDone||toggleDarkMode(),checkDarkDone=!0}function toggleSwitch(){document.querySelectorAll(".dark-mode-toggle").forEach((e=>e.checked=!0))}window.requestAnimationFrame&&window.requestAnimationFrame(checkDark),window.addEventListener("DOMContentLoaded",checkDark),window.addEventListener("DOMContentLoaded",toggleSwitch)}