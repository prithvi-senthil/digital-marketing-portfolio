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

// --- PROPOSAL MODAL CONTROLS & SUBMISSION ---
document.addEventListener("DOMContentLoaded", () => {
  const proposalModal = document.getElementById("proposalModal");
  const openBtn = document.getElementById("openProposalModalBtn");
  const closeBtn = document.getElementById("closeProposalModalBtn");
  const cancelBtn = document.getElementById("cancelProposalBtn");
  const proposalForm = document.getElementById("proposalForm");
  const proposalStatus = document.getElementById("proposalStatus");
  const submitBtn = document.getElementById("submitProposalBtn");

  if (!proposalModal) return;

  const originalBodyOverflow = document.body.style.overflow;
  let closeTimeout;

  const closeModal = () => {
    proposalModal.classList.add("hidden");
    document.body.style.overflow = originalBodyOverflow;
    if (proposalStatus) proposalStatus.classList.add("hidden");
    if (closeTimeout) clearTimeout(closeTimeout);
    if (openBtn) openBtn.focus();
  };

  if (openBtn) {
    openBtn.addEventListener("click", () => {
      if (closeTimeout) clearTimeout(closeTimeout);
      proposalModal.classList.remove("hidden");
      document.body.style.overflow = "hidden";
      const nameField = document.getElementById("clientName");
      if (nameField) nameField.focus();
    });
  }
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  proposalModal.addEventListener("click", (event) => {
    if (event.target === proposalModal) closeModal();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !proposalModal.classList.contains("hidden")) {
      closeModal();
    }
  });

  if (!proposalForm || !proposalStatus || !submitBtn) {
    console.error("Proposal modal is missing its form, status, or submit button.");
    return;
  }

  proposalForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!proposalForm.reportValidity()) return;

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";
    proposalStatus.classList.add("hidden");

    const formData = {
      name: document.getElementById("clientName").value.trim(),
      business: document.getElementById("businessName").value.trim(),
      email: document.getElementById("clientEmail").value.trim(),
      phone: document.getElementById("clientPhone").value.trim(),
      location: document.getElementById("clientLocation").value.trim(),
      budget: document.getElementById("clientBudget").value,
      notes: document.getElementById("projectScope").value.trim()
    };

    try {
      const response = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      if (!response.ok) {
        throw new Error(`Proposal request failed with status ${response.status}.`);
      }

      proposalStatus.textContent = "Thank you! Your proposal request has been received.";
      proposalStatus.className = "text-xs font-semibold text-center py-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
      proposalStatus.classList.remove("hidden");
      proposalForm.reset();
      closeTimeout = setTimeout(closeModal, 2000);
    } catch (error) {
      console.error("Error submitting proposal request:", error);
      proposalStatus.textContent = "Submission failed. Please try again or contact us directly.";
      proposalStatus.className = "text-xs font-semibold text-center py-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20";
      proposalStatus.classList.remove("hidden");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit Proposal Request";
    }
  });
});

// --- SERVICE SELECTOR CARD BEHAVIOR ---
const getStartedBtn = document.getElementById("getStartedBtn");
if (getStartedBtn) {
  getStartedBtn.addEventListener("click", () => {
    const selectedServices = Array.from(
      document.querySelectorAll('#serviceSelectorForm input[name="services"]:checked')
    ).map((checkbox) => checkbox.value);

    const messageField =
      document.getElementById("notes") ||
      document.querySelector("textarea[name='notes']") ||
      document.getElementById("msg");
    if (messageField && selectedServices.length > 0) {
      messageField.value = `Selected Services: ${selectedServices.join(", ")}`;
    }

    const targetSection =
      document.getElementById("apply") || document.getElementById("contact");
    if (targetSection) {
      targetSection.scrollIntoView({ behavior: "smooth" });
    }
  });
}

// Listen for system theme changes if set to system
window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
  if (!localStorage.getItem("pixelroot_theme")) {
    htmlEl.setAttribute("data-theme", e.matches ? "exact-match" : "light");
  }
});

