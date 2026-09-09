// Anime les blocs ".reveal" a l'entree dans le viewport.
document.addEventListener("DOMContentLoaded", () => {
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealEls.length) {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  // Effet 3D "tilt" au survol (suit la souris) sur les elements ".tilt"
  const tiltEls = document.querySelectorAll(".tilt");
  tiltEls.forEach((el) => {
    const img = el.querySelector("img");
    if (!img) return;
    const strength = 10;

    el.addEventListener("mousemove", (e) => {
      const rect = el.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width - 0.5;
      const y = (e.clientY - rect.top) / rect.height - 0.5;
      img.style.transform = `scale(1.04) rotateY(${x * strength}deg) rotateX(${-y * strength}deg)`;
    });

    el.addEventListener("mouseleave", () => {
      img.style.transform = "scale(1) rotateY(0deg) rotateX(0deg)";
    });
  });
});
