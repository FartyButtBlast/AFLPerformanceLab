(() => {
  const config = window.ANALYTICS_CONFIG ?? {};
  const measurementId = config.googleMeasurementId?.trim();

  function loadGoogleAnalytics() {
    if (!measurementId) return;

    window.dataLayer = window.dataLayer || [];
    window.gtag = function gtag() {
      window.dataLayer.push(arguments);
    };

    const script = document.createElement("script");
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(measurementId)}`;
    document.head.append(script);

    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      send_page_view: true,
      anonymize_ip: true,
    });
  }

  window.trackAppEvent = function trackAppEvent(name, params = {}) {
    if (!measurementId || typeof window.gtag !== "function") return;
    window.gtag("event", name, {
      app_name: "AFL Performance Lab",
      ...params,
    });
  };

  loadGoogleAnalytics();
})();
