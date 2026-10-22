/* ALL editable content lives here. To add a project, copy a block in PROJECTS and edit it.
   Newest project goes FIRST. See README.md for every field. */
window.SITE = {
  links: [
    { label: "GitHub", href: "https://github.com/ak-5l", color: "yellow" }
    // { label: "Email", href: "mailto:you@example.com", color: "teal" },
    // { label: "LinkedIn", href: "https://www.linkedin.com/in/your-handle", color: "blue" },
  ]
};

window.PROJECTS = [
  {
    id: "gravity-sandbox",
    title: "Vector Gravity Sandbox",
    status: "Live demo",
    color: "teal",
    stack: ["Python", "Pygame", "JavaScript"],
    summary: "A two-body gravity experiment with editable initial conditions, an orbital trail, pause controls and real-time motion. The desktop version is Python and Pygame; the demo below is a browser port of the same physics.",
    demo: "gravity",   // must match a key in window.DEMOS (assets/js/demos/*.js); omit for projects without a demo
    notes: [
      { title: "The physics", body: "Newton’s law of universal gravitation, resolved into x and y components. Velocity and position update every frame." },
      { title: "The implementation", body: "The Python version caches the star polygon and stores the trail in a bounded deque, so old points are dropped in constant time." },
      { title: "The experiment", body: "Change gravity, star mass or launch speed and watch a stable orbit turn elliptical, escape the star, or fall inward." }
    ],
    snippet: {
      file: "gravity.py",
      code: "force = (G * M_STAR * M_PLANET) / distance_squared\n\nforce_x = force * dx / distance\nforce_y = force * dy / distance\n\nacceleration_x = force_x / M_PLANET\nacceleration_y = force_y / M_PLANET\n\nplanet_vx += acceleration_x * TIMESTEP\nplanet_x  += planet_vx * TIMESTEP"
    },
    links: [
      { label: "Download gravity.py ↓", href: "projects/gravity-sandbox/gravity.py", download: true, color: "yellow" }
    ]
  }
];
