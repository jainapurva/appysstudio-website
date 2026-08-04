// Stackable Organizer Box — Appy's Studio parametric generator
//
// The catalogue version of this box is 4" x 3" x 2" and anything else has been
// a hand-modelled one-off with a hand-guessed price. This is the same box with
// the numbers exposed.
//
// Stacking is a raised lip on the rim and a matching groove underneath, both
// centred on the wall so the box above sits down into the one below rather
// than balancing on it.

length = 100;          // X, mm
width = 75;            // Y
height = 50;           // Z, overall
wall = 2.0;
base = 2.0;
corner = 6;            // corner radius
divisions_long = 0;    // dividers running across the length
divisions_wide = 0;    // dividers running across the width
stacking = true;
lip_height = 3;

// Printed clearance between the lip and the groove it drops into. 0.25 is the
// smallest gap that reliably separates on an unfussed FDM printer; below that
// the two fuse and you own one tall box.
fit = 0.25;

$fn = 48;

// Corner radius cannot exceed half the short side, and the cavity's radius
// follows the outer one inward.
r_out = min(corner, min(length, width) / 2 - 0.01);

module rounded(l, w, r) {
    if (r > 0.05)
        offset(r = r) square([max(0.01, l - 2 * r), max(0.01, w - 2 * r)], center = true);
    else
        square([l, w], center = true);
}

// Outer footprint, and the same footprint pulled in by `d`.
module shell(d) {
    offset(r = -d) rounded(length, width, r_out);
}

module body() {
    difference() {
        linear_extrude(height = height) shell(0);
        translate([0, 0, base])
            linear_extrude(height = height) shell(wall);
    }
}

module dividers() {
    depth = height - base;
    // Clipped to the cavity, so a divider can never poke out through a rounded
    // corner or stand proud of the rim however the numbers fall.
    intersection() {
        translate([0, 0, base])
            linear_extrude(height = depth) shell(wall);
        union() {
            if (divisions_long > 0)
                for (i = [1 : divisions_long])
                    translate([-length / 2 + i * length / (divisions_long + 1), 0, base + depth / 2])
                        cube([wall, width + 1, depth], center = true);
            if (divisions_wide > 0)
                for (i = [1 : divisions_wide])
                    translate([0, -width / 2 + i * width / (divisions_wide + 1), base + depth / 2])
                        cube([length + 1, wall, depth], center = true);
        }
    }
}

// The lip sits in the middle half of the wall: outer edge a quarter-wall in
// from the rim's outside, inner edge a quarter-wall out from its inside.
module lip_band(grow) {
    difference() {
        shell(wall * 0.25 - grow);
        shell(wall * 0.75 + grow);
    }
}

difference() {
    union() {
        body();
        if (divisions_long > 0 || divisions_wide > 0) dividers();
        if (stacking)
            translate([0, 0, height])
                linear_extrude(height = lip_height) lip_band(0);
    }

    // Groove for the lip of the box below. Cut a hair deeper than the lip is
    // tall so the boxes seat on their rims, not on the lip's top face.
    if (stacking)
        translate([0, 0, -0.01])
            linear_extrude(height = lip_height + fit)
                lip_band(fit);
}
