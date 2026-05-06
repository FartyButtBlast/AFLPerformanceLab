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
    newPassword: document.querySelector("#newPasswordForm"),
  };

  let supabase = null;
  let handlingPasswordRecovery = false;
  let passwordRecoveryExpected = isPasswordRecoveryUrl();

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

  function showPasswordResetForm() {
    handlingPasswordRecovery = true;
    passwordRecoveryExpected = true;
    showAuth();
    setMode("newPassword");
    setMessage("Enter a new password to finish resetting your account.", "success");
  }

  async function loadSupabase() {
    const module = await import("https://esm.sh/@supabase/supabase-js@2");
    return module.createClient(config.supabaseUrl, config.supabaseAnonKey);
  }

  function authRedirectUrl() {
    return config.redirectUrl || window.location.origin + window.location.pathname;
  }

  function isPasswordRecoveryUrl() {
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const searchParams = new URLSearchParams(window.location.search);
    return hashParams.get("type") === "recovery" || searchParams.get("type") === "recovery";
  }

  function clearAuthUrlState() {
    window.history.replaceState({}, document.title, window.location.pathname);
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
    if (passwordRecoveryExpected) showPasswordResetForm();
    else if (data.session?.user) showApp(data.session.user);
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
    window.trackAppEvent?.("login_success");
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
      options: { emailRedirectTo: authRedirectUrl() },
    });
    if (error) {
      setMessage(error.message, "error");
      return;
    }
    if (data.user?.identities?.length === 0) {
      setMessage("That email is already registered. Try logging in or resetting the password.", "error");
      return;
    }
    window.trackAppEvent?.("registration_requested");
    setMessage("Account created. Check your email to confirm the registration.", "success");
    setMode("login");
  });

  forms.reset.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("Sending reset link...");
    const email = document.querySelector("#resetEmail").value;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: authRedirectUrl(),
    });
    if (error) {
      setMessage(error.message, "error");
      return;
    }
    window.trackAppEvent?.("password_reset_requested");
    setMessage("Password reset email sent.", "success");
  });

  forms.newPassword.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newPassword = document.querySelector("#newPassword").value;
    const confirmNewPassword = document.querySelector("#confirmNewPassword").value;
    if (newPassword !== confirmNewPassword) {
      setMessage("The passwords do not match.", "error");
      return;
    }
    setMessage("Updating password...");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setMessage(error.message, "error");
      return;
    }
    window.trackAppEvent?.("password_updated");
    await supabase.auth.signOut();
    handlingPasswordRecovery = false;
    passwordRecoveryExpected = false;
    clearAuthUrlState();
    document.querySelector("#newPassword").value = "";
    document.querySelector("#confirmNewPassword").value = "";
    showAuth();
    setMode("login");
    setMessage("Password updated. Please log in with the new password.", "success");
  });

  logoutButton.addEventListener("click", async () => {
    await supabase.auth.signOut();
    window.trackAppEvent?.("logout");
    handlingPasswordRecovery = false;
    passwordRecoveryExpected = false;
    clearAuthUrlState();
    showAuth();
    setMode("login");
  });

  supabase.auth.onAuthStateChange((event, session) => {
    if (event === "PASSWORD_RECOVERY" || passwordRecoveryExpected) {
      showPasswordResetForm();
      return;
    }
    if (session?.user && !handlingPasswordRecovery) showApp(session.user);
    else showAuth();
  });
})();
