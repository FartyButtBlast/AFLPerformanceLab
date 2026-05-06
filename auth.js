(async () => {
  const config = window.AUTH_CONFIG ?? {};
  const configured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
  const fallbackUsers = Array.isArray(config.fallbackUsers) ? config.fallbackUsers : [];
  const authGate = document.querySelector("#authGate");
  const setupNotice = document.querySelector("#authSetupNotice");
  const message = document.querySelector("#authMessage");
  const userBadge = document.querySelector("#userBadge");
  const logoutButton = document.querySelector("#logoutButton");
  const tabs = {
    login: document.querySelector("#loginTab"),
    register: document.querySelector("#registerTab"),
    reset: document.querySelector("#resetTab"),
  };
  const forms = {
    login: document.querySelector("#loginForm"),
    register: document.querySelector("#registerForm"),
    reset: document.querySelector("#resetForm"),
  };

  let supabase = null;

  function setMessage(text, tone = "") {
    message.textContent = text;
    message.dataset.tone = tone;
  }

  function setMode(mode) {
    Object.entries(tabs).forEach(([key, tab]) => tab.classList.toggle("active", key === mode));
    Object.entries(forms).forEach(([key, form]) => {
      form.hidden = key !== mode;
    });
    setMessage("");
  }

  function showApp(user) {
    authGate.hidden = true;
    userBadge.hidden = false;
    logoutButton.hidden = false;
    userBadge.textContent = user?.email ?? user?.username ?? "Signed in";
  }

  function showAuth() {
    authGate.hidden = false;
    userBadge.hidden = true;
    logoutButton.hidden = true;
    userBadge.textContent = "";
  }

  async function loadSupabase() {
    const module = await import("https://esm.sh/@supabase/supabase-js@2");
    return module.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  tabs.login.addEventListener("click", () => setMode("login"));
  tabs.register.addEventListener("click", () => setMode("register"));
  tabs.reset.addEventListener("click", () => setMode("reset"));

  if (!configured) {
    setupNotice.hidden = false;
    setupNotice.innerHTML =
      "Using simple local login. This is suitable for casual sharing only because static-site passwords are visible in the site files.";
    tabs.register.hidden = true;
    tabs.reset.hidden = true;
    document.querySelector("label[for='loginEmail']")?.removeAttribute("for");
    document.querySelector("#loginEmail").type = "text";
    document.querySelector("#loginEmail").autocomplete = "username";
    document.querySelector("#loginEmail").closest("label").firstChild.textContent = "Username";
    const savedUser = window.localStorage.getItem("afl-auth-user");
    if (savedUser) showApp({ username: savedUser });
    forms.login.addEventListener("submit", (event) => {
      event.preventDefault();
      const username = document.querySelector("#loginEmail").value.trim();
      const password = document.querySelector("#loginPassword").value;
      const match = fallbackUsers.find((user) => user.username === username && user.password === password);
      if (!match) {
        setMessage("Username or password is incorrect.", "error");
        return;
      }
      window.localStorage.setItem("afl-auth-user", match.username);
      showApp({ username: match.username });
    });
    logoutButton.addEventListener("click", () => {
      window.localStorage.removeItem("afl-auth-user");
      showAuth();
      setMode("login");
    });
    return;
  }

  try {
    supabase = await loadSupabase();
    const { data } = await supabase.auth.getSession();
    if (data.session?.user) showApp(data.session.user);
  } catch (error) {
    setupNotice.hidden = false;
    setMessage(`Could not load authentication: ${error.message}`, "error");
    return;
  }

  forms.login.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("Signing in...");
    const email = document.querySelector("#loginEmail").value;
    const password = document.querySelector("#loginPassword").value;
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message, "error");
      return;
    }
    showApp(data.user);
  });

  forms.register.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("Creating account...");
    const email = document.querySelector("#registerEmail").value;
    const password = document.querySelector("#registerPassword").value;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + window.location.pathname },
    });
    if (error) {
      setMessage(error.message, "error");
      return;
    }
    if (data.user?.identities?.length === 0) {
      setMessage("That email is already registered. Try logging in or resetting the password.", "error");
      return;
    }
    setMessage("Account created. Check your email to confirm the registration.", "success");
    setMode("login");
  });

  forms.reset.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("Sending reset link...");
    const email = document.querySelector("#resetEmail").value;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname,
    });
    if (error) {
      setMessage(error.message, "error");
      return;
    }
    setMessage("Password reset email sent.", "success");
  });

  logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    showAuth();
    setMode("login");
  });

  supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) showApp(session.user);
    else showAuth();
  });
})();
