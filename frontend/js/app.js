// --- THEME MANAGEMENT ---
const htmlEl = document.documentElement;
const themeToggleBtn = document.getElementById("themeToggleBtn");
const themeMenu = document.getElementById("themeMenu");
const themeOptions = document.querySelectorAll(".theme-option");

function setTheme(mode) {
  if (mode === "system") {
    localStorage.removeItem("pixelroot_theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    htmlEl.setAttribute("data-theme", systemPrefersDark ? "exact-match" : "light");
  } else {
    localStorage.setItem("pixelroot_theme", mode);
    htmlEl.setAttribute("data-theme", mode === "dark" ? "exact-match" : "light");
  }
  if (themeMenu) themeMenu.classList.remove("show");
}

// Initial theme load
const savedTheme = localStorage.getItem("pixelroot_theme");
if (savedTheme) {
  setTheme(savedTheme === "dark" ? "dark" : "light");
} else {
  setTheme("system");
}

// Toggle dropdown visibility
if (themeToggleBtn && themeMenu) {
  themeToggleBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    themeMenu.classList.toggle("show");
  });
  
  // Close menu when clicking outside
  document.addEventListener("click", () => {
    themeMenu.classList.remove("show");
  });
}

// Handle option selection
themeOptions.forEach((option) => {
  option.addEventListener("click", () => {
    const val = option.getAttribute("data-value");
    setTheme(val);
  });
});

// Listen for system theme changes if set to system
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("pixelroot_theme")) {
    htmlEl.setAttribute("data-theme", e.matches ? "exact-match" : "light");
  }
});

// --- DYNAMIC TEAM / FOUNDERS LOADER ---
document.addEventListener("DOMContentLoaded", () => {
  fetch("/data.json")
    .then((response) => response.json())
    .then((data) => {
      if (data.about && data.about.team) {
        populateTeamSection(data.about.team);
      }
    })
    .catch((error) => console.error("Error loading team data:", error));
});

function populateTeamSection(teamData) {
  const teamContainer = document.getElementById("team-container");
  if (teamContainer) {
    teamContainer.innerHTML = ""; // Clear container
    
    teamData.forEach((member) => {
      const skillsHtml = (member.skills || [])
        .map((skill) => `<span class="pill">${skill}</span>`)
        .join("");

      const cardHtml = `
        <article class="card p-8 text-center in">
          <div class="ring w-36 h-36 mx-auto">
            <div class="avatar" role="img" aria-label="Portrait of ${member.name}">
               ${member.initial || ""}
            </div>
          </div>
          <h3 class="serif text-2xl font-bold mt-5">${member.name}</h3>
          <p class="text-sm font-semibold text-[var(--accent)]">${member.role}</p>
          <p class="text-sm text-[var(--muted)] mt-3 leading-relaxed">${member.bio}</p>
          <div class="flex flex-wrap justify-center gap-2 mt-5">
            ${skillsHtml}
          </div>
        </article>
      `;

      teamContainer.innerHTML += cardHtml;
    });
  }
}