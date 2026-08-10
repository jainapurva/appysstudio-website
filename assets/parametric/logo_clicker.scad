// Logo Clicker — a desk clicker built around a Cherry-MX style switch, with
// any logo inlaid flush into the cap face.
//
// Written from first principles for appysstudio.com. The switch-facing numbers
// (stem cross, body pocket, travel clearances) are hardware dimensions rather
// than anything borrowed — everything else is our own.
//
// Two things this file must respect, both from the openscad-wasm build:
//   - there are no fonts, so text() is never used here
//   - output is STL, so colour separation happens by rendering `part` twice
//     and letting the 3MF carry the results as two objects
//
// The logo arrives as contours the browser traced, appended by the API as
// LOGO_POINTS / LOGO_PATHS. Nested contours fill even-odd, so a loop inside a
// loop is a hole with no extra bookkeeping.

$fn = 96;

/* [Shape] */

// circle | square | rectangle | pill
shape = "circle";

// Across the cap. The base adds base_margin all round.
cap_width = 33;      // [24:1:48]

// Rectangle only; other shapes are square on this axis.
cap_depth = 33;      // [24:1:48]

// Corner rounding for square and rectangle.
corner_radius = 4;   // [0:0.5:12]

/* [Logo] */

// Longest axis of the logo on the cap face.
logo_size = 22;      // [6:0.5:44]

// Inlay thickness. 0.8 is four layers at 0.2mm.
logo_depth = 0.8;    // [0.2:0.1:2.0]

// Keep the logo this far in from the edge of the face.
logo_margin = 1.5;   // [0:0.5:6]

// Fatten (+) or thin (-) the artwork. Rescues hairline strokes.
logo_bleed = 0;      // [-0.6:0.05:0.6]

/* [Build] */

// cap | logo | base | preview
part = "preview";

/* [Hidden] */

// ---- proportions -------------------------------------------------------
base_margin = 4.5;               // base overhangs the cap by this all round
cap_height = 12;
base_height = 18;
cap_chamfer = 1;
base_chamfer = 1.2;

// ---- switch interface --------------------------------------------------
// A Cherry-MX stem is a 4.1 x 1.35mm cross; the extra 0.10 is print clearance.
stem_cross_length = 4.276;
stem_cross_width = 1.3;
stem_fit_clearance = 0.10;
stem_socket_depth = 3.8;
socket_post_radius = 2.8;

cap_cavity_diameter = 20;        // clears the switch housing on the downstroke
cap_cavity_depth = 3.8;

base_recess_depth = 6;           // the well the cap travels in
base_recess_clearance = 1;
switch_body = 16;                // MX footprint above the plate
switch_body_depth = 3;
switch_step_inset = 1;
switch_lower_depth = 5;
switch_pin_diameter = 5;
switch_pin_depth = 3.4;

assembled_drop = 6;              // how far the cap sits into the base at rest

eps = 0.02;
face_z = cap_height;

// Appended by the API when a logo was traced. Empty means a plain cap.
LOGO_POINTS = [];
LOGO_PATHS = [];

has_logo = len(LOGO_POINTS) > 0;

// =======================================================================
//  PROFILE
//  One 2D outline drives cap, base and the recess between them, so a
//  rectangular cap automatically gets a rectangular base and a rectangular
//  well - nothing has to be kept in sync by hand.
// =======================================================================

module profile_2d(w, d) {
    if (shape == "circle") {
        // Scaling a unit circle gives an ellipse for free when w != d.
        scale([w / 2, d / 2]) circle(d = 2);
    } else if (shape == "pill") {
        r = min(w, d) / 2;
        offset(r = r) square([max(w - 2 * r, 0.01), max(d - 2 * r, 0.01)], center = true);
    } else {
        r = min(corner_radius, min(w, d) / 2 - 0.01);
        if (r <= 0) square([w, d], center = true);
        else offset(r = r) square([w - 2 * r, d - 2 * r], center = true);
    }
}

// Width/depth actually used, so "circle" and "square" ignore cap_depth.
function w_of() = cap_width;
function d_of() = (shape == "rectangle") ? cap_depth : cap_width;

// A prism with the top and bottom edges chamfered. hull() between two thin
// slices handles any profile, which a linear_extrude scale factor would not
// once the outline stops being a circle.
module chamfered_prism(w, d, h, c) {
    cc = min(c, h / 2 - 0.01);
    if (cc <= 0) {
        linear_extrude(height = h) profile_2d(w, d);
    } else {
        union() {
            hull() {
                linear_extrude(height = 0.01) offset(delta = -cc) profile_2d(w, d);
                translate([0, 0, cc]) linear_extrude(height = 0.01) profile_2d(w, d);
            }
            translate([0, 0, cc])
                linear_extrude(height = h - 2 * cc) profile_2d(w, d);
            hull() {
                translate([0, 0, h - cc])
                    linear_extrude(height = 0.01) profile_2d(w, d);
                translate([0, 0, h - 0.01])
                    linear_extrude(height = 0.01) offset(delta = -cc) profile_2d(w, d);
            }
        }
    }
}

