import math
import sys
import pygame
import pygame.gfxdraw
from collections import deque

# ============================================================
# INITIALIZATION
# ============================================================

pygame.init()

# ------------------------------------------------------------
# WINDOW
# ------------------------------------------------------------

SIM_WIDTH = 850
PANEL_WIDTH = 350
WIDTH = SIM_WIDTH + PANEL_WIDTH
HEIGHT = 600

screen = pygame.display.set_mode((WIDTH, HEIGHT))
pygame.display.set_caption("Vector Gravity Sandbox")

clock = pygame.time.Clock()
FPS = 60

# ============================================================
# FONTS
# ============================================================

font = pygame.font.SysFont(None, 23)
small_font = pygame.font.SysFont(None, 19)
title_font = pygame.font.SysFont(None, 28)

# ============================================================
# COLORS
# ============================================================

BACKGROUND = (10, 15, 30)

STAR_COLOR = (255, 215, 0)
STAR_GLOW_COLOR = (255, 245, 180)

PLANET_COLOR = (0, 200, 255)
TRAIL_COLOR = (100, 100, 250)

PANEL_COLOR = (25, 30, 45)
INPUT_COLOR = (40, 45, 65)
INPUT_ACTIVE = (65, 75, 105)

TEXT_COLOR = (235, 235, 235)
SECONDARY_TEXT = (170, 175, 190)

BORDER_COLOR = (90, 95, 115)

BUTTON_BLUE = (55, 100, 170)
BUTTON_GREEN = (55, 140, 75)
BUTTON_RED = (150, 65, 65)
BUTTON_GRAY = (90, 90, 100)

WHITE = (255, 255, 255)

# ============================================================
# DEFAULT INITIAL CONDITIONS
# ============================================================

DEFAULTS = {
    "G": 1000.0,
    "M_STAR": 140.0,
    "M_PLANET": 5.0,
    "TIMESTEP": 0.1,

    # Automatically centered in the simulation area
    "STAR_X": SIM_WIDTH / 2,
    "STAR_Y": HEIGHT / 2,

    "PLANET_X": SIM_WIDTH / 2,
    "PLANET_Y": HEIGHT / 2 - 180,

    "PLANET_VX": 23.0,
    "PLANET_VY": 0.0,

    "PLANET_RADIUS": 8.0,
    "MAX_TRAIL": 1000,

    "STAR_POINTS": 6,
    "STAR_OUTER_R": 26.0,
    "STAR_INNER_R": 11.0,
}

# ============================================================
# SIMULATION STATE
# ============================================================

G = DEFAULTS["G"]
M_STAR = DEFAULTS["M_STAR"]
M_PLANET = DEFAULTS["M_PLANET"]
TIMESTEP = DEFAULTS["TIMESTEP"]

star_x = DEFAULTS["STAR_X"]
star_y = DEFAULTS["STAR_Y"]

planet_x = DEFAULTS["PLANET_X"]
planet_y = DEFAULTS["PLANET_Y"]

planet_vx = DEFAULTS["PLANET_VX"]
planet_vy = DEFAULTS["PLANET_VY"]

PLANET_RADIUS = DEFAULTS["PLANET_RADIUS"]
MAX_TRAIL = DEFAULTS["MAX_TRAIL"]

STAR_POINTS = DEFAULTS["STAR_POINTS"]
STAR_OUTER_R = DEFAULTS["STAR_OUTER_R"]
STAR_INNER_R = DEFAULTS["STAR_INNER_R"]

# A deque with maxlen evicts old points in O(1). The original list
# needed `del path_points[:n]` every frame once the trail was full,
# which shifts every remaining element down by one (O(n) per frame).
path_points = deque(maxlen=MAX_TRAIL)
paused = False

status_message = ""
status_timer = 0

# Cached star polygon. The star never moves on its own, so there is
# no reason to redo the trig in star_vertices() 60 times a second --
# only recompute it when the relevant settings actually change.
star_polygon_points = []

# ============================================================
# INPUT FIELD
# ============================================================

