(async () => {
  const liveBaseUrl = "https://aflperformance.sportzlabs.com";
  const liveDataFiles = [
    "data/afl-data.js",
    "data/player-positions.js",
    "data/news-feed.js",
  ];
  const bundledData = {
    AFL_DATA: window.AFL_DATA,
    PLAYER_POSITIONS: window.PLAYER_POSITIONS,
    NEWS_FEED: window.NEWS_FEED,
  };

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Could not load ${src}`));
      document.head.append(script);
    });
  }

  async function loadLiveData() {
    const cacheBust = Date.now();
    for (const file of liveDataFiles) {
      await loadScript(`${liveBaseUrl}/${file}?v=${cacheBust}`);
    }
    if (!window.AFL_DATA?.players?.length || !window.NEWS_FEED?.items || !Array.isArray(window.PLAYER_POSITIONS)) {
      throw new Error("Live data did not contain the expected app datasets.");
    }
    window.APP_DATA_SOURCE = {
      mode: "live",
      baseUrl: liveBaseUrl,
    };
  }

  try {
    await loadLiveData();
  } catch (error) {
    console.warn("Using bundled fallback data.", error);
    window.AFL_DATA = bundledData.AFL_DATA;
    window.PLAYER_POSITIONS = bundledData.PLAYER_POSITIONS;
    window.NEWS_FEED = bundledData.NEWS_FEED;
    window.APP_DATA_SOURCE = {
      mode: "bundled",
      baseUrl: window.location.origin,
    };
  }

  await loadScript("./app.js?v=live-data-1");
})();
