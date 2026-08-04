// Spinning Top — Appy's Studio parametric generator
//
// Mass wants to sit at the rim: a heavy outer ring on a thin web spins far
// longer than a solid disc of the same weight. `rim` is what that trade is
// exposed as — turn it up for a long spin, down for a quick snappy one.

body_diameter = 46;
body_height = 9;       // thickness at the rim
rim = 5;               // width of the heavy outer ring
web = 2.4;             // thickness of the thin disc inside the ring
stem_height = 26;
stem_diameter = 8;
tip = "point";         // point | round | flat
flutes = 0;            // grip notches around the rim, 0 for none

$fn = 96;

tip_length = tip == "point" ? 9 : tip == "round" ? 5 : 2.5;
tip_base = body_diameter * 0.42;

module cone_tip() {
    if (tip == "point") {
        // Not a true point — a 0.8mm flat gives the slicer something to start
        // on and spins better than a ragged tip.
        cylinder(d1 = 0.8, d2 = tip_base, h = tip_length);
    } else if (tip == "round") {
        ball = tip_length * 0.9;
        union() {
            translate([0, 0, ball]) sphere(r = ball);
            translate([0, 0, ball]) cylinder(d1 = ball * 2, d2 = tip_base, h = tip_length - ball);
        }
    } else {
        cylinder(d1 = tip_base * 0.75, d2 = tip_base, h = tip_length);
    }
}

module body() {
    difference() {
        // Rim ring at full height, with the top edge chamfered so it reads as
        // turned rather than printed.
        translate([0, 0, tip_length])
            union() {
                cylinder(d = body_diameter, h = body_height - 1);
                translate([0, 0, body_height - 1])
                    cylinder(d1 = body_diameter, d2 = body_diameter - 2, h = 1);
            }

        // Hollow out everything inside the rim down to the web.
        translate([0, 0, tip_length + web])
            cylinder(d = body_diameter - rim * 2, h = body_height + 1);

        if (flutes > 0)
            for (i = [0 : flutes - 1])
                rotate([0, 0, i * 360 / flutes])
                    translate([body_diameter / 2, 0, tip_length - 1])
                        cylinder(d = 3, h = body_height + 2, $fn = 24);
    }
}

union() {
    cone_tip();
    body();
    // Stem sinks into the web so the two are one solid, not two touching faces.
    translate([0, 0, tip_length])
        cylinder(d = stem_diameter, h = stem_height + web);
    // A small knob to pinch
    translate([0, 0, tip_length + stem_height + web])
        sphere(d = stem_diameter * 1.35);
}