class InputField:
    def __init__(self, name, value, x, y, width=145):
        self.name = name
        self.value = str(value)
        self.rect = pygame.Rect(x, y, width, 29)
        self.active = False

        # The label text is static for the field's lifetime, so
        # render it once here instead of every frame in the draw loop.
        self.label_surface = small_font.render(name, True, SECONDARY_TEXT)
        self.label_pos = (x - 125, y + 6)

    def draw(self, surface):
        color = INPUT_ACTIVE if self.active else INPUT_COLOR

        pygame.draw.rect(
            surface,
            color,
            self.rect,
            border_radius=5
        )

        pygame.draw.rect(
            surface,
            BORDER_COLOR,
            self.rect,
            width=1,
            border_radius=5
        )

        # This still has to be rendered every frame since the value
        # can change as the user types.
        text = font.render(self.value, True, TEXT_COLOR)

        surface.blit(
            text,
            (self.rect.x + 8, self.rect.y + 4)
        )

    def handle_event(self, event):
        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:
            self.active = self.rect.collidepoint(event.pos)

        if not self.active or event.type != pygame.KEYDOWN:
            return

        if event.key == pygame.K_BACKSPACE:
            self.value = self.value[:-1]

        elif event.key == pygame.K_RETURN:
            self.active = False

        elif event.key == pygame.K_ESCAPE:
            self.active = False

        else:
            char = event.unicode

            # Only allow numerical input
            if char in "0123456789.-":
                self.value += char

    def get_value(self, integer=False):
        try:
            value = float(self.value)

            if integer:
                return int(value)

            return value

        except ValueError:
            return None


# ============================================================
# INPUT FIELDS
# ============================================================

FIELDS = {}

field_data = [
    ("G", DEFAULTS["G"]),
    ("Star Mass", DEFAULTS["M_STAR"]),
    ("Planet Mass", DEFAULTS["M_PLANET"]),
    ("Time Step", DEFAULTS["TIMESTEP"]),

    ("Star X", DEFAULTS["STAR_X"]),
    ("Star Y", DEFAULTS["STAR_Y"]),

    ("Planet X", DEFAULTS["PLANET_X"]),
    ("Planet Y", DEFAULTS["PLANET_Y"]),

    ("Planet Vx", DEFAULTS["PLANET_VX"]),
    ("Planet Vy", DEFAULTS["PLANET_VY"]),

    ("Planet Radius", DEFAULTS["PLANET_RADIUS"]),
    ("Max Trail", DEFAULTS["MAX_TRAIL"]),

    ("Star Points", DEFAULTS["STAR_POINTS"]),
    ("Star Outer R", DEFAULTS["STAR_OUTER_R"]),
    ("Star Inner R", DEFAULTS["STAR_INNER_R"]),
]

# Input boxes live in the right-hand panel.
FIELD_X = SIM_WIDTH + 165
FIELD_WIDTH = 150

START_Y = 108
FIELD_SPACING = 30

for i, (name, value) in enumerate(field_data):
    y = START_Y + i * FIELD_SPACING

    FIELDS[name] = InputField(
        name,
        value,
        FIELD_X,
        y,
        FIELD_WIDTH
    )

# Module-level constants used by apply_settings()/load_defaults().
# These were previously rebuilt from a literal every single call;
# now they're built once at import time.
INTEGER_FIELDS = {
    "Max Trail",
    "Star Points",
}

FIELD_KEY_MAP = {
    "G": "G",
    "Star Mass": "M_STAR",
    "Planet Mass": "M_PLANET",
    "Time Step": "TIMESTEP",

    "Star X": "STAR_X",
    "Star Y": "STAR_Y",

    "Planet X": "PLANET_X",
    "Planet Y": "PLANET_Y",

    "Planet Vx": "PLANET_VX",
    "Planet Vy": "PLANET_VY",

    "Planet Radius": "PLANET_RADIUS",
    "Max Trail": "MAX_TRAIL",

    "Star Points": "STAR_POINTS",
    "Star Outer R": "STAR_OUTER_R",
    "Star Inner R": "STAR_INNER_R",
}

