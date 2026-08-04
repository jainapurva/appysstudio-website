// Hex Desk Organizer — Appy's Studio parametric generator
//
// A modular desk set: hexagonal cells that tessellate against each other, so a
// pen pot, a phone stand and a coaster sit together without gaps. The studio's
// own design — the existing modules are fixed at 31.75mm circumradius and
// 3.5mm walls, which is what `cell` and `wall` default to here, so a printed
// part still packs against the ones already on the desk.
//
// Magnet pockets go in the flats, not the base, so neighbouring cells hold on
// to each other rather than to the desk.

type = "pen";          // pen | marker | notes | cable | phone | coaster
cell = 31.75;          // circumradius — the studio standard
height = 90;
wall = 3.5;
base = 4.0;
magnets = false;
magnet_d = 6.2;        // 6mm magnet plus a printed-fit allowance
magnet_h = 3.2;

$fn = 64;

// A hexagon is specified by its circumradius; the flats sit at cr*cos(30).
apothem = cell * cos(30);
inner_apothem = apothem - wall;
inner_cell = inner_apothem / cos(30);

module hex(cr, h) {
    linear_extrude(height = h) circle(r = cr, $fn = 6);
}

// Straight-walled cup — the base for most of the modules.
module cup(h, floor_thickness) {
    difference() {
        hex(cell, h);
        translate([0, 0, floor_thickness])
            hex(inner_cell, h);
    }
}

// Pockets in each of the six flats, at mid-height, so cells snap side to side.
module magnet_pockets(h) {
    z = min(h / 2, max(magnet_d, 12));
    for (i = [0 : 5])
        rotate([0, 0, i * 60])
            translate([apothem - magnet_h, 0, z])
                rotate([0, 90, 0])
                    cylinder(d = magnet_d, h = magnet_h + 0.01, $fn = 32);
}

// Everything above the plane that meets the front flat at `front_z` and the
// back flat at `back_z`. Cutting downward-only matters: a cut that also leaned
// forward would slice the footprint back from a full hexagon, and then the cell
// no longer sits flush against its neighbours, which is the whole point of the
// system.
module slanted_top(front_z, back_z) {
    angle = atan2(back_z - front_z, 2 * apothem);
    big = cell * 6;
    translate([0, 0, (front_z + back_z) / 2])
        rotate([0, -angle, 0])
            translate([0, 0, big / 2])
                cube([big, big, big], center = true);
}

module body() {
    if (type == "pen") {
        cup(height, base);

    } else if (type == "marker") {
        // Markers are stubby, so this one is shorter and cut away at the front:
        // a low lip to hold them in, a high back so it still reads as a cell.
        h = max(30, height * 0.62);
        difference() {
            cup(h, base);
            slanted_top(h * 0.45, h);
        }

    } else if (type == "notes") {
        // A shallow well for a note block, open at the front so the top sheet
        // can be pulled off without lifting the pad out.
        h = max(20, height * 0.35);
        difference() {
            cup(h, base);
            slanted_top(base + 4, h);
        }

    } else if (type == "cable") {
        // Solid-ish block with slots across the top to drop cable ends into.
        h = max(18, height * 0.28);
        slot = 5;
        difference() {
            hex(cell, h);
            for (i = [-1, 0, 1])
                translate([i * (slot * 2.2), 0, h - slot * 0.8])
                    rotate([0, 0, 90])
                        union() {
                            // A keyhole: narrow at the top so the cable clips
                            // in and the plug end cannot pull back through.
                            translate([0, 0, slot * 0.8])
                                cube([cell * 3, slot * 0.62, slot * 1.6], center = true);
                            rotate([0, 90, 0])
                                cylinder(d = slot, h = cell * 3, center = true, $fn = 32);
                        }
        }

    } else if (type == "phone") {
        // A solid block with a leaning slot down the middle. 15 degrees off
        // vertical is where a phone stops trying to tip forward out of it.
        lean = 15;
        slot_w = 13;            // phone plus a case
        h = max(40, height * 0.62);
        slot_depth = h * 0.6;
        difference() {
            hex(cell, h);
            // The slot's floor sits at the rotation origin and it runs well
            // past the top, so the cut is open rather than a buried pocket.
            translate([0, 0, h - slot_depth])
                rotate([0, lean, 0])
                    translate([0, 0, slot_depth])
                        cube([slot_w, cell * 3, slot_depth * 2], center = true);
            // A charging cable reaches the port from underneath.
            translate([0, 0, -0.01])
                cylinder(d = 11, h = h - slot_depth + 2, $fn = 32);
        }

    } else {
        // coaster — a shallow dish with a raised rim
        h = max(6, base + 4);
        difference() {
            hex(cell, h);
            translate([0, 0, base])
                hex(inner_cell, h);
        }
    }
}

// Each type decides its own height from `height`; the magnet pockets have to
// sit inside whatever that turned out to be.
function finished_height() =
    type == "marker"  ? max(30, height * 0.62) :
    type == "notes"   ? max(20, height * 0.35) :
    type == "cable"   ? max(18, height * 0.28) :
    type == "phone"   ? max(40, height * 0.62) :
    type == "coaster" ? max(6, base + 4) :
                        height;

difference() {
    body();
    if (magnets) magnet_pockets(finished_height());
}