// =======================================================================
//  LOGO
// =======================================================================

// Measured from the point data, not with resize(), so that the cap's pocket
// and the inlay body are scaled by the same factor even though they are
// rendered in separate passes.
function logo_extent() =
    !has_logo ? [1, 1] :
    let (xs = [for (p = LOGO_POINTS) p[0]],
         ys = [for (p = LOGO_POINTS) p[1]])
    [max(xs) - min(xs), max(ys) - min(ys)];

function logo_scale() =
    let (e = logo_extent()) logo_size / max(max(e[0], e[1]), 0.001);

// Centre on the artwork's bounding box: a traced logo carries whatever origin
// the source image happened to have.
function logo_centre() =
    !has_logo ? [0, 0] :
    let (xs = [for (p = LOGO_POINTS) p[0]],
         ys = [for (p = LOGO_POINTS) p[1]])
    [(min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2];

module logo_raw_2d() {
    if (has_logo) polygon(points = LOGO_POINTS, paths = LOGO_PATHS);
}

// The flat top of the cap, inset by the chamfer, then by the margin.
module face_region_2d() {
    offset(delta = -logo_margin)
        offset(delta = -cap_chamfer)
            profile_2d(w_of(), d_of());
}

// offset() runs through a fixed-point grid, so skip it when it would do
// nothing - a zero offset still snaps coordinates.
module grow_2d(delta) {
    if (delta == 0) children();
    else offset(delta = delta) children();
}

module logo_2d() {
    if (has_logo)
        intersection() {
            grow_2d(logo_bleed)
                scale(logo_scale())
                    translate([-logo_centre()[0], -logo_centre()[1]])
                        logo_raw_2d();
            face_region_2d();
        }
}

module logo_prism() {
    if (has_logo)
        translate([0, 0, face_z - logo_depth])
            linear_extrude(height = logo_depth)
                logo_2d();
}

// =======================================================================
//  CAP
//  Modelled face-up: z=0 is the open underside, z=cap_height is the face.
// =======================================================================

module cap_body() {
    difference() {
        union() {
            difference() {
                chamfered_prism(w_of(), d_of(), cap_height, cap_chamfer);
                // hollow for the switch housing
                translate([0, 0, -eps])
                    cylinder(h = cap_cavity_depth + eps, d = cap_cavity_diameter);
            }
            // the post the stem socket is cut into
            cylinder(h = stem_socket_depth, r = socket_post_radius);
        }

        // MX stem socket
        translate([0, 0, -eps])
            linear_extrude(height = stem_socket_depth + eps)
                union() {
                    square([stem_cross_width + stem_fit_clearance,
                            stem_cross_length + stem_fit_clearance], center = true);
                    square([stem_cross_length + stem_fit_clearance,
                            stem_cross_width + stem_fit_clearance], center = true);
                }

        // logo pocket
        if (has_logo)
            translate([0, 0, -eps]) logo_prism();
    }
}

// =======================================================================
//  BASE
// =======================================================================

function recess_z() = base_height - base_recess_depth;

module base_body() {
    difference() {
        chamfered_prism(w_of() + 2 * base_margin, d_of() + 2 * base_margin,
                        base_height, base_chamfer);

        // the well the cap drops into
        translate([0, 0, recess_z()])
            linear_extrude(height = base_recess_depth + eps)
                offset(delta = base_recess_clearance)
                    profile_2d(w_of(), d_of());

        // switch body, its shoulder, and the pin boss
        translate([0, 0, recess_z() - switch_body_depth])
            linear_extrude(height = switch_body_depth + eps)
                square([switch_body, switch_body], center = true);

        translate([0, 0, recess_z() - switch_body_depth - switch_lower_depth])
            linear_extrude(height = switch_lower_depth + eps)
                square([switch_body - 2 * switch_step_inset,
                        switch_body - 2 * switch_step_inset], center = true);

        translate([0, 0, recess_z() - switch_body_depth - switch_lower_depth
                         - switch_pin_depth])
            cylinder(h = switch_pin_depth + eps, d = switch_pin_diameter);
    }
}

// =======================================================================
//  OUTPUT
//  The cap and its inlay are both emitted face-down, which is how they print:
//  the logo lands in the first layers against the plate and the switch cavity
//  opens upward instead of needing a 20mm bridge.
// =======================================================================

module flip_cap() {
    translate([0, 0, cap_height]) rotate([180, 0, 0]) children();
}

if (part == "cap") {
    flip_cap() cap_body();
}

if (part == "logo") {
    // Same flip, so the inlay lands in the pocket it was cut from.
    rotate([180, 0, 0]) translate([0, 0, -face_z]) logo_prism();
}

if (part == "base") {
    base_body();
}

if (part == "preview") {
    base_body();
    translate([0, 0, base_height - assembled_drop]) {
        cap_body();
        logo_prism();
    }
}