# ============================================================
# BUTTONS
# ============================================================

BUTTON_WIDTH = 135
BUTTON_HEIGHT = 35
BUTTON_GAP = 10
BUTTON_MARGIN = 15

APPLY_RECT = pygame.Rect(
    BUTTON_MARGIN,
    HEIGHT - BUTTON_MARGIN - BUTTON_HEIGHT * 2 - BUTTON_GAP,
    BUTTON_WIDTH,
    BUTTON_HEIGHT
)

DEFAULT_RECT = pygame.Rect(
    BUTTON_MARGIN + BUTTON_WIDTH + BUTTON_GAP,
    HEIGHT - BUTTON_MARGIN - BUTTON_HEIGHT * 2 - BUTTON_GAP,
    BUTTON_WIDTH,
    BUTTON_HEIGHT
)

PAUSE_RECT = pygame.Rect(
    BUTTON_MARGIN,
    HEIGHT - BUTTON_MARGIN - BUTTON_HEIGHT,
    BUTTON_WIDTH,
    BUTTON_HEIGHT
)

CLEAR_TRAIL_RECT = pygame.Rect(
    BUTTON_MARGIN + BUTTON_WIDTH + BUTTON_GAP,
    HEIGHT - BUTTON_MARGIN - BUTTON_HEIGHT,
    BUTTON_WIDTH,
    BUTTON_HEIGHT
)

# Button and title captions never change (except Pause/Resume), so
# render them once instead of doing a font.render() for each of the
# four buttons, every frame, forever.
APPLY_LABEL = font.render("Apply & Reset", True, WHITE)
DEFAULT_LABEL = font.render("Defaults", True, WHITE)
PAUSE_LABEL = font.render("Pause", True, WHITE)
RESUME_LABEL = font.render("Resume", True, WHITE)
CLEAR_LABEL = font.render("Clear Trail", True, WHITE)

TITLE_SURFACE = title_font.render("Simulation Controls", True, TEXT_COLOR)

# ============================================================
# DRAWING FUNCTIONS
# ============================================================

def draw_button(surface, rect, label_surface, color):
    pygame.draw.rect(
        surface,
        color,
        rect,
        border_radius=6
    )

    pygame.draw.rect(
        surface,
        (220, 220, 220),
        rect,
        width=1,
        border_radius=6
    )

    surface.blit(
        label_surface,
        label_surface.get_rect(center=rect.center)
    )


def star_vertices(
    cx,
    cy,
    outer_r,
    inner_r,
    num_points,
    rotation_deg=-90
):
    vertices = []

    step = math.pi / num_points
    start = math.radians(rotation_deg)

    for i in range(num_points * 2):
        radius = outer_r if i % 2 == 0 else inner_r
        angle = start + i * step

        vertices.append(
            (
                int(cx + radius * math.cos(angle)),
                int(cy + radius * math.sin(angle))
            )
        )

    return vertices


def refresh_star_cache():
    """Recompute the cached star polygon. Call only when a setting
    that affects the star's shape or position actually changes."""
    global star_polygon_points

    star_polygon_points = star_vertices(
        star_x,
        star_y,
        STAR_OUTER_R,
        STAR_INNER_R,
        STAR_POINTS
    )


# Build the initial cache now that star_vertices() exists.
refresh_star_cache()

# ============================================================
# APPLY INPUT VALUES
# ============================================================