// --- DYNAMIC SITE DATA LOADER ---
document.addEventListener("DOMContentLoaded", () => {
  fetch("/data.json")
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load data.json: ${response.status} ${response.statusText}`);
      }
      return response.json();
    })
    .then((data) => {
      if (data.about && Array.isArray(data.about.team)) {
        populateTeamSection(data.about.team);
      }
      if (Array.isArray(data.blogs)) {
        populateBlogs(data.blogs);
      }
    })
    .catch((error) => console.error("Error loading site data:", error));
});

function populateBlogs(blogs) {
  const blogContainer = document.getElementById("blog-container");
  if (!blogContainer || !Array.isArray(blogs)) return;

  blogContainer.textContent = "";
  blogs.forEach((blog) => {
    if (
      !blog ||
      !["title", "company", "category", "excerpt", "url"].every(
        (key) => typeof blog[key] === "string" && blog[key].trim()
      )
    ) {
      console.error("Skipping incomplete blog entry:", blog);
      return;
    }

    let url;
    try {
      url = new URL(blog.url);
    } catch (error) {
      console.error("Skipping blog entry with an invalid URL:", error);
      return;
    }
    if (url.protocol !== "https:") {
      console.error("Skipping blog entry with a non-HTTPS URL:", blog.url);
      return;
    }

    const article = document.createElement("article");
    article.className = "card p-6 flex flex-col justify-between group hover:border-[var(--accent)] transition-all";

    const content = document.createElement("div");
    const details = document.createElement("div");
    details.className = "flex items-center justify-between gap-2 text-xs";

    const category = document.createElement("span");
    category.className = "font-bold px-2.5 py-1 rounded-md bg-[var(--surface-2)] text-[var(--accent)] tracking-wider uppercase";
    category.textContent = blog.category;
    details.append(category);

    const readTime = document.createElement("span");
    readTime.className = "text-[var(--muted)] font-medium";
    readTime.textContent =
      typeof blog.readTime === "string" && blog.readTime.trim()
        ? blog.readTime
        : "5 min read";
    details.append(readTime);
    content.append(details);

    const title = document.createElement("h3");
    title.className = "serif text-xl font-bold mt-4 text-[var(--text)] group-hover:text-[var(--accent)] transition-colors leading-snug";
    title.textContent = blog.title;
    content.append(title);

    const company = document.createElement("p");
    company.className = "text-xs font-semibold text-[var(--accent-2)] mt-1";
    company.textContent = `Source: ${blog.company}`;
    content.append(company);

    const excerpt = document.createElement("p");
    excerpt.className = "text-sm text-[var(--muted)] mt-3 leading-relaxed";
    excerpt.textContent = blog.excerpt;
    content.append(excerpt);
    article.append(content);

    const footer = document.createElement("div");
    footer.className = "mt-6 pt-4 border-t border-[var(--border)] flex items-center justify-between";

    const resourceLabel = document.createElement("span");
    resourceLabel.className = "text-xs font-semibold text-[var(--muted)]";
    resourceLabel.textContent = "External Resource";
    footer.append(resourceLabel);

    const readLink = document.createElement("a");
    readLink.href = url.href;
    readLink.target = "_blank";
    readLink.rel = "noopener noreferrer";
    readLink.className = "inline-flex items-center gap-1.5 text-xs font-bold text-[var(--accent)] hover:underline";
    readLink.append(document.createTextNode("Read Article"));

    const arrow = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    arrow.setAttribute("width", "14");
    arrow.setAttribute("height", "14");
    arrow.setAttribute("viewBox", "0 0 24 24");
    arrow.setAttribute("fill", "none");
    arrow.setAttribute("stroke", "currentColor");
    arrow.setAttribute("stroke-width", "2.5");
    arrow.setAttribute("stroke-linecap", "round");
    arrow.setAttribute("stroke-linejoin", "round");
    const arrowPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
    arrowPath.setAttribute("d", "M7 17l9.2-9.2M17 17V7H7");
    arrow.append(arrowPath);
    readLink.append(arrow);
    footer.append(readLink);
    article.append(footer);
    blogContainer.append(article);
  });
}

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

// --- DYNAMIC FOOTER CONTACT LOADER ---
async function loadContactTextFile() {
  const response = await fetch("contact.txt");
  if (!response.ok) {
    throw new Error(`Failed to load contact.txt: ${response.status} ${response.statusText}`);
  }

  const config = Object.create(null);
  (await response.text()).split(/\r?\n/).forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const [key, ...rest] = trimmed.split("=");
      if (key && rest.length > 0) {
        config[key.trim()] = rest.join("=").trim();
      }
    }
  });

  const contactContainer = document.getElementById("footer-contact-container");
  if (contactContainer) {
    contactContainer.textContent = "";

    const addContactItem = (icon, value, href) => {
      const item = document.createElement("li");
      item.className = "flex items-center gap-2";

      const iconElement = document.createElement("span");
      iconElement.textContent = icon;
      item.append(iconElement);

      if (href) {
        const link = document.createElement("a");
        link.href = href;
        link.className = "hover:text-[var(--accent)] transition-colors";
        link.textContent = value;
        item.append(link);
      } else {
        const text = document.createElement("span");
        text.textContent = value;
        item.append(text);
      }

      contactContainer.append(item);
    };

    if (config.email) {
      addContactItem("📧", config.email, `mailto:${config.email}`);
    }
    if (config.phone) {
      addContactItem("📞", config.phone, `tel:${config.phone.replace(/\s+/g, "")}`);
    }
    if (config.location) {
      addContactItem("📍", config.location);
    }
  }

  const emailCard = document.getElementById("card-contact-email");
  if (emailCard && config.email) {
    emailCard.href = `mailto:${config.email}`;
    emailCard.textContent = config.email;
  }

  const phoneCard = document.getElementById("card-contact-phone");
  if (phoneCard && config.phone) {
    phoneCard.href = `tel:${config.phone.replace(/\s+/g, "")}`;
    phoneCard.textContent = config.phone;
  }

  const locationCard = document.getElementById("card-contact-location");
  if (locationCard && config.location) {
    locationCard.textContent = config.location;
  }

  const socialContainer = document.getElementById("footer-social-container");
  if (socialContainer) {
    socialContainer.textContent = "";

    const socialLinks = [
      {
        key: "linkedin",
        label: "LinkedIn",
        path: "M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"
      },
      {
        key: "instagram",
        label: "Instagram",
        path: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"
      }
    ];

    socialLinks.forEach(({ key, label, path }) => {
      if (!config[key]) return;

      let url;
      try {
        url = new URL(config[key]);
      } catch (error) {
        console.error(`Invalid ${label} URL in contact.txt:`, error);
        return;
      }
      if (url.protocol !== "https:") {
        console.error(`Expected an HTTPS ${label} URL in contact.txt.`);
        return;
      }

      const link = document.createElement("a");
      link.href = url.href;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.className = "p-2.5 rounded-full bg-[var(--surface-2)] text-[var(--text)] hover:text-[var(--accent)] transition-colors";
      link.setAttribute("aria-label", label);

      const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      svg.setAttribute("width", "18");
      svg.setAttribute("height", "18");
      svg.setAttribute("fill", "currentColor");
      svg.setAttribute("viewBox", "0 0 24 24");
      const iconPath = document.createElementNS("http://www.w3.org/2000/svg", "path");
      iconPath.setAttribute("d", path);
      svg.append(iconPath);
      link.append(svg);
      socialContainer.append(link);
    });
  }
}

document.addEventListener("DOMContentLoaded", () => {
  loadContactTextFile().catch((error) => {
    console.error("Error reading contact.txt:", error);
  });
});