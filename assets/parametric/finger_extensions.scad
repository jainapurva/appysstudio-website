// Articulated Finger Extensions — Appy's Studio parametric generator
//
// A socket for a fingertip and a chain of links that bend, printed in one piece
// with the joints already assembled. Nothing to clip together afterwards.
//
// PRINT FLAT, exactly as generated. The hinge axes run vertically (Z), so every
// moving gap is a vertical annulus rather than a horizontal overhang — that is
// the whole reason it survives an FDM printer. Stand it up or lay it on a side
// and the joints fuse.
//
// `clearance` is the gap on every moving surface. 0.35 works on a well-behaved
// 0.4mm nozzle. Raise it if the joints come out stiff, lower it if they rattle.

segments = 3;          // links after the socket
segment_length = 26;   // joint to joint, mm
finger_width = 19;     // across your fingertip
finger_height = 15;    // top to bottom of your fingertip
socket_depth = 26;     // how far the finger goes in
thickness = 12;        // link thickness — the hinge lives inside this
wall = 2.4;
clearance = 0.35;
claw = true;           // taper the last link to a point

$fn = 48;

// --- derived ---------------------------------------------------------------

// Ears above and below the tongue, and the tongue itself, share `thickness`.
tongue_t = thickness / 3;
ear_t = (thickness - tongue_t - 2 * clearance) / 2;

pin_r = max(1.6, thickness * 0.16);

// Joint half-widths, tapering from the socket end down to the tip.
kr_root = (finger_width / 2 + wall) * 0.78;
kr_tip = max(3.2, pin_r + wall);

function kr(i) = kr_root + (kr_tip - kr_root) * (i / segments);

// Where the thin tongue gives way to the full-thickness body.
//
// This one number decides whether the thing works. The fork ears at a joint
// reach `kr` out from its centre, so any full-thickness material closer than
// that is not a tight joint — it is the same lump of plastic, and the print
// comes out rigid. The body's proximal end is a circle of radius
// BODY_NECK_R * kr sitting `neck` along, so its nearest approach to the joint
// is neck - BODY_NECK_R*kr, and that has to stay outside kr + clearance:
//
//     neck >= (1 + BODY_NECK_R) * kr + clearance
//
// Held with a little margin, this clears at every bend angle rather than only
// at the printed one. A fused chain still measures watertight, so nothing
// downstream catches this — __tests__ counts the shells instead.
BODY_NECK_R = 0.55;

function neck(i) = (1 + BODY_NECK_R) * kr(i) + clearance + 0.5;

// --- pieces ----------------------------------------------------------------

// The slot a tongue swings in. It opens toward +X — away from the link that
// owns it — so it hollows out the knuckle without cutting into the link body.
module fork_slot(i) {
    x = i * segment_length;
    translate([0, 0, thickness / 2])
        linear_extrude(height = tongue_t + 2 * clearance, center = true)
            hull() {
                translate([x, 0]) circle(r = kr(i) + clearance);
                translate([x + segment_length, 0]) circle(r = kr(i) + clearance);
            }
}

module ear_hole(i, through = 0) {
    translate([i * segment_length, 0, -0.5])
        cylinder(r = pin_r + clearance, h = (through > 0 ? through : thickness) + 1);
}

// A link running from joint `i` to joint `i+1`: thin tongue and pin at the
// proximal end, full-thickness body, fork at the distal end.
module link(i) {
    x0 = i * segment_length;
    x1 = (i + 1) * segment_length;
    last = (i == segments - 1);

    difference() {
        union() {
            // Tongue — sits inside the previous fork.
            translate([0, 0, thickness / 2])
                linear_extrude(height = tongue_t, center = true)
                    hull() {
                        translate([x0, 0]) circle(r = kr(i) - clearance);
                        translate([x0 + neck(i), 0]) circle(r = kr(i) * BODY_NECK_R);
                    }

            // Pin — full thickness, so it reaches into both ears above and below.
            translate([x0, 0, 0]) cylinder(r = pin_r, h = thickness);

            // Body.
            linear_extrude(height = thickness)
                hull() {
                    translate([x0 + neck(i), 0]) circle(r = kr(i) * BODY_NECK_R);
                    translate([x1, 0]) circle(r = last && claw ? kr_tip * 0.55 : kr(i + 1));
                }
        }

        // Only a link that has another one after it needs a fork.
        if (!last) {
            fork_slot(i + 1);
            ear_hole(i + 1);
        }
    }
}

// A fingertip is deeper than a link is thick, so the socket is its own height
// and tapers down into the chain. Hulling a tall cylinder to a short one does
// the taper in both plan and section at once.
socket_t = max(thickness, finger_height + 2 * wall);

// The socket. A rounded-rectangle bore rather than a round one: a flat ceiling
// bridges cleanly, where the top of a circular bore would collapse into it.
module socket() {
    outer_w = finger_width + 2 * wall;
    inner_r = min(finger_width, finger_height) * 0.28;

    // The shell's rounded proximal end bulges back past its centre, so the bore
    // has to start beyond that to actually break through. Starting it at the
    // centre leaves a cap over the opening, and the "bore" becomes a sealed
    // void — still watertight, still one tidy STL, and useless.
    bore_start = -(socket_depth + outer_w / 2 + 1);
    // Stop clear of the fork slot, which reaches back to kr_root + clearance
    // from the joint; running into it merges the finger opening with the hinge.
    bore_end = -(kr_root + clearance + wall);

    difference() {
        hull() {
            translate([-socket_depth, 0, 0])
                cylinder(r = outer_w / 2, h = socket_t);
            cylinder(r = kr_root, h = thickness);
        }

        // The profile is centred, so this lines the bore's middle up with the
        // middle of the socket, leaving `wall` above and below it.
        translate([bore_start, 0, socket_t / 2])
            rotate([0, 90, 0])
                linear_extrude(height = bore_end - bore_start)
                    offset(r = inner_r)
                        square([max(0.1, finger_height - 2 * inner_r),
                                max(0.1, finger_width - 2 * inner_r)], center = true);

        // The socket carries the first fork.
        fork_slot(0);
        ear_hole(0, socket_t);
    }
}

union() {
    socket();
    for (i = [0 : segments - 1]) link(i);
}