def apply_settings():
    global G
    global M_STAR
    global M_PLANET
    global TIMESTEP

    global star_x
    global star_y

    global planet_x
    global planet_y

    global planet_vx
    global planet_vy

    global PLANET_RADIUS
    global MAX_TRAIL

    global STAR_POINTS
    global STAR_OUTER_R
    global STAR_INNER_R

    global path_points
    global status_message
    global status_timer

    values = {}

    # Read all fields
    for name, field in FIELDS.items():

        value = field.get_value(
            integer=name in INTEGER_FIELDS
        )

        if value is None:
            status_message = f"Invalid value: {name}"
            status_timer = 180
            return False

        values[name] = value

    # Basic validation
    if values["Planet Mass"] <= 0:
        status_message = "Planet Mass must be > 0"
        status_timer = 180
        return False

    if values["Time Step"] <= 0:
        status_message = "Time Step must be > 0"
        status_timer = 180
        return False

    if values["Max Trail"] < 1:
        status_message = "Max Trail must be >= 1"
        status_timer = 180
        return False

    if values["Star Points"] < 2:
        status_message = "Star Points must be >= 2"
        status_timer = 180
        return False

    # Apply values
    G = values["G"]
    M_STAR = values["Star Mass"]
    M_PLANET = values["Planet Mass"]
    TIMESTEP = values["Time Step"]

    star_x = values["Star X"]
    star_y = values["Star Y"]

    planet_x = values["Planet X"]
    planet_y = values["Planet Y"]

    planet_vx = values["Planet Vx"]
    planet_vy = values["Planet Vy"]

    PLANET_RADIUS = max(1, values["Planet Radius"])
    MAX_TRAIL = max(1, values["Max Trail"])

    STAR_POINTS = max(2, values["Star Points"])
    STAR_OUTER_R = max(1, values["Star Outer R"])
    STAR_INNER_R = max(1, values["Star Inner R"])

    # New initial conditions = new trail. Rebuilding the deque also
    # picks up any change to MAX_TRAIL.
    path_points = deque(maxlen=MAX_TRAIL)

    # Star position/shape may have changed -- refresh the cached
    # polygon once here rather than every frame.
    refresh_star_cache()

    status_message = "Settings applied"
    status_timer = 120

    return True


# ============================================================
# LOAD DEFAULTS
# ============================================================

def load_defaults():
    for name, field in FIELDS.items():
        field.value = str(
            DEFAULTS[FIELD_KEY_MAP[name]]
        )

    apply_settings()


# ============================================================
# MAIN LOOP
# ============================================================

running = True

