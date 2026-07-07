(function () {
  var script = document.currentScript;
  if (!script) return;

  var company = script.getAttribute("data-company") || "";
  var token = script.getAttribute("data-token") || "";
  var targetId = script.getAttribute("data-target") || "crmkit-schedule";
  var container = document.getElementById(targetId);

  if (!container || !company) {
    return;
  }

  var origin = new URL(script.src).origin;
  var params = new URLSearchParams({ token: token });
  var embedUrl = origin + "/embed/schedule/" + encodeURIComponent(company) + "?" + params.toString();

  var iframe = document.createElement("iframe");
  iframe.src = embedUrl;
  iframe.title = "Расписание";
  iframe.loading = "lazy";
  iframe.setAttribute("allowfullscreen", "true");
  iframe.style.width = "100%";
  iframe.style.minHeight = "720px";
  iframe.style.border = "0";
  iframe.style.borderRadius = "16px";
  iframe.style.background = "transparent";

  container.innerHTML = "";
  container.appendChild(iframe);

  window.addEventListener("message", function (event) {
    if (!event.data || event.data.type !== "crmkit-schedule-height") return;
    if (typeof event.data.height === "number" && event.data.height > 0) {
      iframe.style.height = event.data.height + "px";
    }
  });
})();
