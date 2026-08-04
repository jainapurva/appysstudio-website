// Cookie Cutter & Clay Stamp — Appy's Studio parametric generator
//
// The cutting edge is a thin band standing on a wider flange. The flange is
// what you press on: without it the wall digs into your hand, and it also
// stiffens a shape that is otherwise a tall thin ribbon.
//
// Print this in PLA or PETG and keep it out of the dishwasher — heat will
// relax the wall. Wash warm, not hot.

shape = "heart";       // circle | square | hexagon | star | heart | flower
size = 70;             // widest span, mm
wall = 0.9;            // cutting wall — thin cuts cleanly, too thin is fragile
height = 18;           // how deep it cuts
flange = 5;            // finger ledge around the top
flange_height = 2.4;
points = 5;            // star points / flower petals
mode = "cutter";       // cutter | stamp
handle = true;         // knob on top, stamp only

$fn = 96;

// ---------------------------------------------------------------- shapes ---
// Each is centred on the origin and spans `size` at its widest.

module shape_2d() {
    r = size / 2;

    if (shape == "circle") {
        circle(r = r);

    } else if (shape == "square") {
        // Rounded corners, or the cutter is unpleasant to press on.
        offset(r = size * 0.08) square(size - size * 0.16, center = true);

    } else if (shape == "hexagon") {
        circle(r = r, $fn = 6);

    } else if (shape == "star") {
        inner = r * 0.45;
        polygon([
            for (i = [0 : points * 2 - 1])
                let(a = i * 180 / points, rr = (i % 2 == 0) ? r : inner)
                    [rr * sin(a), rr * cos(a)]
        ]);

    } else if (shape == "heart") {
        // Two lobes over a V. Scaled to span `size` across the lobes.
        lobe = r * 0.52;
        scale([1, 1])
            union() {
                translate([-lobe * 0.94, r * 0.30]) circle(r = lobe);
                translate([ lobe * 0.94, r * 0.30]) circle(r = lobe);
                polygon([
                    [-r * 0.985, r * 0.36],
                    [ r * 0.985, r * 0.36],
                    [0, -r]
                ]);
            }

    } else {
        // flower — petals around a hub
        petal = r * 0.40;
        union() {
            circle(r = r * 0.46);
            for (i = [0 : points - 1])
                rotate([0, 0, i * 360 / points])
                    translate([r - petal, 0]) circle(r = petal);
        }
    }
}

// ----------------------------------------------------------------- parts ---

// The band that does the cutting: the outline, minus the outline pulled in by
// `wall`. offset(r=) rather than delta so a star's inner corners can't fold
// through themselves at larger wall values.
module cutting_band() {
    difference() {
        shape_2d();
        offset(r = -wall) shape_2d();
    }
}

module flange_band() {
    difference() {
        offset(r = flange) shape_2d();
        offset(r = -wall) shape_2d();
    }
}

if (mode == "cutter") {
    union() {
        linear_extrude(height = height) cutting_band();
        translate([0, 0, height - flange_height])
            linear_extrude(height = flange_height) flange_band();
    }
} else {
    // Stamp: a solid plate with the outline standing proud of it, so it
    // presses a line into clay or dough instead of cutting through.
    plate = 3;
    relief = 1.6;
    union() {
        linear_extrude(height = plate) offset(r = flange) shape_2d();
        translate([0, 0, plate])
            linear_extrude(height = relief) cutting_band();
        if (handle)
            translate([0, 0, plate])
                union() {
                    cylinder(d1 = size * 0.30, d2 = size * 0.16, h = size * 0.22);
                    translate([0, 0, size * 0.22]) sphere(d = size * 0.20);
                }
    }
}