while running:

    # ========================================================
    # EVENTS
    # ========================================================

    for event in pygame.event.get():

        if event.type == pygame.QUIT:
            running = False

        # ----------------------------------------------------
        # Keyboard
        # ----------------------------------------------------

        elif event.type == pygame.KEYDOWN:

            if event.key == pygame.K_SPACE:
                paused = not paused

        # ----------------------------------------------------
        # Input fields
        # ----------------------------------------------------

        for field in FIELDS.values():
            field.handle_event(event)

        # ----------------------------------------------------
        # Buttons
        # ----------------------------------------------------

        if event.type == pygame.MOUSEBUTTONDOWN and event.button == 1:

            if APPLY_RECT.collidepoint(event.pos):
                apply_settings()

                # Remove focus from all fields
                for field in FIELDS.values():
                    field.active = False

            elif DEFAULT_RECT.collidepoint(event.pos):
                load_defaults()

                for field in FIELDS.values():
                    field.active = False

            elif PAUSE_RECT.collidepoint(event.pos):
                paused = not paused

            elif CLEAR_TRAIL_RECT.collidepoint(event.pos):
                path_points.clear()

    # ========================================================
    # PHYSICS
    # ========================================================

    if not paused:

        # Vector from planet to star
        dx = star_x - planet_x
        dy = star_y - planet_y

        distance_squared = dx * dx + dy * dy

        # Avoid division by zero / extreme acceleration
        if distance_squared < 400:
            distance_squared = 400

        distance = math.sqrt(distance_squared)

        # ----------------------------------------------------
        # F = G M1 M2 / r²
        # ----------------------------------------------------

        force = (
            G * M_STAR * M_PLANET
        ) / distance_squared

        # ----------------------------------------------------
        # Resolve force directly into x/y components.
        # ----------------------------------------------------

        force_x = force * dx / distance
        force_y = force * dy / distance

        # ----------------------------------------------------
        # F = ma
        # ----------------------------------------------------

        acceleration_x = force_x / M_PLANET
        acceleration_y = force_y / M_PLANET

        # ----------------------------------------------------
        # v = u + at
        # ----------------------------------------------------

        planet_vx += acceleration_x * TIMESTEP
        planet_vy += acceleration_y * TIMESTEP

        # ----------------------------------------------------
        # s = vt
        # ----------------------------------------------------

        planet_x += planet_vx * TIMESTEP
        planet_y += planet_vy * TIMESTEP

        # ----------------------------------------------------
        # Trail -- the deque's maxlen handles eviction for us,
        # in O(1), so no manual trimming is needed here.
        # ----------------------------------------------------

        path_points.append(
            (int(planet_x), int(planet_y))
        )

    # ========================================================
    # DRAW EVERYTHING
    # ========================================================

    screen.fill(BACKGROUND)

    # --------------------------------------------------------
    # Orbit trail
    # --------------------------------------------------------

    if len(path_points) > 1:
        pygame.draw.lines(
            screen,
            TRAIL_COLOR,
            False,
            path_points,
            2
        )

    # --------------------------------------------------------
    # Star glow
    # --------------------------------------------------------

    pygame.draw.circle(
        screen,
        STAR_GLOW_COLOR,
        (int(star_x), int(star_y)),
        int(STAR_OUTER_R + 6),
        width=1
    )

    # --------------------------------------------------------
    # Star (cached polygon -- no trig recomputed here)
    # --------------------------------------------------------

    pygame.gfxdraw.aapolygon(
        screen,
        star_polygon_points,
        STAR_COLOR
    )

    pygame.gfxdraw.filled_polygon(
        screen,
        star_polygon_points,
        STAR_COLOR
    )

    # --------------------------------------------------------
    # Planet
    # --------------------------------------------------------

    pygame.draw.circle(
        screen,
        PLANET_COLOR,
        (int(planet_x), int(planet_y)),
        int(PLANET_RADIUS)
    )

    # ========================================================
    # CONTROL PANEL
    # ========================================================

    pygame.draw.rect(
        screen,
        PANEL_COLOR,
        (SIM_WIDTH, 0, PANEL_WIDTH, HEIGHT)
    )

    pygame.draw.line(
        screen,
        (80, 85, 105),
        (SIM_WIDTH, 0),
        (SIM_WIDTH, HEIGHT),
        2
    )

    # --------------------------------------------------------
    # Panel title (pre-rendered)
    # --------------------------------------------------------

    screen.blit(
        TITLE_SURFACE,
        (SIM_WIDTH + 20, 20)
    )

    # --------------------------------------------------------
    # Input fields (labels pre-rendered)
    # --------------------------------------------------------

    for field in FIELDS.values():
        screen.blit(field.label_surface, field.label_pos)
        field.draw(screen)

    # ========================================================
    # BUTTONS (labels pre-rendered)
    # ========================================================

    draw_button(
        screen,
        APPLY_RECT,
        APPLY_LABEL,
        BUTTON_BLUE
    )

    draw_button(
        screen,
        DEFAULT_RECT,
        DEFAULT_LABEL,
        BUTTON_GRAY
    )

    draw_button(
        screen,
        PAUSE_RECT,
        RESUME_LABEL if paused else PAUSE_LABEL,
        BUTTON_GREEN if paused else BUTTON_RED
    )

    draw_button(
        screen,
        CLEAR_TRAIL_RECT,
        CLEAR_LABEL,
        BUTTON_GRAY
    )

    # --------------------------------------------------------
    # Status message
    # --------------------------------------------------------

    if status_timer > 0:

        status = small_font.render(
            status_message,
            True,
            (200, 220, 200)
        )

        screen.blit(
            status,
            (SIM_WIDTH + 20, HEIGHT - 25)
        )

        status_timer -= 1

    # ========================================================
    # UPDATE DISPLAY
    # ========================================================

    pygame.display.flip()
    clock.tick(FPS)


pygame.quit()
sys.exit()